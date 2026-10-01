import { describe, it, expect } from "vitest";
import { parseRosterCSV } from "../rosterCsv";

describe("parseRosterCSV", () => {
  it("parses a well-formed roster", () => {
    const csv = "roll_number,name,stream\n23CS001,Ada Lovelace,CS\n23CS002,Grace Hopper,CS\n";
    const result = parseRosterCSV(csv);
    expect(result.validRows).toHaveLength(2);
    expect(result.validRows[0]).toEqual({ roll_number: "23CS001", name: "Ada Lovelace", stream: "CS" });
    expect(result.invalidRowsCount).toBe(0);
    expect(result.duplicateRowsCount).toBe(0);
  });

  it("normalizes roll numbers to trimmed uppercase", () => {
    const csv = "roll number,name\n 23cs001 ,Ada\n";
    const result = parseRosterCSV(csv);
    expect(result.validRows[0].roll_number).toBe("23CS001");
  });

  it("counts rows missing required fields as invalid", () => {
    const csv = "roll_number,name\n23CS001,Ada\n,NoRoll\n23CS003,\n";
    const result = parseRosterCSV(csv);
    expect(result.validRows).toHaveLength(1);
    expect(result.invalidRowsCount).toBe(2);
  });

  it("drops duplicate roll numbers and reports the count", () => {
    const csv = "roll_number,name\n23CS001,Ada\n23CS001,Ada Again\n";
    const result = parseRosterCSV(csv);
    expect(result.validRows).toHaveLength(1);
    expect(result.duplicateRowsCount).toBe(1);
  });

  it("accepts alternate header spellings", () => {
    const csv = "Roll,Student Name,Department\n23CS001,Ada,CS\n";
    const result = parseRosterCSV(csv);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].stream).toBe("CS");
  });

  it("throws when required headers are missing", () => {
    expect(() => parseRosterCSV("foo,bar\n1,2\n")).toThrow(/Missing required CSV headers/);
  });

  it("throws on an empty CSV", () => {
    expect(() => parseRosterCSV("")).toThrow(/CSV Parsing Error/);
  });

  it("strips a leading BOM", () => {
    const csv = "\uFEFFroll_number,name\n23CS001,Ada\n";
    const result = parseRosterCSV(csv);
    expect(result.validRows).toHaveLength(1);
  });
});
