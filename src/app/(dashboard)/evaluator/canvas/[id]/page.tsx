"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  ArrowLeft, Save, CheckCircle, FileText, ChevronRight, Loader2, 
  AlertTriangle, Check, Settings2, PanelRightClose, PanelRightOpen, 
  HelpCircle, Maximize, Columns, LayoutTemplate,
  Cloud, CloudLightning, CheckSquare, Columns2,
  MousePointer2, Type, Pen, Eraser, MousePointerClick, Flag, X,
  LogOut, User as UserIcon, Settings
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import type { Annotation, AnnotationType } from "@/components/dashboard/AnnotatablePDFViewer";
import dynamic from 'next/dynamic';
import { cn } from "@/lib/utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const AnnotatablePDFViewer = dynamic(
  () => import("@/components/dashboard/AnnotatablePDFViewer").then(mod => mod.AnnotatablePDFViewer),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 absolute inset-0 text-muted-foreground z-10">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Initializing PDF Engine...</p>
      </div>
    )
  }
);

export default function EvaluationCanvas() {
  const params = useParams();
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/login");
    } catch (error: any) {
      toast.error("Failed to logout: " + error.message);
    } finally {
      setIsLoggingOut(false);
    }
  };
  const { role, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const scriptId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scriptData, setScriptData] = useState<any>(null);
  const [resources, setResources] = useState<any>(null);

  const [marks, setMarks] = useState<{ [qId: string]: { obtained: string, max: string } }>({});
  const [reviewFlags, setReviewFlags] = useState<{ [key: string]: boolean }>({});
  const [comments, setComments] = useState("");
  const [activeTab, setActiveTab] = useState("student-script");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // Redesign State
  const [focusMode, setFocusMode] = useState(false);
  const [docMode, setDocMode] = useState<"fit-width" | "fit-page" | "two-page">("fit-page");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("saved");
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [activeTool, setActiveTool] = useState<AnnotationType | "cursor">("cursor");
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [referenceTab, setReferenceTab] = useState("question-paper");

  // Resource URL states
  const [pdfUrls, setPdfUrls] = useState<{
    [key: string]: { url: string | null; loading: boolean; error: string | null }
  }>({
    "student-script": { url: null, loading: true, error: null },
    "question-paper": { url: null, loading: true, error: null },
    "marking-scheme": { url: null, loading: true, error: null },
  });

  // BeforeUnload Guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveState === "saving" || saveState === "error") {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveState]);  // Initial load effect
  useEffect(() => {
    async function fetchScriptAndResources() {
      setIsLoading(true);
      
      // Helper to extract relative storage path and normalize for createSignedUrl
      const normalizeStoragePath = (input: string, bucketName: string) => {
        if (!input) return "";
        let path = input;

        // 1. Remove full Supabase storage URL if present
        if (path.startsWith('http')) {
          try {
            const url = new URL(path);
            const searchStr = `/object/public/${bucketName}/`;
            const authSearchStr = `/object/authenticated/${bucketName}/`;
            
            if (url.pathname.includes(searchStr)) {
              path = url.pathname.split(searchStr)[1];
            } else if (url.pathname.includes(authSearchStr)) {
              path = url.pathname.split(authSearchStr)[1];
            } else {
              // Fallback: extract after the bucket name if it follows the standard pattern
              const parts = url.pathname.split('/');
              const bucketIndex = parts.indexOf(bucketName);
              if (bucketIndex !== -1) {
                path = parts.slice(bucketIndex + 1).join('/');
              }
            }
          } catch (e) {
            console.error("[PDF_LOAD] Failed to parse URL for normalization:", e);
          }
        }

        // 2. Remove leading slash
        if (path.startsWith('/')) path = path.substring(1);

        // 3. Remove the bucket name if it's accidentally duplicated at the start of the relative path
        if (path.startsWith(`${bucketName}/`)) {
          path = path.replace(`${bucketName}/`, '');
        }

        return path;
      };

      try {
        const { data: script, error: scriptError } = await supabase
          .from("scripts")
          .select("id, file_url, file_path, status, question_marks, total_marks, comments, annotations, exam_id, exam_session_id, anonymous_code")
          .eq("id", scriptId)
          .single();

        if (scriptError) throw scriptError;
        
        // Prefer file_path, fallback to file_url
        const bucket = 'eval_documents';
        let rawPath = script.file_path || script.file_url;
        let scriptPath = normalizeStoragePath(rawPath, bucket);
        
        
        // Validation: Ensure we have a path to the digital asset
        if (!scriptPath) {
          console.warn("[PDF_LOAD] Script path missing for ID:", scriptId);
          setPdfUrls(prev => ({ ...prev, "student-script": { url: null, loading: false, error: "Script file path is missing in database" } }));
        } else {
          try {
            const { data, error: signedError } = await supabase.storage
              .from(bucket)
              .createSignedUrl(scriptPath, 3600);
            
            if (signedError) {
              const isNotFound = (signedError as any).status === 404 || signedError.message.toLowerCase().includes('not found');
              console.error("[PDF_LOAD] Supabase Storage Error:", signedError);
              throw new Error(isNotFound ? "Script file missing from storage" : signedError.message);
            }

            if (!data?.signedUrl) {
              throw new Error("No signed URL returned from storage engine");
            }

            setPdfUrls(prev => ({ ...prev, "student-script": { url: data.signedUrl, loading: false, error: null } }));
          } catch (err: any) {
            console.error("[PDF_LOAD] Script Retrieval Failure:", err);
            setPdfUrls(prev => ({ ...prev, "student-script": { url: null, loading: false, error: err.message } }));
          }
        }

        setScriptData(script);

        // Hydrate marks ... (rest of hydration logic)
        if (script.question_marks) {
          const m = script.question_marks;
          const hydrated: { [key: string]: any } = {};
          Object.keys(m).forEach(q => {
            if (typeof m[q] === 'object' && m[q] !== null) {
              hydrated[q] = m[q];
            } else {
              hydrated[q] = { obtained: String(m[q]), max: "10" };
            }
          });
          setMarks(hydrated);
        } else {
          const defaults: any = {};
          for(let i=1; i<=10; i++) defaults[`q${i}`] = { obtained: "", max: "10" };
          setMarks(defaults);
        }

        if (script.comments) setComments(script.comments.replace("[UFM FLAGGED] ", ""));
        if (script.annotations) setAnnotations(script.annotations);

        // Fetch resources (QP/MS)
        if (script.exam_session_id || script.exam_id) {
          const query = supabase.from("resources").select("*");
          if (script.exam_session_id) {
            query.eq("exam_session_id", script.exam_session_id);
          } else {
            query.eq("exam_id", script.exam_id);
          }

          const { data: resourceData } = await query.single();
            
          if (resourceData) {
            setResources(resourceData);
            
            // Process Resources Signed URLs concurrently
            const resourceTasks = [
              { key: "question-paper", path: resourceData.question_paper_url },
              { key: "marking-scheme", path: resourceData.marking_scheme_url }
            ];

            await Promise.all(resourceTasks.map(async (task) => {
              if (!task.path) {
                setPdfUrls(prev => ({ ...prev, [task.key]: { url: null, loading: false, error: "Not provided" } }));
                return;
              }

              const relativeResourcePath = normalizeStoragePath(task.path, bucket);

              try {
                const { data, error } = await supabase.storage
                  .from(bucket)
                  .createSignedUrl(relativeResourcePath, 3600);
                
                if (error) {
                  const isNotFound = (error as any).status === 404 || error.message.toLowerCase().includes('not found');
                  console.error(`[PDF_LOAD] ${task.key} storage error:`, error);
                  throw new Error(isNotFound ? "Resource file missing from storage" : error.message);
                }

                if (!data?.signedUrl) {
                   throw new Error("No signed URL returned");
                }

                setPdfUrls(prev => ({ ...prev, [task.key]: { url: data.signedUrl, loading: false, error: null } }));
              } catch (err: any) {
                console.error(`[PDF_LOAD] ${task.key} total failure:`, err);
                setPdfUrls(prev => ({ ...prev, [task.key]: { url: null, loading: false, error: err.message } }));
              }
            }));
          } else {
            setPdfUrls(prev => ({ 
              ...prev, 
              "question-paper": { url: null, loading: false, error: "No resources found" },
              "marking-scheme": { url: null, loading: false, error: "No resources found" }
            }));
          }
        }
      } catch (error: any) {
        toast.error(`Error loading script: ${error.message}`);
        router.push("/evaluator");
      } finally {
        setIsLoading(false);
        setTimeout(() => setIsInitialLoad(false), 500);
      }
    }

    if (scriptId) fetchScriptAndResources();
  }, [scriptId, router]);

  const questions = useMemo(() => Object.keys(marks).sort((a,b) => {
    const numA = parseInt(a.replace('q', ''));
    const numB = parseInt(b.replace('q', ''));
    return numA - numB;
  }), [marks]);

  const totalMarks = useMemo(() => {
    return Object.values(marks).reduce((sum, m) => {
      const num = Number(m.obtained);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [marks]);

  const handleSaveDraft = useCallback(async (isSilent = false) => {
    if (!scriptId) return;
    
    if (!isSilent) setIsSubmitting(true);
    setSaveState("saving");

    // Clean payload for JSONB
    const cleanMarks = { ...marks };

    const payload = {
      question_marks: cleanMarks,
      total_marks: parseInt(totalMarks.toString(), 10) || 0,
      comments: comments || "",
      annotations: Array.isArray(annotations) ? annotations : []
    };

    try {
      const { error } = await supabase.from("scripts").update(payload).eq("id", scriptId);
      if (error) throw error;
      
      setSaveState("saved");
      setLastSaved(new Date());
      if (!isSilent) toast.success("Draft saved successfully.");
    } catch (error: any) {
      console.error("Draft Save Error:", error);
      setSaveState("error");
      if (!isSilent) toast.error(`Draft Save Failed: ${error.message}`);
    } finally {
      if (!isSilent) setIsSubmitting(false);
    }
  }, [scriptId, marks, totalMarks, comments, annotations, isSubmitting]);

  // Debounced Autosave Effect
  useEffect(() => {
    if (isInitialLoad) return;
    
    setSaveState("saving");
    
    const timeoutId = setTimeout(() => {
      handleSaveDraft(true);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [marks, comments, annotations, reviewFlags, isInitialLoad, handleSaveDraft]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }
      
      const key = e.key.toLowerCase();
      switch (key) {
        case 'v': setActiveTool("cursor"); break;
        case 'c': setActiveTool("tick"); break;
        case 'x': setActiveTool("cross"); break;
        case 'o': setActiveTool("circle"); break;
        case 'u': setActiveTool("underline"); break;
        case 't': setActiveTool("text"); break;
        case 'p': setActiveTool("pen"); break;
        case 'm': setFocusMode(f => !f); break; // Toggle focus mode
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleMarkChange = (qId: string, field: "obtained" | "max", value: string) => {
    if (value === "" || !isNaN(Number(value))) {
      setMarks(prev => ({ 
        ...prev, 
        [qId]: { ...prev[qId], [field]: value } 
      }));
    }
  };

  const handleAddQuestion = () => {
    const nextId = questions.length + 1;
    const qKey = `q${nextId}`;
    setMarks(prev => ({
      ...prev,
      [qKey]: { obtained: "", max: "10" }
    }));
    toast.success(`Question ${nextId} added`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index < questions.length - 1) {
        document.getElementById(questions[index + 1])?.focus();
      } else {
        document.getElementById('comments')?.focus();
      }
    }
  };

  // Real Submission Logic
  const executeFinalSubmission = async (status: 'evaluated' | 'flagged_ufm') => {
    if (!scriptId) return;
    if (saveState === "saving") {
      toast.error("Please wait for the current draft to finish saving.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Authoritative final save of current state
      const payload = {
        question_marks: marks,
        total_marks: totalMarks,
        comments: status === 'flagged_ufm' ? `[UFM FLAGGED] ${comments}` : comments,
        annotations: annotations,
        status: status,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("scripts")
        .update(payload)
        .eq("id", scriptId);

      if (error) throw error;

      toast.success(status === 'evaluated' ? "Script submitted successfully!" : "Script flagged for UFM.");
      
      // 2. Automate "Next Script" finding or redirect back
      handleNextScript();
    } catch (error: any) {
      console.error("Submission Error:", error);
      toast.error(`Submission failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUFMSubmit = async () => {
    if(!confirm("Are you sure you want to flag this script for UFM? This will move it to the review queue.")) return;
    await executeFinalSubmission('flagged_ufm');
  };

  const handleSubmit = async () => {
    // Basic validation: Ensure some marks are entered
    if (totalMarks === 0 && !confirm("Total marks are 0. Are you sure you want to submit?")) return;
    await executeFinalSubmission('evaluated');
  };

  const handleNextScript = async () => {
    try {
      // Find another pending script for this exam (or any pending script if none in this exam)
      const { data: nextScript } = await supabase
        .from("scripts")
        .select("id")
        .eq("status", "pending")
        .neq("id", scriptId)
        .limit(1)
        .single();

      if (nextScript) {
        toast.info("Loading next pending script...");
        router.push(`/evaluator/canvas/${nextScript.id}`);
      } else {
        toast.info("No more pending scripts. Returning to dashboard.");
        router.push("/evaluator");
      }
    } catch (err) {
      router.push("/evaluator");
    }
  };

  const activeDocState = pdfUrls[activeTab];

  const toggleReviewFlag = (qId: string) => {
    setReviewFlags(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-900 selection:bg-blue-500/30">
      
      {/* 1. Workstation Operations Bar (h-12, high-density) */}
      <header className="h-12 flex-shrink-0 border-b border-slate-800 bg-slate-900 px-4 flex items-center justify-between z-50 sticky top-0 shadow-lg">
        
        {/* Left: Branding & Session Meta */}
        <div className="flex items-center gap-4 w-1/3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-sidebar-foreground/40 hover:text-white hover:bg-white/10 transition-colors" 
            onClick={() => router.push("/evaluator")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-mono-code font-bold text-white tracking-wider">
                {scriptData?.anonymous_code || `ANON-${scriptId.substring(0,8).toUpperCase()}`}
              </span>
              <Badge variant="outline" className="h-4 text-[9px] border-white/10 text-white/40 bg-white/5 font-bold px-1.5 py-0">
                {scriptData?.status || 'draft'}
              </Badge>
            </div>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest hidden md:block mt-0.5">
              Workstation <span className="mx-1 opacity-50">•</span> {scriptData?.exam_name || 'Academic records'}
            </p>
          </div>
        </div>

        {/* Center: Viewport Controls */}
        <div className="flex items-center justify-center gap-2 w-1/3">
          <div className="flex bg-slate-800/50 rounded-lg p-0.5 border border-slate-700/50 shadow-inner">
            <Button 
              variant={docMode === "fit-width" ? "secondary" : "ghost"} 
              size="sm" 
              className={cn("h-7 px-3 text-[10px] font-semibold", docMode === "fit-width" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200")} 
              onClick={() => setDocMode("fit-width")}
            >
              Width
            </Button>
            <Button 
              variant={docMode === "fit-page" ? "secondary" : "ghost"} 
              size="sm" 
              className={cn("h-7 px-3 text-[10px] font-semibold", docMode === "fit-page" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200")} 
              onClick={() => setDocMode("fit-page")}
            >
              Page
            </Button>
            <Button 
              variant={docMode === "two-page" ? "secondary" : "ghost"} 
              size="sm" 
              className={cn("h-7 px-3 text-[10px] font-semibold", docMode === "two-page" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200")} 
              onClick={() => setDocMode("two-page")}
            >
              Spread
            </Button>
          </div>
        </div>

        {/* Right: Operations & Sync Status */}
        <div className="flex items-center justify-end gap-4 w-1/3">
          {/* High-Fidelity Sync Engine Status */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/30 border border-slate-700/30">
            {saveState === "saved" && (
              <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-medium text-slate-400">
                  Synced {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
            {saveState === "saving" && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 text-sky-400 animate-spin" />
                <span className="text-[10px] font-medium text-sky-400/80">Syncing draft...</span>
              </div>
            )}
            {saveState === "error" && (
              <div className="flex items-center gap-2">
                <CloudLightning className="h-3 w-3 text-red-500 animate-pulse" />
                <span className="text-[10px] font-bold text-red-500">Sync Error</span>
              </div>
            )}
          </div>
          
          <div className="h-4 w-px bg-slate-800" />
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 transition-all rounded-lg" 
              title="Next Pending Script"
              onClick={handleNextScript}
              disabled={isSubmitting}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Dialog>
              <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white h-8 w-8 text-slate-400" title="Shortcuts Help">
                <HelpCircle className="h-4 w-4" />
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-200">
                <DialogHeader>
                  <DialogTitle className="text-white">Professional Workstation Bindings</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    High-throughput evaluation requires minimal mouse travel. Use these system bindings.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-y-2 py-4">
                  {[
                    { label: "Cursor (Pan/Select)", key: "V" },
                    { label: "Tick (Correct)", key: "C", color: "text-emerald-400" },
                    { label: "Cross (Incorrect)", key: "X", color: "text-red-400" },
                    { label: "Text Comment", key: "T" },
                    { label: "Underline / Highlight", key: "U" },
                    { label: "Focus Component Toggle", key: "M" },
                  ].map((item) => (
                    <div key={item.key} className="flex justify-between items-center bg-slate-800/50 p-2 rounded border border-slate-700/50">
                      <span className={cn("text-xs font-bold uppercase tracking-wide", item.color || "text-slate-300")}>{item.label}</span>
                      <kbd className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700 font-mono text-xs text-white shadow-sm">{item.key}</kbd>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              variant={focusMode ? "secondary" : "ghost"} 
              size="icon" 
              className={cn("h-8 w-8 transition-all rounded-lg", focusMode ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-800 hover:text-white")} 
              onClick={() => setFocusMode(!focusMode)}
              title="Toggle Focused View"
            >
              {focusMode ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
            </Button>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* User Account Portal */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center space-x-2 p-1 rounded-lg hover:bg-slate-800 transition-all outline-none border border-transparent hover:border-slate-700">
              <Avatar fallback={role?.[0]} className="h-6 w-6 rounded-md bg-blue-600 text-[10px] font-bold" />
              <div className="hidden lg:block text-left mr-1">
                <p className="text-[10px] font-bold leading-none text-slate-300 capitalize">{role}</p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2">
              <DropdownMenuGroup>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(`/${role}/profile`)}>
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/${role}/settings`)}>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout} 
                disabled={isLoggingOut}
                variant="destructive"
              >
                {isLoggingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                {isLoggingOut ? "Logging out..." : "Log out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 flex overflow-hidden">
               {/* Left Rail: High-Fidelity Toolbox */}
        <div className="w-14 border-r border-slate-800 bg-slate-900 flex flex-col items-center py-6 gap-4 z-20 shadow-xl relative">
           <button 
             onClick={() => setActiveTool("cursor")}
             className={cn(
               "p-2.5 rounded-xl transition-all duration-200 group relative", 
               activeTool === "cursor" 
                ? "bg-slate-700 text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] border border-slate-600" 
                : "hover:bg-slate-800 text-slate-500 hover:text-slate-300"
             )} 
             title="Select / Pan (V)"
           >
             <MousePointer2 className="h-5 w-5" />
           </button>
           
           <div className="w-8 h-px bg-slate-800" />
           
           <button 
             onClick={() => setActiveTool("tick")}
             className={cn(
               "p-2.5 rounded-xl transition-all duration-200", 
               activeTool === "tick" 
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 border border-emerald-500" 
                : "hover:bg-emerald-900/20 text-emerald-600/70 hover:text-emerald-500"
             )} 
             title="Correct (C)"
           >
             <Check className="h-5 w-5 stroke-[4]" />
           </button>
           
           <button 
             onClick={() => setActiveTool("cross")}
             className={cn(
               "p-2.5 rounded-xl transition-all duration-200", 
               activeTool === "cross" 
                ? "bg-red-600 text-white shadow-lg shadow-red-900/40 border border-red-500" 
                : "hover:bg-red-900/20 text-red-600/70 hover:text-red-500"
             )} 
             title="Incorrect (X)"
           >
             <X className="h-5 w-5 stroke-[4]" />
           </button>

           <button 
             onClick={() => setActiveTool("circle")}
             className={cn(
               "p-2.5 rounded-xl transition-all duration-200", 
               activeTool === "circle" 
                ? "bg-sky-600 text-white shadow-lg shadow-sky-900/40 border border-sky-500" 
                : "hover:bg-sky-900/20 text-sky-600/70 hover:text-sky-500"
             )} 
             title="Annotate Circle (O)"
           >
             <div className="h-5 w-5 rounded-full border-[3px] border-current" />
           </button>

           <button 
             onClick={() => setActiveTool("underline")}
             className={cn(
               "p-2.5 rounded-xl transition-all duration-200", 
               activeTool === "underline" 
                ? "bg-sky-600 text-white shadow-lg shadow-sky-900/40 border border-sky-500" 
                : "hover:bg-sky-900/20 text-sky-600/70 hover:text-sky-500"
             )} 
             title="Underline (U)"
           >
             <div className="h-1 w-5 bg-current rounded-full" />
           </button>
           
           <button 
             onClick={() => setActiveTool("text")}
             className={cn(
               "p-2.5 rounded-xl transition-all duration-200", 
               activeTool === "text" 
                ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40 border border-violet-500" 
                : "hover:bg-violet-900/20 text-violet-600/70 hover:text-violet-500"
             )} 
             title="Text Comment (T)"
           >
             <Type className="h-5 w-5" />
           </button>
           
           <button 
             onClick={() => setActiveTool("pen")}
             className={cn(
               "p-2.5 rounded-xl transition-all duration-200", 
               activeTool === "pen" 
                ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40 border border-violet-500" 
                : "hover:bg-violet-900/20 text-violet-600/70 hover:text-violet-500"
             )} 
             title="Freehand Ink (P)"
           >
             <Pen className="h-5 w-5" />
           </button>
           
           <div className="w-8 h-px bg-slate-800" />
           
           <button 
             onClick={() => {
               if(confirm("Destroy all annotations? This action is non-reversible.")) {
                 setAnnotations([]);
               }
             }}
             className="p-2.5 rounded-xl hover:bg-red-900/20 text-slate-600 hover:text-red-500 mt-auto transition-all" 
             title="Clear Workspace"
           >
             <Eraser className="h-5 w-5" />
           </button>
        </div>

        {/* Center Canvas: The Sterile Lab Environment */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950/40">
          {/* Quick Tabs Overlay & Split Toggle */}
          <div className="absolute top-2 right-4 z-20 flex items-center gap-2">
            <Button 
               variant={isSplitMode ? "secondary" : "outline"} 
               size="sm" 
               onClick={() => setIsSplitMode(!isSplitMode)}
               className="h-8 text-xs bg-background/90 backdrop-blur font-bold shadow-sm"
               title="Toggle Split View"
            >
              <Columns2 className="h-4 w-4 mr-1.5 opacity-70" />
              {isSplitMode ? "Exit Split" : "Split View"}
            </Button>
            
            {!isSplitMode && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[300px]">
                <TabsList className="grid w-full grid-cols-3 shadow-sm border bg-background/90 backdrop-blur h-8">
                  <TabsTrigger value="student-script" className="text-xs py-0 h-7">Script</TabsTrigger>
                  <TabsTrigger value="question-paper" className="text-xs py-0 h-7">Q-Paper</TabsTrigger>
                  <TabsTrigger value="marking-scheme" className="text-xs py-0 h-7">Scheme</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          <div className="flex-1 overflow-hidden relative">
            {isLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                <p className="text-sm text-slate-500 font-mono">LOADING WORKSPACE...</p>
              </div>
            ) : isSplitMode ? (
              <ResizablePanelGroup direction="horizontal" className="h-full w-full">
                <ResizablePanel minSize={30} maxSize={70} defaultSize={50} className="relative bg-slate-100 dark:bg-slate-950">
                  {pdfUrls["student-script"].url ? (
                    <AnnotatablePDFViewer 
                      key={pdfUrls["student-script"].url}
                      url={pdfUrls["student-script"].url}
                      annotations={annotations}
                      activeTool={activeTool}
                      onAnnotationsChange={setAnnotations}
                      readOnly={false}
                      externalError={pdfUrls["student-script"].error}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-10 text-center">
                      <AlertTriangle className="h-10 w-10 text-amber-500 mb-4 opacity-50" />
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{pdfUrls["student-script"].error || "Staging Script..."}</p>
                    </div>
                  )}
                  <div className="absolute top-3 left-4 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] uppercase font-bold text-muted-foreground border shadow-sm z-20 pointer-events-none">
                    Student Script
                  </div>
                </ResizablePanel>
                
                <ResizableHandle withHandle className="w-2 hover:bg-primary/20 transition-colors bg-border/50" />
                
                <ResizablePanel minSize={30} maxSize={70} defaultSize={50} className="relative bg-slate-50 border-l dark:bg-slate-900">
                   <div className="absolute top-3 left-4 z-20 pointer-events-auto">
                     <Tabs value={referenceTab} onValueChange={setReferenceTab} className="w-[220px]">
                        <TabsList className="grid w-full grid-cols-2 shadow-md border bg-background/95 backdrop-blur h-8">
                          <TabsTrigger value="question-paper" className="text-xs py-0 h-7">Q-Paper</TabsTrigger>
                          <TabsTrigger value="marking-scheme" className="text-xs py-0 h-7">Scheme</TabsTrigger>
                        </TabsList>
                     </Tabs>
                   </div>
                   {pdfUrls[referenceTab].url ? (
                     <AnnotatablePDFViewer 
                       url={pdfUrls[referenceTab].url as string}
                       annotations={[]}
                       activeTool="cursor"
                       readOnly={true}
                       onAnnotationsChange={() => {}}
                       externalError={pdfUrls[referenceTab].error}
                     />
                   ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 p-10 text-center">
                      <Loader2 className="h-8 w-8 text-slate-700 animate-spin mb-4" />
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-relaxed">
                        {pdfUrls[referenceTab].error || `Retrieving ${referenceTab.replace('-', ' ')}...`}
                      </p>
                    </div>
                   )}
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <div className="w-full h-full relative">
                {activeDocState.url ? (
                  <AnnotatablePDFViewer 
                    key={activeDocState.url}
                    url={activeDocState.url as string}
                    annotations={annotations}
                    activeTool={activeTool}
                    onAnnotationsChange={setAnnotations}
                    readOnly={activeTab !== "student-script"} 
                    externalError={activeDocState.error}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-20 text-center">
                    {activeDocState.loading ? (
                      <>
                        <Loader2 className="h-12 w-12 text-blue-500/20 animate-spin mb-6" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Synchronizing Secure Assets...</p>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-16 w-16 text-amber-500/20 mb-6" />
                        <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">Asset Authorization Error</h3>
                        <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed font-medium">
                          {activeDocState.error || "The digital script could not be verified by the storage engine. Please contact the session administrator."}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Scoring Panel: The Analytical Engine */}
        {!focusMode && (
          <div className="w-80 lg:w-[320px] border-l border-slate-800 bg-slate-900 flex flex-col shadow-2xl z-30 transition-all duration-300 relative">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between shadow-sm">
              <span className="text-[10px] font-semibold tracking-wider text-slate-400 flex items-center gap-2">
                <CheckSquare className="h-3 w-3 text-blue-500" /> Evaluation Stack
              </span>
            </div>
            
            {/* High-Density Row Grid */}
            <div className="flex-1 overflow-y-auto bg-slate-900/80 custom-scrollbar">
              <div className="p-3 space-y-1 pb-6">
                {questions.map((q, index) => {
                  const m = marks[q];
                  const obtained = Number(m.obtained) || 0;
                  const max = Number(m.max) || 0;
                  const isInvalid = obtained > max && max > 0;
                  const isFlagged = reviewFlags[q];
                  const isEntered = m.obtained !== "";
                  
                  return (
                    <div 
                      key={q} 
                      className={cn(
                        "group relative flex items-center gap-3 p-1.5 rounded-lg border transition-all duration-200",
                        isEntered 
                          ? "bg-slate-800/50 border-slate-700/50 shadow-sm" 
                          : "bg-transparent border-transparent hover:border-slate-800 hover:bg-slate-800/30",
                        isInvalid && "border-red-500/50 bg-red-950/20",
                        isFlagged && "border-amber-500/50 bg-amber-950/20"
                      )}
                    >
                      <div className={cn(
                        "flex shrink-0 items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold transition-colors",
                        isEntered 
                          ? "bg-blue-600/20 text-blue-400" 
                          : "text-slate-500"
                      )}>
                        {q.replace('q','')}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          id={q}
                          type="text"
                          inputMode="numeric"
                          placeholder="-"
                          value={m.obtained}
                          onChange={(e) => handleMarkChange(q, "obtained", e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          className={cn(
                            "h-8 w-14 text-center font-mono text-sm font-black p-0 bg-slate-950 border-slate-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all",
                            isInvalid && "border-red-500 text-red-100",
                            isFlagged && "border-amber-500 text-amber-100"
                          )}
                        />
                        <span className="text-[10px] text-slate-600 font-black">/</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="10"
                          value={m.max}
                          onChange={(e) => handleMarkChange(q, "max", e.target.value)}
                          className="h-8 w-10 text-center font-mono text-[10px] p-0 bg-transparent border-none text-slate-500 focus:text-slate-300 transition-colors"
                        />
                      </div>
                      
                      {/* Interaction HUD */}
                      <div className={cn(
                        "flex items-center gap-1 transition-all duration-200", 
                        isFlagged || isInvalid ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn(
                            "h-7 w-7 rounded-md transition-colors", 
                            isFlagged ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20" : "text-slate-500 hover:text-amber-500 hover:bg-slate-800"
                          )}
                          onClick={() => toggleReviewFlag(q)}
                          title={isFlagged ? "Mark for Review" : "Flag for Review"}
                        >
                          <Flag className={cn("h-3 w-3", isFlagged && "fill-current")} />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <Button 
                  variant="ghost" 
                  className="w-full h-9 border-dashed border border-slate-800 text-[10px] font-medium text-slate-500 hover:text-blue-400 hover:bg-slate-800/50 transition-all mt-4"
                  onClick={handleAddQuestion}
                >
                  <Settings2 className="h-3 w-3 mr-2" /> Append Row
                </Button>
              </div>
            </div>

            {/* Locked Aggregate Footer: The Certification Bar */}
            <div className="border-t border-slate-800 bg-slate-900 p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.4)] z-20">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-end px-1">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-medium text-slate-500">Current score</span>
                    <span className="text-[10px] font-semibold text-slate-400">Certified aggregate</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white font-mono leading-none tracking-tighter">{totalMarks}</span>
                    <span className="text-xs font-medium text-slate-600 italic">pts</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    className="h-10 text-[10px] font-semibold border-red-900/30 bg-red-900/10 text-red-500 hover:bg-red-900/20 shadow-sm" 
                    onClick={handleUFMSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                    UFM flag
                  </Button>
                  <Button 
                    className="h-10 text-[10px] font-semibold bg-blue-600 text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-all active:scale-95" 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                    Complete final
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
