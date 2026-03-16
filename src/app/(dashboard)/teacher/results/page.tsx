"use client";

import ResultsTable from "@/components/dashboard/ResultsTable";
import { supabase } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function TeacherResultsPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("scripts")
          .select(`
            id,
            status,
            total_marks,
            comments,
            is_released,
            exams (
              subject
            )
          `)
          .eq("status", "evaluated")
          .order("updated_at", { ascending: false });

        if (error) throw error;

        // Transform for the ResultsTable
        const formattedScripts = data?.map(s => ({
          id: s.id,
          status: 'Completed',
          subject: Array.isArray(s.exams) ? s.exams[0]?.subject : (s.exams as any)?.subject || 'Unknown',
          totalMarks: s.total_marks,
          comments: s.comments,
          isReleased: s.is_released
        })) || [];

        setScripts(formattedScripts);
      } catch (error: any) {
        toast.error(`Error loading results: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
    fetchResults();
  }, []);

  const handleToggleRelease = async (id: string, isReleased: boolean) => {
    try {
      const { error } = await supabase
        .from("scripts")
        .update({ is_released: isReleased })
        .eq("id", id);

      if (error) throw error;

      setScripts(prev => prev.map(s => s.id === id ? { ...s, isReleased } : s));
      toast.success(isReleased ? "Results released to student" : "Results retracted");
    } catch (error: any) {
      toast.error(`Failed to update release status: ${error.message}`);
    }
  };

  return (
    <div className="container-admin py-8 space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div>
        <h1 className="text-page-title">Archive & releases</h1>
        <p className="text-body-text mt-1.5 font-medium">
          Verify evaluation results and manage official release protocol for assigned subjects.
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4 text-text-muted border border-border/50 rounded-lg bg-secondary/5">
          <Loader2 className="h-6 w-6 animate-spin opacity-40" />
          <p className="text-caption font-bold uppercase tracking-widest opacity-60">Fetching evaluation records...</p>
        </div>
      ) : (
        <div className="border border-border/50 rounded-lg overflow-hidden shadow-premium">
           <ResultsTable scripts={scripts} onToggleRelease={handleToggleRelease} />
        </div>
      )}
    </div>
  );
}
