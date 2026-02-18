import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { SidebarLayout } from "../components/SidebarLayout";
import { supabase } from "../lib/supabase";
import { useAppData } from "../state/useAppData";
import { isAdminEmail } from "../lib/admin";
import { getWeekKey, getNextWeekKey } from "../lib/sales/weekKey";

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
  const { currentUserEmail, profileLoaded } = useAppData();
  const isAdmin = profileLoaded && isAdminEmail(currentUserEmail);
  const [challenge, setChallenge] = useState<{
    week_key?: string;
    title?: string | null;
    status: string;
    freeze_at: string;
    reveal_at: string;
    ends_at: string;
    category?: string | null;
  } | null>(null);
  const [backlogPlannedNext, setBacklogPlannedNext] = useState(false);
  const [backlogPlannedTitle, setBacklogPlannedTitle] = useState<string | null>(null);
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
          .select("week_key, title, status, freeze_at, reveal_at, ends_at, category")
          .eq("week_key", weekKey)
          .maybeSingle(),
        supabase
          .from("sales_backlog")
          .select("id, title")
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
      const planned = plannedRes.data as { id: string; title?: string } | null;
      setBacklogPlannedNext(!!planned);
      setBacklogPlannedTitle(planned?.title?.trim() || null);
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

  if (!profileLoaded || (!isAdmin && profileLoaded)) {
    if (!profileLoaded) {
      return (
        <SidebarLayout title="Admin Dashboard">
          <div className="flex min-h-[40vh] items-center justify-center">
            <p className="text-sm text-[var(--color-text-muted)]">Lade…</p>
          </div>
        </SidebarLayout>
      );
    }
    return <Navigate to="/" replace />;
  }

  const endDate = challenge?.ends_at ? new Date(challenge.ends_at) : null;

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
              {challenge?.title && (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {challenge.week_key} · {challenge.title}
                </p>
              )}
              {!challenge ? (
                <div className="mt-2 space-y-1 text-sm text-[var(--color-text-muted)]">
                  <p>Keine aktive Challenge gefunden.</p>
                  <p>Hinweis: Week-start Cron prüfen.</p>
                </div>
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
                  {endDate && (
                    <li className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                      <span className="text-[var(--color-text-muted)]">Ende der Woche (ends_at)</span>
                      <span>{formatCountdown(endDate)} · {formatAt(challenge.ends_at)}</span>
                    </li>
                  )}
                </ul>
              )}
            </section>

            {/* Backlog Status */}
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Backlog Status</h2>
              <ul className="mt-3 space-y-1 text-sm text-[var(--color-text-muted)]">
                <li>
                  Geplant für nächste Woche: {backlogPlannedNext ? (backlogPlannedTitle ? `Ja – ${backlogPlannedTitle}` : "Ja") : "Nein"}
                </li>
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
