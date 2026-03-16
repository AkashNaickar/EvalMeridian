"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UploadCloud, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/utils/supabase/client";
import { useEffect } from "react";
import { extractRollNumber } from "@/utils/studentMapping";

export default function AssignPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [evaluators, setEvaluators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedEvaluator, setSelectedEvaluator] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<{ file: File; isLinearized: boolean }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: string }>({});

  const checkLinearization = async (file: File): Promise<boolean> => {
    try {
      const blob = file.slice(0, 1024);
      const text = await blob.text();
      return text.includes("/Linearized");
    } catch {
      return false;
    }
  };

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const [examsRes, evaluatorsRes] = await Promise.all([
        supabase.from("exams").select("id, name, subject"),
        supabase.from("profiles").select("id, name, email").eq("role", "evaluator")
      ]);

      if (examsRes.data) setExams(examsRes.data);
      if (evaluatorsRes.data) setEvaluators(evaluatorsRes.data);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        file => file.type === "application/pdf"
      );
      
      if (droppedFiles.length !== e.dataTransfer.files.length) {
        toast.warning("Only PDF files are accepted.");
      }
      
      const newFiles = await Promise.all(droppedFiles.map(async file => ({
        file,
        isLinearized: await checkLinearization(file)
      })));

      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files).filter(
        file => file.type === "application/pdf"
      );
      
      const newFiles = await Promise.all(selectedFiles.map(async file => ({
        file,
        isLinearized: await checkLinearization(file)
      })));
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedExam || !selectedEvaluator) {
      toast.error("Please select both an exam and an evaluator.");
      return;
    }
    
    if (files.length === 0) {
      toast.error("Please upload at least one answer script (PDF).");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress({});
    
    try {
      const startTime = performance.now();
      const uploadPromises = files.map(async ({ file }) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${selectedExam}/${fileName}`;

        setUploadProgress(prev => ({ ...prev, [file.name]: "Uploading..." }));
        
        const { error: uploadError } = await supabase.storage
          .from("eval_documents")
          .upload(filePath, file);
        
        if (uploadError) {
          setUploadProgress(prev => ({ ...prev, [file.name]: "Failed" }));
          throw uploadError;
        }

        setUploadProgress(prev => ({ ...prev, [file.name]: "Recording..." }));

        const { data: { publicUrl } } = supabase.storage
          .from("eval_documents")
          .getPublicUrl(filePath);

        const extractedRoll = extractRollNumber(file.name);

        return {
          exam_id: selectedExam,
          evaluator_id: selectedEvaluator,
          file_url: publicUrl,
          file_path: filePath,
          original_filename: file.name,
          status: "pending" as const,
          roll_number: extractedRoll,
          mapping_status: extractedRoll ? ("unmapped" as const) : ("mapping_error" as const)
        };
      });

      const scriptData = await Promise.all(uploadPromises);
      const { error: insertError } = await supabase
        .from("scripts")
        .insert(scriptData);
      
      if (insertError) throw insertError;

      files.forEach(f => setUploadProgress(prev => ({ ...prev, [f.file.name]: "Done" })));
      const totalTime = ((performance.now() - startTime) / 1000).toFixed(1);
      toast.success(`Successfully assigned ${files.length} script(s) in ${totalTime}s.`);
      
      setSelectedExam("");
      setSelectedEvaluator("");
      setFiles([]);
      
    } catch (error: any) {
      console.error("Assignment Performance Error:", error);
      toast.error(`Error during assignment: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Assign Scripts</h2>
        <p className="text-muted-foreground mt-1">
          Upload student answer scripts and assign them to an evaluator.
        </p>
      </div>

      <Card className="shadow-lg border-muted/60 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-xl font-bold">Assignment Details</CardTitle>
            <CardDescription>
              Select the context and upload the corresponding PDF scripts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="exam">Select Exam</Label>
                <Select value={selectedExam} onValueChange={(val) => setSelectedExam(val || "")}>
                  <SelectTrigger id="exam" className="bg-muted/50 border-none">
                    <SelectValue placeholder="Select an exam">
                      {selectedExam ? (exams.find(e => e.id === selectedExam)?.name || selectedExam) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
                      <SelectItem value="loading" disabled>Loading exams...</SelectItem>
                    ) : exams.map((exam) => (
                      <SelectItem 
                        key={exam.id} 
                        value={exam.id}
                      >
                        {exam.name} {exam.subject ? `(${exam.subject})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="evaluator">Select Evaluator</Label>
                <Select value={selectedEvaluator} onValueChange={(val) => setSelectedEvaluator(val || "")}>
                  <SelectTrigger id="evaluator" className="bg-muted/50 border-none">
                    <SelectValue placeholder="Select an evaluator">
                      {selectedEvaluator ? (() => {
                        const ev = evaluators.find(e => e.id === selectedEvaluator);
                        return ev ? `${ev.name || 'Unnamed'} (${ev.email})` : selectedEvaluator;
                      })() : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
                      <SelectItem value="loading" disabled>Loading evaluators...</SelectItem>
                    ) : evaluators.map((ev) => (
                      <SelectItem 
                        key={ev.id} 
                        value={ev.id}
                      >
                        {ev.name || 'Unnamed Evaluator'} ({ev.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Upload Student Answer Scripts (PDFs)</Label>
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 ${
                  isDragging
                    ? "border-primary bg-primary/5 scale-[1.01] shadow-inner"
                    : files.length > 0 
                      ? "border-green-500/50 bg-green-500/5" 
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                  <UploadCloud className={`h-8 w-8 transition-transform duration-300 ${isDragging ? 'scale-110' : ''} ${files.length > 0 ? 'text-green-500' : 'text-primary'}`} />
                </div>
                <h3 className="text-lg font-bold mb-1">
                  {isDragging ? "Drop to upload" : "Drag & drop PDFs here"}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  or click to browse from your computer
                </p>
                <div className="relative inline-block">
                  <Input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={handleFileInput}
                    multiple
                    accept=".pdf"
                  />
                  <Button type="button" variant="secondary" className="shadow-sm font-semibold">
                    Browse Files
                  </Button>
                </div>
              </div>

              {files.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Selected Files ({files.length}):</h4>
                  <ul className="space-y-4">
                    {files.map(({ file, isLinearized }, idx) => (
                      <li key={idx} className="flex flex-col gap-2 p-4 rounded-xl border bg-background/50 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="truncate max-w-[250px] font-bold text-sm">{file.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                          <div className="flex items-center gap-2">
                             {!isLinearized && (
                               <Badge variant="outline" className="text-[9px] border-orange-500/20 text-orange-600 bg-orange-500/5 px-1.5 h-5">
                                 UNOPTIMIZED
                               </Badge>
                             )}
                            {uploadProgress[file.name] && (
                              <Badge variant={uploadProgress[file.name] === "Done" ? "default" : uploadProgress[file.name] === "Failed" ? "destructive" : "outline"} className="h-5 text-[9px]">
                                {uploadProgress[file.name]}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end p-6 bg-muted/20 border-t">
            <Button type="submit" disabled={isSubmitting} className="px-8 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 font-bold">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading... Please wait
                </>
              ) : (
                "Assign Scripts"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
