import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BookOpen, FileText, CheckSquare, BarChart3 } from "lucide-react";

export default function TeacherDashboard() {
  return (
    <div className="container-admin py-8 space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div>
        <h1 className="text-page-title">Overview</h1>
        <p className="text-body-text mt-1.5 font-medium">Manage your academic courses and assessment lifecycles.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Active Courses", value: "4", icon: BookOpen, trend: "Spring Term 2024" },
          { label: "Assessments", value: "2", icon: FileText, trend: "1 Published, 1 Draft" },
          { label: "Resources", value: "18", icon: CheckSquare, trend: "4 New uploads today" },
        ].map((kpi, i) => (
          <Card key={i} className="hover:border-primary/20 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-secondary/10">
              <CardTitle className="text-label-text text-text-muted font-bold tracking-tight uppercase">{kpi.label}</CardTitle>
              <kpi.icon className="h-4 w-4 text-text-muted/60" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-metric-value">{kpi.value}</div>
              <div className="mt-2 text-caption font-semibold text-text-muted">
                {kpi.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         {/* Placeholder for Recent Results or similar */}
         <Card className="border-border/50">
            <CardHeader className="border-b border-border/10 bg-secondary/10">
              <CardTitle className="text-section-title">Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-3">
               <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-text-muted/40" />
               </div>
               <p className="text-body-text text-text-muted max-w-[200px]">No recent assessment results published.</p>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
