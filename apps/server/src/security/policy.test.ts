import { describe, expect, it } from "vitest";
import { agentGrantProfiles, demoPrincipals, protectedDocuments } from "./fixtures.js";
import { applyRevocations, evaluateDocumentAccess } from "./policy.js";

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

describe("applyRevocations", () => {
  it("leaves grants untouched when nothing is revoked", () => {
    const result = applyRevocations(agentGrantProfiles, []);
    expect(result).toEqual(agentGrantProfiles);
  });

  it("marks the matching grant revoked and leaves the other grant alone", () => {
    const result = applyRevocations(agentGrantProfiles, [
      { principalId: "alice-finance", agentName: "Finance Analyst Agent", revokedAt: "2026-01-01T00:00:00.000Z" },
    ]);
    const aliceGrant = result.find((grant) => grant.principalId === "alice-finance")!;
    const bobGrant = result.find((grant) => grant.principalId === "bob-engineering")!;
    expect(aliceGrant.revokedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(bobGrant.revokedAt).toBeNull();
  });

  it("produces grants that evaluateDocumentAccess then denies", () => {
    const revoked = applyRevocations(agentGrantProfiles, [
      { principalId: "alice-finance", agentName: "Finance Analyst Agent", revokedAt: "2026-01-01T00:00:00.000Z" },
    ]);
    const result = evaluateDocumentAccess(
      { principal: alice, agentName: "Finance Analyst Agent", document: financeDoc },
      revoked,
    );
    expect(result).toEqual({ authorized: false, reasonCode: "grant_missing_or_revoked" });
  });
});
