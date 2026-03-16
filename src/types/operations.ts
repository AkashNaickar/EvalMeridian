export type ExamSessionStatus = 'Setup' | 'Ready for Evaluation' | 'Evaluation in Progress' | 'Completed' | 'Archived';

export interface ExamSession {
  id: string;
  name: string;
  exam_type: string | null;
  academic_year: string | null;
  semester: string | null;
  status: ExamSessionStatus;
  created_at: string;
  updated_at: string;
}

export type ScriptBatchStatus = 'Pending' | 'Uploaded' | 'Mapped' | 'Ready for Evaluation';

export interface ScriptBatch {
  id: string;
  exam_session_id: string;
  paper_code: string;
  batch_code: string;
  uploaded_by: string | null;
  total_scripts: number;
  status: ScriptBatchStatus;
  created_at: string;
  updated_at: string;
  
  // Relations
  exam_sessions?: ExamSession; // Supabase joined property
}

export interface OpsScript {
  id: string;
  exam_session_id: string | null;
  batch_id: string | null;
  file_url: string;
  file_path: string | null;
  original_filename: string | null;
  roll_number: string | null;
  anonymous_code: string | null;
  student_id: string | null;
  mapping_status: string;
  status: string;
  evaluator_id: string | null;
  created_at: string;
}
