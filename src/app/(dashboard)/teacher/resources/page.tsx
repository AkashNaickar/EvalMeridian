"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileUp, Loader2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/utils/supabase/client";

export default function TeacherResourcesPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedExam, setSelectedExam] = useState("");
  const [questionPaper, setQuestionPaper] = useState<{ file: File; isLinearized: boolean } | null>(null);
  const [markingScheme, setMarkingScheme] = useState<{ file: File; isLinearized: boolean } | null>(null);

  const checkLinearization = async (file: File): Promise<boolean> => {
    try {
      const blob = file.slice(0, 1024);
      const text = await blob.text();
      return text.includes("/Linearized");
    } catch {
      return false;
    }
  };

  const handleFileChange = async (file: File | null, type: 'qp' | 'ms') => {
    if (!file) {
      if (type === 'qp') setQuestionPaper(null);
      else setMarkingScheme(null);
      return;
    }
    const isLinearized = await checkLinearization(file);
    if (type === 'qp') setQuestionPaper({ file, isLinearized });
    else setMarkingScheme({ file, isLinearized });
  };

  useEffect(() => {
    async function fetchExams() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("exam_sessions")
        .select("id, name, academic_year, semester")
        .order("created_at", { ascending: false });
        
      if (!error && data) {
        setExams(data);
      }
      setIsLoading(false);
    }
    fetchExams();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedExam) {
      toast.error("Please select a relevant exam/subject.");
      return;
    }
    
    if (!questionPaper && !markingScheme) {
      toast.error("Please upload at least one document.");
      return;
    }

    setIsSubmitting(true);

    try {
      let qpUrl = null;
      let msUrl = null;

      const uploadDoc = async (file: File, prefix: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${prefix}_${selectedExam}_${Date.now()}.${fileExt}`;
        const filePath = `resources/${selectedExam}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("eval_documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        return filePath;
      };

      if (questionPaper) qpUrl = await uploadDoc(questionPaper.file, 'qp');
      if (markingScheme) msUrl = await uploadDoc(markingScheme.file, 'ms');

      const { data: existingResource } = await supabase
        .from("resources")
        .select("id")
        .eq("exam_session_id", selectedExam)
        .single();

      let dbError;
      if (existingResource) {
        const { error } = await supabase
          .from("resources")
          .update({
            ...(qpUrl && { question_paper_url: qpUrl }),
            ...(msUrl && { marking_scheme_url: msUrl })
          })
          .eq("id", existingResource.id);
        dbError = error;
      } else {
        const { error } = await supabase
          .from("resources")
          .insert({
            exam_session_id: selectedExam,
            question_paper_url: qpUrl,
            marking_scheme_url: msUrl
          });
        dbError = error;
      }

      if (dbError) throw dbError;

      toast.success("Resources uploaded successfully. They are now available to evaluators.");
      
      setSelectedExam("");
      setQuestionPaper(null);
      setMarkingScheme(null);
      
    } catch (error: any) {
      toast.error(`Error uploading resources: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-admin py-8 space-y-8 animate-in fade-in duration-500 max-w-4xl">
      {/* Header Section */}
      <div>
        <h1 className="text-page-title">Resource delivery</h1>
        <p className="text-body-text mt-1.5 font-medium">Stage question papers and authorized marking schemes for evaluation.</p>
      </div>

      <Card className="border-border/50 shadow-premium overflow-hidden">
        <form onSubmit={handleSubmit}>
          <CardHeader className="bg-secondary/10 border-b border-border/10">
            <CardTitle className="text-section-title">Submission details</CardTitle>
            <CardDescription className="text-caption font-medium">
              Select the assessment context and stage the required PDF assets for evaluators.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-10">
            {/* Context Group */}
            <div className="space-y-3">
              <Label htmlFor="exam" className="text-label-text">Exam context</Label>
              <Select value={selectedExam} onValueChange={(val) => setSelectedExam(val || "")}>
                <SelectTrigger id="exam" className="h-11">
                  <SelectValue placeholder="Select an active session">
                    {selectedExam && exams.find(e => e.id === selectedExam) 
                      ? `${exams.find(e => e.id === selectedExam).name} (${exams.find(e => e.id === selectedExam).academic_year} - ${exams.find(e => e.id === selectedExam).semester})`
                      : undefined
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <SelectItem value="loading" disabled>Loading sessions...</SelectItem>
                  ) : exams.length === 0 ? (
                    <SelectItem value="none" disabled>No active sessions found</SelectItem>
                  ) : (
                    exams.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.name} ({exam.academic_year} — {exam.semester})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Payload Area */}
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="question-paper" className="text-label-text">Question paper (PDF)</Label>
                  {questionPaper && (
                    <Badge variant={questionPaper.isLinearized ? "success" : "warning"}>
                      {questionPaper.isLinearized ? "Optimized" : "Unoptimized"}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <Input
                    id="question-paper"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'qp')}
                    className="cursor-pointer file:font-bold file:text-primary file:bg-primary/5 hover:file:bg-primary/10 transition-all"
                  />
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider flex items-center gap-1.5 px-1">
                    <Info className="h-3 w-3" /> Max file size: 25MB
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="marking-scheme" className="text-label-text">Marking scheme (PDF)</Label>
                  {markingScheme && (
                    <Badge variant={markingScheme.isLinearized ? "success" : "warning"}>
                      {markingScheme.isLinearized ? "Optimized" : "Unoptimized"}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <Input
                    id="marking-scheme"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'ms')}
                    className="cursor-pointer file:font-bold file:text-primary file:bg-primary/5 hover:file:bg-primary/10 transition-all"
                  />
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider flex items-center gap-1.5 px-1">
                    <Info className="h-3 w-3" /> Authorized scheme only
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-end p-6 bg-secondary/10 border-t border-border/10">
            <Button type="submit" disabled={isSubmitting} className="px-12 font-bold h-11">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Staging Resources...
                </>
              ) : (
                <>
                   <FileUp className="mr-2 h-4 w-4" />
                   Finalize Delivery
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <div className="p-6 rounded-lg border border-border/50 bg-secondary/5">
         <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.1em] mb-2">Protocol Requirement</h4>
         <p className="text-caption text-text-secondary leading-relaxed font-medium">
           Ensuring PDFs are &quot;Optimized&quot; (Linearized) improves the evaluator experience by allowing page-by-page loading on high-latency connections. 
           Unoptimized files are still accepted but may experience slower rendering during high-load evaluation sessions.
         </p>
      </div>
    </div>
  );
}
