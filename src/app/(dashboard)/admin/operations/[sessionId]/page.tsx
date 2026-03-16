"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { ExamSession } from "@/types/operations";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Users, UploadCloud, Link as LinkIcon, BarChart3, Settings } from "lucide-react";
import Link from "next/link";
// We will import panels here later
import { StudentImportPanel } from "@/components/admin/StudentImportPanel";
import { BatchUploadPanel } from "@/components/admin/BatchUploadPanel";
import { MappingRunner } from "@/components/admin/MappingRunner";
import { UnmappedScriptsTable } from "@/components/admin/UnmappedScriptsTable";
import { MonitoringPanel } from "@/components/admin/MonitoringPanel";
import { AssignmentPanel } from "@/components/admin/AssignmentPanel";
import { UnmappedScript } from "@/types/roster";

export default function SessionOperationsManager() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [session, setSession] = useState<ExamSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("roster");
  const [unmappedScripts, setUnmappedScripts] = useState<UnmappedScript[]>([]);

  const fetchSession = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();
      
    if (error || !data) {
      toast.error("Failed to load exam session.");
      router.push("/admin/operations");
    } else {
      setSession(data);
    }
    setLoading(false);
  };

  const fetchUnmapped = async () => {
    const { data } = await supabase
      .from("scripts")
      .select("id, file_url, roll_number, mapping_status, status, created_at, student_id")
      .eq("exam_session_id", sessionId)
      .or("student_id.is.null,mapping_status.in.(unmapped,ambiguous,mapping_error)")
      .order("created_at", { ascending: false });

    if (data) setUnmappedScripts(data as UnmappedScript[]);
  };

  useEffect(() => {
    if (sessionId) {
      fetchSession();
      fetchUnmapped();
      
      const channel = supabase
        .channel(`session-${sessionId}-scripts`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'scripts',
            filter: `exam_session_id=eq.${sessionId}`
          },
          () => fetchUnmapped()
        )
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
    }
  }, [sessionId]);

  const updateSessionStatus = async (newStatus: string) => {
    try {
       const { error } = await supabase.from("exam_sessions").update({ status: newStatus }).eq("id", sessionId);
       if (error) throw error;
       toast.success(`Session moved to: ${newStatus}`);
       fetchSession();
    } catch(err: any) {
       toast.error(`Failed to update status: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{session.name}</h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold px-3">
              {session.status}
            </Badge>
          </div>
          <p className="text-sm font-medium text-slate-500">
            {session.academic_year} • {session.semester || 'S2'} ({session.exam_type || 'Main Exam'})
          </p>
        </div>
        
        {session.status === 'Setup' && (
          <Button 
            onClick={() => updateSessionStatus('Ready for Evaluation')} 
            className="font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm ring-1 ring-blue-700 transition-all px-6"
          >
            Advance to Evaluation <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex h-12 w-full items-center justify-start gap-4 bg-transparent p-0 border-b rounded-none mb-8">
          <TabsTrigger value="roster" className="relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-semibold text-slate-500 transition-none data-[state=active]:border-b-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none hover:text-slate-900">
             1. Roster Setup
          </TabsTrigger>
          <TabsTrigger value="batches" className="relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-semibold text-slate-500 transition-none data-[state=active]:border-b-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none hover:text-slate-900">
             2. Script Uploads
          </TabsTrigger>
          <TabsTrigger value="mapping" className="relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-semibold text-slate-500 transition-none data-[state=active]:border-b-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none hover:text-slate-900">
             3. Reconciliation
          </TabsTrigger>
          <TabsTrigger value="monitor" className="relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-semibold text-slate-500 transition-none data-[state=active]:border-b-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none hover:text-slate-900">
             4. Monitor & Assign
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-8">
          <TabsContent value="roster" className="space-y-6">
            <div className="grid gap-6">
              <StudentImportPanel />
              {/* Note: In a fully separated real-world app, we might limit this panel to the specific session or just use the global master roster. For this college system, the master roster is usually universal per term. */}
            </div>
          </TabsContent>
          
          <TabsContent value="batches">
            <BatchUploadPanel sessionId={sessionId} onSuccess={fetchUnmapped} />
          </TabsContent>
          
          <TabsContent value="mapping">
            <div className="grid gap-6">
               <MappingRunner unmappedCount={unmappedScripts.length} sessionId={sessionId} onSuccess={fetchUnmapped} />
               <UnmappedScriptsTable scripts={unmappedScripts} />
            </div>
          </TabsContent>

          <TabsContent value="monitor" className="space-y-6">
            <MonitoringPanel sessionId={sessionId} />
            <AssignmentPanel sessionId={sessionId} />
          </TabsContent>
        </div>
      </Tabs>
      
    </div>
  );
}

const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
)
