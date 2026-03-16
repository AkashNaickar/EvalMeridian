"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNav } from "@/context/NavContext";
import { cn } from "@/lib/utils";
import { X, Layers } from "lucide-react";

export function MobileDrawer({ groups }: { groups: any[] }) {
  const { isMobileOpen, setIsMobileOpen } = useNav();
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);

  // Handle Esc key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileOpen(false);
    };
    if (isMobileOpen) {
      window.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isMobileOpen, setIsMobileOpen]);

  if (!isMobileOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={() => setIsMobileOpen(false)}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-[280px] bg-sidebar shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-white">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-[19px] font-bold tracking-tight text-white">Onscreen Eval</span>
          </div>
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="p-2 text-sidebar-foreground/50 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-7">
          {groups.map((group) => (
            <div key={group.title} className="space-y-1">
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/30 mb-3 ml-1">
                {group.title}
              </h3>
              <nav className="space-y-0.5">
                {group.links.map((link: any) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-[14px] font-medium transition-all relative",
                        isActive 
                          ? "bg-sidebar-accent text-white" 
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "text-sidebar-foreground/30")} />
                      {link.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
