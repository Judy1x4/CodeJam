import { describe, expect, it } from "vitest";
import { agentGrantProfiles, demoPrincipals, protectedDocuments } from "./fixtures.js";
import { evaluateDocumentAccess } from "./policy.js";

const alice = demoPrincipals.find((principal) => principal.id === "alice-finance")!;
const bob = demoPrincipals.find((principal) => principal.id === "bob-engineering")!;
const financeDoc = protectedDocuments.find((document) => document.id === "FIN-001")!;
const restrictedDoc = protectedDocuments.find((document) => document.id === "HR-001")!;

describe("evaluateDocumentAccess", () => {
  it("allows the Finance principal through the Finance Analyst Agent grant", () => {
    const result = evaluateDocumentAccess({
      principal: alice,
      agentName: "Finance Analyst Agent",
      document: financeDoc,
    });
    expect(result).toEqual({ authorized: true, reasonCode: "authorized" });
  });

  it("denies an Engineering principal reading a Finance document", () => {
    const result = evaluateDocumentAccess({
      principal: bob,
      agentName: "Engineering Assistant Agent",
      document: financeDoc,
    });
    expect(result.authorized).toBe(false);
  });

  it("denies Bob even if he selects the Finance Analyst Agent, since the grant is Alice's", () => {
    const result = evaluateDocumentAccess({
      principal: bob,
      agentName: "Finance Analyst Agent",
      document: financeDoc,
    });
    expect(result).toEqual({ authorized: false, reasonCode: "grant_missing_or_revoked" });
  });

  it("denies when the grant has been revoked", () => {
    const revokedGrants = agentGrantProfiles.map((grant) =>
      grant.principalId === "alice-finance" ? { ...grant, revokedAt: new Date().toISOString() } : grant,
    );
    const result = evaluateDocumentAccess(
      { principal: alice, agentName: "Finance Analyst Agent", document: financeDoc },
      revokedGrants,
    );
    expect(result).toEqual({ authorized: false, reasonCode: "grant_missing_or_revoked" });
  });

  it("denies restricted content even for a principal whose department matches", () => {
    const result = evaluateDocumentAccess({
      principal: alice,
      agentName: "Finance Analyst Agent",
      document: { ...restrictedDoc, department: "Finance" },
    });
    expect(result.authorized).toBe(false);
    expect(result.reasonCode).toBe("restricted_always_blocked");
  });

  it("denies a document above the grant's maximum classification", () => {
    const result = evaluateDocumentAccess({
      principal: bob,
      agentName: "Engineering Assistant Agent",
      document: { ...financeDoc, department: "Engineering", classification: "confidential" },
    });
    expect(result).toEqual({ authorized: false, reasonCode: "classification_exceeds_grant" });
  });

  it("denies an inactive principal", () => {
    const result = evaluateDocumentAccess({
      principal: { ...alice, active: false },
      agentName: "Finance Analyst Agent",
      document: financeDoc,
    });
    expect(result).toEqual({ authorized: false, reasonCode: "principal_inactive" });
  });
});
