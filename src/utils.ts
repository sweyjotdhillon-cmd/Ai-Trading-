export function findSimilarName(newName: string, existingNames: string[]): string | null {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedNew = normalize(newName);
  if (!normalizedNew) return null;

  for (const existing of existingNames) {
    const normalizedExisting = normalize(existing);
    if (!normalizedExisting) continue;

    // Exact match after normalization (e.g. "Apple " vs "apple")
    if (normalizedNew === normalizedExisting) return existing;
  }
  return null;
}
