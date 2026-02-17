import { useCallback, useEffect, useState } from "react";
import { SidebarLayout } from "../components/SidebarLayout";
import { supabase } from "../lib/supabase";
import { useAppData } from "../state/useAppData";
import { isAdminEmail } from "../lib/admin";
import { Navigate } from "react-router-dom";

type BacklogItem = {
  id: string;
  status: string;
  category: string;
  title: string;
  original_text: string;
  context_md: string | null;
  rules_md: string | null;
  planned_week_key: string | null;
  planned_starts_at: string | null;
  used_in_challenge_id: string | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_RULES = "Max 3 Stimmen pro Person, max 2 pro Karte. Tap: 0→1→2→0.";
const WEEK_KEY_PATTERN = /^\d{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$/;

export function SalesBacklogPage() {
  const { currentUserEmail } = useAppData();
  const isAdmin = isAdminEmail(currentUserEmail);
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "Verkaufssprüche",
    original_text: "",
    context_md: "",
    rules_md: DEFAULT_RULES,
    planned_week_key: "",
  });
  const [saving, setSaving] = useState(false);
  const [planWeekKeyById, setPlanWeekKeyById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: e } = await supabase
      .from("sales_backlog")
      .select("id, status, category, title, original_text, context_md, rules_md, planned_week_key, planned_starts_at, used_in_challenge_id, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (e) {
      setError(e.message);
      setItems([]);
    } else {
      setItems((data ?? []) as BacklogItem[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const openNew = () => {
    setEditingId("new");
    setForm({
      title: "",
      category: "Verkaufssprüche",
      original_text: "",
      context_md: "",
      rules_md: DEFAULT_RULES,
      planned_week_key: "",
    });
  };

  const openEdit = (item: BacklogItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      category: item.category,
      original_text: item.original_text,
      context_md: item.context_md ?? "",
      rules_md: item.rules_md ?? DEFAULT_RULES,
      planned_week_key: item.planned_week_key ?? "",
    });
  };

  const save = async () => {
    if (!form.title.trim() || !form.original_text.trim()) return;
    setSaving(true);
    if (editingId === "new") {
      const { error: e } = await supabase.from("sales_backlog").insert({
        title: form.title.trim(),
        category: form.category.trim() || "Allgemein",
        original_text: form.original_text.trim(),
        context_md: form.context_md.trim() || null,
        rules_md: form.rules_md.trim() || null,
        status: "draft",
      });
      if (e) setError(e.message);
      else setEditingId(null);
    } else if (editingId) {
      const { error: e } = await supabase
        .from("sales_backlog")
        .update({
          title: form.title.trim(),
          category: form.category.trim() || "Allgemein",
          original_text: form.original_text.trim(),
          context_md: form.context_md.trim() || null,
          rules_md: form.rules_md.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);
      if (e) setError(e.message);
      else setEditingId(null);
    }
    setSaving(false);
    void load();
  };

  const plan = async (itemId: string, weekKey: string) => {
    const wk = weekKey.trim();
    if (!WEEK_KEY_PATTERN.test(wk)) {
      setError("planned_week_key muss Format YYYY-Www haben (z.B. 2026-W08).");
      return;
    }
    const { error: e } = await supabase
      .from("sales_backlog")
      .update({ status: "planned", planned_week_key: wk, updated_at: new Date().toISOString() })
      .eq("id", itemId);
    if (e) setError(e.message);
    else setPlanWeekKeyById((prev) => ({ ...prev, [itemId]: "" }));
    void load();
  };

  const unplan = async (itemId: string) => {
    const { error: e } = await supabase
      .from("sales_backlog")
      .update({ status: "draft", planned_week_key: null, updated_at: new Date().toISOString() })
      .eq("id", itemId);
    if (e) setError(e.message);
    void load();
  };

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <SidebarLayout title="Quiz-Backlog">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {error && (
          <p className="mb-3 text-sm text-red-500">{error}</p>
        )}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Sales-Quiz Backlog</h1>
          <button
            type="button"
            onClick={openNew}
            className="rounded-xl bg-blue-500 px-3 py-2 text-sm font-medium text-white"
          >
            Neu
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Lade…</p>
        ) : editingId ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {editingId === "new" ? "Neuer Eintrag" : "Bearbeiten"}
            </h2>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-medium text-[var(--color-text-muted)]">
                Titel
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
                placeholder="z.B. Verkaufssprüche 2026-W08"
              />
              <label className="block text-xs font-medium text-[var(--color-text-muted)]">
                Kategorie (Dropdown oder frei)
              </label>
              <input
                list="backlog-categories"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
                placeholder="z.B. Verkaufssprüche"
              />
              <datalist id="backlog-categories">
                <option value="Allgemein" />
                <option value="Verkaufssprüche" />
              </datalist>
              <label className="block text-xs font-medium text-[var(--color-text-muted)]">
                Original-Text
              </label>
              <textarea
                value={form.original_text}
                onChange={(e) => setForm((f) => ({ ...f, original_text: e.target.value }))}
                rows={3}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
                placeholder="Originalspruch für die Woche"
              />
              <label className="block text-xs font-medium text-[var(--color-text-muted)]">
                Kontext (Markdown, optional)
              </label>
              <textarea
                value={form.context_md}
                onChange={(e) => setForm((f) => ({ ...f, context_md: e.target.value }))}
                rows={2}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
              />
              <label className="block text-xs font-medium text-[var(--color-text-muted)]">
                Spielregeln (optional)
              </label>
              <textarea
                value={form.rules_md}
                onChange={(e) => setForm((f) => ({ ...f, rules_md: e.target.value }))}
                rows={2}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
              />
              <p className="text-xs text-[var(--color-text-muted)]">
                Woche planen: nach Speichern in der Liste „Planen“ mit YYYY-Www nutzen.
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="rounded-lg bg-blue-500 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                {saving ? "…" : "Speichern"}
              </button>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Noch keine Backlog-Einträge.</p>
            ) : (
              items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-[var(--color-text-muted)]">{item.status}</span>
                    {item.planned_week_key && (
                      <span className="ml-2 text-xs text-[var(--color-text-muted)]">{item.planned_week_key}</span>
                    )}
                    <p className="font-medium text-[var(--color-text-primary)]">{item.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{item.category}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs"
                    >
                      Bearbeiten
                    </button>
                    {item.status === "draft" && (
                      <>
                        <input
                          type="text"
                          value={planWeekKeyById[item.id] ?? ""}
                          onChange={(e) => setPlanWeekKeyById((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="2026-W08"
                          className="w-20 rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void plan(item.id, planWeekKeyById[item.id] ?? "");
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => void plan(item.id, planWeekKeyById[item.id] ?? "")}
                          className="rounded-lg bg-blue-500 px-2 py-1 text-xs text-white"
                        >
                          Planen
                        </button>
                      </>
                    )}
                    {item.status === "planned" && (
                      <button
                        type="button"
                        onClick={() => void unplan(item.id)}
                        className="rounded-lg bg-amber-500/20 px-2 py-1 text-xs text-amber-700 dark:text-amber-300"
                      >
                        Entplanen
                      </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </SidebarLayout>
  );
}
