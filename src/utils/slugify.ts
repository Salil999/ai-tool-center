/**
 * Convert a display name to a canonical slug (lowercase, hyphenated).
 * Used for generating IDs from names across the app.
 */
export function slugify(name: string, fallback = 'item'): string {
  return (
    (name || fallback)
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '') || fallback
  );
}

/**
 * Generate a unique ID from a base ID, avoiding collisions with existing IDs.
 */
export function uniqueId(baseId: string, existingIds: string[]): string {
  let finalId = baseId;
  let n = 1;
  while (existingIds.includes(finalId)) {
    finalId = `${baseId}-${n++}`;
  }
  return finalId;
}
