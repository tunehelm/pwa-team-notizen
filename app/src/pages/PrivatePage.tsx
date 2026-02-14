import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SidebarLayout } from '../components/SidebarLayout'
import { FolderIcon, getStableColor, NoteIcon } from '../components/FolderIcons'
import { useAppData } from '../state/useAppData'

export function PrivatePage() {
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState('')
  const {
    currentUserId,
    folders,
    notes,
    createFolder,
    createNote,
  } = useAppData()

  // Private Ordner: nur Root-Ordner mit access='private' die dem User gehören
  const privateFolders = folders.filter(
    (f) => f.access === 'private' && f.parentId === null && (!f.ownerId || f.ownerId === currentUserId),
  )

  // Private Notizen: in privaten Ordnern oder Notizen die dem User gehören
  const privateFolderIds = new Set(
    folders.filter((f) => f.access === 'private' && (!f.ownerId || f.ownerId === currentUserId)).map((f) => f.id),
  )
  const privateNotes = notes.filter(
    (n) => privateFolderIds.has(n.folderId) || (n.ownerId === currentUserId && !n.folderId),
  )

  return (
    <SidebarLayout title="Privat">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Privat</h1>
            <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">Nur für dich sichtbar</p>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Neuer privater Ordner */}
            <button
              type="button"
              onClick={async () => {
                const created = await createFolder('Neuer Ordner', { access: 'private' })
                if (created) {
                  setFeedback(`Privater Ordner "${created.name}" erstellt.`)
                  navigate(`/folder/${created.id}`)
                }
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
              aria-label="Neuer privater Ordner"
              title="Neuer privater Ordner"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </button>
            {/* Neue private Notiz */}
            <button
              type="button"
              onClick={async () => {
                let targetFolder = privateFolders[0]
                if (!targetFolder) {
                  targetFolder = (await createFolder('Meine Notizen', { access: 'private' }))!
                }
                if (targetFolder) {
                  const created = await createNote(targetFolder.id, 'Neue Notiz')
                  if (created) {
                    navigate(`/note/${created.id}`)
                  }
                }
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
              aria-label="Neue private Notiz"
              title="Neue private Notiz"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </button>
          </div>
        </div>

        {feedback ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            {feedback}
          </div>
        ) : null}

        {/* Private Ordner */}
        {privateFolders.length > 0 ? (
          <section className="mt-6">
            <div className="flex flex-col gap-3">
              {privateFolders.map((folder) => {
                const color = getStableColor(folder.id)
                return (
                  <Link
                    key={folder.id}
                    to={`/folder/${folder.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3.5 shadow-sm transition-colors active:bg-slate-100 dark:active:bg-slate-700"
                  >
                    <FolderIcon icon="folder" className={`h-5 w-5 shrink-0 ${color.stroke}`} />
                    <p className="min-w-0 flex-1 text-sm font-medium text-[var(--color-text-primary)]">{folder.name}</p>
                  </Link>
                )
              })}
            </div>
          </section>
        ) : null}

        {/* Private Notizen */}
        {privateNotes.length > 0 ? (
          <section className="mt-4">
            <div className="flex flex-col gap-3">
              {privateNotes.map((note) => {
                const noteColor = getStableColor(note.id)
                return (
                  <Link
                    key={note.id}
                    to={`/note/${note.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3.5 shadow-sm transition-colors active:bg-slate-100 dark:active:bg-slate-700"
                  >
                    <NoteIcon className={`h-5 w-5 shrink-0 ${noteColor.stroke}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{note.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-[var(--color-text-secondary)]">{note.excerpt}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ) : null}

        {/* Leer */}
        {privateFolders.length === 0 && privateNotes.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4.5" y="10.5" width="15" height="9" rx="2" />
                <path d="M8 10.5V8a4 4 0 018 0v2.5" />
              </svg>
            </div>
            <p className="mt-4 text-sm text-[var(--color-text-muted)]">
              Noch keine privaten Ordner/Notizen erstellt.
            </p>
          </div>
        ) : null}
      </div>
    </SidebarLayout>
  )
}
