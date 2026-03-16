"use client";

import ResultsTable from "@/components/dashboard/ResultsTable";
import { supabase } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminResultsPage() {
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">Evaluation Results</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Monitor evaluator performance, release final marks to students, and download marklists.
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground animate-pulse font-medium italic">
          Fetching evaluation records...
        </div>
      ) : (
        <ResultsTable scripts={scripts} onToggleRelease={handleToggleRelease} />
      )}
    </div>
  );
}
