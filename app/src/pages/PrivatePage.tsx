import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SidebarLayout } from '../components/SidebarLayout'
import { CreateItemModal } from '../components/CreateItemModal'
import { useAppData } from '../state/useAppData'

export function PrivatePage() {
  const navigate = useNavigate()
  const [isModalOpen, setModalOpen] = useState(false)
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
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-xl font-medium text-white shadow-md shadow-blue-500/30 transition-transform active:scale-95"
            aria-label="Neues privates Element"
          >
            +
          </button>
        </div>

        {feedback ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            {feedback}
          </div>
        ) : null}

        {/* Private Ordner */}
        {privateFolders.length > 0 ? (
          <section className="mt-6">
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm">
              {/* Header-Zeile */}
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-blue-500" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4.5" y="10.5" width="15" height="9" rx="2" />
                    <path d="M8 10.5V8a4 4 0 018 0v2.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Meine Notizen</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{privateNotes.length} Notizen · Privat</p>
                </div>
              </div>

              {/* Ordner-Liste */}
              {privateFolders.map((folder) => (
                <Link
                  key={folder.id}
                  to={`/folder/${folder.id}`}
                  className="flex items-center gap-3 border-t border-[var(--color-border)] px-4 py-3 transition-colors active:bg-slate-100 dark:active:bg-slate-700"
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

        {/* Private Notizen */}
        {privateNotes.length > 0 ? (
          <section className="mt-4">
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm">
              {privateNotes.map((note, i) => (
                <Link
                  key={note.id}
                  to={`/note/${note.id}`}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors active:bg-slate-100 dark:active:bg-slate-700 ${
                    i > 0 ? 'border-t border-[var(--color-border)]' : ''
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5 stroke-[var(--color-text-muted)]" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7.5 4.5h9l3 3V18a2 2 0 01-2 2h-11a2 2 0 01-2-2V6.5a2 2 0 012-2Z" />
                      <path d="M8.5 12h7M8.5 15h5" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{note.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-[var(--color-text-secondary)]">{note.excerpt}</p>
                    <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{note.updatedLabel}</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" strokeWidth="2" stroke="currentColor" strokeLinecap="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              ))}
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
              Noch keine privaten Notizen.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-3 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              Erste private Notiz erstellen
            </button>
          </div>
        ) : null}
      </div>

      {isModalOpen ? (
        <CreateItemModal
          title="Privat erstellen"
          options={['Privater Ordner', 'Private Notiz']}
          onClose={() => setModalOpen(false)}
          onSubmit={async ({ type, name }) => {
            if (type === 'Privater Ordner') {
              const created = await createFolder(name, { access: 'private' })
              if (created) {
                setFeedback(`Privater Ordner "${created.name}" erstellt.`)
              }
            } else {
              let targetFolder = privateFolders[0]
              if (!targetFolder) {
                targetFolder = (await createFolder('Meine Notizen', { access: 'private' }))!
              }
              if (targetFolder) {
                const created = await createNote(targetFolder.id, name)
                if (created) {
                  setFeedback(`"${created.title}" erstellt.`)
                  navigate(`/note/${created.id}`)
                }
              }
            }
            setModalOpen(false)
          }}
        />
      ) : null}
    </SidebarLayout>
  )
}
