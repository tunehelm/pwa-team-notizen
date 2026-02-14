import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SidebarLayout } from '../components/SidebarLayout'
import { UserAvatar } from '../components/UserAvatar'
import { useAppData } from '../state/useAppData'
import { FolderIcon, getStableColor } from '../components/FolderIcons'
import { isAdminEmail } from '../lib/admin'
import { supabase } from '../lib/supabase'

export function DashboardPage() {
  const {
    apiError,
    currentUserId,
    currentUserEmail,
    currentUserName,
    createFolder,
    createNote,
    getMainFolderItems,
    getPinnedFolderItems,
    getPinnedNoteItems,
    getSubfolderItems,
    getFolderNoteItems,
  } = useAppData()
  const navigate = useNavigate()
  const isAdmin = isAdminEmail(currentUserEmail)

  const userEmail = currentUserEmail
  const userName = currentUserName

  // Profile-Daten für alle User laden (damit Avatare korrekte Initialen zeigen)
  const [profileMap, setProfileMap] = useState<Map<string, { email: string; name: string }>>(new Map())

  useEffect(() => {
    void supabase.from('profiles').select('id, email, display_name').then(({ data, error }) => {
      if (error) {
        console.warn('[Dashboard] Profile laden fehlgeschlagen:', error.message)
        return
      }
      if (data) {
        const map = new Map<string, { email: string; name: string }>()
        for (const p of data) {
          map.set(p.id, { email: p.email || '', name: p.display_name || '' })
        }
        setProfileMap(map)
      }
    })
  }, [])

  /** Returns {email, name} for a given ownerId – uses profile data for correct avatars */
  function ownerProps(ownerId: string | undefined) {
    if (!ownerId || ownerId === currentUserId) {
      return { email: userEmail, name: userName }
    }
    const profile = profileMap.get(ownerId)
    if (profile) {
      return { email: profile.email, name: profile.name || undefined }
    }
    return { email: ownerId }
  }

  const pinnedFolders = getPinnedFolderItems()
  const pinnedNotes = getPinnedNoteItems()
  const rootFolders = getMainFolderItems()

  const pinnedScrollRef = useRef<HTMLDivElement>(null)
  const [pinnedScrollProgress, setPinnedScrollProgress] = useState(0)
  const updatePinnedScroll = useCallback(() => {
    const el = pinnedScrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const maxScroll = scrollWidth - clientWidth
    const progress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 100
    setPinnedScrollProgress(progress)
  }, [])

  // Fixierte Elemente zusammen (Ordner + Notizen) wie im Mockup
  const hasPinned = pinnedFolders.length > 0 || pinnedNotes.length > 0

  return (
    <SidebarLayout title={`Hallo, ${userName ? userName.split(' ')[0] : 'Team'}`}>
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* User Menu */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">Willkommen zurück</p>
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">
              {userName || userEmail}
            </p>
          </div>
          {isAdmin ? (
            <div className="flex items-center gap-1.5">
              {/* Neuer Ordner */}
              <button
                type="button"
                onClick={async () => {
                  const created = await createFolder('Neuer Ordner', { access: 'team' })
                  if (created) navigate(`/folder/${created.id}`)
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                aria-label="Neuer Ordner"
                title="Neuer Ordner"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
              </button>
              {/* Neue Notiz */}
              <button
                type="button"
                onClick={async () => {
                  const first = rootFolders.find((f) => f.access !== 'readonly')
                  let targetId: string
                  if (first) {
                    targetId = first.id
                  } else {
                    const created = await createFolder('Allgemein', { access: 'team' })
                    if (!created) return
                    targetId = created.id
                  }
                  const note = await createNote(targetId, 'Neue Notiz')
                  if (note) navigate(`/note/${note.id}`)
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                aria-label="Neue Notiz"
                title="Neue Notiz"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>

        {apiError ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {apiError}
          </div>
        ) : null}

        {/* ── FIXIERT – größere Karten, horizontale Scroll-Bar ── */}
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            <span className="text-sm">📌</span> Fixiert
          </h2>
          {hasPinned ? (
            <div className="relative">
              <div
                ref={pinnedScrollRef}
                onScroll={updatePinnedScroll}
                className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scroll-smooth"
                style={{ scrollbarWidth: 'thin' }}
              >
                {pinnedNotes.map((note) => (
                  <Link
                    key={note.id}
                    to={`/note/${note.id}`}
                    className="flex w-40 shrink-0 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2.5 shadow-sm transition-transform active:scale-[0.98]"
                  >
                    <div className="mb-1">
                      <UserAvatar {...ownerProps(note.ownerId)} size="sm" />
                    </div>
                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">{note.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] text-[var(--color-text-secondary)]">{note.excerpt}</p>
                  </Link>
                ))}
                {pinnedFolders.map((folder) => {
                  const isRo = folder.access === 'readonly'
                  const fIcon = 'folder'
                  const fColor = isRo
                    ? { bg: 'bg-amber-100 dark:bg-amber-900/30', stroke: 'stroke-amber-600' }
                    : getStableColor(folder.id)
                  return (
                    <Link
                      key={folder.id}
                      to={`/folder/${folder.id}`}
                      className="flex w-40 shrink-0 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2.5 shadow-sm transition-transform active:scale-[0.98]"
                    >
                      <FolderIcon icon={fIcon} className={`mb-1 h-5 w-5 ${fColor.stroke}`} />
                      <p className="text-xs font-semibold text-[var(--color-text-primary)]">{folder.name}</p>
                      <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                        {getFolderNoteItems(folder.id).length} Notizen · {getSubfolderItems(folder.id).length} Ordner
                      </p>
                    </Link>
                  )
                })}
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full bg-[var(--color-text-muted)] transition-all duration-150"
                  style={{ width: `${pinnedScrollProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-4 text-center text-xs text-[var(--color-text-muted)]">
              Noch keine fixierten Elemente. Fixiere Notizen oder Ordner für schnellen Zugriff.
            </p>
          )}
        </section>

        {/* ── BEREICHE – Einzelkarten mit Abstand, kein Pfeil ── */}
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Bereiche
          </h2>
          {rootFolders.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
              Noch keine Ordner vorhanden.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {rootFolders.map((folder) => {
                const isReadonly = folder.access === 'readonly'
                const iconId = 'folder'
                const color = isReadonly
                  ? { bg: 'bg-amber-100 dark:bg-amber-900/30', stroke: 'stroke-amber-600' }
                  : getStableColor(folder.id)
                return (
                  <Link
                    key={folder.id}
                    to={`/folder/${folder.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3.5 shadow-sm transition-colors active:bg-slate-100 dark:active:bg-slate-700"
                  >
                    <FolderIcon icon={iconId} className={`h-5 w-5 shrink-0 ${color.stroke}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{folder.name}</p>
                        {isReadonly ? (
                          <span title="Nur Lesen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 shrink-0 text-amber-600 dark:text-amber-400">
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0110 0v4" />
                          </svg></span>
                        ) : null}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {getFolderNoteItems(folder.id).length} Notizen · {getSubfolderItems(folder.id).length} Ordner
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>

    </SidebarLayout>
  )
}
