"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCcw, Layers, Users, CheckCircle } from "lucide-react";
import Link from "next/link";
import { ExamSession } from "@/types/operations";
import { cn } from "@/lib/utils";

interface SessionCardProps {
  session: ExamSession;
  onReset: (id: string) => void;
  stats?: {
    totalScripts: number;
    mappedScripts: number;
    evaluatedScripts: number;
  };
}

export function SessionCard({ session, onReset, stats }: SessionCardProps) {
  const mappingProgress = stats ? (stats.mappedScripts / stats.totalScripts) * 100 : 0;
  const evaluationProgress = stats ? (stats.evaluatedScripts / stats.totalScripts) * 100 : 0;

  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg border-slate-200">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-bold uppercase text-[9px] tracking-wider">
            {session.status}
          </Badge>
          <span className="text-[10px] font-medium text-slate-400">
            Created {new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <CardTitle className="text-lg font-bold text-slate-900 truncate" title={session.name}>
          {session.name}
        </CardTitle>
        <CardDescription className="text-xs font-medium text-slate-500">
          {session.academic_year} • {session.semester || 'S2'} • {session.exam_type || 'Main'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 py-4 bg-slate-50/50 space-y-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight text-slate-500">
              <span>Mapping Progress</span>
              <span className="text-slate-900">{Math.round(mappingProgress)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-500" 
                style={{ width: `${mappingProgress}%` }} 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight text-slate-500">
              <span>Evaluation Progress</span>
              <span className="text-slate-900">{Math.round(evaluationProgress)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div 
                className="h-full bg-emerald-600 transition-all duration-500" 
                style={{ width: `${evaluationProgress}%` }} 
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="flex items-center space-x-2">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 leading-none">SCRIPTS</p>
              <p className="text-xs font-bold text-slate-900">{stats?.totalScripts || 0}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 leading-none">MAPPED</p>
              <p className="text-xs font-bold text-slate-900">{stats?.mappedScripts || 0}</p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 border-t bg-white flex justify-between gap-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="text-[11px] font-bold h-8 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
          onClick={() => onReset(session.id)}
        >
          <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
          Reset
        </Button>
        <Link href={`/admin/operations/${session.id}`} className="flex-1">
          <Button size="sm" className="w-full text-[11px] font-bold h-8 bg-slate-900 shadow-sm transition-all hover:bg-slate-800">
            Manage Workflow
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
