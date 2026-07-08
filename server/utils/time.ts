export function nowIso(date = new Date()) {
  return date.toISOString();
}

export function todayDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}
