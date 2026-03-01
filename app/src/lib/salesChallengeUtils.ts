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

/** Last Sunday of a given month (0-indexed) at 01:00 UTC — EU clock-change moment. */
function getLastSundayUTC(year: number, month: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  lastDay.setUTCDate(lastDay.getUTCDate() - lastDay.getUTCDay()); // back to Sunday
  lastDay.setUTCHours(1, 0, 0, 0); // 01:00 UTC = 02:00 CET (clock change)
  return lastDay;
}

/** Berlin UTC offset in hours: 2 during CEST (last Sun Mar → last Sun Oct), else 1. */
function getBerlinOffsetHours(date: Date): number {
  const y = date.getUTCFullYear();
  const cestStart = getLastSundayUTC(y, 2); // last Sunday of March
  const cestEnd = getLastSundayUTC(y, 9);   // last Sunday of October
  return date >= cestStart && date < cestEnd ? 2 : 1;
}

function getMondayOfISOWeek(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  return new Date(Date.UTC(year, 0, 4 - (day - 1) + (week - 1) * 7));
}

function parseWeekKey(weekKey: string): { year: number; week: number } {
  const m = weekKey.match(/^(\d{4})-W(\d{2})$/);
  return { year: parseInt(m![1], 10), week: parseInt(m![2], 10) };
}

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
  const friday = new Date(monday);
  friday.setUTCDate(friday.getUTCDate() + 4);

  const weekOffset = getBerlinOffsetHours(monday);
  const nextWeekOffset = getBerlinOffsetHours(nextMonday);

  const h = (base: Date, hour: number, offset: number) => {
    const d = new Date(base);
    d.setUTCHours(hour - offset, 0, 0, 0);
    return d.toISOString();
  };
  return {
    starts_at: h(monday, 11, weekOffset),
    edit_deadline_at: h(friday, 12, weekOffset),
    vote_deadline_at: h(friday, 14, weekOffset),
    freeze_at: h(friday, 15, weekOffset),
    reveal_at: h(friday, 16, weekOffset),
    ends_at: h(nextMonday, 11, nextWeekOffset),
  };
}
