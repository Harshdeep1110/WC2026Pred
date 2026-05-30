export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special chars
    .trim()
    .toLowerCase();
}

export function calculateLevenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

export function isMatch(predicted: string | null | undefined, actual: string | null | undefined): boolean {
  if (!predicted || !actual) return false;

  const normPred = normalizeString(predicted);
  const normActual = normalizeString(actual);

  // Exact normalized match
  if (normPred === normActual) return true;

  // Substring matching (allow short names if >= 4 chars)
  if (normPred.length >= 4 && normActual.includes(normPred)) return true;
  if (normActual.length >= 4 && normPred.includes(normActual)) return true;

  // Levenshtein Typo tolerance (allow up to 2 typos)
  // But only if strings are decently long so we don't accidentally match completely different short words
  if (normPred.length >= 4 && normActual.length >= 4) {
    const distance = calculateLevenshtein(normPred, normActual);
    if (distance <= 2) return true;
  }

  return false;
}
