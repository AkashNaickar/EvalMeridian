"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Search, Settings, ArrowRight, Loader2, AlertTriangle, RefreshCcw, Layers } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { ExamSession } from "@/types/operations";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SessionCard } from "@/components/shared/SessionCard";

export default function OperationsDashboard() {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [sessionStats, setSessionStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [resettingSession, setResettingSession] = useState<string | null>(null);
  
  const fetchSessions = async () => {
    setLoading(true);
    const { data: sessionData, error } = await supabase
      .from("exam_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load operations sessions");
    } else if (sessionData) {
      setSessions(sessionData as ExamSession[]);
      
      const statsMap: Record<string, any> = {};
      await Promise.all(sessionData.map(async (session) => {
        const { data: scriptStats, error: statsError } = await supabase
          .from("scripts")
          .select("mapping_status, status, student_id")
          .eq("exam_session_id", session.id);
          
        if (!statsError && scriptStats) {
          statsMap[session.id] = {
            totalScripts: scriptStats.length,
            mappedScripts: scriptStats.filter((s: any) => s.mapping_status === 'mapped' || s.student_id).length,
            evaluatedScripts: scriptStats.filter((s: any) => s.status === 'evaluated').length,
          };
        }
      }));
      setSessionStats(statsMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleResetSession = async (sessionId: string) => {
    setResettingSession(sessionId);
    try {
      const { data: scripts, error: scriptsError } = await supabase
        .from("scripts")
        .select("file_path")
        .eq("exam_session_id", sessionId);

      if (scriptsError) throw scriptsError;

      if (scripts && scripts.length > 0) {
        const filePaths = scripts.map(s => s.file_path).filter(Boolean) as string[];
        if (filePaths.length > 0) {
          await supabase.storage.from("eval_documents").remove(filePaths);
        }
      }

      const { error: deleteError } = await supabase
        .from("exam_sessions")
        .delete()
        .eq("id", sessionId);

      if (deleteError) throw deleteError;
      
      toast.success("Exam session and associated scripts have been completely reset.");
      fetchSessions();
      
    } catch (error: any) {
      toast.error(`Reset failed: ${error.message}`);
    } finally {
      setResettingSession(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Active Sessions</h2>
          <p className="text-sm text-slate-500 mt-1">
            Orchestrate examination lifecycles and monitor progress.
          </p>
        </div>
        <Link href="/admin/operations/new">
          <Button className="font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm ring-1 ring-blue-700 transition-all">
            <Plus className="mr-2 h-4 w-4" /> Create Session
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="border-dashed shadow-sm text-center py-20 bg-slate-50/50">
          <CardContent>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
              <Layers className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No sessions initiated</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto mb-8">
              Initiate a new exam session to begin importing rosters and script batches.
            </p>
            <Link href="/admin/operations/new">
              <Button variant="outline" className="font-bold">Create First Session</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <SessionCard 
              key={session.id} 
              session={session} 
              onReset={(id) => setResettingSession(id)}
              stats={sessionStats[session.id]}
            />
          ))}
        </div>
      )}


      {/* Reset Confirmation Dialog */}
      <Dialog open={!!resettingSession} onOpenChange={(open) => !open && setResettingSession(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Reset Exam Session
            </DialogTitle>
            <DialogDescription className="py-2">
              Are you absolute sure you want to reset this session? 
              <br /><br />
              <span className="font-bold text-foreground">Warning:</span> This will permanently delete all script PDFs from storage, remove all script rows, and wipe batch histories for this session via Supabase API. Roster (Students) will be kept intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setResettingSession(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => resettingSession && handleResetSession(resettingSession)} className="font-bold">
              Purge Session Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
