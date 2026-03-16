export interface StudentRosterRow {
  roll_number: string;
  name: string;
  stream: string | null;
}

export interface CSVParseResult {
  validRows: StudentRosterRow[];
  invalidRowsCount: number;
  duplicateRowsCount: number;
  totalParsed: number;
}

export type MappingStatus = 'unmapped' | 'mapped' | 'ambiguous' | 'manually_mapped' | 'mapping_error';

export interface UnmappedScript {
  id: string;
  file_url: string;
  roll_number: string | null;
  mapping_status: MappingStatus;
  status: string;
  created_at: string;
}

export interface MappingRunnerSummary {
  mapped: number;
  unmapped: number;
  ambiguous: number;
  errors: number;
}
