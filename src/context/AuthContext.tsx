"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";

export type Role = "admin" | "teacher" | "evaluator" | "student" | null;

interface AuthContextType {
  role: Role;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<Role>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function getSession() {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error fetching session:", error.message);
        if (mounted) setIsLoading(false);
        return;
      }

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        if (mounted) setIsLoading(false);
      }
    }

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT" && mounted) {
          setRole(null);
          router.push("/login");
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) throw error;

      const userRole = data?.role as Role;
      setRole(userRole);
      
      // If we're on login page, redirect based on role
      if (window.location.pathname === "/login" && userRole) {
        router.push(`/${userRole}`);
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error.message);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  }

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Perform immediate redirect + refresh instead of waiting for listener
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
          
        if (profile?.role) {
          setRole(profile.role as Role);
          router.push(`/${profile.role}`);
        } else {
          throw new Error("No active role assigned to this account.");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to login");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Prevent indefinite hanging by capping the sign out request at 800ms
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 800))
      ]);
    } catch (error: any) {
      console.error("Error logging out:", error.message);
    } finally {
      setRole(null);
      setIsLoading(false);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        login,
        logout,
        isAuthenticated: !!role,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
