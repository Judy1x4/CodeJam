import { describe, expect, it } from "vitest";
import {
  VAULT_CANARY,
  agentGrantProfiles,
  demoPrincipals,
  protectedDocuments,
} from "./fixtures.js";

describe("demoPrincipals", () => {
  it("defines exactly the two demo principals", () => {
    const ids = demoPrincipals.map((principal) => principal.id).sort();
    expect(ids).toEqual(["alice-finance", "bob-engineering"]);
  });

  it("marks both principals active", () => {
    expect(demoPrincipals.every((principal) => principal.active)).toBe(true);
  });
});

describe("agentGrantProfiles", () => {
  it("defines a profile for each demo Agent", () => {
    const agentNames = agentGrantProfiles.map((profile) => profile.agentName).sort();
    expect(agentNames).toEqual(["Engineering Assistant Agent", "Finance Analyst Agent"]);
  });

  it("caps the Finance profile at confidential and the Engineering profile at internal", () => {
    const finance = agentGrantProfiles.find((profile) => profile.agentName === "Finance Analyst Agent");
    const engineering = agentGrantProfiles.find(
      (profile) => profile.agentName === "Engineering Assistant Agent",
    );
    expect(finance?.maximumClassification).toBe("confidential");
    expect(engineering?.maximumClassification).toBe("internal");
  });
});

describe("protectedDocuments", () => {
  it("defines eight synthetic documents", () => {
    expect(protectedDocuments).toHaveLength(8);
  });

  it("covers all four classifications", () => {
    const classifications = new Set(protectedDocuments.map((document) => document.classification));
    expect(classifications).toEqual(new Set(["public", "internal", "confidential", "restricted"]));
  });

  it("plants the canary only in the restricted HR-001 fixture", () => {
    const withCanary = protectedDocuments.filter((document) => document.content.includes(VAULT_CANARY));
    expect(withCanary.map((document) => document.id)).toEqual(["HR-001"]);
    expect(protectedDocuments.find((document) => document.id === "HR-001")?.classification).toBe(
      "restricted",
    );
  });

  it("has unique document IDs", () => {
    const ids = protectedDocuments.map((document) => document.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
