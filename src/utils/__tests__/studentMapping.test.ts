import { describe, it, expect } from "vitest";
import { normalizeRollNumber, extractRollNumber, isValidRollNumber } from "../studentMapping";

describe("normalizeRollNumber", () => {
  it("trims and uppercases", () => {
    expect(normalizeRollNumber(" 23cs001 ")).toBe("23CS001");
  });

  it("returns empty string for null/undefined", () => {
    expect(normalizeRollNumber(null)).toBe("");
    expect(normalizeRollNumber(undefined)).toBe("");
  });

  it("stringifies numeric input", () => {
    expect(normalizeRollNumber(1234)).toBe("1234");
  });
});

describe("extractRollNumber", () => {
  it("strips the extension and normalizes", () => {
    expect(extractRollNumber("23CS001.pdf")).toBe("23CS001");
    expect(extractRollNumber("23cs001.PDF")).toBe("23CS001");
  });

  it("handles names with multiple dots", () => {
    expect(extractRollNumber("23.CS.001.pdf")).toBe("23.CS.001");
  });

  it("returns empty for empty input", () => {
    expect(extractRollNumber("")).toBe("");
  });
});

describe("isValidRollNumber", () => {
  it("accepts alphanumeric roll numbers of length >= 3", () => {
    expect(isValidRollNumber("23CS001")).toBe(true);
    expect(isValidRollNumber("A1-22")).toBe(true);
  });

  it("rejects too-short values", () => {
    expect(isValidRollNumber("A1")).toBe(false);
  });

  it("rejects values with special characters or spaces", () => {
    expect(isValidRollNumber("23 CS!")).toBe(false);
    expect(isValidRollNumber("")).toBe(false);
  });
});
