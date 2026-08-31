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
    let distinctMatches = 0;
    for (const token of queryTokens) {
      const inTitle = titleTokens.has(token);
      const inContent = contentTokens.has(token);
      if (inTitle) score += 2;
      if (inContent) score += 1;
      if (inTitle || inContent) distinctMatches += 1;
    }
    // A single matching token — even a title match — is too easy to trigger
    // by incidental overlap with an ordinary word ("run", "test" from the
    // fixture email domain, or "summary" from a completely unrelated
    // "weather summary" coding task matching FIN-001's title) and would
    // otherwise deny or pollute completely unrelated requests. Require at
    // least two distinct query tokens to match, not just a weighted score.
    if (distinctMatches > 1) {
      matches.push({ document, score });
    }
  }

  return matches.sort((left, right) => right.score - left.score);
}
