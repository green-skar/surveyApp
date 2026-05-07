/**
 * Normalize for display-name vs ID name comparison.
 * Unicode NFD strip combining marks, lowercase, collapse whitespace.
 */
export function normalizePersonName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,]/g, "")
    .trim();
}

/** Split into non-empty tokens (words). */
export function nameTokens(s) {
  return normalizePersonName(s)
    .split(" ")
    .filter(Boolean);
}

/**
 * True if profile name and document-extracted name refer to the same person.
 * Uses sorted token-set equality so "John Doe" matches "Doe John".
 */
export function namesMatch(profileFullName, documentExtractedName) {
  const a = nameTokens(profileFullName).sort().join(" ");
  const b = nameTokens(documentExtractedName).sort().join(" ");
  if (a.length === 0 || b.length === 0) return false;
  return a === b;
}
