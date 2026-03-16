"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertCircle, Link as LinkIcon, AlertTriangle, UserCheck } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { UnmappedScript } from "@/types/roster";
import { useRouter } from "next/navigation";
import { normalizeRollNumber } from "@/utils/studentMapping";

import { DataTable } from "@/components/shared/DataTable";

interface Props {
  scripts: UnmappedScript[];
}

export function UnmappedScriptsTable({ scripts }: Props) {
  const router = useRouter();
  const [isLinking, setIsLinking] = useState(false);

  const handleManualLink = async (scriptId: string) => {
    const newRoll = prompt("MANUAL OVERRIDE\nEnter the exact roll_number to permanently link this script to a student:");
    if (!newRoll?.trim()) return;

    setIsLinking(true);
    try {
      const { data: student } = await supabase
        .from("students")
        .select("id, name")
        .eq("roll_number", normalizeRollNumber(newRoll))
        .single();
      
      if (!student) {
        toast.error(`Student with roll number "${newRoll.trim()}" not found in master roster.`);
        return;
      }

      const confirmed = window.confirm(`Found Student: ${student.name}.\n\nAre you sure you want to map this script to them? This action creates an audit trail.`);
      if (!confirmed) return;

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("scripts")
        .update({ 
          student_id: student.id, 
          roll_number: normalizeRollNumber(newRoll),
          mapping_status: 'manually_mapped',
          mapped_at: new Date().toISOString(),
          mapped_by: user?.id,
          mapping_source: 'admin_manual_override'
        })
        .eq("id", scriptId);

      if (error) throw error;
      
      toast.success("Script manually linked and audited.");
      router.refresh();

    } catch (err: any) {
      toast.error(`Manual link failed: ${err.message}`);
    } finally {
      setIsLinking(false);
    }
  };

  const columns = [
    {
      header: "Script ID",
      accessorKey: "id",
      cell: (script: UnmappedScript) => (
        <span className="font-mono text-[11px] font-bold text-blue-600">
          {script.id.substring(0, 8)}
        </span>
      ),
    },
    {
      header: "Captured Roll No.",
      accessorKey: "roll_number",
      cell: (script: UnmappedScript) => (
        script.roll_number ? (
          <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
            {script.roll_number}
          </span>
        ) : (
          <div className="flex items-center gap-1 text-red-500 font-bold text-[10px] uppercase">
            <AlertTriangle className="h-3 w-3" /> missing
          </div>
        )
      ),
    },
    {
      header: "Mapping Status",
      accessorKey: "mapping_status",
      cell: (script: UnmappedScript) => (
        script.mapping_status === 'mapping_error' 
          ? <Badge variant="destructive" className="text-[10px] py-0 h-4">Error</Badge>
          : script.mapping_status === 'ambiguous'
          ? <Badge variant="outline" className="text-[10px] py-0 h-4 text-amber-600 border-amber-200 bg-amber-50">Ambiguous</Badge>
          : <Badge variant="secondary" className="text-[10px] py-0 h-4">Unmapped</Badge>
      ),
    },
    {
      header: "Upload Date",
      accessorKey: "created_at",
      cell: (script: UnmappedScript) => (
        <span className="text-slate-500">{new Date(script.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      header: "Action",
      accessorKey: "actions",
      className: "text-right",
      cell: (script: UnmappedScript) => (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => handleManualLink(script.id)} 
          disabled={isLinking}
          className="h-7 text-[10px] font-bold shadow-xs hover:bg-slate-900 hover:text-white transition-all"
        >
          <LinkIcon className="h-3 w-3 mr-1" /> Force Link
        </Button>
      ),
    },
  ];

  return (
    <Card className="shadow-sm border-slate-200 overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b py-4 px-6 text-2xl font-bold tracking-tight text-slate-900 border-none bg-none">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Reconciliation Needed
            </CardTitle>
            <CardDescription className="text-xs">
              Manual intervention required for {scripts.length} scripts.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable 
          data={scripts} 
          columns={columns} 
          emptyMessage="All scripts successfully mapped."
          className="border-none shadow-none rounded-none"
        />
      </CardContent>
    </Card>
  );
}
