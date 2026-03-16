"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { Loader2, TrendingUp, Users, CheckCircle, FileText, BarChart } from "lucide-react";

interface MonitoringPanelProps {
  sessionId: string;
}

interface Metrics {
  total: number;
  mapped: number;
  unmapped: number;
  assigned: number;
  evaluated: number;
  completionPercent: number;
}

export function MonitoringPanel({ sessionId }: MonitoringPanelProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    
    // Fetch all scripts for this session to calculate metrics
    const { data: scripts, error } = await supabase
      .from("scripts")
      .select("mapping_status, status, evaluator_id, student_id")
      .eq("exam_session_id", sessionId);

    if (error || !scripts) {
      setLoading(false);
      return;
    }

    const total = scripts.length;
    const mapped = scripts.filter((s: any) => s.student_id !== null || ['mapped', 'manually_mapped'].includes(s.mapping_status)).length;
    const unmapped = scripts.filter((s: any) => s.student_id === null || ['unmapped', 'ambiguous', 'mapping_error'].includes(s.mapping_status)).length;
    const assigned = scripts.filter((s: any) => s.evaluator_id !== null).length;
    const evaluated = scripts.filter((s: any) => s.status === 'evaluated').length;
    
    const completionPercent = total > 0 ? Math.round((evaluated / total) * 100) : 0;

    setMetrics({ total, mapped, unmapped, assigned, evaluated, completionPercent });
    setLoading(false);
  };

  useEffect(() => {
    if (sessionId) {
      fetchMetrics();
      
      const channel = supabase
        .channel(`monitor-${sessionId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'scripts', filter: `exam_session_id=eq.${sessionId}` },
          () => fetchMetrics()
        )
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Total Scripts</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-slate-900">{metrics.total}</h3>
                  <span className="text-[10px] font-semibold text-slate-400">Captured</span>
                </div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 italic">
                <FileText className="h-4 w-4 text-slate-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-500">
               <span className="flex h-1.5 w-1.5 rounded-full bg-slate-300" />
               Raw Intake Complete
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "shadow-sm border-slate-200 bg-white overflow-hidden",
          metrics.unmapped > 0 && "ring-1 ring-amber-200"
        )}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Identity Mapped</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-slate-900">{metrics.mapped}</h3>
                  <span className="text-[10px] font-semibold text-slate-400">/ {metrics.total}</span>
                </div>
              </div>
              <div className={cn(
                "p-2 rounded-lg border italic",
                metrics.unmapped > 0 ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"
              )}>
                <Users className={cn("h-4 w-4", metrics.unmapped > 0 ? "text-amber-500" : "text-blue-500")} />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-bold mb-1.5 uppercase tracking-tight">
                <span className={metrics.unmapped > 0 ? "text-amber-600" : "text-slate-500"}>
                  {metrics.unmapped > 0 ? `⚠️ ${metrics.unmapped} Unmapped` : "Success"}
                </span>
                <span className="text-slate-900">{Math.round((metrics.mapped / metrics.total) * 100)}%</span>
              </div>
              <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500", metrics.unmapped > 0 ? "bg-amber-500" : "bg-blue-600")}
                  style={{ width: `${(metrics.mapped / metrics.total) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Allocated</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-slate-900">{metrics.assigned}</h3>
                  <span className="text-[10px] font-semibold text-slate-400">/ {metrics.total}</span>
                </div>
              </div>
              <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100 italic">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-500">
               <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-200" />
               {metrics.total - metrics.assigned} Scripts Pending Allocation
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Graded Scripts</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-slate-900">{metrics.evaluated}</h3>
                  <span className="text-[10px] font-semibold text-slate-400">/ {metrics.assigned || '-'}</span>
                </div>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100 italic">
                <BarChart className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-bold mb-1.5 uppercase tracking-tight">
                <span className="text-slate-500">Completion</span>
                <span className="text-slate-900">{metrics.completionPercent}%</span>
              </div>
              <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                <div 
                  className="h-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${metrics.completionPercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
