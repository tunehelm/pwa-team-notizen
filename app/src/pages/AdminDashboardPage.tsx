import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { SidebarLayout } from "../components/SidebarLayout";
import { supabase } from "../lib/supabase";
import { useAppData } from "../state/useAppData";
import { isAdminEmail } from "../lib/admin";
import { getWeekKey, getNextWeekKey, getPreviousWeekKey } from "../lib/sales/weekKey";

const WEEK_KEY_PATTERN = /^\d{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$/;

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
  const [bestofPrevWeekCount, setBestofPrevWeekCount] = useState<number>(0);
  const [seedWeekKey, setSeedWeekKey] = useState(() => getWeekKey(new Date()));
  const [seedWeekLoading, setSeedWeekLoading] = useState(false);
  const [seedWeekError, setSeedWeekError] = useState<string | null>(null);
  const [seedWeekInfo, setSeedWeekInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const weekKey = getWeekKey(new Date());
    const nextWeekKey = getNextWeekKey(new Date());
    const prevWeekKey = getPreviousWeekKey(new Date());
    let cancelled = false;
    (async () => {
      const [chRes, plannedRes, draftRes, bestofRes] = await Promise.all([
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
        supabase
          .from("sales_bestof")
          .select("id", { count: "exact", head: true })
          .eq("challenge_week_key", prevWeekKey),
      ]);
      if (cancelled) return;
      if (chRes.data) setChallenge(chRes.data as typeof challenge);
      if (cancelled) return;
      const planned = plannedRes.data as { id: string; title?: string } | null;
      setBacklogPlannedNext(!!planned);
      setBacklogPlannedTitle(planned?.title?.trim() || null);
      setBacklogDraftCount(draftRes.count ?? 0);
      setBestofPrevWeekCount(bestofRes.count ?? 0);
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

  const seedWeekNow = async () => {
    const wk = seedWeekKey.trim();
    if (!WEEK_KEY_PATTERN.test(wk)) {
      setSeedWeekError("week_key muss Format YYYY-Www haben (z. B. 2026-W10).");
      setSeedWeekInfo(null);
      return;
    }
    setSeedWeekLoading(true);
    setSeedWeekError(null);
    setSeedWeekInfo(null);
    try {
      const { data, error } = await supabase.functions.invoke("sales-week-start", {
        method: "POST",
        body: { week_key: wk },
      });
      if (error) throw new Error(error.message ?? "Week-start fehlgeschlagen.");
      const res = data as {
        ok?: boolean;
        error?: string;
        message?: string;
        week_key?: string;
        challenge_id?: string;
        status?: string;
        activation_blocked?: boolean;
      } | null;
      if (res?.error) throw new Error(res.error);
      if (res?.activation_blocked || res?.status === "draft") {
        setSeedWeekInfo(res?.message ?? `Entwurf bereit für ${res?.week_key ?? wk}. Vor Aktivierung bitte Varianten pflegen.`);
      } else if (res?.message === "Challenge already exists") {
        setSeedWeekInfo(`Challenge existiert bereits für ${res.week_key ?? wk}.`);
      } else if (res?.challenge_id) {
        setSeedWeekInfo(`Challenge erzeugt für ${res.week_key ?? wk} (ID: ${res.challenge_id}).`);
      } else {
        setSeedWeekInfo(`Week-start ausgeführt für ${res?.week_key ?? wk}.`);
      }
      setTick((t) => t + 1);
    } catch (e) {
      setSeedWeekError(e instanceof Error ? e.message : "Week-start fehlgeschlagen.");
    } finally {
      setSeedWeekLoading(false);
    }
  };

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

  // System Health (nur aus bestehenden Daten, Admin-only)
  const now = new Date();
  const weekStartOk = !!challenge;
  const freezeOk = !challenge
    ? true
    : now <= new Date(challenge.freeze_at) || challenge.status !== "active";
  const revealOk = !challenge
    ? true
    : now <= new Date(challenge.reveal_at) || challenge.status === "revealed";
  const archiveOk = bestofPrevWeekCount > 0;

  const healthRows: { label: string; ok: boolean; message: string }[] = [
    {
      label: "Week Start",
      ok: weekStartOk,
      message: weekStartOk ? "OK" : "Week-Start nicht ausgeführt",
    },
    {
      label: "Freeze",
      ok: freezeOk,
      message: freezeOk ? "OK" : "Freeze nicht ausgeführt",
    },
    {
      label: "Reveal",
      ok: revealOk,
      message: revealOk ? "OK" : "Reveal nicht ausgeführt",
    },
    {
      label: "Archivierung",
      ok: archiveOk,
      message: archiveOk ? "OK" : "Archivierung fehlt",
    },
  ];

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
              <div className="mt-4 border-t border-[var(--color-border)] pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Manuell: Week-start</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    value={seedWeekKey}
                    onChange={(e) => setSeedWeekKey(e.target.value)}
                    placeholder="YYYY-Www"
                    className="w-36 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={seedWeekLoading}
                    onClick={() => void seedWeekNow()}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                  >
                    {seedWeekLoading ? "Starte…" : "Week jetzt starten"}
                  </button>
                </div>
                {seedWeekError && <p className="mt-2 text-xs text-red-500">{seedWeekError}</p>}
                {seedWeekInfo && <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{seedWeekInfo}</p>}
              </div>
            </section>

            {/* System Health (Admin-only) */}
            {isAdmin && (
              <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">System Health</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {healthRows.map((row) => (
                    <li key={row.label} className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          row.ok ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        aria-hidden
                      />
                      <span className="text-[var(--color-text-secondary)]">{row.label}</span>
                      <span className={row.ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                        {row.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

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
                <Link
                  to="/admin/sales-planning"
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
                >
                  Wochenplanung
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
