"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function RosterTemplateDownload() {
  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,roll_number,name,stream\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_roster_template.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8,roll_number,name,stream\n2024CS001,John Doe,Computer Science\n2024EE012,Jane Smith,Electrical\n2024ME003,Bob Johnson,Mechanical\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_roster_sample.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={downloadTemplate} className="text-xs">
        <Download className="mr-2 h-3 w-3" />
        Blank Template
      </Button>
      <Button variant="outline" size="sm" onClick={downloadSample} className="text-xs">
        <Download className="mr-2 h-3 w-3" />
        Sample File
      </Button>
    </div>
  );
}
