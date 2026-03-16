"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import Link from "next/link";

export default function NewExamSession() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    exam_type: "Midterm",
    academic_year: new Date().getFullYear().toString() + "-" + (new Date().getFullYear() + 1).toString().substring(2),
    semester: "Spring",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Session Name is required.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from("exam_sessions")
        .insert([{
          name: formData.name.trim(),
          exam_type: formData.exam_type,
          academic_year: formData.academic_year,
          semester: formData.semester,
          status: 'Setup'
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      toast.success("Exam session created successfully.");
      router.push(`/admin/operations/${data.id}`);
      
    } catch (err: any) {
      toast.error(`Failed to create session: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-500 mt-8">
      <Link href="/admin/operations" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Operations
      </Link>
      
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Create Exam Session</h2>
        <p className="text-muted-foreground mt-1">
          Initialize a new evaluation cycle with specific term configurations before importing rosters.
        </p>
      </div>

      <Card className="shadow-sm border-muted/60">
        <form onSubmit={handleSubmit}>
          <CardHeader className="bg-muted/10 pb-6 border-b">
            <CardTitle className="text-xl text-slate-900">Session Metadata</CardTitle>
            <CardDescription>Enter the descriptive details for this examination period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Session Name <span className="text-destructive">*</span></Label>
              <Input 
                id="name" 
                placeholder="e.g. Computer Science Spring Midterms 2026" 
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
                className="h-10 bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-950 transition-all font-medium"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="exam_type" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Exam Type</Label>
                <Select value={formData.exam_type} onValueChange={(val) => handleSelectChange("exam_type", val || "")} disabled={isSubmitting}>
                  <SelectTrigger id="exam_type" className="h-10 bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quiz">Quiz</SelectItem>
                    <SelectItem value="Midterm">Midterm</SelectItem>
                    <SelectItem value="Final">Final</SelectItem>
                    <SelectItem value="Supplementary">Supplementary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="semester" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Semester / Term</Label>
                <Select value={formData.semester} onValueChange={(val) => handleSelectChange("semester", val || "")} disabled={isSubmitting}>
                  <SelectTrigger id="semester" className="h-10 bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fall">Fall</SelectItem>
                    <SelectItem value="Winter">Winter</SelectItem>
                    <SelectItem value="Spring">Spring</SelectItem>
                    <SelectItem value="Summer">Summer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="academic_year" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Academic Year</Label>
              <Input 
                id="academic_year" 
                placeholder="e.g. 2026-27" 
                value={formData.academic_year}
                onChange={handleChange}
                disabled={isSubmitting}
                className="h-10 bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-950 transition-all max-w-[150px]"
              />
            </div>

          </CardContent>
          <CardFooter className="bg-muted/5 border-t p-6 flex justify-end gap-3">
             <Button variant="ghost" type="button" onClick={() => router.push("/admin/operations")} disabled={isSubmitting} className="font-bold text-slate-500">
               Cancel
             </Button>
             <Button type="submit" disabled={isSubmitting} className="font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm ring-1 ring-blue-700 transition-all px-8">
               {isSubmitting ? (
                 <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
               ) : (
                 <><Save className="mr-2 h-4 w-4" /> Initialize Session</>
               )}
             </Button>
          </CardFooter>
        </form>
      </Card>
      
    </div>
  );
}
