export interface RedactionResult {
  content: string;
  redactionCount: number;
}

const REDACTION_PATTERNS: RegExp[] = [
  /VAULT_CANARY_[A-Za-z0-9]+/g,
  /\b(?:ark|sk)-[A-Za-z0-9-]{16,}\b/gi,
  /\b\d{4}-\d{4}-\d{4}\b/g,
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
];

export function redact(content: string): RedactionResult {
  let redactionCount = 0;
  let result = content;
  for (const pattern of REDACTION_PATTERNS) {
    result = result.replace(pattern, () => {
      redactionCount += 1;
      return "[REDACTED]";
    });
  }
  return { content: result, redactionCount };
}
