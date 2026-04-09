export type UserRole = "admin" | "teacher" | "evaluator" | "student";

export type ScriptStatus = "pending" | "evaluated" | "completed" | "flagged_ufm";

export interface Student {
  id: string;
  roll_number: string;
  name: string;
  stream: string | null;
  created_at: string;
}

export interface CSVStudentRow {
  roll_number: string;
  name: string;
  stream: string;
}

export interface UnmappedScript {
  id: string;
  file_url: string;
  roll_number: string | null;
  status: ScriptStatus;
  created_at: string;
}
