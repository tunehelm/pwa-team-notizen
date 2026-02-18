import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { SidebarLayout } from "../components/SidebarLayout";
import { supabase } from "../lib/supabase";
import { useAppData } from "../state/useAppData";
import { isAdminEmail } from "../lib/admin";
import { getWeekKey, getNextWeekKey } from "../lib/salesChallengeUtils";

function formatCountdown(until: Date): string {
  const now = new Date();
  const ms = until.getTime() - now.getTime();
  if (ms <= 0) return "jetzt / abgelaufen";
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `in ${d} Tagen ${h % 24} Std`;
  if (h > 0) return `in ${h} Std ${min % 60} Min`;
  if (min > 0) return `in ${min} Min`;
  return "in wenigen Sekunden";
}

function formatAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AdminDashboardPage() {
  const { currentUserEmail } = useAppData();
  const isAdmin = isAdminEmail(currentUserEmail);
  const [challenge, setChallenge] = useState<{
    freeze_at: string;
    reveal_at: string;
    ends_at: string;
    status: string;
  } | null>(null);
  const [backlogPlannedNext, setBacklogPlannedNext] = useState(false);
  const [backlogDraftCount, setBacklogDraftCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const weekKey = getWeekKey(new Date());
    const nextWeekKey = getNextWeekKey(new Date());
    let cancelled = false;
    (async () => {
      const [chRes, plannedRes, draftRes] = await Promise.all([
        supabase
          .from("sales_challenges")
          .select("freeze_at, reveal_at, ends_at, status")
          .eq("week_key", weekKey)
          .maybeSingle(),
        supabase
          .from("sales_backlog")
          .select("id")
          .eq("status", "planned")
          .eq("planned_week_key", nextWeekKey)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("sales_backlog")
          .select("id", { count: "exact", head: true })
          .eq("status", "draft"),
      ]);
      if (cancelled) return;
      if (chRes.data) setChallenge(chRes.data as typeof challenge);
      if (cancelled) return;
      setBacklogPlannedNext(!!plannedRes.data);
      setBacklogDraftCount(draftRes.count ?? 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, tick]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!isAdmin) return <Navigate to="/" replace />;

  const endDate = challenge?.ends_at ? new Date(challenge.ends_at) : null;
  const archiveAt = endDate;
  const weekStartAt = endDate ? new Date(endDate.getTime() + 5 * 60 * 1000) : null;

  return (
    <SidebarLayout title="Admin Dashboard">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Admin Dashboard</h1>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">Lade…</p>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Nächste Aktionen */}
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Nächste Aktionen</h2>
              {!challenge ? (
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">Keine aktive Challenge gefunden.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                    <span className="text-[var(--color-text-muted)]">Freeze (Fr 15:00)</span>
                    <span>{formatCountdown(new Date(challenge.freeze_at))} · {formatAt(challenge.freeze_at)}</span>
                  </li>
                  <li className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                    <span className="text-[var(--color-text-muted)]">Reveal (Fr 16:00)</span>
                    <span>{formatCountdown(new Date(challenge.reveal_at))} · {formatAt(challenge.reveal_at)}</span>
                  </li>
                  {archiveAt && (
                    <li className="flex justify-between gap-2">
                      <span className="text-[var(--color-text-muted)]">Archivierung (Mo 11:00)</span>
                      <span>{formatCountdown(archiveAt)}</span>
                    </li>
                  )}
                  {weekStartAt && (
                    <li className="flex justify-between gap-2">
                      <span className="text-[var(--color-text-muted)]">Week-Start (Mo 11:05)</span>
                      <span>{formatCountdown(weekStartAt)}</span>
                    </li>
                  )}
                </ul>
              )}
            </section>

            {/* Backlog Status */}
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Backlog Status</h2>
              <ul className="mt-3 space-y-1 text-sm text-[var(--color-text-muted)]">
                <li>Geplant für nächste Woche: {backlogPlannedNext ? "Ja" : "Nein"}</li>
                <li>Draft-Items: {backlogDraftCount}</li>
              </ul>
              <Link
                to="/admin/sales-backlog"
                className="mt-3 inline-block rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white"
              >
                Zum Backlog
              </Link>
            </section>

            {/* Quick Links */}
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Quick Links</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to="/sales-quiz"
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
                >
                  Montags-Quiz
                </Link>
                <Link
                  to="/admin/sales-backlog"
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
                >
                  Quiz-Backlog
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
