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
  status: string;
  created_at: string;
}
