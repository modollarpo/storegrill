const JSON_ARRAY_RE = /^\[.*\]$/s;
const COMMA_SPLIT_RE = /[,|\n]/;

/**
 * Safely parses a persisted list that may be stored as a JSON array string
 * (admin writes `JSON.stringify([...])`), a plain string (`"en,de,fr"`), a
 * single scalar (`"en"`), or an already-parsed array. Never throws.
 */
export function parseStringList(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map(v => (typeof v === 'string' ? v : String(v)))
      .map(v => v.trim())
      .filter(Boolean);
  }
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (JSON_ARRAY_RE.test(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map(v => (typeof v === 'string' ? v : String(v)))
          .map(v => v.trim())
          .filter(Boolean);
      }
      return typeof parsed === 'string' && parsed.trim() ? [parsed.trim()] : [];
    } catch {
      return trimmed.split(COMMA_SPLIT_RE).map(v => v.trim()).filter(Boolean);
    }
  }
  return trimmed.split(COMMA_SPLIT_RE).map(v => v.trim()).filter(Boolean);
}