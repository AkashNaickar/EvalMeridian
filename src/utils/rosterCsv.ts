import { CSVParseResult, StudentRosterRow } from "@/types/roster";
import Papa from "papaparse";
import { normalizeRollNumber } from "./studentMapping";

export const parseRosterCSV = (str: string): CSVParseResult => {
  // Strip BOM if present
  const cleanStr = str.replace(/^\uFEFF/, '');

  const parsed = Papa.parse<Record<string, string>>(cleanStr, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().toLowerCase().replace(/[^a-z_]/g, ''),
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(`CSV Parsing Error: ${parsed.errors[0].message}`);
  }

  if (parsed.data.length === 0) {
    throw new Error("CSV appears to be empty.");
  }

  // Ensure required headers exist in the parsed output keys
  const headers = parsed.meta.fields || [];
  
  const rollKey = headers.find(h => h === "rollnumber" || h === "roll_number" || h === "roll");
  const nameKey = headers.find(h => h === "name" || h === "studentname");
  const streamKey = headers.find(h => h === "stream" || h === "department");

  if (!rollKey || !nameKey) {
    const missing = [];
    if (!rollKey) missing.push("roll_number");
    if (!nameKey) missing.push("name");
    throw new Error(`Missing required CSV headers: ${missing.join(", ")}. Found: ${headers.join(", ")}`);
  }

  const validRows: StudentRosterRow[] = [];
  const duplicates = new Set<string>();
  let invalidRowsCount = 0;
  let duplicateRowsCount = 0;

  for (const row of parsed.data) {
    const roll = normalizeRollNumber(row[rollKey]);
    const name = row[nameKey]?.trim();
    const stream = streamKey ? row[streamKey]?.trim() : null;

    if (!roll || !name) { 
      invalidRowsCount++; 
      continue; 
    }
    
    // Detect duplicates within the uploaded CSV
    if (duplicates.has(roll)) { 
      duplicateRowsCount++;
      continue; 
    }

    duplicates.add(roll);
    validRows.push({ roll_number: roll, name, stream: stream || null });
  }

  return {
    validRows,
    invalidRowsCount,
    duplicateRowsCount,
    totalParsed: parsed.data.length
  };
};
