/**
 * ISO week helpers (Montag = Wochenanfang).
 * Keine externe Lib, reine Date-Arithmetik.
 */

/** ISO-Wochennummer (1–53) für ein Datum (UTC). */
function getISOWeek(d: Date): number {
  const t = new Date(d);
  t.setUTCHours(0, 0, 0, 0);
  const day = t.getUTCDay() || 7; // Sonntag = 7, Montag = 1
  const thursday = new Date(t);
  thursday.setUTCDate(t.getUTCDate() - day + 4);
  const jan1 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const weekNo =
    1 +
    Math.round(
      ((thursday.getTime() - jan1.getTime()) / 86400000 - 3 + ((jan1.getUTCDay() || 7) - 1)) / 7
    );
  return weekNo;
}

/** ISO-Wochenjahr (kann am Jahreswechsel vom Kalenderjahr abweichen). */
function getISOWeekYear(d: Date): number {
  const day = d.getUTCDay() || 7;
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() - day + 4);
  return thursday.getUTCFullYear();
}

/** Week-Key für ein Datum, z. B. "2026-W08" (UTC, ISO-Woche). */
export function getWeekKey(date: Date): string {
  const y = getISOWeekYear(date);
  const w = getISOWeek(date);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

/** Week-Key der darauffolgenden Woche, z. B. für "nächste Woche". */
export function getNextWeekKey(date: Date): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 7);
  return getWeekKey(d);
}
