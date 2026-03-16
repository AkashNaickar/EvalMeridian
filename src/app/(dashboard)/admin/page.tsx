import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, FileText, CheckSquare, BarChart3, Activity, ShieldCheck, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  return (
    <div className="container-admin py-8 space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div>
        <h1 className="text-page-title">Overview</h1>
        <p className="text-body-text mt-1.5 font-medium">System performance and administrative summary.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Users", value: "1,204", trend: "+12% from last term", icon: Users, color: "text-blue-600" },
          { label: "Active Exams", value: "14", trend: "2 ending today", icon: FileText, color: "text-amber-600" },
          { label: "Scripts Intake", value: "8,452", trend: "98% Processing", icon: CheckSquare, color: "text-emerald-600" },
          { label: "Evaluated", value: "3,120", trend: "+412 today", icon: BarChart3, color: "text-purple-600" },
        ].map((kpi, i) => (
          <Card key={i} className="hover:border-primary/20 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-secondary/10">
              <CardTitle className="text-label-text text-text-muted font-bold tracking-tight uppercase">{kpi.label}</CardTitle>
              <kpi.icon className="h-4 w-4 text-text-muted/60" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-metric-value">{kpi.value}</div>
              <div className="mt-2 text-caption flex items-center gap-1.5 font-semibold">
                <span className={cn("inline-block w-1.5 h-1.5 rounded-full", kpi.color.replace('text', 'bg'))} />
                {kpi.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Information Sections */}
      <div className="grid gap-8 md:grid-cols-5">
        <Card className="md:col-span-3 border-border/50">
          <CardHeader className="border-b border-border/10 bg-secondary/10">
            <CardTitle className="text-section-title">System activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/10">
              {[
                { event: "Batch C-102 uploaded", time: "12m ago", status: "success" },
                { event: "Evaluator J. Doe session started", time: "24m ago", status: "info" },
                { event: "Result set 'Midterm CS-501' released", time: "1h ago", status: "warning" },
                { event: "Auto-mapping engine completed", time: "2h ago", status: "success" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      item.status === "success" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : 
                      item.status === "warning" ? "bg-amber-500" : "bg-blue-500"
                    )} />
                    <span className="text-body-text font-semibold text-text-primary">{item.event}</span>
                  </div>
                  <span className="text-mono-code text-text-muted opacity-60 group-hover:opacity-100 transition-opacity">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Access Log / Monitor Monitor */}
        <Card className="md:col-span-2 bg-sidebar text-white border-sidebar-border shadow-lg">
          <CardHeader className="border-b border-sidebar-border bg-sidebar-accent/20">
             <div className="flex items-center justify-between">
                <CardTitle className="text-section-title text-white">Security monitor</CardTitle>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
             </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-label-text text-sidebar-foreground/50">
                  <span className="uppercase tracking-widest font-bold">Network latency</span>
                  <span className="text-white font-mono">12ms</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-sidebar-border overflow-hidden">
                  <div className="h-full w-[85%] bg-emerald-500 rounded-full" />
                </div>
              </div>
              
              <div className="pt-4 space-y-4 border-t border-sidebar-border/50">
                 <p className="text-label-text text-sidebar-foreground/50 uppercase tracking-widest font-bold">Active evaluators</p>
                 <div className="flex items-center gap-2">
                    {[1,2,3,4,5,6].map(i => (
                      <div key={i} className="h-8 w-8 rounded-md bg-sidebar-accent/50 border border-sidebar-border flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-transparent transition-all hover:ring-primary">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                    <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-xs font-bold text-white shadow-sm hover:bg-primary/90 transition-colors">
                      +12
                    </div>
                 </div>
                 <p className="text-caption text-sidebar-foreground/40 mt-3 font-medium">Real-time encrypted connection active.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
