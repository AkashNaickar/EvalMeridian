"use client";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, AlertCircle, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function StudentResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchResults() {
      try {
        // RLS ensures that the student can only query their own master student record
        const { data: studentRecord } = await supabase
          .from("students")
          .select("id")
          .single();

        if (studentRecord) {
          // RLS ensures that 'scripts' only returns entries where student_id matches AND is_released is true
          const { data: scripts, error } = await supabase
            .from("scripts")
            .select(`
              id,
              total_marks,
              comments,
              exams (
                name,
                subject
              )
            `)
            .eq("student_id", studentRecord.id)
            .eq("is_released", true);

          if (error) throw error;
          setResults(scripts || []);
        }
      } catch (error) {
        console.error("Error fetching results:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchResults();
  }, []);

  const filteredResults = results.filter(r => 
    r.exams?.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.exams?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container-admin py-8 space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-page-title">Academic records</h1>
          <p className="text-body-text mt-1.5 font-medium">View your officially released evaluation results and transcripts.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted/60" />
          <Input 
            placeholder="Search by subject..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary/20"
          />
        </div>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full rounded-md bg-secondary/20" />
            ))}
          </div>
        ) : filteredResults.length === 0 ? (
          <Card className="border-border/50 bg-secondary/5 py-16 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center mb-4">
              <Info className="h-6 w-6 text-text-muted/40" />
            </div>
            <h3 className="text-section-title">No records found</h3>
            <p className="text-caption mt-2 max-w-[240px] font-medium">
              Scripts are currently being evaluated. Check back later for official releases.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredResults.map((result) => (
              <Card key={result.id} className="border-border/50 shadow-premium hover:border-primary/20 transition-all duration-300 overflow-hidden group">
                <div className="flex flex-col sm:flex-row sm:items-center p-6 gap-6">
                  {/* Subject & Mark badge */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">
                        {result.exams?.subject || "general"}
                      </Badge>
                      <span className="text-mono-code text-text-muted opacity-60">ID: {result.id.slice(0, 8)}</span>
                    </div>
                    <h3 className="text-section-title group-hover:text-primary transition-colors">
                      {result.exams?.name || "Exam attempt"}
                    </h3>
                  </div>

                  <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l pt-6 sm:pt-0 sm:pl-8 border-border/10">
                    <div className="text-center sm:text-right">
                      <p className="text-[10px] uppercase font-bold text-text-muted mb-1 tracking-[0.1em]">Total score</p>
                      <div className="flex items-baseline justify-center sm:justify-end gap-1.5">
                        <span className="text-metric-value">{result.total_marks || 0}</span>
                        <span className="text-sm font-bold text-text-muted self-end mb-1.5">/ 100</span>
                      </div>
                    </div>
                  </div>
                </div>

                {result.comments && (
                  <div className="px-6 pb-6 pt-0">
                    <div className="bg-secondary/20 rounded-md p-4 space-y-2 border border-border/5 group-hover:bg-secondary/30 transition-colors">
                      <p className="text-caption text-text-secondary leading-relaxed font-semibold italic">
                        "{result.comments}"
                      </p>
                      <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">— Official feedback</p>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Security Protocol */}
      <div className="bg-sidebar rounded-lg p-6 flex gap-4 border border-sidebar-border shadow-lg">
        <div className="h-8 w-8 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
          <AlertCircle className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="space-y-1">
          <p className="text-label-text text-white font-bold uppercase tracking-widest">Protocol security</p>
          <p className="text-[11px] text-sidebar-foreground/60 leading-relaxed font-medium">
            This workspace is protected by endpoint encryption and high-confidence Row Level Security (RLS). 
            Access is restricted to authorized credentials only. Unauthorized access attempts are logged.
          </p>
        </div>
      </div>
    </div>
  );
}
