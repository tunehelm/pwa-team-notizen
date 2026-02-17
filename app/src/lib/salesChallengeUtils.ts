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
