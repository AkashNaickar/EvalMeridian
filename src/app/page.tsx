"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { isAuthenticated, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && role) {
      router.push(`/${role}`);
    } else {
      router.push("/login");
    }
  }, [isAuthenticated, role, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-8 w-32 bg-muted rounded mb-4"></div>
        <div className="text-sm text-muted-foreground">Redirecting...</div>
      </div>
    </div>
  );
}
