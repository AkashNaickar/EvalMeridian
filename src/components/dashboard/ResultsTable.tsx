"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Download, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type Script = {
  id: string;
  examId: string;
  evaluatorId: string;
  studentId: string;
  subject: string;
  status: "Pending" | "Completed";
  totalMarks?: number;
  comments?: string;
  isReleased?: boolean;
};

interface ResultsTableProps {
  scripts: Script[];
  onToggleRelease?: (id: string, isReleased: boolean) => void;
}

export default function ResultsTable({ scripts, onToggleRelease }: ResultsTableProps) {
  const { role } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const subjects = useMemo(() => {
    const s = new Set(scripts.map(s => s.subject));
    return Array.from(s);
  }, [scripts]);

  const filteredScripts = useMemo(() => {
    return scripts.filter(script => {
      const matchesSearch = script.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = subjectFilter === "all" || script.subject === subjectFilter;
      return matchesSearch && matchesSubject;
    });
  }, [scripts, searchQuery, subjectFilter]);

  const downloadCSV = () => {
    if (filteredScripts.length === 0) {
      toast.error("No data to download.");
      return;
    }

    const headers = ["Script ID", "Subject", "Status", "Total Marks", "Comments"];
    const rows = filteredScripts.map(s => [
      s.id,
      `"${(s.subject || "").replace(/"/g, '""')}"`,
      s.status,
      s.totalMarks ?? "N/A",
      `"${(s.comments ?? "").replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `marklist_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Marklist downloaded successfully!");
  };

  return (
    <div className="space-y-4">
      {/* Institutional Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-md border border-border/50 shadow-sm">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:max-w-[280px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted/60" />
            <Input
              placeholder="Search by script identity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-secondary/10"
            />
          </div>
          <Select value={subjectFilter} onValueChange={(val) => setSubjectFilter(val || "all")}>
            <SelectTrigger className="w-[180px] h-9 bg-secondary/10">
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map(subject => (
                <SelectItem key={subject} value={subject}>{subject}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          variant="outline"
          size="sm"
          onClick={downloadCSV} 
          className="h-9 font-bold"
        >
          <Download className="mr-2 h-3.5 w-3.5" /> 
          Export dataset
        </Button>
      </div>

      {/* Production Grade Data Grid */}
      <div className="rounded-md border border-border/50 bg-white shadow-premium overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/10">
            <TableRow>
              <TableHead className="text-label-text font-bold uppercase tracking-widest text-text-muted p-4 h-12">Script identity</TableHead>
              <TableHead className="text-label-text font-bold uppercase tracking-widest text-text-muted p-4 h-12">Subject</TableHead>
              <TableHead className="text-label-text font-bold uppercase tracking-widest text-text-muted p-4 h-12">Status</TableHead>
              <TableHead className="text-label-text font-bold uppercase tracking-widest text-text-muted p-4 h-12">Score</TableHead>
              <TableHead className="text-label-text font-bold uppercase tracking-widest text-text-muted p-4 h-12">Protocol</TableHead>
              <TableHead className="text-label-text font-bold uppercase tracking-widest text-text-muted p-4 h-12">Observations</TableHead>
              <TableHead className="text-label-text font-bold uppercase tracking-widest text-text-muted p-4 h-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredScripts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center bg-secondary/5">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-body-text font-medium text-text-muted/60 italic">No evaluation records match your current criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredScripts.map((script) => (
                <TableRow key={script.id} className="group hover:bg-secondary/5 transition-colors border-b border-border/5 last:border-0">
                  <TableCell className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-secondary/20 group-hover:bg-primary/10 transition-colors">
                        <FileText className="h-3.5 w-3.5 text-text-muted group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-mono-code font-bold text-text-primary" title={script.id}>
                        {script.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="p-4">
                    <span className="text-caption font-semibold text-text-secondary uppercase tracking-tight">{script.subject}</span>
                  </TableCell>
                  <TableCell className="p-4">
                    <Badge variant={script.status === "Completed" ? "success" : "secondary"}>
                      {script.status === "Completed" ? "verified" : "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-4">
                    <div className="text-mono-code font-bold text-text-primary">
                      {script.totalMarks !== undefined ? (
                        <div className="flex items-center gap-1.5">
                          <span className="bg-secondary/20 px-2 py-0.5 rounded border border-border/5 text-sm">
                            {String(script.totalMarks).padStart(2, '0')}
                          </span>
                          <span className="text-[10px] text-text-muted font-bold">/ 100</span>
                        </div>
                      ) : (
                        <span className="text-text-muted/20">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-4">
                    {onToggleRelease && (role === 'admin' || role === 'teacher') ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleRelease(script.id, !script.isReleased)}
                        className={cn(
                          "h-7 px-3 text-[10px] font-bold uppercase tracking-[0.1em] rounded-md border transition-all",
                          script.isReleased 
                            ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" 
                            : "bg-secondary/20 text-text-muted border-border/10 hover:bg-secondary/30"
                        )}
                      >
                        {script.isReleased ? "Released" : "Private"}
                      </Button>
                    ) : (
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-[0.1em] px-2",
                        script.isReleased ? "text-primary" : "text-text-muted"
                      )}>
                        {script.isReleased ? "Released" : "Private"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="p-4">
                    <p className="text-caption text-text-secondary italic max-w-[200px] truncate font-medium" title={script.comments || "No observations provided."}>
                      {script.comments || "No observations provided."}
                    </p>
                  </TableCell>
                  <TableCell className="p-4 text-right">
                    <Link href={`/evaluator/canvas/${script.id}`}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-3 text-[11px] font-bold text-primary hover:bg-primary/5 transition-all gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
