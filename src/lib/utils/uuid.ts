/**
 * Validates if a string is a valid UUID v4
 * @param id - String to validate
 * @returns boolean - true if valid UUID
 */
export function isValidUUID(id: string | undefined | null): boolean {
  if (!id) return false;
  if (id === ':eventoId' || id === ':motoristaId') return false;
  if (id.length < 36) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
