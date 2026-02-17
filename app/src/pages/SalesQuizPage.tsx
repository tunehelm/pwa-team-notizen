import { useCallback, useEffect, useMemo, useState } from "react";
import { SidebarLayout } from "../components/SidebarLayout";
import { supabase } from "../lib/supabase";
import { getWeekKey } from "../lib/salesChallengeUtils";

type Challenge = {
  id: string;
  week_key: string;
  title: string | null;
  original_text: string | null;
  context_md: string | null;
  rules_md: string | null;
  status: string;
  edit_deadline_at: string;
  vote_deadline_at: string;
  freeze_at: string;
  reveal_at: string;
};

type Entry = {
  id: string;
  challenge_id: string;
  author_user_id: string | null;
  author_initials: string | null;
  source: "human" | "ai";
  is_published: boolean;
  published_at: string | null;
  text: string;
  draft_text: string | null;
  my_card_color: string | null;
  locked_at: string | null;
};

type Vote = { entry_id: string; weight: number };

type Winner = {
  place1_entry_id: string | null;
  place2_entry_id: string | null;
  place3_entry_id: string | null;
  total_votes: number;
};

const CARD_COLORS = [
  "bg-slate-100 dark:bg-slate-800",
  "bg-amber-50 dark:bg-amber-900/20",
  "bg-sky-50 dark:bg-sky-900/20",
  "bg-emerald-50 dark:bg-emerald-900/20",
  "bg-violet-50 dark:bg-violet-900/20",
];

function shuffle<T>(arr: T[], seed?: number): T[] {
  const out = [...arr];
  let i = out.length;
  const rng = seed !== undefined ? () => (Math.sin(seed * 9999) * 10000) % 1 : Math.random;
  while (i > 1) {
    const j = Math.floor(rng() * i);
    i--;
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function SalesQuizPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [myEntry, setMyEntry] = useState<Entry | null>(null);
  const [myVotes, setMyVotes] = useState<Vote[]>([]);
  const [winners, setWinners] = useState<Winner | null>(null);
  const [liveTotalVotes, setLiveTotalVotes] = useState<number>(0);
  const [loadCounter, setLoadCounter] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  const weekKey = useMemo(() => getWeekKey(new Date()), []);
  const [userId, setUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      setUserId(uid);

      const { data: chData, error: chErr } = await supabase
        .from("sales_challenges")
        .select("id, week_key, title, original_text, context_md, rules_md, status, edit_deadline_at, vote_deadline_at, freeze_at, reveal_at")
        .eq("week_key", weekKey)
        .in("status", ["active", "frozen", "revealed"])
        .maybeSingle();

      if (chErr) throw chErr;
      if (!chData) {
        setChallenge(null);
        setEntries([]);
        setMyEntry(null);
        setMyVotes([]);
        setWinners(null);
        setLiveTotalVotes(0);
        setLoading(false);
        return;
      }

      setChallenge(chData as Challenge);

      const { data: entriesData, error: entriesErr } = await supabase
        .from("sales_entries")
        .select("id, challenge_id, author_user_id, author_initials, source, is_published, published_at, text, draft_text, my_card_color, locked_at")
        .eq("challenge_id", chData.id)
        .eq("is_published", true);

      if (entriesErr) throw entriesErr;
      const published = (entriesData ?? []) as Entry[];
      setEntries(published);

      const { data: liveTotal } = await supabase.rpc("get_sales_challenge_total_votes", {
        p_challenge_id: chData.id,
      });
      setLiveTotalVotes(typeof liveTotal === "number" ? liveTotal : 0);

      if (uid) {
        const { data: myEntryData } = await supabase
          .from("sales_entries")
          .select("*")
          .eq("challenge_id", chData.id)
          .eq("author_user_id", uid)
          .maybeSingle();
        setMyEntry((myEntryData as Entry) ?? null);

        const { data: votesData } = await supabase
          .from("sales_votes")
          .select("entry_id, weight")
          .eq("challenge_id", chData.id)
          .eq("voter_user_id", uid);
        setMyVotes((votesData ?? []) as Vote[]);
      } else {
        setMyEntry(null);
        setMyVotes([]);
      }

      if (chData.status === "revealed" || new Date(chData.reveal_at) <= new Date()) {
        const { data: winData } = await supabase
          .from("sales_winners")
          .select("place1_entry_id, place2_entry_id, place3_entry_id, total_votes")
          .eq("challenge_id", chData.id)
          .maybeSingle();
        setWinners((winData as Winner) ?? null);
      } else {
        setWinners(null);
      }
      setLoadCounter((c) => c + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }, [weekKey]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const totalVotes = winners?.total_votes ?? liveTotalVotes ?? 0;
  const myVotesUsed = myVotes.reduce((s, v) => s + v.weight, 0);
  const now = new Date();
  const isRevealed = challenge?.status === "revealed" || (challenge?.reveal_at && new Date(challenge.reveal_at) <= now);
  const editLocked = challenge?.edit_deadline_at ? new Date(challenge.edit_deadline_at) <= now : true;
  const voteLocked = challenge?.vote_deadline_at ? new Date(challenge.vote_deadline_at) <= now : true;
  const isFrozen = challenge?.freeze_at ? new Date(challenge.freeze_at) <= now : false;

  // Shuffle pro Page-Load (loadCounter), stabil solange Liste gleich bleibt (challenge + entry ids)
  const shuffledEntries = useMemo(
    () => shuffle([...entries]),
    [loadCounter, challenge?.id, entries.map((e) => e.id).sort().join(",")]
  );

  const getVoteForEntry = (entryId: string) => myVotes.find((v) => v.entry_id === entryId)?.weight ?? 0;

  const [voteError, setVoteError] = useState<string | null>(null);

  const setVote = useCallback(
    async (entryId: string, nextWeight: number) => {
      if (!challenge || !userId || voteLocked) return;
      setVoteError(null);
      const current = myVotes.find((v) => v.entry_id === entryId)?.weight ?? 0;
      const newTotal = myVotesUsed - current + nextWeight;
      if (newTotal > 3) {
        setVoteError("Du hast keine Stimmen mehr frei.");
        return;
      }
      if (nextWeight > 2) return;

      if (nextWeight === 0) {
        const { error: delErr } = await supabase
          .from("sales_votes")
          .delete()
          .eq("challenge_id", challenge.id)
          .eq("entry_id", entryId)
          .eq("voter_user_id", userId);
        if (delErr) {
          setVoteError("Stimme konnte nicht zurückgenommen werden.");
          return;
        }
        setMyVotes((prev) => prev.filter((v) => v.entry_id !== entryId));
        const { data: total } = await supabase.rpc("get_sales_challenge_total_votes", { p_challenge_id: challenge.id });
        setLiveTotalVotes(typeof total === "number" ? total : 0);
        return;
      }

      const { error: upsertErr } = await supabase.from("sales_votes").upsert(
        {
          challenge_id: challenge.id,
          entry_id: entryId,
          voter_user_id: userId,
          weight: nextWeight,
        },
        { onConflict: "challenge_id,entry_id,voter_user_id" }
      );
      if (upsertErr) {
        const msg = upsertErr.message?.toLowerCase() ?? "";
        setVoteError(msg.includes("limit") || msg.includes("constraint") ? "Du hast keine Stimmen mehr frei." : "Stimme konnte nicht gespeichert werden.");
        return;
      }
      setMyVotes((prev) => {
        const rest = prev.filter((v) => v.entry_id !== entryId);
        return [...rest, { entry_id: entryId, weight: nextWeight }];
      });
      const { data: total } = await supabase.rpc("get_sales_challenge_total_votes", { p_challenge_id: challenge.id });
      setLiveTotalVotes(typeof total === "number" ? total : 0);
    },
    [challenge, userId, voteLocked, myVotesUsed, myVotes]
  );

  const saveDraft = useCallback(
    async (draftText: string, colorKey?: string) => {
      if (!challenge || !userId || editLocked) return;
      if (myEntry) {
        await supabase
          .from("sales_entries")
          .update({ draft_text: draftText, my_card_color: colorKey ?? myEntry.my_card_color, updated_at: new Date().toISOString() })
          .eq("id", myEntry.id);
      } else {
        const { data: ins } = await supabase
          .from("sales_entries")
          .insert({
            challenge_id: challenge.id,
            author_user_id: userId,
            source: "human",
            text: draftText || " ",
            draft_text: draftText,
            my_card_color: colorKey ?? null,
            is_published: false,
          })
          .select()
          .single();
        if (ins) setMyEntry(ins as Entry);
      }
      void loadData();
    },
    [challenge, userId, editLocked, myEntry, loadData]
  );

  const publishEntry = useCallback(async () => {
    if (!myEntry || editLocked) return;
    const text = (myEntry.draft_text ?? myEntry.text).trim() || myEntry.text;
    await supabase
      .from("sales_entries")
      .update({
        text,
        draft_text: null,
        is_published: true,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", myEntry.id);
    void loadData();
  }, [myEntry, editLocked, loadData]);

  if (loading) {
    return (
      <SidebarLayout title="Montags-Quiz">
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-[var(--color-text-muted)]">Lade…</p>
        </div>
      </SidebarLayout>
    );
  }

  if (error) {
    return (
      <SidebarLayout title="Montags-Quiz">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <p className="text-red-500">{error}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-3 rounded-xl bg-blue-500 px-4 py-2 text-sm text-white"
          >
            Erneut laden
          </button>
        </div>
      </SidebarLayout>
    );
  }

  if (!challenge) {
    return (
      <SidebarLayout title="Montags-Quiz">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <p className="text-[var(--color-text-secondary)]">Diese Woche gibt es keine aktive Challenge ({weekKey}).</p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout title="Montags-Quiz">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Banner: Auswertung läuft */}
        {isFrozen && !isRevealed && (
          <div className="mb-4 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            Auswertung läuft – Ergebnis um {challenge.reveal_at ? new Date(challenge.reveal_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "16:00"}.
          </div>
        )}

        {/* Header Ticker */}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-[var(--color-text-secondary)]">🔥 Diese Woche: {totalVotes} Stimmen</span>
          <span className="text-[var(--color-text-secondary)]">🎯 Deine Stimmen: {myVotesUsed} von 3</span>
        </div>

        {/* Original Card */}
        <section className="mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Original</h2>
          <p className="mt-2 whitespace-pre-wrap text-[var(--color-text-primary)]">
            {challenge.original_text || "—"}
          </p>
        </section>

        {/* Context + Rules Accordion */}
        <div className="mb-6 space-y-2">
          <button
            type="button"
            onClick={() => setContextOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-left text-sm text-[var(--color-text-primary)]"
          >
            Kontext
            <span className="text-[var(--color-text-muted)]">{contextOpen ? "▼" : "▶"}</span>
          </button>
          {contextOpen && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
              {challenge.context_md ? (
                <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: challenge.context_md.replace(/\n/g, "<br />") }} />
              ) : (
                "—"
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setRulesOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-left text-sm text-[var(--color-text-primary)]"
          >
            Spielregeln
            <span className="text-[var(--color-text-muted)]">{rulesOpen ? "▼" : "▶"}</span>
          </button>
          {rulesOpen && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
              {challenge.rules_md || "—"}
            </div>
          )}
        </div>

        {/* Meine Karte */}
        <section className="mb-6 rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-[var(--color-bg-card)] p-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Meine Karte</h2>
          {editLocked ? (
            <>
              <p className="mt-2 text-sm text-[var(--color-text-primary)]">
                {myEntry?.is_published ? myEntry.text : "Bearbeitung beendet."}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Bearbeitung gesperrt (Deadline: {challenge.edit_deadline_at ? new Date(challenge.edit_deadline_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "—"})
              </p>
            </>
          ) : (
            <>
              <textarea
                value={myEntry?.draft_text ?? myEntry?.text ?? ""}
                onChange={(e) => setMyEntry((prev) => (prev ? { ...prev, draft_text: e.target.value } : null))}
                placeholder="Dein Spruch…"
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => myEntry && void saveDraft(myEntry.draft_text ?? myEntry.text)}
                  className="rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-medium dark:bg-slate-700"
                >
                  Entwurf speichern
                </button>
                {!myEntry?.is_published && (
                  <button
                    type="button"
                    onClick={() => void publishEntry()}
                    className="rounded-xl bg-blue-500 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Veröffentlichen
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        {/* Published entries (Liste) oder Reveal Podium (nur Top 3 + Original) */}
        {isRevealed && winners ? (
          <RevealPodium
            challengeId={challenge.id}
            winners={winners}
            entries={entries}
            originalText={challenge.original_text}
          />
        ) : (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Varianten</h2>
            {voteError && (
              <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">{voteError}</p>
            )}
            {voteLocked && (
              <p className="mb-3 text-xs text-[var(--color-text-muted)]">
                Voting geschlossen (Deadline: {challenge.vote_deadline_at ? new Date(challenge.vote_deadline_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "—"})
              </p>
            )}
            {shuffledEntries.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Noch keine veröffentlichten Varianten.</p>
            ) : (
              <ul className="space-y-3">
                {shuffledEntries.map((entry, idx) => {
                  const vote = getVoteForEntry(entry.id);
                  const colorClass = CARD_COLORS[idx % CARD_COLORS.length];
                  return (
                    <li
                      key={entry.id}
                      className={`rounded-2xl border border-[var(--color-border)] p-4 ${colorClass}`}
                    >
                      <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{entry.text}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-[var(--color-text-muted)]">Deine Stimmen hier: {vote}</span>
                        {!voteLocked && (
                          <>
                            <button
                              type="button"
                              onClick={() => setVote(entry.id, vote === 0 ? 1 : vote === 1 ? 2 : 0)}
                              className="rounded-lg bg-blue-500 px-2 py-1 text-xs font-medium text-white transition-transform duration-150 active:scale-95"
                            >
                              {vote === 0 ? "0 → 1" : vote === 1 ? "1 → 2" : "2 → 0"}
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </SidebarLayout>
  );
}

function RevealPodium({
  winners,
  entries,
  originalText,
}: {
  challengeId: string;
  winners: Winner;
  entries: Entry[];
  originalText: string | null;
}) {
  const top3 = [winners.place1_entry_id, winners.place2_entry_id, winners.place3_entry_id]
    .filter(Boolean)
    .map((id) => entries.find((e) => e.id === id))
    .filter(Boolean) as Entry[];

  if (top3.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Ergebnis</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Keine Plätze vergeben.</p>
        {originalText && (
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
            <p className="text-xs font-medium text-[var(--color-text-muted)]">Originalspruch</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">{originalText}</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="overflow-auto">
      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">🏆 Podium (Top 3)</h2>
      <div className="space-y-3">
        {top3.map((entry, i) => (
          <div
            key={entry.id}
            className={`min-w-0 rounded-2xl border-2 p-4 ${
              i === 0 ? "border-amber-400 dark:border-amber-600" : i === 1 ? "border-slate-300 dark:border-slate-600" : "border-amber-700 dark:border-amber-900"
            }`}
          >
            <p className="text-xs font-medium text-[var(--color-text-muted)]">Platz {i + 1}</p>
            <p className="mt-1 whitespace-pre-wrap text-[var(--color-text-primary)]">{entry.text}</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {entry.source === "ai" ? "KI" : entry.author_initials || "—"}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">Gesamt: {winners.total_votes} Stimmen</p>
      {originalText && (
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">Originalspruch</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">{originalText}</p>
        </div>
      )}
    </section>
  );
}
