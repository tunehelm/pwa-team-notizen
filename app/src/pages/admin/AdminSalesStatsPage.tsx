import { useEffect, useState } from "react";
import { SidebarLayout } from "../../components/SidebarLayout";
import { supabase } from "../../lib/supabase";
import { useAppData } from "../../state/useAppData";
import { isAdminEmail } from "../../lib/admin";
import { Navigate } from "react-router-dom";
import { getWeekKeysLastN } from "../../lib/salesChallengeUtils";

const PERIODS = [
  { value: 4, label: "4 Wochen" },
  { value: 12, label: "12 Wochen" },
  { value: 52, label: "52 Wochen" },
] as const;

type TableRow = {
  week_key: string;
  titleOrCategory: string;
  total_votes: number;
  winner1: string;
  winner2: string;
  winner3: string;
};

export function AdminSalesStatsPage() {
  const { currentUserEmail, profileLoaded } = useAppData();
  const isAdmin = profileLoaded && isAdminEmail(currentUserEmail);
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
    tableRows: TableRow[];
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
          .select("id, week_key, title, category")
          .in("week_key", weekKeys)
          .eq("status", "archived");
        if (chErr) throw new Error(chErr.message);
        if (cancelled) return;
        const challengeList = challenges ?? [];
        const challengeIds = challengeList.map((c) => c.id);
        const challengesCount = challengeIds.length;

        let totalVotes = 0;
        let publishedEntriesCount = 0;
        const authorIds = new Set<string>();

        let winnersList: { challenge_id: string; total_votes: number }[] = [];
        if (challengeIds.length > 0) {
          const { data: winners } = await supabase
            .from("sales_winners")
            .select("challenge_id, total_votes")
            .in("challenge_id", challengeIds);
          winnersList = winners ?? [];
          totalVotes = winnersList.reduce((s, w) => s + (w.total_votes ?? 0), 0);
          if (cancelled) return;

          const { data: entries } = await supabase
            .from("sales_entries")
            .select("author_user_id")
            .in("challenge_id", challengeIds)
            .eq("is_published", true)
            .eq("source", "human");
          publishedEntriesCount = entries?.length ?? 0;
          (entries ?? []).forEach((e) => {
            if (e.author_user_id) authorIds.add(e.author_user_id);
          });
        }
        if (cancelled) return;

        const { data: bestof } = await supabase
          .from("sales_bestof")
          .select("challenge_week_key, place, source")
          .in("challenge_week_key", weekKeys);
        const bestofList = bestof ?? [];
        const kiInTop3Count = bestofList.filter((r) => r.source === "ai").length;
        const kiPlace1Count = bestofList.filter((r) => r.place === 1 && r.source === "ai").length;

        const votesByChall = new Map<string, number>();
        winnersList.forEach((w) => votesByChall.set(w.challenge_id, w.total_votes ?? 0));
        const bestofByWeek: Record<string, { place: number; source: string }[]> = {};
        bestofList.forEach((b) => {
          const key = b.challenge_week_key;
          if (!bestofByWeek[key]) bestofByWeek[key] = [];
          bestofByWeek[key].push({ place: b.place, source: b.source });
        });
        const tableRows: TableRow[] = challengeList
          .sort((a, b) => (a.week_key > b.week_key ? 1 : -1))
          .map((ch) => {
            const sources = bestofByWeek[ch.week_key] ?? [];
            const byPlace = (p: number) => sources.find((s) => s.place === p)?.source ?? "–";
            return {
              week_key: ch.week_key,
              titleOrCategory: (ch.title ?? ch.category ?? ch.week_key) || ch.week_key,
              total_votes: votesByChall.get(ch.id) ?? 0,
              winner1: byPlace(1),
              winner2: byPlace(2),
              winner3: byPlace(3),
            };
          });

        if (!cancelled)
          setStats({
            challengesCount,
            totalVotes,
            publishedEntriesCount,
            uniqueAuthorsCount: authorIds.size,
            kiInTop3Count,
            kiPlace1Count,
            tableRows,
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

  if (!profileLoaded) {
    return (
      <SidebarLayout title="Quiz Statistik">
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-[var(--color-text-muted)]">Lade…</p>
        </div>
      </SidebarLayout>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <SidebarLayout title="Quiz Statistik">
      <div className="mx-auto max-w-3xl px-4 py-6">
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

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        {loading ? (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">Lade…</p>
        ) : stats ? (
          <div className="mt-6 space-y-6">
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">KPIs</h2>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Challenges im Zeitraum</span>
                  <span className="font-medium">{stats.challengesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Summe Votes</span>
                  <span className="font-medium">{stats.totalVotes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Veröff. User-Entries</span>
                  <span className="font-medium">{stats.publishedEntriesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Unique Autoren</span>
                  <span className="font-medium">{stats.uniqueAuthorsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">KI in Top 3</span>
                  <span className="font-medium">{stats.kiInTop3Count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">KI Platz 1</span>
                  <span className="font-medium">{stats.kiPlace1Count}</span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Challenges (Zeitraum)</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[400px] text-left text-sm">
                  <thead>
                    <tr>
                      <th className="border-b border-[var(--color-border)] py-2 pr-2 text-[var(--color-text-muted)]">week_key</th>
                      <th className="border-b border-[var(--color-border)] py-2 pr-2 text-[var(--color-text-muted)]">Titel / Kategorie</th>
                      <th className="border-b border-[var(--color-border)] py-2 pr-2 text-[var(--color-text-muted)]">Votes</th>
                      <th className="border-b border-[var(--color-border)] py-2 pr-2 text-[var(--color-text-muted)]">P1</th>
                      <th className="border-b border-[var(--color-border)] py-2 pr-2 text-[var(--color-text-muted)]">P2</th>
                      <th className="border-b border-[var(--color-border)] py-2 text-[var(--color-text-muted)]">P3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.tableRows.map((row) => (
                      <tr key={row.week_key} className="border-b border-[var(--color-border)]/50">
                        <td className="py-2 pr-2 font-mono text-xs">{row.week_key}</td>
                        <td className="max-w-[180px] truncate py-2 pr-2" title={row.titleOrCategory}>{row.titleOrCategory}</td>
                        <td className="py-2 pr-2">{row.total_votes}</td>
                        <td className="py-2 pr-2">{row.winner1}</td>
                        <td className="py-2 pr-2">{row.winner2}</td>
                        <td className="py-2">{row.winner3}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </SidebarLayout>
  );
}
