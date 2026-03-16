"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, UploadCloud, FileCheck2, AlertTriangle } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { parseRosterCSV } from "@/utils/rosterCsv";
import { CSVParseResult } from "@/types/roster";
import { RosterTemplateDownload } from "./RosterTemplateDownload";
import { useRouter } from "next/navigation";

export function StudentImportPanel() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [preview, setPreview] = useState<CSVParseResult | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProgressMsg("Parsing & Validating...");
    
    try {
      const text = await file.text();
      const parsed = parseRosterCSV(text);
      setPreview(parsed);
    } catch (err: any) {
      toast.error(`Invalid CSV: ${err.message}`);
      setPreview(null);
    } finally {
      setIsProcessing(false);
      setProgressMsg("");
      e.target.value = ""; // Always reset input so the same file can be re-selected
    }
  };

  const handleUpload = async () => {
    if (!preview || preview.validRows.length === 0) return;
    
    setIsProcessing(true);
    let inserted = 0;
    
    try {
      const batchSize = 500;
      const total = preview.validRows.length;
      
      for (let i = 0; i < total; i += batchSize) {
        const chunk = preview.validRows.slice(i, i + batchSize);
        setProgressMsg(`Uploading batch ${Math.ceil((i+1)/batchSize)} of ${Math.ceil(total/batchSize)}...`);
        
        const { error } = await supabase.from("students").upsert(chunk, { onConflict: "roll_number" });
        if (error) throw error;
        
        inserted += chunk.length;
      }
      
      toast.success(`Import complete! Upserted ${inserted} students.`);
      setPreview(null);
      router.refresh();
      
    } catch (err: any) {
      toast.error(`Import failed at batch. ${err.message}`);
    } finally {
      setIsProcessing(false);
      setProgressMsg("");
    }
  };

  return (
    <Card className="shadow-sm border-slate-200 bg-white">
      <CardHeader className="bg-slate-50/50 border-b py-4">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Import Master Roster</CardTitle>
            <CardDescription className="text-xs">
              Upload students via CSV: <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px] font-bold text-slate-700 font-mono">roll_number, name, stream</code>
            </CardDescription>
          </div>
          <RosterTemplateDownload />
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        
        {!preview ? (
          <div className="border-2 border-dashed rounded-xl p-10 text-center bg-slate-50/30 border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 transition-all group">
            <div className="bg-white p-4 rounded-full shadow-sm border border-slate-100 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="h-6 w-6 text-slate-400 group-hover:text-blue-500" />
            </div>
            <div className="relative">
              <Input 
                type="file" 
                accept=".csv" 
                disabled={isProcessing}
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              />
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700">Drop your student roster here</p>
                  <p className="text-xs text-slate-400">CSV files only, up to 10MB</p>
                </div>
                <Button disabled={isProcessing} variant="outline" className="font-bold border-slate-200 shadow-sm px-8">
                  {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> {progressMsg}</> : "Browse Files"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-center">
                <p className="text-2xl font-bold text-blue-600 tracking-tight">{preview.validRows.length}</p>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Valid Records</p>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-center">
                <p className="text-2xl font-bold text-red-500 tracking-tight">{preview.invalidRowsCount}</p>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Invalid</p>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-center">
                <p className="text-2xl font-bold text-amber-500 tracking-tight">{preview.duplicateRowsCount}</p>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Duplicates</p>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-center">
                <p className="text-2xl font-bold text-slate-900 tracking-tight">{preview.totalParsed}</p>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Total</p>
              </div>
            </div>
            
            {preview.invalidRowsCount > 0 && (
               <div className="flex items-start gap-3 text-xs text-amber-700 bg-amber-50/50 p-4 rounded-xl border border-amber-100 italic">
                 <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                 <p>Notice: {preview.invalidRowsCount} records will be ignored due to structural issues or missing primary keys.</p>
               </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="ghost" className="font-bold text-slate-500" onClick={() => setPreview(null)} disabled={isProcessing}>Abandon</Button>
              <Button 
                onClick={handleUpload} 
                disabled={isProcessing || preview.validRows.length === 0}
                className="font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm ring-1 ring-blue-700 transition-all px-8 border-none"
              >
                {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> {progressMsg}</> : <><FileCheck2 className="mr-2 h-4 w-4"/> Commit Records</>}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
