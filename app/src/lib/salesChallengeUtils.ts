/** ISO week number (1–53) for a date. */
function getISOWeek(d: Date): number {
  const t = new Date(d);
  t.setUTCHours(0, 0, 0, 0);
  const day = t.getUTCDay() || 7;
  const thursday = new Date(t);
  thursday.setUTCDate(t.getUTCDate() - day + 4);
  const jan1 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const weekNo = 1 + Math.round(((thursday.getTime() - jan1.getTime()) / 86400000 - 3 + ((jan1.getUTCDay() || 7) - 1)) / 7);
  return weekNo;
}

/** ISO week year. */
function getISOWeekYear(d: Date): number {
  const day = d.getUTCDay() || 7;
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() - day + 4);
  return thursday.getUTCFullYear();
}

/** Week key e.g. "2026-W08" for current date (UTC). */
export function getWeekKey(date: Date): string {
  const y = getISOWeekYear(date);
  const w = getISOWeek(date);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

/** Week key of the week after the given date (e.g. for "next week"). */
export function getNextWeekKey(date: Date): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 7);
  return getWeekKey(d);
}

/** Last N week keys including current week (oldest first). E.g. getWeekKeysLastN(now, 4) => [W-3, W-2, W-1, current]. */
export function getWeekKeysLastN(date: Date, n: number): string[] {
  const keys: string[] = [];
  const d = new Date(date);
  for (let i = 0; i < n; i++) {
    keys.push(getWeekKey(d));
    d.setUTCDate(d.getUTCDate() - 7);
  }
  return keys.reverse();
}
