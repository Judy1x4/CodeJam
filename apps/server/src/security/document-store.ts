import { protectedDocuments } from "./fixtures.js";
import type { ProtectedDocument } from "./types.js";

export interface DocumentMatch {
  document: ProtectedDocument;
  score: number;
}

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "as", "at", "be", "by", "for", "from",
  "in", "into", "is", "it", "its", "of", "on", "or", "that", "this",
  "to", "was", "were", "will", "with", "all",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0 && !STOPWORDS.has(token));
}

export function searchDocuments(
  query: string,
  documents: ProtectedDocument[] = protectedDocuments,
): DocumentMatch[] {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) {
    return [];
  }

  const matches: DocumentMatch[] = [];
  for (const document of documents) {
    const titleTokens = new Set(tokenize(document.title));
    const contentTokens = new Set(tokenize(document.content));
    let score = 0;
    for (const token of queryTokens) {
      if (titleTokens.has(token)) score += 2;
      if (contentTokens.has(token)) score += 1;
    }
    if (score > 0) {
      matches.push({ document, score });
    }
  }

  return matches.sort((left, right) => right.score - left.score);
}
