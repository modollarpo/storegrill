const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

const ESCAPE_RE = /[&<>"']/g;

export function escapeHtml(str: string): string {
  return str.replace(ESCAPE_RE, c => ESCAPE_MAP[c]);
}

export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

export function sanitizeInput(str: string): string {
  return stripHtml(str).trim();
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (typeof out[key] === 'string') {
      (out as any)[key] = sanitizeInput(out[key] as string);
    }
  }
  return out;
}
