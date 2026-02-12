import { useState } from 'react'
import { SidebarLayout } from '../components/SidebarLayout'
import { useAppData } from '../state/useAppData'

function formatDeletedDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return 'Unbekannt'

  const now = Date.now()
  const diff = now - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (minutes < 1) return 'gerade eben'
  if (minutes < 60) return `vor ${minutes} Min.`
  if (hours < 24) return `vor ${hours} Std.`
  if (days === 1) return 'gestern'
  if (days < 7) return `vor ${days} Tagen`
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function daysUntilDeletion(dateStr: string): number {
  const date = new Date(dateStr)
  const deleteAt = date.getTime() + 7 * 24 * 60 * 60 * 1000
  return Math.max(0, Math.ceil((deleteAt - Date.now()) / (1000 * 60 * 60 * 24)))
}

export function TrashPage() {
  const {
    trash,
    restoreFolderFromTrash,
    restoreNoteFromTrash,
    permanentlyDeleteFolder,
    permanentlyDeleteNote,
    emptyTrash,
  } = useAppData()

  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [feedback, setFeedback] = useState('')

  const totalItems = trash.folders.length + trash.notes.length
  const isEmpty = totalItems === 0

  return (
    <SidebarLayout title="Papierkorb">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {isEmpty
                ? 'Der Papierkorb ist leer.'
                : `${totalItems} Element${totalItems !== 1 ? 'e' : ''} – Einträge werden nach 7 Tagen automatisch gelöscht.`}
            </p>
          </div>
          {!isEmpty ? (
            <div>
              {confirmEmpty ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-500">Alles endgültig löschen?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await emptyTrash()
                      setConfirmEmpty(false)
                      setFeedback('Papierkorb wurde geleert.')
                    }}
                    className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-medium text-white active:bg-rose-600"
                  >
                    Ja, löschen
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmEmpty(false)}
                    className="rounded-lg border px-3 py-1.5 text-xs"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    Abbrechen
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmEmpty(true)}
                  className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-50 active:bg-rose-100 dark:border-rose-700 dark:hover:bg-rose-900/20"
                >
                  Papierkorb leeren
                </button>
              )}
            </div>
          ) : null}
        </div>

        {/* Feedback */}
        {feedback ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            {feedback}
          </div>
        ) : null}

        {/* Gelöschte Ordner */}
        {trash.folders.length > 0 ? (
          <section className="mt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Ordner
            </h2>
            <div className="overflow-hidden rounded-2xl border shadow-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}>
              {trash.folders.map((folder, index) => {
                const remaining = daysUntilDeletion(folder.deletedAt)
                return (
                  <div
                    key={folder.id}
                    className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t' : ''}`}
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {/* Icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200/60 dark:bg-slate-700/40">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }}>
                        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                      </svg>
                    </div>
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {folder.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Gelöscht {formatDeletedDate(folder.deletedAt)} · {remaining > 0 ? `noch ${remaining} Tag${remaining !== 1 ? 'e' : ''}` : 'wird bald gelöscht'}
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await restoreFolderFromTrash(folder.id)
                          setFeedback(`„${folder.name}" wurde wiederhergestellt.`)
                        }}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                      >
                        Wiederherstellen
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`„${folder.name}" endgültig löschen?`)) {
                            await permanentlyDeleteFolder(folder.id)
                            setFeedback(`„${folder.name}" wurde endgültig gelöscht.`)
                          }
                        }}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-500 transition-colors hover:bg-rose-50 dark:border-rose-700 dark:hover:bg-rose-900/20"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        {/* Gelöschte Notizen */}
        {trash.notes.length > 0 ? (
          <section className="mt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Notizen
            </h2>
            <div className="overflow-hidden rounded-2xl border shadow-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}>
              {trash.notes.map((note, index) => {
                const remaining = daysUntilDeletion(note.deletedAt)
                return (
                  <div
                    key={note.id}
                    className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t' : ''}`}
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {/* Icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200/60 dark:bg-slate-700/40">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }}>
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {note.title || 'Ohne Titel'}
                      </p>
                      <p className="truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {note.excerpt || 'Leere Notiz'} · Gelöscht {formatDeletedDate(note.deletedAt)} · {remaining > 0 ? `noch ${remaining}d` : 'bald gelöscht'}
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await restoreNoteFromTrash(note.id)
                          setFeedback(`„${note.title}" wurde wiederhergestellt.`)
                        }}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                      >
                        Wiederherstellen
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`„${note.title}" endgültig löschen?`)) {
                            await permanentlyDeleteNote(note.id)
                            setFeedback(`„${note.title}" wurde endgültig gelöscht.`)
                          }
                        }}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-500 transition-colors hover:bg-rose-50 dark:border-rose-700 dark:hover:bg-rose-900/20"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        {/* Leerer Zustand */}
        {isEmpty ? (
          <div className="mt-16 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto h-16 w-16" style={{ color: 'var(--color-text-muted)' }}>
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
              <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            <p className="mt-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Keine gelöschten Elemente vorhanden.
            </p>
          </div>
        ) : null}
      </div>
    </SidebarLayout>
  )
}
