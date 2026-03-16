"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

interface AssignmentPanelProps {
  sessionId: string;
}

export function AssignmentPanel({ sessionId }: AssignmentPanelProps) {
  const [evaluators, setEvaluators] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedEvaluator, setSelectedEvaluator] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [evaluatorsRes, batchesRes] = await Promise.all([
      supabase.from("profiles").select("id, name, email").eq("role", "evaluator"),
      supabase.from("script_batches").select("id, batch_code, total_scripts").eq("exam_session_id", sessionId)
    ]);

    if (evaluatorsRes.data) setEvaluators(evaluatorsRes.data);
    if (batchesRes.data) setBatches(batchesRes.data);
    setLoading(false);
  };

  useEffect(() => {
    if (sessionId) {
      fetchData();
    }
  }, [sessionId]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvaluator || !selectedBatch) {
      toast.error("Please select both a batch and an evaluator.");
      return;
    }

    setIsAssigning(true);
    try {
       // 1. Fetch unassigned, mapped scripts in this batch
       const { data: scriptsToAssign, error: fetchErr } = await supabase
         .from("scripts")
         .select("id")
         .eq("batch_id", selectedBatch)
         .is("evaluator_id", null)
         .or("student_id.not.is.null,mapping_status.in.(mapped,manually_mapped)");

       if (fetchErr) throw fetchErr;

       if (!scriptsToAssign || scriptsToAssign.length === 0) {
         toast.info("No unassigned, mapped scripts found in this batch. Make sure mapping is complete.");
         setIsAssigning(false);
         return;
       }

       const scriptIds = scriptsToAssign.map(s => s.id);

       // 2. Perform the assignment
       const { error: updateErr } = await supabase
         .from("scripts")
         .update({ evaluator_id: selectedEvaluator })
         .in("id", scriptIds);

       if (updateErr) throw updateErr;

       toast.success(`Successfully assigned ${scriptIds.length} scripts to the evaluator.`);
       
       setSelectedBatch("");
       setSelectedEvaluator("");
       
    } catch (err: any) {
      toast.error(`Assignment failed: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="shadow-sm border-muted/60 mt-6">
      <form onSubmit={handleAssign}>
        <CardHeader className="bg-muted/30 pb-4 border-b">
           <CardTitle className="text-xl flex items-center gap-2">
             <UserPlus className="h-5 w-5 text-primary" />
             Release for Evaluation
           </CardTitle>
           <CardDescription>
             Assign fully mapped script batches to evaluators. Only scripts with confirmed student identities will be released (though evaluators will only see the anonymous code).
           </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="batch">Select Batch</Label>
              <Select value={selectedBatch} onValueChange={(val) => setSelectedBatch(val || "")}>
                <SelectTrigger id="batch" className="bg-muted/50">
                  <SelectValue placeholder="Select a batch">
                    {selectedBatch ? batches.find(b => b.id === selectedBatch)?.batch_code : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {batches.length === 0 ? (
                     <SelectItem value="none" disabled>No batches found</SelectItem>
                  ) : (
                     batches.map((batch) => (
                       <SelectItem key={batch.id} value={batch.id}>
                         {batch.batch_code} ({batch.total_scripts} scripts)
                       </SelectItem>
                     ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="evaluator">Assign to Evaluator</Label>
              <Select value={selectedEvaluator} onValueChange={(val) => setSelectedEvaluator(val || "")}>
                <SelectTrigger id="evaluator" className="bg-muted/50">
                  <SelectValue placeholder="Select an evaluator">
                     {selectedEvaluator ? (() => {
                        const ev = evaluators.find(e => e.id === selectedEvaluator);
                        return ev ? `${ev.name || 'Unnamed'} (${ev.email})` : selectedEvaluator;
                     })() : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {evaluators.length === 0 ? (
                     <SelectItem value="none" disabled>No evaluators found</SelectItem>
                  ) : (
                     evaluators.map((ev) => (
                       <SelectItem key={ev.id} value={ev.id}>
                         {ev.name || 'Unnamed'} ({ev.email})
                       </SelectItem>
                     ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/5 border-t p-4 flex justify-end">
          <Button type="submit" disabled={isAssigning || !selectedBatch || !selectedEvaluator} className="font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm ring-1 ring-blue-700 transition-all px-8 border-none">
            {isAssigning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Assigning...</> : <><UserPlus className="mr-2 h-4 w-4"/> Allocate Batch</>}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
