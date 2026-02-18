import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { SidebarLayout } from "../components/SidebarLayout";
import { supabase } from "../lib/supabase";
import { useAppData } from "../state/useAppData";
import { isAdminEmail } from "../lib/admin";
import { getWeekKey, getNextWeekKey, getPreviousWeekKey } from "../lib/sales/weekKey";

const TEST_WEEK_KEY = "2099-W01";

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
  const { currentUserEmail, currentUserId, profileLoaded } = useAppData();
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

  // Quiz-Testdaten (Admin-only): Accordion + Buttons
  const [showTestTools, setShowTestTools] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [createTestWeekLoading, setCreateTestWeekLoading] = useState(false);
  const [createTestWeekError, setCreateTestWeekError] = useState<string | null>(null);

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

  const resetTestData = async () => {
    setConfirmResetOpen(false);
    setResetting(true);
    setResetError(null);
    try {
      const { data, error } = await supabase.functions.invoke("sales-reset-testweek", { method: "POST" });
      if (error) throw new Error(error.message ?? "Reset fehlgeschlagen.");
      const res = data as { error?: string; ok?: boolean } | null;
      if (res?.error) throw new Error(res.error);
      setTick((t) => t + 1);
    } catch (e) {
      setResetError(e instanceof Error ? e.message : "Reset fehlgeschlagen.");
    } finally {
      setResetting(false);
    }
  };

  const seedTestWeek = async () => {
    setCreateTestWeekLoading(true);
    setCreateTestWeekError(null);
    try {
      const { data, error } = await supabase.functions.invoke("sales-seed-testweek", {
        method: "POST",
        body: { voter_user_id: currentUserId ?? undefined },
      });
      if (error) throw new Error(error.message ?? "Seed fehlgeschlagen.");
      const res = data as { error?: string; ok?: boolean; message?: string } | null;
      if (res?.error) throw new Error(res.error);
      if (res?.message === "Challenge already exists") {
        setCreateTestWeekError("Testwoche existiert bereits.");
        return;
      }
      setTick((t) => t + 1);
    } catch (e) {
      setCreateTestWeekError(e instanceof Error ? e.message : "Anlegen fehlgeschlagen.");
    } finally {
      setCreateTestWeekLoading(false);
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

            {/* Quiz-Testdaten (Admin-only, week_key=2099-W01) */}
            {isAdmin && (
              <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTestTools(!showTestTools)}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-[var(--color-text-primary)] hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span>Testdaten</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`h-4 w-4 transition-transform ${showTestTools ? "rotate-90" : ""}`}
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
                {showTestTools && (
                  <div className="border-t border-[var(--color-border)] px-4 py-3 space-y-3">
                    {resetError && (
                      <p className="text-sm text-red-500">{resetError}</p>
                    )}
                    {createTestWeekError && (
                      <p className="text-sm text-red-500">{createTestWeekError}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={resetting}
                        onClick={() => setConfirmResetOpen(true)}
                        className="rounded-lg border border-amber-500 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50 disabled:opacity-50"
                      >
                        {resetting ? "Lösche…" : "Testdaten zurücksetzen"}
                      </button>
                      <button
                        type="button"
                        disabled={createTestWeekLoading}
                        onClick={() => void seedTestWeek()}
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                      >
                        {createTestWeekLoading ? "Anlegen…" : "Testwoche anlegen"}
                      </button>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Nur {TEST_WEEK_KEY}. Kein Einfluss auf echte Wochen.
                    </p>
                  </div>
                )}
              </section>
            )}

            {confirmResetOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-labelledby="confirm-reset-title">
                <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-xl">
                  <h3 id="confirm-reset-title" className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Testdaten wirklich löschen?
                  </h3>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Alle Quiz-Daten für {TEST_WEEK_KEY} werden entfernt. Nicht rückgängig machbar.
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmResetOpen(false)}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={() => void resetTestData()}
                      className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              </div>
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
              </div>
            </section>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
