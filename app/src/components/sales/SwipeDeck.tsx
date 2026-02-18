import { useCallback, useEffect, useRef, useState } from "react";

const SWIPE_THRESHOLD_PX = 60;

export type SwipeDeckEntry = {
  id: string;
  text: string;
};

const CARD_COLORS = [
  "bg-slate-100 dark:bg-slate-800",
  "bg-amber-50 dark:bg-amber-900/20",
  "bg-sky-50 dark:bg-sky-900/20",
  "bg-emerald-50 dark:bg-emerald-900/20",
  "bg-violet-50 dark:bg-violet-900/20",
];

const MAX_VOTES = 3;

type Props = {
  entries: SwipeDeckEntry[];
  getMyWeight: (entryId: string) => number;
  remainingVotes: number;
  onVotePlus: (entryId: string) => void;
  onVoteMinus: (entryId: string) => void;
  voteLocked: boolean;
  voteFreezeReason: string | null;
};

export function SwipeDeck({ entries, getMyWeight, remainingVotes, onVotePlus, onVoteMinus, voteLocked, voteFreezeReason }: Props) {
  const [index, setIndex] = useState(0);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragOffsetRef = useRef(0);

  const n = entries.length;
  const clampedIndex = n === 0 ? 0 : Math.max(0, Math.min(index, n - 1));
  const entry = n > 0 ? entries[clampedIndex] : null;
  const vote = entry ? getMyWeight(entry.id) : 0;

  const [justChanged, setJustChanged] = useState(false);
  const prevIndexRef = useRef(clampedIndex);
  useEffect(() => {
    if (prevIndexRef.current !== clampedIndex) {
      prevIndexRef.current = clampedIndex;
      setJustChanged(true);
      const id = requestAnimationFrame(() => setJustChanged(false));
      return () => cancelAnimationFrame(id);
    }
  }, [clampedIndex]);

  const goPrev = useCallback(() => {
    if (n <= 1) return;
    setIndex((i) => Math.max(0, i - 1));
  }, [n]);

  const goNext = useCallback(() => {
    if (n <= 1) return;
    setIndex((i) => Math.min(n - 1, i + 1));
  }, [n]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragStart({ x: e.clientX, y: e.clientY });
    dragOffsetRef.current = 0;
    setDragOffset(0);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragStart === null) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        dragOffsetRef.current = dx;
        setDragOffset(dx);
      }
    },
    [dragStart]
  );

  const handlePointerUp = useCallback(() => {
    if (dragStart === null) return;
    const dx = dragOffsetRef.current;
    if (dx > SWIPE_THRESHOLD_PX) goPrev();
    else if (dx < -SWIPE_THRESHOLD_PX) goNext();
    dragOffsetRef.current = 0;
    setDragStart(null);
    setDragOffset(0);
  }, [dragStart, goPrev, goNext]);

  if (n === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-center text-sm text-[var(--color-text-muted)]">
        Noch keine veröffentlichten Varianten.
      </div>
    );
  }

  const colorClass = CARD_COLORS[clampedIndex % CARD_COLORS.length];

  return (
    <div>
      <div
        className="select-none rounded-2xl border border-[var(--color-border)] p-4 transition-transform duration-150 touch-pan-y"
        style={{ transform: dragOffset !== 0 ? `translateX(${dragOffset}px)` : undefined }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        role="region"
        aria-label={`Karte ${clampedIndex + 1} von ${n}`}
      >
        <div
          className={`rounded-xl p-4 transition-opacity duration-200 ${colorClass} ${justChanged ? "opacity-0" : "opacity-100"}`}
        >
          <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{entry!.text}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--color-text-muted)]">Meine Stimmen: {vote}</span>
            <span className="rounded bg-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]" aria-hidden="true">
              {vote}/{MAX_VOTES}
            </span>
            {voteLocked ? (
              <span className="text-xs text-[var(--color-text-muted)]" title={voteFreezeReason ?? undefined}>
                {voteFreezeReason ?? "Voting beendet."}
              </span>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVoteMinus(entry!.id);
                  }}
                  disabled={vote <= 0}
                  title="Eine Stimme zurücknehmen"
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-xs font-medium text-[var(--color-text-primary)] transition-transform duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  aria-label="Stimme abziehen"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVotePlus(entry!.id);
                  }}
                  disabled={remainingVotes <= 0}
                  title="Eine Stimme vergeben"
                  className="rounded-lg bg-blue-500 px-2 py-1 text-xs font-medium text-white transition-transform duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  aria-label="Stimme hinzufügen"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={n <= 1}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] disabled:opacity-50"
          aria-label="Vorherige Karte"
        >
          {"←"}
        </button>
        <span className="text-xs text-[var(--color-text-muted)]">
          {clampedIndex + 1} / {n}
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={n <= 1}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] disabled:opacity-50"
          aria-label="Nächste Karte"
        >
          {"→"}
        </button>
      </div>
    </div>
  );
}
