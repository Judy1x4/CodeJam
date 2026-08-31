import { describe, expect, it } from "vitest";
import { VAULT_CANARY } from "./fixtures.js";
import { redact } from "./redactor.js";

describe("redact", () => {
  it("removes the planted canary and reports one redaction", () => {
    const result = redact(`Internal system reference: ${VAULT_CANARY}.`);
    expect(result.content).not.toContain(VAULT_CANARY);
    expect(result.redactionCount).toBe(1);
  });

  it("removes an account-number-shaped identifier", () => {
    const result = redact("Disbursed to account 8842-1930-5567 on file.");
    expect(result.content).not.toContain("8842-1930-5567");
    expect(result.redactionCount).toBe(1);
  });

  it("removes an email address", () => {
    const result = redact("Contact helpdesk@example.test for access.");
    expect(result.content).not.toContain("helpdesk@example.test");
    expect(result.redactionCount).toBe(1);
  });

  it("removes an API-key-shaped token", () => {
    const result = redact("Rotate key ark-9f3c7e21aaaabbbbccccddddeeee1111 immediately.");
    expect(result.content).not.toContain("9f3c7e21aaaabbbbccccddddeeee1111");
    expect(result.redactionCount).toBeGreaterThanOrEqual(1);
  });

  it("leaves clean text untouched with zero redactions", () => {
    const clean = "Our support hours are Monday through Friday.";
    const result = redact(clean);
    expect(result.content).toBe(clean);
    expect(result.redactionCount).toBe(0);
  });

  it("counts multiple redactions in the same document", () => {
    const result = redact(`Canary ${VAULT_CANARY} and account 8842-1930-5567 both appear here.`);
    expect(result.redactionCount).toBe(2);
  });
});
