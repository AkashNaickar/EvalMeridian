/**
 * Enforces a canonical normalized string format for roll numbers.
 * Standard: String(value).trim().toUpperCase()
 */
export const normalizeRollNumber = (value: any): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim().toUpperCase();
};

/**
 * Extracts a normalized roll number from a filename.
 * Example: "23CS001.pdf" -> "23CS001"
 * Strips extension and applies canonical normalization.
 */
export const extractRollNumber = (fileName: string): string => {
  if (!fileName) return "";
  
  // 1. Remove extension (e.g., .pdf)
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
  
  // 2. Canonical normalization
  return normalizeRollNumber(nameWithoutExt);
};

/**
 * Validates if a roll number string follows a basic expected format.
 * (Adjust regex based on specific institutional patterns if needed)
 */
export const isValidRollNumber = (rollNumber: string): boolean => {
  const normalized = normalizeRollNumber(rollNumber);
  return normalized.length >= 3 && /^[A-Z0-9-]+$/.test(normalized);
};
