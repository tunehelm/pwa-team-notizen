import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SidebarLayout } from '../components/SidebarLayout'
import { CreateItemModal } from '../components/CreateItemModal'
import { UserAvatar } from '../components/UserAvatar'
import { useAppData } from '../state/useAppData'
import { supabase } from '../lib/supabase'
import { FolderIcon, FOLDER_COLOR_CYCLE, READONLY_ICON } from '../components/FolderIcons'
import { isAdminEmail } from '../lib/admin'

export function DashboardPage() {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isEditingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [isModalOpen, setModalOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const {
    apiError,
    currentUserId,
    currentUserEmail,
    currentUserName,
    notes,
    createFolder,
    getMainFolderItems,
    getPinnedFolderItems,
    getPinnedNoteItems,
    getSubfolderItems,
    getFolderNoteItems,
  } = useAppData()
  const isAdmin = isAdminEmail(currentUserEmail)

  const userEmail = currentUserEmail
  const userName = currentUserName

  /** Returns {email, name} for a given ownerId – if it's the current user, use their profile name */
  function ownerProps(ownerId: string | undefined) {
    if (!ownerId || ownerId === currentUserId) {
      return { email: userEmail, name: userName }
    }
    return { email: ownerId }
  }

  const pinnedFolders = getPinnedFolderItems()
  const pinnedNotes = getPinnedNoteItems()
  const rootFolders = getMainFolderItems()
  const recentNotes = useMemo(() => notes.slice(0, 6), [notes])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

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
          <div className="flex items-center gap-3">
            {/* + Button zum Erstellen */}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-transform hover:bg-blue-700 active:scale-95"
              aria-label="Erstellen"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-5 w-5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu((v) => !v)}
              className="transition-transform active:scale-95"
            >
              <UserAvatar email={userEmail} name={userName} size="lg" />
            </button>
            {showUserMenu ? (
              <div className="absolute right-0 top-14 z-50 w-64 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1 shadow-xl">
                <p className="truncate px-3 py-2 text-xs text-[var(--color-text-muted)]">
                  {userEmail}
                </p>
                {userName ? (
                  <p className="truncate px-3 pb-1 text-sm font-medium text-[var(--color-text-primary)]">
                    {userName}
                  </p>
                ) : null}
                {isEditingName ? (
                  <form
                    className="flex gap-1.5 px-2 py-1.5"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      const trimmed = nameInput.trim()
                      if (!trimmed) return
                      await supabase.auth.updateUser({ data: { display_name: trimmed } })
                      window.location.reload()
                    }}
                  >
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Vor- und Nachname"
                      className="h-9 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-app)] px-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-400 focus:outline-none"
                      autoFocus
                    />
                    <button type="submit" className="h-9 rounded-lg bg-blue-500 px-3 text-xs font-medium text-white active:bg-blue-600">
                      OK
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setNameInput(userName); setEditingName(true) }}
                    className="flex h-10 w-full items-center rounded-xl px-3 text-left text-sm text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    {userName ? 'Name ändern' : 'Name eingeben'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="flex h-10 w-full items-center rounded-xl px-3 text-left text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                >
                  Abmelden
                </button>
              </div>
            ) : null}
          </div>
          </div>
        </div>

        {/* Feedback */}
        {feedback ? (
          <div className="mb-4 rounded-xl bg-emerald-600/90 px-4 py-2.5 text-sm text-white">{feedback}</div>
        ) : null}

        {apiError ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {apiError}
          </div>
        ) : null}

        {/* ── FIXIERT – horizontal scrollbar, Karten mit Avataren wie Mockup ── */}
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            <span className="text-sm">📌</span> Fixiert
          </h2>
          {hasPinned ? (
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none">
              {pinnedNotes.map((note) => (
                <Link
                  key={note.id}
                  to={`/note/${note.id}`}
                  className="flex w-44 shrink-0 flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-sm transition-transform active:scale-[0.98]"
                >
                  {/* Avatar oben links */}
                  <div className="mb-2">
                    <UserAvatar {...ownerProps(note.ownerId)} size="md" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{note.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-secondary)]">{note.excerpt}</p>
                  {/* Avatar + Zeit unten */}
                  <div className="mt-3 flex items-center gap-1.5">
                    <UserAvatar {...ownerProps(note.ownerId)} size="sm" />
                    <span className="text-[10px] text-[var(--color-text-muted)]">{note.updatedLabel}</span>
                  </div>
                </Link>
              ))}
              {pinnedFolders.map((folder, idx) => {
                const isRo = folder.access === 'readonly'
                const fIcon = isRo ? READONLY_ICON : (folder.icon || 'folder')
                const fColor = isRo
                  ? { bg: 'bg-amber-100 dark:bg-amber-900/30', stroke: 'stroke-amber-600' }
                  : FOLDER_COLOR_CYCLE[idx % FOLDER_COLOR_CYCLE.length]
                return (
                  <Link
                    key={folder.id}
                    to={`/folder/${folder.id}`}
                    className="flex w-44 shrink-0 flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-sm transition-transform active:scale-[0.98]"
                  >
                    <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${fColor.bg}`}>
                      <FolderIcon icon={fIcon} className={`h-5 w-5 ${fColor.stroke}`} />
                    </div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{folder.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {getFolderNoteItems(folder.id).length} Notizen · {getSubfolderItems(folder.id).length} Ordner
                    </p>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-4 text-center text-xs text-[var(--color-text-muted)]">
              Noch keine fixierten Elemente. Fixiere Notizen oder Ordner für schnellen Zugriff.
            </p>
          )}
        </section>

        {/* ── BEREICHE – individuelle Icons pro Ordner wie Mockup ── */}
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Bereiche
          </h2>
          {rootFolders.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
              Noch keine Ordner. Nutze das + oben rechts, um einen zu erstellen.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm">
              {rootFolders.map((folder, index) => {
                const isReadonly = folder.access === 'readonly'
                const iconId = isReadonly ? READONLY_ICON : (folder.icon || 'folder')
                const color = isReadonly
                  ? { bg: 'bg-amber-100 dark:bg-amber-900/30', stroke: 'stroke-amber-600' }
                  : FOLDER_COLOR_CYCLE[index % FOLDER_COLOR_CYCLE.length]
                return (
                  <Link
                    key={folder.id}
                    to={`/folder/${folder.id}`}
                    className={`flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-slate-100 dark:active:bg-slate-700 ${
                      index > 0 ? 'border-t border-[var(--color-border)]' : ''
                    }`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color.bg}`}>
                      <FolderIcon icon={iconId} className={`h-5 w-5 ${color.stroke}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{folder.name}</p>
                        {isReadonly ? (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            Nur Lesen
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {getFolderNoteItems(folder.id).length} Notizen · {getSubfolderItems(folder.id).length} Ordner
                      </p>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" strokeWidth="2" stroke="currentColor" strokeLinecap="round">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* ── ZULETZT BEARBEITET – mit Avataren wie Mockup ── */}
        {recentNotes.length > 0 ? (
          <section className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Zuletzt bearbeitet
            </h2>
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm">
              {recentNotes.map((note, i) => (
                <Link
                  key={note.id}
                  to={`/note/${note.id}`}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors active:bg-slate-100 dark:active:bg-slate-700 ${
                    i > 0 ? 'border-t border-[var(--color-border)]' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{note.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-[var(--color-text-secondary)]">{note.excerpt}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <UserAvatar {...ownerProps(note.ownerId)} size="sm" />
                      <span className="text-[10px] text-[var(--color-text-muted)]">{note.updatedLabel}</span>
                    </div>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" strokeWidth="2" stroke="currentColor" strokeLinecap="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {/* Create Item Modal */}
      {isModalOpen ? (
        <CreateItemModal
          title="Erstellen"
          options={isAdmin ? ['Ordner', 'Nur-Lesen Ordner'] : ['Ordner']}
          onClose={() => setModalOpen(false)}
          onSubmit={async ({ type, name, icon }) => {
            if (type === 'Nur-Lesen Ordner') {
              const created = await createFolder(name, { access: 'readonly', icon })
              if (created) setFeedback(`Nur-Lesen Ordner "${created.name}" wurde erstellt.`)
            } else {
              const created = await createFolder(name, { access: 'team', icon })
              if (created) setFeedback(`Ordner "${created.name}" wurde erstellt.`)
            }
            setModalOpen(false)
          }}
        />
      ) : null}
    </SidebarLayout>
  )
}
