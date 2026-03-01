import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { SidebarLayout } from "../../components/SidebarLayout";
import { supabase } from "../../lib/supabase";
import { useAppData } from "../../state/useAppData";
import { isAdminEmail } from "../../lib/admin";
import { getWeekKey, getWeekTimestamps } from "../../lib/salesChallengeUtils";

type ChallengeRow = {
  id: string;
  week_key: string;
  title: string | null;
  original_text: string | null;
  context_md: string | null;
  rules_md: string | null;
  status: string;
};

type WeekChallenges = Record<string, ChallengeRow | null>;

function getUpcomingWeekKeys(n: number): string[] {
  const result: string[] = [];
  const base = new Date();
  for (let i = 0; i < n; i++) {
    const shifted = new Date(base);
    shifted.setUTCDate(shifted.getUTCDate() + i * 7);
    result.push(getWeekKey(shifted));
  }
  return result;
}

function WeekPlanCard({
  weekKey,
  challenge,
  onRefresh,
}: {
  weekKey: string;
  challenge: ChallengeRow | null;
  onRefresh: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [activating, setActivating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: challenge?.title ?? "",
    original_text: challenge?.original_text ?? "",
    context_md: challenge?.context_md ?? "",
    rules_md: challenge?.rules_md ?? "",
  });

  useEffect(() => {
    setForm({
      title: challenge?.title ?? "",
      original_text: challenge?.original_text ?? "",
      context_md: challenge?.context_md ?? "",
      rules_md: challenge?.rules_md ?? "",
    });
  }, [challenge?.id]);

  const createDraft = async () => {
    setCreating(true);
    setActionError(null);
    setActionInfo(null);
    const timestamps = getWeekTimestamps(weekKey);
    const { error } = await supabase.from("sales_challenges").insert({
      week_key: weekKey,
      ...timestamps,
      title: "Entwurf",
      original_text: "",
      context_md: "",
      rules_md: "",
      status: "draft",
    });
    setCreating(false);
    if (error) {
      setActionError(error.message);
    } else {
      setActionInfo("Entwurf angelegt.");
      onRefresh();
    }
  };

  const saveDraft = async () => {
    if (!challenge) return;
    setSaving(true);
    setActionError(null);
    setActionInfo(null);
    const { error } = await supabase
      .from("sales_challenges")
      .update({
        title: form.title,
        original_text: form.original_text,
        context_md: form.context_md,
        rules_md: form.rules_md,
      })
      .eq("id", challenge.id);
    setSaving(false);
    if (error) {
      setActionError(error.message);
    } else {
      setActionInfo("Gespeichert.");
      onRefresh();
    }
  };

  const activate = async () => {
    setActivating(true);
    setActionError(null);
    setActionInfo(null);
    const { data, error } = await supabase.functions.invoke("sales-week-start", {
      method: "POST",
      body: { week_key: weekKey },
    });
    setActivating(false);
    if (error) {
      setActionError(error.message ?? "Aktivierung fehlgeschlagen.");
      return;
    }
    const res = data as { ok?: boolean; error?: string; source?: string } | null;
    if (res?.error) {
      setActionError(res.error);
    } else {
      setActionInfo(res?.source === "draft_activated" ? "Entwurf aktiviert." : "Week-Start ausgeführt.");
      onRefresh();
    }
  };

  const statusLabel = challenge
    ? challenge.status === "draft"
      ? "Entwurf"
      : challenge.status === "active"
        ? "Aktiv"
        : challenge.status === "frozen"
          ? "Eingefroren"
          : challenge.status === "revealed"
            ? "Reveal"
            : challenge.status === "archived"
              ? "Archiviert"
              : challenge.status
    : "Kein Eintrag";

  const statusColor = !challenge
    ? "text-[var(--color-text-muted)]"
    : challenge.status === "draft"
      ? "text-purple-600 dark:text-purple-400"
      : challenge.status === "active"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-[var(--color-text-muted)]";

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-medium text-[var(--color-text-primary)]">{weekKey}</span>
        <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
      </div>

      {actionError && (
        <p className="mt-2 text-xs text-red-500">{actionError}</p>
      )}
      {actionInfo && (
        <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{actionInfo}</p>
      )}

      {!challenge && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => void createDraft()}
            disabled={creating}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            {creating ? "Anlegen…" : "Entwurf anlegen"}
          </button>
        </div>
      )}

      {challenge?.status === "draft" && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)]">Titel</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
              placeholder="Titel der Challenge"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)]">Original-Text</label>
            <textarea
              value={form.original_text}
              onChange={(e) => setForm((f) => ({ ...f, original_text: e.target.value }))}
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
              placeholder="Originalspruch für die Woche"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)]">Kontext (Markdown, optional)</label>
            <textarea
              value={form.context_md}
              onChange={(e) => setForm((f) => ({ ...f, context_md: e.target.value }))}
              rows={2}
              className="mt-1 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)]">Spielregeln (optional)</label>
            <textarea
              value={form.rules_md}
              onChange={(e) => setForm((f) => ({ ...f, rules_md: e.target.value }))}
              rows={2}
              className="mt-1 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={saving}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Speichere…" : "Entwurf speichern"}
            </button>
            <button
              type="button"
              onClick={() => void activate()}
              disabled={activating}
              className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {activating ? "Aktiviere…" : "Aktivieren (Week-Start)"}
            </button>
          </div>
        </div>
      )}

      {challenge?.status === "active" && (
        <div className="mt-3">
          <p className="text-xs text-[var(--color-text-muted)]">{challenge.title || "—"}</p>
          <Link
            to={`/sales-quiz?week=${weekKey}`}
            className="mt-2 inline-block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Quiz ansehen
          </Link>
        </div>
      )}

      {challenge && !["draft", "active"].includes(challenge.status) && (
        <div className="mt-3">
          <p className="text-xs text-[var(--color-text-muted)]">{challenge.title || "—"}</p>
        </div>
      )}
    </div>
  );
}

export function AdminSalesPlanningPage() {
  const { currentUserEmail, profileLoaded } = useAppData();
  const isAdmin = profileLoaded && isAdminEmail(currentUserEmail);

  const [challenges, setChallenges] = useState<WeekChallenges>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const upcomingWeeks = useMemo(() => getUpcomingWeekKeys(4), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: e } = await supabase
      .from("sales_challenges")
      .select("id, week_key, title, original_text, context_md, rules_md, status")
      .in("week_key", upcomingWeeks);
    if (e) {
      setError(e.message);
      setLoading(false);
      return;
    }
    const map: WeekChallenges = {};
    for (const wk of upcomingWeeks) {
      map[wk] = null;
    }
    for (const row of data ?? []) {
      map[row.week_key] = row as ChallengeRow;
    }
    setChallenges(map);
    setLoading(false);
  }, [upcomingWeeks]);

  useEffect(() => {
    if (isAdmin) void loadData();
  }, [isAdmin, loadData]);

  if (!profileLoaded) {
    return (
      <SidebarLayout title="Wochenplanung">
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-[var(--color-text-muted)]">Lade…</p>
        </div>
      </SidebarLayout>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <SidebarLayout title="Wochenplanung">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Quiz-Wochenplanung</h1>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Entwürfe für zukünftige Wochen anlegen und aktivieren.</p>

        {error && (
          <p className="mt-3 text-sm text-red-500">{error}</p>
        )}

        {loading ? (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">Lade…</p>
        ) : (
          <div className="mt-6 space-y-4">
            {upcomingWeeks.map((weekKey) => (
              <WeekPlanCard
                key={weekKey}
                weekKey={weekKey}
                challenge={challenges[weekKey] ?? null}
                onRefresh={() => void loadData()}
              />
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
