import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SidebarLayout } from '../components/SidebarLayout'
import { UserAvatar } from '../components/UserAvatar'
import { useAppData } from '../state/useAppData'

/** HTML-Tags aus Content entfernen für saubere Textsuche */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
}

export function SearchPage() {
  const [query, setQuery] = useState('')
  const { notes, folders, currentUserId, currentUserEmail, currentUserName } = useAppData()

  /** Hilfsfunktion: Owner-Info für Avatar */
  function ownerProps(ownerId: string | undefined) {
    if (!ownerId || ownerId === currentUserId) {
      return { email: currentUserEmail, name: currentUserName }
    }
    return { email: ownerId }
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return { notes: [], folders: [] }

    const matchedNotes = notes
      .filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          stripHtml(n.content).toLowerCase().includes(q) ||
          n.excerpt.toLowerCase().includes(q),
      )
      .slice(0, 30)

    const matchedFolders = folders
      .filter((f) => f.name.toLowerCase().includes(q))
      .slice(0, 20)

    return { notes: matchedNotes, folders: matchedFolders }
  }, [query, notes, folders])

  const hasResults = results.notes.length > 0 || results.folders.length > 0
  const isSearching = query.trim().length >= 2

  return (
    <SidebarLayout title="Suche">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Suche</h1>

        {/* Suchfeld */}
        <div className="relative mt-4">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 stroke-[var(--color-text-muted)]"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M16.5 16.5L21 21" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Notizen durchsuchen..."
            autoFocus
            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] py-3 pl-11 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-400 focus:outline-none"
          />
        </div>

        {/* Kein Suchbegriff */}
        {!isSearching ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-16 w-16 stroke-slate-200 dark:stroke-slate-700"
              strokeWidth="1"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M16.5 16.5L21 21" />
            </svg>
            <p className="mt-4 text-sm text-[var(--color-text-muted)]">
              Durchsuche alle Notizen und Projekte
            </p>
          </div>
        ) : null}

        {/* Keine Ergebnisse */}
        {isSearching && !hasResults ? (
          <div className="mt-16 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Keine Ergebnisse für &quot;{query}&quot;
            </p>
          </div>
        ) : null}

        {/* Ordner-Ergebnisse */}
        {results.folders.length > 0 ? (
          <section className="mt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Ordner
            </h2>
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm">
              {results.folders.map((folder, i) => (
                <Link
                  key={folder.id}
                  to={`/folder/${folder.id}`}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors active:bg-slate-100 dark:active:bg-slate-700 ${
                    i > 0 ? 'border-t border-[var(--color-border)]' : ''
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5 stroke-blue-500" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    </svg>
                  </div>
                  <p className="min-w-0 flex-1 text-sm font-medium text-[var(--color-text-primary)]">{folder.name}</p>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" strokeWidth="2" stroke="currentColor" strokeLinecap="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Notizen-Ergebnisse */}
        {results.notes.length > 0 ? (
          <section className="mt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Notizen
            </h2>
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm">
              {results.notes.map((note, i) => (
                <Link
                  key={note.id}
                  to={`/note/${note.id}`}
                  className={`block px-4 py-3 transition-colors active:bg-slate-100 dark:active:bg-slate-700 ${
                    i > 0 ? 'border-t border-[var(--color-border)]' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{note.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-[var(--color-text-secondary)]">{note.excerpt}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <UserAvatar {...ownerProps(note.ownerId)} size="sm" />
                    <span className="text-[10px] text-[var(--color-text-muted)]">{note.updatedLabel}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </SidebarLayout>
  )
}
