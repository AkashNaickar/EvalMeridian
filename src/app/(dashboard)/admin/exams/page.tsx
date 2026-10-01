"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, AlertTriangle, Plus, Loader2 } from "lucide-react";

type Exam = {
  id: string;
  name: string;
  subject: string;
  date: string;
  status: "Upcoming" | "In Progress" | "Completed";
};
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/utils/supabase/client";
import { useEffect } from "react";

export default function ExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newExam, setNewExam] = useState<Partial<Exam>>({
    status: "Upcoming",
  });
  const [examToDelete, setExamToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("exams")
      .select("id, name, subject, date, status")
      .order("created_at", { ascending: false })
      .order("date", { ascending: false });
      
    if (error) {
      toast.error("Failed to fetch exams");
      console.error(error);
    } else {
      setExams(data || []);
    }
    setIsLoading(false);
  };

  const handleCreateExam = async () => {
    if (!newExam.name || !newExam.subject || !newExam.date) {
      toast.error("Please fill in all fields.");
      return;
    }

    const { error } = await supabase.from("exams").insert({
      name: newExam.name,
      subject: newExam.subject,
      date: newExam.date,
      status: newExam.status,
    });

    if (error) {
      toast.error("Failed to create exam: " + error.message);
      return;
    }

    setIsDialogOpen(false);
    setNewExam({ name: "", subject: "", date: "", status: "Upcoming" });
    toast.success("Exam created successfully!");
    fetchExams();
  };

  const handleDeleteExam = async () => {
    if (!examToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("exams")
        .delete()
        .eq("id", examToDelete);

      if (error) throw error;

      toast.success("Exam and all associated data deleted successfully.");
      fetchExams();
    } catch (error: any) {
      toast.error("Failed to delete exam: " + error.message);
    } finally {
      setIsDeleting(false);
      setExamToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Manage Exams</h2>
          <p className="text-muted-foreground mt-1">
            Create and monitor examination sessions.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm ring-1 ring-blue-700 transition-all font-bold" />}>
            <Plus className="mr-2 h-4 w-4" /> Create Exam
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Exam</DialogTitle>
              <DialogDescription>
                Enter the details of the new examination. Click save when you&apos;re done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Exam Name
                </Label>
                <Input
                  id="name"
                  value={newExam.name}
                  onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
                  className="col-span-3"
                  placeholder="e.g. Midterm Physics"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="subject" className="text-right">
                  Subject
                </Label>
                <Input
                  id="subject"
                  value={newExam.subject}
                  onChange={(e) => setNewExam({ ...newExam, subject: e.target.value })}
                  className="col-span-3"
                  placeholder="e.g. Physics"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={newExam.date}
                  onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select
                  value={newExam.status}
                  onValueChange={(value) => setNewExam({ ...newExam, status: value as Exam["status"] })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Upcoming">Upcoming</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateExam}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-semibold">Exam Name</TableHead>
              <TableHead className="font-semibold">Subject</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Loading exams...
                </TableCell>
              </TableRow>
            ) : exams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No exams found. Click &quot;Create Exam&quot; to get started.
                </TableCell>
              </TableRow>
            ) : (
              exams.map((exam) => (
                <TableRow key={exam.id} className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">{exam.name}</TableCell>
                  <TableCell>{exam.subject}</TableCell>
                  <TableCell>{exam.date}</TableCell>
                  <TableCell>
                    <Badge variant={
                      exam.status === "Completed" ? "default" :
                      exam.status === "In Progress" ? "secondary" : "outline"
                    } className={
                      exam.status === "Completed" ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400" :
                      exam.status === "In Progress" ? "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400" :
                      "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }>
                      {exam.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={() => setExamToDelete(exam.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!examToDelete} onOpenChange={(open) => !open && setExamToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="py-2">
              Are you absolute sure you want to delete this exam? 
              <br /><br />
              <span className="font-bold text-foreground">Warning:</span> This will permanently remove all associated student scripts, evaluations, and resource files. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setExamToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteExam} disabled={isDeleting} className="font-bold">
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Exam"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
