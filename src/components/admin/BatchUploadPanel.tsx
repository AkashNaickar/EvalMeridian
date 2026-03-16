"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { UploadCloud, Loader2, PackagePlus } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { extractRollNumber, normalizeRollNumber } from "@/utils/studentMapping";
import { useRouter } from "next/navigation";

interface BatchUploadPanelProps {
  sessionId: string;
  onSuccess?: () => void;
}

export function BatchUploadPanel({ sessionId, onSuccess }: BatchUploadPanelProps) {
  const router = useRouter();
  const [paperCode, setPaperCode] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: string }>({});

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        file => file.type === "application/pdf"
      );
      
      if (droppedFiles.length !== e.dataTransfer.files.length) {
        toast.warning("Only PDF files are accepted.");
      }
      
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files).filter(
        file => file.type === "application/pdf"
      );
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    const newProgress = {...uploadProgress};
    delete newProgress[files[index].name];
    setUploadProgress(newProgress);
  };

  const generateAnonymousCode = (paper: string) => {
    const randomHex = Math.random().toString(16).substring(2, 7).toUpperCase();
    const safePaper = paper.replace(/[^A-Z0-9]/ig, '').substring(0, 5).toUpperCase();
    return `${safePaper}-ANON-${randomHex}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paperCode.trim() || !batchCode.trim()) {
      toast.error("Paper Code and Batch Code are required.");
      return;
    }
    if (files.length === 0) {
      toast.error("Please add at least one PDF script to this batch.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress({});
    
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Create Script Batch
      const { data: batch, error: batchError } = await supabase
        .from("script_batches")
        .insert([{
          exam_session_id: sessionId,
          paper_code: paperCode.trim(),
          batch_code: batchCode.trim(),
          uploaded_by: user?.id,
          total_scripts: files.length,
          status: 'Uploaded'
        }])
        .select()
        .single();
      
      if (batchError) throw batchError;

      // 2. Upload PDFs & Insert Scripts
      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split('.').pop() || 'pdf';
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const fileName = `${Math.random().toString(36).substring(2, 10)}_${Date.now()}_${safeName}`;
        
        // Use professional bucket path architecture
        const basePath = `exam-sessions/${sessionId}/${batch.paper_code}/${batch.batch_code}`;
        const filePath = `${basePath}/${fileName}`;

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

        const extractedRoll = normalizeRollNumber(extractRollNumber(file.name));
        const anonCode = generateAnonymousCode(batch.paper_code);

        return {
          exam_session_id: sessionId,
          batch_id: batch.id,
          file_url: publicUrl,
          file_path: filePath,
          original_filename: file.name,
          roll_number: extractedRoll, // Kept for auto-mapping engine later
          anonymous_code: anonCode,
          status: "pending",
          mapping_status: extractedRoll ? "unmapped" : "mapping_error"
        };
      });

      const scriptData = await Promise.all(uploadPromises);
      
      // 3. Insert Scripts to DB
      const { error: insertError } = await supabase
        .from("scripts")
        .insert(scriptData);
      
      if (insertError) throw insertError;

      files.forEach(f => setUploadProgress(prev => ({ ...prev, [f.name]: "Done" })));
      
      toast.success(`Batch ${batch.batch_code} created. ${files.length} scripts uploaded.`);
      
      setPaperCode("");
      setBatchCode("");
      setFiles([]);
      router.refresh();
      if (onSuccess) onSuccess();
      
    } catch (error: any) {
      console.error("Batch Upload Error:", error);
      toast.error(`Error uploading batch: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-sm border-slate-200 bg-white">
      <form onSubmit={handleSubmit}>
        <CardHeader className="bg-slate-50/50 border-b py-4">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
            <PackagePlus className="h-4 w-4 text-slate-400" />
            Ingest Script Batch
          </CardTitle>
          <CardDescription className="text-xs">
            Assemble scanned submissions into structured batches for evaluation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-4">
            <div className="space-y-2">
              <Label htmlFor="paperCode" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject Context</Label>
              <Input 
                id="paperCode" 
                placeholder="E.G. CS-401" 
                value={paperCode}
                onChange={(e) => setPaperCode(e.target.value.toUpperCase())}
                disabled={isSubmitting}
                className="font-mono uppercase transition-all border-slate-200 focus:ring-blue-500/20 text-sm h-10 italic"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="batchCode" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Batch ID</Label>
              <Input 
                id="batchCode" 
                placeholder="E.G. B1-MORN" 
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value.toUpperCase())}
                disabled={isSubmitting}
                className="font-mono uppercase transition-all border-slate-200 focus:ring-blue-500/20 text-sm h-10 italic"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-xs font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 block">Payload Delivery</Label>
            <div
              className={`border-2 border-dashed rounded-2xl py-12 px-6 text-center transition-all duration-500 ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50 scale-[1.01] shadow-lg shadow-blue-500/10"
                  : files.length > 0 
                  ? "border-emerald-200 bg-emerald-50/20" 
                  : "border-slate-200 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-300"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Input
                type="file"
                multiple
                accept="application/pdf"
                className="hidden"
                id="file-upload"
                onChange={handleFileInput}
                disabled={isSubmitting}
              />
              
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className={`p-4 rounded-2xl shadow-sm border transition-all duration-300 ${files.length > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
                   <UploadCloud className={`h-8 w-8 ${files.length > 0 ? 'text-emerald-500' : 'text-slate-400'}`} />
                </div>
                
                {files.length === 0 ? (
                  <div className="max-w-xs mx-auto">
                    <h3 className="font-bold text-slate-900 mb-1">Upload Answer Scripts</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6">
                      Drag PDF assets here or click to browse. System will attempt auto-mapping via filename detection.
                    </p>
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <div className="bg-slate-900 text-white hover:bg-slate-800 h-9 px-8 py-2 rounded-lg inline-flex text-xs font-bold shadow-sm transition-all active:scale-95">
                        Choose Files
                      </div>
                    </Label>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-bold text-emerald-900 mb-1">{files.length} Assets Staged</h3>
                    <div className="mt-4 flex gap-4 justify-center">
                       <Label htmlFor="file-upload" className="cursor-pointer text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider">
                         Add Assets
                       </Label>
                       <button type="button" onClick={() => setFiles([])} className="text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider" disabled={isSubmitting}>
                         Purge All
                       </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar border border-slate-100 rounded-xl p-3 bg-slate-50/30">
                {files.map((file, i) => (
                   <div key={`${file.name}-${i}`} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-xs group animate-in fade-in slide-in-from-left-2 transition-all">
                     <div className="overflow-hidden flex-1 flex items-center gap-3">
                       <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 italic">
                         PDF
                       </div>
                       <div className="min-w-0">
                         <p className="text-[11px] font-bold text-slate-900 truncate pr-2" title={file.name}>{file.name}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                           {uploadProgress[file.name] || `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                         </p>
                       </div>
                     </div>
                     {!isSubmitting && (
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="h-7 w-7 text-slate-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2 hover:bg-red-50 hover:text-red-500 rounded-md"
                         onClick={() => removeFile(i)}
                         type="button"
                       >
                         <span className="text-lg">&times;</span>
                       </Button>
                     )}
                     {uploadProgress[file.name] === "Uploading..." && (
                       <Loader2 className="h-4 w-4 animate-spin text-blue-500 ml-2 flex-shrink-0" />
                     )}
                   </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t py-6 px-8 flex justify-end gap-4">
           <Button type="button" variant="ghost" className="text-slate-500 font-bold text-xs" onClick={() => {setFiles([]); setBatchCode(""); setPaperCode("");}} disabled={isSubmitting}>
             Reset
           </Button>
           <Button type="submit" disabled={isSubmitting || files.length === 0} className="font-bold bg-slate-900 text-white px-10 shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all h-10">
             {isSubmitting ? (
               <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
             ) : (
               <><UploadCloud className="mr-2 h-4 w-4" /> Finalize Ingestion</>
             )}
           </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
