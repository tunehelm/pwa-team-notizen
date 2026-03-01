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
  starts_at: string;
  status: string;
};

type VariantRow = {
  id: string;
  challenge_id: string;
  text: string;
  source: "human" | "ai" | "admin";
  is_published: boolean;
  published_at: string | null;
  created_at: string;
};

type VariantDraft = {
  id?: string;
  text: string;
};

type WeekChallenges = Record<string, ChallengeRow | null>;
type WeekVariants = Record<string, VariantRow[]>;

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

function buildVariantDrafts(variants: VariantRow[]): VariantDraft[] {
  return variants.map((variant) => ({ id: variant.id, text: variant.text }));
}

function WeekPlanCard({
  weekKey,
  challenge,
  variants,
  onRefresh,
}: {
  weekKey: string;
  challenge: ChallengeRow | null;
  variants: VariantRow[];
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
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>(() => buildVariantDrafts(variants));

  useEffect(() => {
    setForm({
      title: challenge?.title ?? "",
      original_text: challenge?.original_text ?? "",
      context_md: challenge?.context_md ?? "",
      rules_md: challenge?.rules_md ?? "",
    });
  }, [challenge?.id, challenge?.title, challenge?.original_text, challenge?.context_md, challenge?.rules_md]);

  useEffect(() => {
    setVariantDrafts(buildVariantDrafts(variants));
  }, [challenge?.id, variants]);

  const trimmedVariants = variantDrafts
    .map((variant) => ({ ...variant, text: variant.text.trim() }))
    .filter((variant) => variant.text.length > 0);

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
    if (trimmedVariants.length > 3) {
      setActionError("Es sind maximal 3 Varianten erlaubt.");
      setActionInfo(null);
      return;
    }

    setSaving(true);
    setActionError(null);
    setActionInfo(null);

    const { error: challengeError } = await supabase
      .from("sales_challenges")
      .update({
        title: form.title.trim() || "Entwurf",
        original_text: form.original_text.trim(),
        context_md: form.context_md.trim() || null,
        rules_md: form.rules_md.trim() || null,
      })
      .eq("id", challenge.id);

    if (challengeError) {
      setSaving(false);
      setActionError(challengeError.message);
      return;
    }

    const currentById = new Map(variants.map((variant) => [variant.id, variant]));
    const keptIds = new Set(trimmedVariants.filter((variant) => variant.id).map((variant) => variant.id as string));
    const idsToDelete = variants.filter((variant) => !keptIds.has(variant.id)).map((variant) => variant.id);

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("sales_entries")
        .delete()
        .in("id", idsToDelete);
      if (deleteError) {
        setSaving(false);
        setActionError(deleteError.message);
        return;
      }
    }

    for (const variant of trimmedVariants) {
      if (variant.id) {
        const current = currentById.get(variant.id);
        const { error: updateError } = await supabase
          .from("sales_entries")
          .update({
            text: variant.text,
            source: "admin",
            is_published: true,
            published_at: current?.published_at ?? challenge.starts_at,
          })
          .eq("id", variant.id);
        if (updateError) {
          setSaving(false);
          setActionError(updateError.message);
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from("sales_entries")
          .insert({
            challenge_id: challenge.id,
            source: "admin",
            is_published: true,
            published_at: challenge.starts_at,
            text: variant.text,
          });
        if (insertError) {
          setSaving(false);
          setActionError(insertError.message);
          return;
        }
      }
    }

    setSaving(false);
    setActionInfo(trimmedVariants.length === 0 ? "Gespeichert. Entwurf aktuell ohne Varianten." : "Gespeichert.");
    onRefresh();
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
    const res = data as { ok?: boolean; error?: string; source?: string; message?: string; activation_blocked?: boolean } | null;
    if (res?.error) {
      setActionError(res.error);
    } else if (res?.activation_blocked) {
      setActionError(res.message ?? "Aktivierung blockiert.");
      onRefresh();
    } else {
      setActionInfo(res?.source === "draft_activated" ? "Entwurf aktiviert." : res?.message ?? "Week-Start ausgeführt.");
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
      ? "text-amber-600 dark:text-amber-400"
      : challenge.status === "active"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-[var(--color-text-muted)]";

  const canActivate = !!challenge && challenge.status === "draft" && trimmedVariants.length >= 1 && trimmedVariants.length <= 3;

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-medium text-[var(--color-text-primary)]">{weekKey}</p>
          <p className={`mt-1 text-xs font-medium ${statusColor}`}>{statusLabel}</p>
        </div>
        {challenge?.status === "active" && (
          <Link
            to={`/sales-quiz?week=${weekKey}`}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Live ansehen
          </Link>
        )}
      </div>

      {actionError && <p className="mt-3 text-sm text-red-500">{actionError}</p>}
      {actionInfo && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{actionInfo}</p>}

      {!challenge ? (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-page)] p-4">
          <p className="text-sm text-[var(--color-text-secondary)]">Für diese Woche gibt es noch keinen Entwurf.</p>
          <button
            type="button"
            onClick={() => void createDraft()}
            disabled={creating}
            className="mt-3 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {creating ? "Lege an…" : "Entwurf anlegen"}
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-page)] p-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Wochendaten</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)]">Titel</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                  disabled={challenge.status !== "draft"}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm disabled:opacity-60"
                  placeholder="Titel der Challenge"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)]">Original-Text</label>
                <textarea
                  value={form.original_text}
                  onChange={(e) => setForm((current) => ({ ...current, original_text: e.target.value }))}
                  disabled={challenge.status !== "draft"}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm disabled:opacity-60"
                  placeholder="Originalspruch für die Woche"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)]">Kontext</label>
                <textarea
                  value={form.context_md}
                  onChange={(e) => setForm((current) => ({ ...current, context_md: e.target.value }))}
                  disabled={challenge.status !== "draft"}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)]">Spielregeln</label>
                <textarea
                  value={form.rules_md}
                  onChange={(e) => setForm((current) => ({ ...current, rules_md: e.target.value }))}
                  disabled={challenge.status !== "draft"}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-page)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Varianten</h2>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">1 bis 3 Varianten. Copy/Paste direkt in die Karten.</p>
              </div>
              {challenge.status === "draft" && (
                <button
                  type="button"
                  onClick={() => setVariantDrafts((current) => [...current, { text: "" }])}
                  disabled={variantDrafts.length >= 3}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Variante hinzufügen
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {variantDrafts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-5 text-sm text-[var(--color-text-muted)]">
                  Noch keine Varianten gepflegt. Für die Aktivierung ist mindestens 1 Variante nötig.
                </div>
              ) : (
                variantDrafts.map((variant, index) => (
                  <article key={variant.id ?? `new-${index}`} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">Variante {index + 1}</p>
                      {challenge.status === "draft" && (
                        <button
                          type="button"
                          onClick={() => setVariantDrafts((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                          className="text-xs font-medium text-red-500 hover:text-red-600"
                        >
                          Löschen
                        </button>
                      )}
                    </div>
                    <textarea
                      value={variant.text}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setVariantDrafts((current) =>
                          current.map((currentVariant, currentIndex) =>
                            currentIndex === index ? { ...currentVariant, text: nextValue } : currentVariant
                          )
                        );
                      }}
                      disabled={challenge.status !== "draft"}
                      rows={4}
                      className="mt-3 w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm leading-6 disabled:opacity-60"
                      placeholder="Variante hier einfügen"
                    />
                  </article>
                ))
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
              <span>{trimmedVariants.length} von 3 Varianten gepflegt</span>
              {trimmedVariants.length === 0 && <span>Aktivierung aktuell blockiert</span>}
              {trimmedVariants.length > 3 && <span>Zu viele Varianten</span>}
            </div>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-page)] p-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Aktionen</h2>
            {challenge.status === "draft" ? (
              <>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  Erst speichern, dann aktivieren. Aktivierung ist nur mit 1 bis 3 gepflegten Varianten möglich.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void saveDraft()}
                    disabled={saving}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                  >
                    {saving ? "Speichere…" : "Speichern"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void activate()}
                    disabled={activating || !canActivate}
                    className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    {activating ? "Aktiviere…" : "Aktivieren (Week-Start)"}
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Diese Woche ist nicht mehr im Entwurfsmodus. Varianten können hier nur noch gelesen werden.
              </p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

export function AdminSalesPlanningPage() {
  const { currentUserEmail, profileLoaded } = useAppData();
  const isAdmin = profileLoaded && isAdminEmail(currentUserEmail);

  const [challenges, setChallenges] = useState<WeekChallenges>({});
  const [variantsByChallenge, setVariantsByChallenge] = useState<WeekVariants>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const upcomingWeeks = useMemo(() => getUpcomingWeekKeys(4), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: challengeError } = await supabase
      .from("sales_challenges")
      .select("id, week_key, title, original_text, context_md, rules_md, starts_at, status")
      .in("week_key", upcomingWeeks);

    if (challengeError) {
      setError(challengeError.message);
      setLoading(false);
      return;
    }

    const map: WeekChallenges = {};
    for (const weekKey of upcomingWeeks) {
      map[weekKey] = null;
    }

    const challengeRows = (data ?? []) as ChallengeRow[];
    for (const row of challengeRows) {
      map[row.week_key] = row;
    }
    setChallenges(map);

    const variantsMap: WeekVariants = {};
    for (const weekKey of upcomingWeeks) {
      variantsMap[weekKey] = [];
    }

    const challengeIds = challengeRows.map((row) => row.id);
    if (challengeIds.length > 0) {
      const { data: variantData, error: variantError } = await supabase
        .from("sales_entries")
        .select("id, challenge_id, text, source, is_published, published_at, created_at")
        .in("challenge_id", challengeIds)
        .neq("source", "human")
        .order("created_at", { ascending: true });

      if (variantError) {
        setError(variantError.message);
        setLoading(false);
        return;
      }

      for (const variant of (variantData ?? []) as VariantRow[]) {
        const challenge = challengeRows.find((row) => row.id === variant.challenge_id);
        if (!challenge) continue;
        variantsMap[challenge.week_key] = [...(variantsMap[challenge.week_key] ?? []), variant];
      }
    }

    setVariantsByChallenge(variantsMap);
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
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Quiz-Wochenplanung</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Entwürfe für zukünftige Wochen redaktionell pflegen und mit den aktuell hinterlegten Varianten live schalten.
        </p>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        {loading ? (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">Lade…</p>
        ) : (
          <div className="mt-6 space-y-4">
            {upcomingWeeks.map((weekKey) => (
              <WeekPlanCard
                key={weekKey}
                weekKey={weekKey}
                challenge={challenges[weekKey] ?? null}
                variants={variantsByChallenge[weekKey] ?? []}
                onRefresh={() => void loadData()}
              />
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
