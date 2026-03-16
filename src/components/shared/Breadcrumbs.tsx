"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const routeLabels: Record<string, string> = {
  admin: "Admin",
  operations: "Operations",
  students: "Students",
  exams: "Exams",
  assign: "Assign Scripts",
  scripts: "Scripts Inventory",
  results: "Results",
  settings: "Settings",
  teacher: "Teacher",
  resources: "Resources",
  courses: "Courses",
  assessments: "Assessments",
  evaluator: "Evaluator",
  pending: "Pending Evaluations",
  history: "History",
  canvas: "Canvas",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center space-x-1 text-xs font-medium text-slate-500">
      <Link
        href="/"
        className="flex items-center hover:text-slate-900 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const label = routeLabels[segment] || segment;

        // Skip UUIDs or dynamic IDs from labels if possible, or show truncated
        const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
        const displayLabel = isId ? `ID: ${segment.slice(0, 8)}...` : label;

        return (
          <div key={href} className="flex items-center space-x-1">
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            {isLast ? (
              <span className="text-slate-900 font-semibold">{displayLabel}</span>
            ) : (
              <Link
                href={href}
                className="hover:text-slate-900 transition-colors"
              >
                {displayLabel}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
