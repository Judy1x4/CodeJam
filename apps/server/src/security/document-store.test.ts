import { describe, expect, it } from "vitest";
import { searchDocuments } from "./document-store.js";

describe("searchDocuments", () => {
  it("ranks a Project Atlas budget question to FIN-001", () => {
    const results = searchDocuments("What were the approved expenses and budget variance for Project Atlas?");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.document.id).toBe("FIN-001");
  });

  it("returns nothing for a query with no overlapping terms", () => {
    const results = searchDocuments("zzzzz qqqqq nonexistent");
    expect(results).toHaveLength(0);
  });

  it("returns nothing for an empty query", () => {
    expect(searchDocuments("")).toHaveLength(0);
  });

  it("matches Engineering documents independently of Finance documents", () => {
    const results = searchDocuments("deployment runbook rollback");
    expect(results.some((match) => match.document.id === "ENG-001")).toBe(true);
    expect(results.some((match) => match.document.id === "FIN-001")).toBe(false);
  });
});
