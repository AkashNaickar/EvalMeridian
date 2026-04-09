"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar, getNavigationGroups } from "@/components/layout/Sidebar";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";
import { NavProvider, useNav } from "@/context/NavContext";

function DashboardLayoutContent({ children, role }: { children: React.ReactNode, role: string | null }) {
  const { isHydrated } = useNav();
  const pathname = usePathname();
  const isCanvas = pathname?.includes("/evaluator/canvas/");
  const navGroups = getNavigationGroups(role);

  if (!isHydrated) {
    return <div className="h-screen w-screen bg-slate-50 flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className={cn(
      "flex h-screen flex-col overflow-hidden",
      isCanvas ? "bg-slate-950 dark" : "bg-slate-50"
    )}>
      {!isCanvas && <Header />}
      <MobileDrawer groups={navGroups} />
      <div className="flex flex-1 overflow-hidden relative z-0">
        {!isCanvas && (
          <div className="hidden lg:block h-full">
            <Sidebar />
          </div>
        )}
        <main 
          className={cn(
            "flex-1 overflow-y-auto transition-all duration-premium ease-premium",
            !isCanvas ? "p-4 md:p-8" : "p-0"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, role } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isMounted || !isAuthenticated) {
    return null;
  }

  return (
    <NavProvider>
      <DashboardLayoutContent role={role}>{children}</DashboardLayoutContent>
    </NavProvider>
  );
}
