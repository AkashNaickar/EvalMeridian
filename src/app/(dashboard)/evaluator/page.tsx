"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EvaluatorDashboard() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchScripts() {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Fetch scripts assigned to this evaluator, joining the exams table for the subject
        const { data, error } = await supabase
          .from("scripts")
          .select(`
            id,
            status,
            anonymous_code,
            exams (
              subject
            )
          `)
          .eq("evaluator_id", session.user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        // Transform the nested exam data for the UI
        const formattedScripts = data?.map(s => ({
          id: s.id,
          status: s.status === 'pending' ? 'pending' : 'completed',
          anonymous_code: s.anonymous_code || `ANON-${s.id.substring(0,8).toUpperCase()}`,
          subject: Array.isArray(s.exams) ? s.exams[0]?.subject : (s.exams as any)?.subject || 'Unknown' 
        })) || [];

        setScripts(formattedScripts);
      } catch (error: any) {
        toast.error(`Error loading scripts: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchScripts();
  }, []);

  return (
    <div className="container-admin py-8 space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div>
        <h1 className="text-page-title">Overview</h1>
        <p className="text-body-text mt-1.5 font-medium">Review and score student submissions assigned to your workstation.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover-lift hover:border-primary/20 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-secondary/10">
            <CardTitle className="text-label-text text-text-muted font-bold tracking-tight uppercase">Pending markings</CardTitle>
            <Play className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-metric-value">
              {isLoading ? "..." : scripts.filter((s) => s.status === "pending").length}
            </div>
            <p className="text-caption mt-2 font-semibold text-text-muted">Requires immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Worklist */}
      <div className="space-y-4">
        <h2 className="text-section-title px-1">Assigned scripts</h2>
        <Card className="border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Script identifier</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Operation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-text-muted italic">
                    Loading workstation data...
                  </TableCell>
                </TableRow>
              ) : scripts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-text-muted italic">
                    No scripts currently assigned to this account.
                  </TableCell>
                </TableRow>
              ) : (
                scripts.map((script) => (
                  <TableRow key={script.id}>
                    <TableCell>
                       <span className="text-mono-code font-bold text-text-primary px-2 py-1 bg-secondary/50 rounded border border-border/50">
                         {script.anonymous_code}
                       </span>
                    </TableCell>
                    <TableCell className="font-semibold text-text-primary">
                      {script.subject}
                    </TableCell>
                    <TableCell>
                      <Badge variant={script.status === "completed" ? "success" : "warning"}>
                        {script.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/evaluator/canvas/${script.id}`}>
                        <Button 
                          variant={script.status === "pending" ? "default" : "outline"} 
                          size="sm" 
                          className="font-bold"
                        >
                          {script.status === "pending" ? (
                            <><Play className="mr-2 h-3.5 w-3.5" /> Evaluate</>
                          ) : "Review"}
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
