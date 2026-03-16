"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Bell, Settings, LogOut, User as UserIcon, Loader2, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNav } from "@/context/NavContext";

export function Header() {
  const { role, logout } = useAuth();
  const { setIsMobileOpen } = useNav();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error: any) {
      toast.error("Failed to logout: " + error.message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-sticky flex h-14 w-full items-center justify-between border-b bg-white/80 backdrop-blur-md px-6 lg:px-6">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="mr-2 p-2 rounded-md hover:bg-slate-100 transition-colors lg:hidden"
          aria-label="Open navigation menu"
          aria-controls="mobile-navigation"
        >
          <Menu className="h-5 w-5 text-slate-600" />
        </button>
        <Breadcrumbs />
      </div>

      <div className="flex items-center space-x-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center space-x-2 p-1 rounded-lg hover:bg-slate-100 transition-all outline-none border border-transparent hover:border-slate-200">
            <Avatar fallback={role?.[0]} className="h-6 w-6 rounded-md" />
            <div className="hidden md:block text-left">
              <p className="text-[11px] font-bold leading-none text-slate-900 capitalize">{role}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-1">
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/${role}/profile`)}>
                <UserIcon className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/${role}/settings`)}>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout} 
              disabled={isLoggingOut}
              variant="destructive"
            >
              {isLoggingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              {isLoggingOut ? "Logging out..." : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
