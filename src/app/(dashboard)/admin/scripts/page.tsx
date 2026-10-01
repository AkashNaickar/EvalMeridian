"use client";

import { useState, useEffect, useCallback } from "react";
import { extractRollNumber, normalizeRollNumber } from "@/utils/studentMapping";
import { supabase } from "@/utils/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { RefreshCcw, Search, Link as LinkIcon, Database, AlertCircle, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function ScriptsInventoryPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMapping, setIsMapping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [manualRollNumber, setManualRollNumber] = useState("");
  const [isReconciling, setIsReconciling] = useState(false);
  const router = useRouter();

  const [storageFilesCount, setStorageFilesCount] = useState<number | null>(null);

  const verifyStorage = async () => {
    try {
      // List all folders (exams) in the bucket
      const { data: exams, error: examsError } = await supabase.storage.from("eval_documents").list();
      if (examsError) throw examsError;

      let totalFiles = 0;
      for (const exam of exams || []) {
        if (!exam.id) continue; // Folder check
        const { data: files } = await supabase.storage.from("eval_documents").list(exam.name);
        totalFiles += (files?.length || 0);
      }
      setStorageFilesCount(totalFiles);
      toast.success(`Storage inspection complete. Found ${totalFiles} physical files.`);
    } catch (error: any) {
      toast.error(`Storage check failed: ${error.message}`);
    }
  };

  const fetchScripts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("scripts")
        .select(`
          id,
          file_url,
          file_path,
          original_filename,
          roll_number,
          mapping_status,
          status,
          created_at,
          student_id,
          exams (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setScripts(data || []);
    } catch (error: any) {
      toast.error(`Failed to load scripts: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  const runMappingEngine = async () => {
    setIsMapping(true);
    try {
      // 1. Fetch all students to match against
      const { data: students } = await supabase.from("students").select("id, roll_number");
      const studentMap = new Map(students?.map(s => [normalizeRollNumber(s.roll_number), s.id]) || []);

      // 2. Filter unmapped scripts
      const unmapped = scripts.filter(s => s.mapping_status === 'unmapped');
      
      if (unmapped.length === 0) {
        toast.info("No new scripts to map.");
        return;
      }

      let mappedCount = 0;
      let errorCount = 0;

      for (const script of unmapped) {
        // ALWAYS extract from file_path or original_filename to ensure accuracy against manual edits
        const sourceName = script.original_filename || (script.file_path ? script.file_path.split('/').pop()! : "");
        const rollToMatch = extractRollNumber(sourceName) || script.roll_number;

        if (!rollToMatch) {
          // Still no roll number, mark as error
          await supabase.from("scripts").update({ mapping_status: 'mapping_error' }).eq("id", script.id);
          errorCount++;
          continue;
        }

        // Exact match with normalized lookup
        const studentId = studentMap.get(normalizeRollNumber(rollToMatch));
        
        if (studentId) {
          const { error } = await supabase
            .from("scripts")
            .update({
              student_id: studentId,
              roll_number: rollToMatch, // Persist the extracted one
              mapping_status: 'mapped',
              mapped_at: new Date().toISOString(),
              mapping_source: 'auto_engine'
            })
            .eq("id", script.id);
          
          if (!error) mappedCount++;
          else errorCount++;
        } else {
          // No student match, but persist the roll number if it was missing
          if (!script.roll_number) {
            await supabase.from("scripts").update({ roll_number: rollToMatch }).eq("id", script.id);
          }
        }
      }

      toast.success(`Mapping complete: ${mappedCount} linked, ${errorCount} errors.`);
      router.refresh();
      fetchScripts();
    } catch (error: any) {
      toast.error(`Mapping engine failed: ${error.message}`);
    } finally {
      setIsMapping(false);
    }
  };

  const handleManualMapping = async () => {
    if (!selectedScript || !manualRollNumber) return;
    setIsReconciling(true);
    
    try {
      // Verify student exists
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("roll_number", normalizeRollNumber(manualRollNumber))
        .single();

      if (studentError || !student) {
        toast.error("Student with this roll number not found.");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("scripts")
        .update({
          student_id: student.id,
          mapping_status: 'manually_mapped',
          mapped_at: new Date().toISOString(),
          mapped_by: user?.id,
          mapping_source: 'admin_manual'
        })
        .eq("id", selectedScript.id);

      if (error) throw error;

      toast.success("Manual mapping successful.");
      setSelectedScript(null);
      setManualRollNumber("");
      fetchScripts();
      router.refresh();
    } catch (error: any) {
      toast.error(`Reconciliation failed: ${error.message}`);
    } finally {
      setIsReconciling(false);
    }
  };

  const filteredScripts = scripts.filter(s => 
    s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.roll_number && s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Scripts Inventory</h2>
          <p className="text-muted-foreground mt-1">
            Total of {scripts.length} answer scripts discovered in system.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={verifyStorage} disabled={isLoading}>
            <Database className="h-4 w-4 mr-2" />
            Verify Storage
          </Button>
          <Button variant="outline" size="sm" onClick={fetchScripts} disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={runMappingEngine} disabled={isMapping || isLoading}>
            {isMapping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LinkIcon className="h-4 w-4 mr-2" />}
            Run Mapping Engine
          </Button>
        </div>
      </div>

      {storageFilesCount !== null && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{storageFilesCount}</div>
              <p className="text-xs text-muted-foreground">Physical Files in Storage</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{scripts.length}</div>
              <p className="text-xs text-muted-foreground">Database Records</p>
            </CardContent>
          </Card>
          <Card className={storageFilesCount === scripts.length ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{storageFilesCount - scripts.length}</div>
              <p className="text-xs text-muted-foreground">Sync Variance</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-sm border-muted/60">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Answer Scripts</CardTitle>
              <CardDescription>Inspector for physical files and database records.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ID or Roll Number..."
                className="pl-9 h-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead>Script ID</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Filename/Roll</TableHead>
                <TableHead>Mapping</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    Inspecting scripts...
                  </TableCell>
                </TableRow>
              ) : filteredScripts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                    No scripts found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredScripts.map((script) => (
                  <TableRow key={script.id} className="transition-colors hover:bg-muted/50">
                    <TableCell>
                      <Badge variant={script.status === 'evaluated' ? 'default' : 'outline'} className="capitalize text-[10px] h-5">
                        {script.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] max-w-[120px] truncate">{script.id}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{script.exams?.name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs truncate max-w-[200px]">
                          {script.roll_number || "PENDING_EXTRACT"}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                          {script.original_filename || "unknown_file"}
                        </span>
                        <a href={script.file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary flex items-center gap-1 hover:underline mt-1">
                          View PDF <ExternalLink className="w-2 h-2" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={script.mapping_status === 'mapped' || script.mapping_status === 'manually_mapped' ? 'default' : 'outline'} 
                        className={`text-[10px] h-5 border-none shadow-none ${
                          script.mapping_status === 'mapped' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          script.mapping_status === 'manually_mapped' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          script.mapping_status === 'mapping_error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
                        {script.mapping_status === 'mapped' || script.mapping_status === 'manually_mapped' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                        {script.mapping_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {new Date(script.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger 
                          render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setSelectedScript(script)}>
                              <LinkIcon className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Manual Student Linkage</DialogTitle>
                            <DialogDescription>
                              Force link this script to a student by entering their verified roll number.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="grid gap-2">
                              <Label>Script ID</Label>
                              <code className="text-[11px] p-2 bg-muted rounded">{script.id}</code>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="roll">Student Roll Number</Label>
                              <Input 
                                id="roll" 
                                placeholder="e.g. 23CS001" 
                                value={manualRollNumber}
                                onChange={(e) => setManualRollNumber(e.target.value)}
                              />
                              <p className="text-[10px] text-muted-foreground">This will override any existing automated mapping.</p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedScript(null)}>Cancel</Button>
                            <Button onClick={handleManualMapping} disabled={isReconciling}>
                              {isReconciling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Confirm Linkage
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
