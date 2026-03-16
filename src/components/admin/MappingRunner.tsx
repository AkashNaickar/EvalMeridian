"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Link as LinkIcon, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { MappingRunnerSummary } from "@/types/roster";
import { useRouter } from "next/navigation";
import { extractRollNumber, normalizeRollNumber } from "@/utils/studentMapping";

interface MappingRunnerProps {
  unmappedCount: number;
  sessionId?: string;
  onSuccess?: () => void;
}

export function MappingRunner({ unmappedCount, sessionId, onSuccess }: MappingRunnerProps) {
  const router = useRouter();
  const [isMapping, setIsMapping] = useState(false);
  const [summary, setSummary] = useState<MappingRunnerSummary | null>(null);

  const runReconciliation = async () => {
    setIsMapping(true);
    setSummary(null);
    
    try {
      // 1. Fetch scripts that need mapping
      let query = supabase
        .from("scripts")
        .select("id, roll_number, file_path, original_filename")
        .or("student_id.is.null,mapping_status.in.(unmapped,ambiguous,mapping_error)");

      if (sessionId) {
        query = query.eq("exam_session_id", sessionId);
      }

      const { data: scripts, error: fetchErr } = await query;

      if (fetchErr) throw fetchErr;

      if (!scripts || scripts.length === 0) {
        toast.info("No unmapped scripts found.");
        setIsMapping(false);
        return;
      }

      // 2. Safely extract roll number from original filename or file path
      const scriptsWithIntent = scripts.map(script => {
         const sourceName = script.original_filename || (script.file_path ? script.file_path.split('/').pop() : "");
         let intendedRoll = script.roll_number || "";
         
         if (sourceName) {
            const extracted = extractRollNumber(sourceName);
            if (extracted) {
              intendedRoll = extracted;
            }
         }
         return { ...script, intendedRoll };
      });

      const rollNumbers = Array.from(new Set(scriptsWithIntent.map(s => s.intendedRoll).filter(Boolean)));

      if (rollNumbers.length === 0) {
        toast.info("No valid roll numbers could be extracted from these scripts.");
        setIsMapping(false);
        return;
      }

      // 3. Fetch students matching these extracted roll numbers
      const { data: students, error: studentErr } = await supabase
        .from("students")
        .select("id, roll_number")
        .in("roll_number", rollNumbers);

      if (studentErr) throw studentErr;

      const studentMap = new Map<string, string>();
      students?.forEach(s => {
        studentMap.set(normalizeRollNumber(s.roll_number), s.id);
      });

      let mapped = 0;
      let unmapped = 0;
      let ambiguous = 0;
      let errors = 0;
      
      const { data: { user } } = await supabase.auth.getUser();

      // 4. Update scripts
      const promises = scriptsWithIntent.map(async (script) => {
        let rollToMatch = script.intendedRoll;
        
        if (rollToMatch) {
          const studentId = studentMap.get(rollToMatch);
          
          if (studentId) {
            // Exact match
            const { error } = await supabase
              .from("scripts")
              .update({ 
                 student_id: studentId, 
                 roll_number: rollToMatch, // strictly persist the normalized extracted one
                 mapping_status: 'mapped',
                 mapped_at: new Date().toISOString(),
                 mapped_by: user?.id,
                 mapping_source: 'auto_runner'
              })
              .eq("id", script.id); // script.id is ONLY used as the row identifier for the UPDATE query
              
            if (error) errors++;
            else mapped++;
            return;
          }
        }
        
        // No match found in the database.
        unmapped++;
      });

      await Promise.all(promises);

      setSummary({ mapped, unmapped, ambiguous, errors });
      
      if (mapped > 0) {
        toast.success(`Mapping complete! Mapped ${mapped} scripts.`);
        router.refresh(); // Refresh page data
        if (onSuccess) onSuccess();
      } else if (unmapped > 0) {
        toast.warning(`No matches found. ${unmapped} scripts remain unmapped.`);
      }

    } catch (err: any) {
      toast.error(`Mapping runner failed: ${err.message}`);
    } finally {
      setIsMapping(false);
    }
  };

  return (
    <Card className="shadow-sm border-muted/60">
      <CardHeader className="bg-muted/30">
        <CardTitle className="text-xl">Automated Mapping</CardTitle>
        <CardDescription>Link scripts to imported students using file roll numbers.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 flex flex-col items-center justify-center space-y-6">
        <div className="text-center space-y-2">
          <Badge variant={unmappedCount > 0 ? "destructive" : "secondary"} className="text-sm px-3 py-1 mb-2">
            {unmappedCount} Unmapped Scripts
          </Badge>
          <p className="text-sm text-muted-foreground w-full max-w-sm leading-snug">
            This agent matches uploaded script roll numbers against the verified master roster. Scripts that cannot be mapped will be sent to manual reconciliation.
          </p>
        </div>

        {summary && (
          <div className="w-full bg-slate-50 border p-4 rounded-lg space-y-2 text-sm animate-in fade-in slide-in-from-top-4">
             <div className="flex justify-between items-center pb-2 border-b">
               <span className="font-semibold text-slate-700">Last Run Results</span>
             </div>
             <div className="grid grid-cols-2 gap-2 pt-1">
               <div className="flex justify-between"><span className="text-muted-foreground">Mapped:</span> <span className="font-mono font-bold text-green-600">{summary.mapped}</span></div>
               <div className="flex justify-between"><span className="text-muted-foreground">Unmapped:</span> <span className="font-mono font-bold text-amber-600">{summary.unmapped}</span></div>
               <div className="flex justify-between"><span className="text-muted-foreground">Ambiguous:</span> <span className="font-mono font-bold">{summary.ambiguous}</span></div>
               <div className="flex justify-between"><span className="text-muted-foreground">Errors:</span> <span className="font-mono font-bold text-red-600">{summary.errors}</span></div>
             </div>
          </div>
        )}

        <Button 
          onClick={runReconciliation} 
          disabled={isMapping || unmappedCount === 0} 
          className="w-full font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm ring-1 ring-blue-700 transition-all h-12 border-none"
        >
          {isMapping ? (
            <><RefreshCw className="mr-2 h-5 w-5 animate-spin"/> Running Engine...</>
          ) : (
            <><LinkIcon className="mr-2 h-5 w-5"/> Run Mapping Engine</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
