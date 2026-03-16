"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface NavContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (value: boolean) => void;
  isHydrated: boolean;
}

const NavContext = createContext<NavContextType | undefined>(undefined);

export function NavProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Persistence: Hydrate from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem("ls-sidebar-collapsed");
    if (savedState === "true") {
      setIsCollapsed(true);
    }
    setIsHydrated(true);
  }, []);

  const toggleCollapsed = (value: boolean) => {
    setIsCollapsed(value);
    localStorage.setItem("ls-sidebar-collapsed", String(value));
  };

  // Close mobile drawer on resize to desktop (breakpoint 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <NavContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed: toggleCollapsed,
        isMobileOpen,
        setIsMobileOpen,
        isHydrated,
      }}
    >
      <div 
        style={{ 
          "--sidebar-width": isCollapsed ? "72px" : "256px",
          "--sidebar-transition": "250ms cubic-bezier(0.4, 0, 0.2, 1)"
        } as React.CSSProperties}
        className="contents"
      >
        {children}
      </div>
    </NavContext.Provider>
  );
}

export function useNav() {
  const context = useContext(NavContext);
  if (context === undefined) {
    throw new Error("useNav must be used within a NavProvider");
  }
  return context;
}
