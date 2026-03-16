"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { UnmappedScript } from "@/types/roster";
import { StudentImportPanel } from "@/components/admin/StudentImportPanel";
import { MappingRunner } from "@/components/admin/MappingRunner";
import { UnmappedScriptsTable } from "@/components/admin/UnmappedScriptsTable";

export default function StudentsPage() {
  const [unmappedScripts, setUnmappedScripts] = useState<UnmappedScript[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnmapped = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("scripts")
      .select("id, file_url, roll_number, mapping_status, status, created_at")
      .in("mapping_status", ["unmapped", "mapping_error", "ambiguous"])
      .order("created_at", { ascending: false });

    if (data) setUnmappedScripts(data as UnmappedScript[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchUnmapped();

    // Listen to changes in the scripts table (like from MappingRunner)
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scripts',
        },
        () => fetchUnmapped()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Manage Exams</h2>
        <p className="text-muted-foreground mt-1">
          Import verified rosters, execute strict automated mapping, and enforce blind evaluation.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <StudentImportPanel />
        <MappingRunner unmappedCount={unmappedScripts.length} />
      </div>

      <UnmappedScriptsTable scripts={unmappedScripts} />
    </div>
  );
}
