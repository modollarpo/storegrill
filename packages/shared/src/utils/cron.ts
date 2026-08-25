export function isCronDue(expr: string, date: Date): boolean {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return false;

  const minute = date.getMinutes();
  const hour = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();

  return (
    fieldMatches(fields[0], minute, 0, 59) &&
    fieldMatches(fields[1], hour, 0, 23) &&
    fieldMatches(fields[2], dayOfMonth, 1, 31) &&
    fieldMatches(fields[3], month, 1, 12) &&
    (fieldMatches(fields[4], dayOfWeek, 0, 7) ||
      (dayOfWeek === 0 && fieldMatches(fields[4], 7, 0, 7)))
  );
}

function fieldMatches(field: string, value: number, min: number, max: number): boolean {
  return field.split(',').some(part => partMatches(part, value, min, max));
}

function partMatches(part: string, value: number, min: number, max: number): boolean {
  const [rangePart, stepPart] = part.split('/');
  const step = stepPart === undefined ? 1 : Number(stepPart);
  if (!Number.isInteger(step) || step < 1) return false;

  let lower = min;
  let upper = max;
  if (rangePart !== '*') {
    const [a, b] = rangePart.split('-');
    lower = Number(a);
    upper = b === undefined ? Number(a) : Number(b);
    if (!Number.isInteger(lower) || !Number.isInteger(upper)) return false;
  }

  if (value < lower || value > upper) return false;
  return (value - lower) % step === 0;
}
