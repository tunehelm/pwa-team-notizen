// Shared helpers for Sales Swipe Challenge Edge Functions
// Europe/Berlin: Montag 11:00 Start, Freitag 12/14/15/16, Montag 11:00 Ende

const BERLIN_OFFSET_HOURS = 1; // CET (winter); CEST = 2, vereinfacht 1

/** ISO week number (1–53) for a given date (UTC). */
function getISOWeek(d: Date): number {
  const t = new Date(d);
  t.setUTCHours(0, 0, 0, 0);
  const thursday = new Date(t);
  thursday.setUTCDate(t.getUTCDate() - (t.getUTCDay() + 6) % 7 + 3);
  const jan1 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const weekNo = 1 + Math.round(((thursday.getTime() - jan1.getTime()) / 86400000 - 3 + (jan1.getUTCDay() + 6) % 7) / 7);
  return weekNo;
}

/** ISO week year (can differ from calendar year at year boundaries). */
function getISOWeekYear(d: Date): number {
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7 + 3);
  return thursday.getUTCFullYear();
}

/** Week key e.g. "2026-W08" for a given date (week determined in UTC). */
export function getWeekKey(date: Date): string {
  const y = getISOWeekYear(date);
  const w = getISOWeek(date);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

/** Week key of the previous week (for archive: Montag archiviert Vorwoche). */
export function getPreviousWeekKey(date: Date): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 7);
  return getWeekKey(d);
}

/** Monday 00:00 UTC of the given ISO week (year, week). */
function getMondayOfISOWeek(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7; // 1 = Mon, 7 = Sun
  const monday = new Date(Date.UTC(year, 0, 4 - (day - 1) + (week - 1) * 7));
  return monday;
}

/** Parse week_key "2026-W08" -> { year, week }. */
function parseWeekKey(weekKey: string): { year: number; week: number } {
  const [_, yearStr, weekStr] = weekKey.match(/^(\d{4})-W(\d{2})$/) || [];
  return { year: parseInt(yearStr!, 10), week: parseInt(weekStr!, 10) };
}

/** Timestamps for a given week_key (Berlin: Mon 11:00, Fri 12/14/15/16, next Mon 11:00). Stored as ISO strings. */
export function getWeekTimestamps(weekKey: string): {
  starts_at: string;
  edit_deadline_at: string;
  vote_deadline_at: string;
  freeze_at: string;
  reveal_at: string;
  ends_at: string;
} {
  const { year, week } = parseWeekKey(weekKey);
  const monday = getMondayOfISOWeek(year, week);
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);

  const monday11 = new Date(monday);
  monday11.setUTCHours(11 - BERLIN_OFFSET_HOURS, 0, 0, 0);
  const friday = new Date(monday);
  friday.setUTCDate(friday.getUTCDate() + 4);
  const fri12 = new Date(friday);
  fri12.setUTCHours(12 - BERLIN_OFFSET_HOURS, 0, 0, 0);
  const fri14 = new Date(friday);
  fri14.setUTCHours(14 - BERLIN_OFFSET_HOURS, 0, 0, 0);
  const fri15 = new Date(friday);
  fri15.setUTCHours(15 - BERLIN_OFFSET_HOURS, 0, 0, 0);
  const fri16 = new Date(friday);
  fri16.setUTCHours(16 - BERLIN_OFFSET_HOURS, 0, 0, 0);
  const nextMon11 = new Date(nextMonday);
  nextMon11.setUTCHours(11 - BERLIN_OFFSET_HOURS, 0, 0, 0);

  return {
    starts_at: monday11.toISOString(),
    edit_deadline_at: fri12.toISOString(),
    vote_deadline_at: fri14.toISOString(),
    freeze_at: fri15.toISOString(),
    reveal_at: fri16.toISOString(),
    ends_at: nextMon11.toISOString(),
  };
}

