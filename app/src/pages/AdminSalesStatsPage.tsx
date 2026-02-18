import { useEffect, useState } from "react";
import { SidebarLayout } from "../components/SidebarLayout";
import { supabase } from "../lib/supabase";
import { useAppData } from "../state/useAppData";
import { isAdminEmail } from "../lib/admin";
import { Navigate } from "react-router-dom";
import { getWeekKeysLastN } from "../lib/salesChallengeUtils";

const PERIODS = [
  { value: 4, label: "Letzte 4 Wochen" },
  { value: 12, label: "Letzte 12 Wochen" },
  { value: 52, label: "Letzte 52 Wochen" },
] as const;

export function AdminSalesStatsPage() {
  const { currentUserEmail } = useAppData();
  const isAdmin = isAdminEmail(currentUserEmail);
  const [weeks, setWeeks] = useState<number>(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    challengesCount: number;
    totalVotes: number;
    publishedEntriesCount: number;
    uniqueAuthorsCount: number;
    kiInTop3Count: number;
    kiPlace1Count: number;
    topByInitials: { initials: string; count: number }[];
  } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const weekKeys = getWeekKeysLastN(new Date(), weeks);
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data: challenges, error: chErr } = await supabase
          .from("sales_challenges")
          .select("id")
          .in("week_key", weekKeys)
          .eq("status", "archived");
        if (chErr) throw new Error(chErr.message);
        if (cancelled) return;
        const challengeIds = (challenges ?? []).map((c) => c.id);
        const challengesCount = challengeIds.length;

        let totalVotes = 0;
        let publishedEntriesCount = 0;
        const authorIds = new Set<string>();

        if (challengeIds.length > 0) {
          const { data: winners } = await supabase
            .from("sales_winners")
            .select("challenge_id, total_votes")
            .in("challenge_id", challengeIds);
          totalVotes = (winners ?? []).reduce((s, w) => s + (w.total_votes ?? 0), 0);
          if (cancelled) return;

          const { data: entries } = await supabase
            .from("sales_entries")
            .select("author_user_id")
            .in("challenge_id", challengeIds)
            .eq("is_published", true);
          publishedEntriesCount = entries?.length ?? 0;
          (entries ?? []).forEach((e) => {
            if (e.author_user_id) authorIds.add(e.author_user_id);
          });
        }
        if (cancelled) return;

        const { data: bestof } = await supabase
          .from("sales_bestof")
          .select("place, source, author_initials")
          .in("challenge_week_key", weekKeys);
        const bestofList = bestof ?? [];
        const kiInTop3Count = bestofList.filter((r) => r.source === "ai").length;
        const kiPlace1Count = bestofList.filter((r) => r.place === 1 && r.source === "ai").length;

        const initialsCount: Record<string, number> = {};
        bestofList.forEach((r) => {
          const key = r.author_initials?.trim() || "(anonym)";
          initialsCount[key] = (initialsCount[key] ?? 0) + 1;
        });
        const topByInitials = Object.entries(initialsCount)
          .map(([initials, count]) => ({ initials, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        if (!cancelled) setStats({
          challengesCount,
          totalVotes,
          publishedEntriesCount,
          uniqueAuthorsCount: authorIds.size,
          kiInTop3Count,
          kiPlace1Count,
          topByInitials,
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, weeks]);

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <SidebarLayout title="Quiz Statistik">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Quiz Statistik</h1>

        <div className="mt-4">
          <label className="text-sm text-[var(--color-text-muted)]">Zeitraum</label>
          <select
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="ml-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-500">{error}</p>
        )}

        {loading ? (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">Lade…</p>
        ) : stats ? (
          <div className="mt-6 space-y-6">
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">KPIs</h2>
              <table className="mt-3 w-full text-left text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 text-[var(--color-text-muted)]">Challenges im Zeitraum</td>
                    <td className="py-1 font-medium">{stats.challengesCount}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-[var(--color-text-muted)]">Summe Votes</td>
                    <td className="py-1 font-medium">{stats.totalVotes}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-[var(--color-text-muted)]">Veröffentlichte Entries</td>
                    <td className="py-1 font-medium">{stats.publishedEntriesCount}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-[var(--color-text-muted)]">Unique Autoren (published)</td>
                    <td className="py-1 font-medium">{stats.uniqueAuthorsCount}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-[var(--color-text-muted)]">KI in Top 3 (Anzahl Nennungen)</td>
                    <td className="py-1 font-medium">{stats.kiInTop3Count}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-[var(--color-text-muted)]">KI Platz 1 (Anzahl)</td>
                    <td className="py-1 font-medium">{stats.kiPlace1Count}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {stats.topByInitials.length > 0 && (
              <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Top-10 nach Auftritten (Initialen)</h2>
                <table className="mt-3 w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="py-1 text-[var(--color-text-muted)]">Initialen</th>
                      <th className="py-1 text-[var(--color-text-muted)]">Anzahl (Top-3)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topByInitials.map(({ initials, count }) => (
                      <tr key={initials}>
                        <td className="py-1">{initials}</td>
                        <td className="py-1 font-medium">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </div>
        ) : null}
      </div>
    </SidebarLayout>
  );
}
