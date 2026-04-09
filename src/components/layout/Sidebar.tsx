"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, Settings, BookOpen, CheckSquare, BarChart3, Layers } from "lucide-react";

/**
 * Premium Institutional Navigation Groups
 * Shorter, direct operational labels.
 */
export const getNavigationGroups = (role: string | null) => {
  if (role === "admin") {
    return [
      {
        title: "Overview",
        links: [
          { name: "Overview", href: "/admin", icon: LayoutDashboard },
        ]
      },
      {
        title: "Academy",
        links: [
          { name: "Operations", href: "/admin/operations", icon: Layers },
          { name: "Students", href: "/admin/students", icon: Users },
          { name: "Exams", href: "/admin/exams", icon: FileText },
          { name: "Assignment", href: "/admin/assign", icon: FileText },
        ]
      },
      {
        title: "Inventory",
        links: [
          { name: "Scripts", href: "/admin/scripts", icon: CheckSquare },
          { name: "Results", href: "/admin/results", icon: BarChart3 },
        ]
      },
      {
        title: "System",
        links: [
          { name: "Settings", href: "/admin/settings", icon: Settings },
        ]
      }
    ];
  }
  if (role === "teacher") {
    return [
      {
        title: "Overview",
        links: [
          { name: "Overview", href: "/teacher", icon: LayoutDashboard },
        ]
      },
      {
        title: "Academics",
        links: [
          { name: "Courses", href: "/teacher/courses", icon: BookOpen },
          { name: "Assessments", href: "/teacher/assessments", icon: FileText },
          { name: "Resources", href: "/teacher/resources", icon: BookOpen },
        ]
      },
      {
        title: "Reporting",
        links: [
          { name: "Results", href: "/teacher/results", icon: BarChart3 },
        ]
      }
    ];
  }
  if (role === "evaluator") {
    return [
      {
        title: "Overview",
        links: [
          { name: "Overview", href: "/evaluator", icon: LayoutDashboard },
        ]
      },
      {
        title: "Workstation",
        links: [
          { name: "Pending", href: "/evaluator/pending", icon: CheckSquare },
          { name: "History", href: "/evaluator/history", icon: FileText },
        ]
      }
    ];
  }
  if (role === "student") {
    return [
      {
        title: "Overview",
        links: [
          { name: "Overview", href: "/student", icon: LayoutDashboard },
          { name: "Results", href: "/student/results", icon: BarChart3 },
        ]
      }
    ];
  }
  return [];
};

import { useNav } from "@/context/NavContext";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";

export function Sidebar() {
  const { role } = useAuth();
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useNav();
  const groups = getNavigationGroups(role);

  if (!role) return null;

  return (
    <TooltipProvider delay={100}>
      <aside 
        style={{ width: "var(--sidebar-width)" }}
        className="h-full border-r border-sidebar-border bg-sidebar flex flex-col flex-shrink-0 transition-[width] duration-premium ease-premium z-20"
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center px-4 border-b border-sidebar-border overflow-hidden whitespace-nowrap">
          <Link href="/" className="flex items-center space-x-3 transition-opacity hover:opacity-90 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary text-white shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <span className="text-[19px] font-bold tracking-tight text-white animate-in fade-in slide-in-from-left-2 duration-300">
                Onscreen Eval
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 space-y-7 custom-scrollbar">
          {groups.map((group) => (
            <div key={group.title} className="px-3 space-y-1">
              {!isCollapsed && (
                <h3 className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/30 mb-3 ml-1 animate-in fade-in duration-300">
                  {group.title}
                </h3>
              )}
              <nav className="space-y-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  
                  const NavItem = (
                    <Link
                      key={link.name}
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      aria-label={link.name}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-all group relative whitespace-nowrap",
                        isActive 
                          ? "bg-sidebar-accent text-white" 
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      )}
                      <Icon className={cn(
                        "h-5 w-5 shrink-0 transition-colors", 
                        isActive ? "text-primary" : "text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60"
                      )} />
                      {!isCollapsed && (
                        <span className="animate-in fade-in slide-in-from-left-1 duration-300">
                          {link.name}
                        </span>
                      )}
                    </Link>
                  );

                  if (isCollapsed) {
                    return (
                      <Tooltip key={link.name}>
                        <TooltipTrigger render={NavItem} />
                        <TooltipContent side="right">
                          {link.name}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return NavItem;
                })}
              </nav>
            </div>
          ))}
        </div>
        
        {/* Footer info & Toggle */}
        <div className="p-4 border-t border-sidebar-border/50 space-y-4">
          {!isCollapsed && (
            <div className="rounded-md border border-sidebar-border/50 bg-sidebar-accent/30 p-3 animate-in fade-in duration-300">
              <p className="text-[9px] font-bold text-sidebar-foreground/30 mb-1 uppercase tracking-widest">System</p>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-sidebar-foreground/80">v1.2.0</p>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </div>
            </div>
          )}
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-full flex items-center justify-center p-2 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground/40 hover:text-white transition-colors border border-transparent hover:border-sidebar-border/30"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : (
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest">
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
