"use client";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StudentDashboard() {
  const [stats, setStats] = useState({
    released: 0,
    pending: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Students can only see their OWN record due to RLS
        const { data: studentData } = await supabase
          .from("students")
          .select("id")
          .single();

        if (studentData) {
          const { data: scripts } = await supabase
            .from("scripts")
            .select("is_released, status")
            .eq("student_id", studentData.id);

          const releasedCount = scripts?.filter(s => s.is_released).length || 0;
          const pendingCount = scripts?.filter(s => !s.is_released).length || 0;

          setStats({ released: releasedCount, pending: pendingCount });
        }
      } catch (error) {
        console.error("Error fetching student stats:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="container-admin py-8 space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div>
        <h1 className="text-page-title">Overview</h1>
        <p className="text-body-text mt-1.5 font-medium">Your academic evaluation status and results archive.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:border-primary/20 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-secondary/10">
            <CardTitle className="text-label-text text-text-muted font-bold tracking-tight uppercase">Released results</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-metric-value">{stats.released}</div>
            <p className="text-caption mt-2 font-semibold text-text-muted">Available for review</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/20 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-secondary/10">
            <CardTitle className="text-label-text text-text-muted font-bold tracking-tight uppercase">In progress</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-metric-value">{stats.pending}</div>
            <p className="text-caption mt-2 font-semibold text-text-muted">Under evaluation</p>
          </CardContent>
        </Card>
      </div>

      {/* Institutional Info */}
      <div className="grid gap-8 md:grid-cols-5">
        <div className="md:col-span-3 space-y-4">
          <h2 className="text-section-title px-1">Evaluation information</h2>
          <Card className="border-border/50 bg-secondary/5 p-6 space-y-4">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-md bg-white shadow-sm flex items-center justify-center border border-border/50 shrink-0">
                <FileText className="h-5 w-5 text-text-muted" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-body-text font-bold text-text-primary">Official marklist generation</h3>
                <p className="text-caption text-text-secondary leading-relaxed font-medium">
                  Final marklists are generated after the entire batch evaluation is completed and verified by the Dean's office. 
                  If you notice any discrepancies in the released marks, please contact the controller of examinations.
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-border/10">
               <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Verification status: <span className="text-emerald-600">Active</span></p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
