import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SidebarLayout } from '../components/SidebarLayout'
import { MoveNoteModal } from '../components/MoveNoteModal'
import { FolderIcon, getStableColor, NoteIcon } from '../components/FolderIcons'
import { useAppData } from '../state/useAppData'

import { isAdminEmail } from '../lib/admin'

export function FolderPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState('')
  const [isRenameMode, setRenameMode] = useState(false)
  const [isActionsMenuOpen, setActionsMenuOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [moveNoteTarget, setMoveNoteTarget] = useState<{ id: string; title: string; folderId: string } | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const actionsMenuRef = useRef<HTMLDivElement>(null)
  const {
    apiError,
    currentUserId,
    currentUserEmail,
    findFolderById,
    getFolderPathItems,
    getFolderNoteItems,
    getSubfolderItems,
    createFolder,
    createNote,
    loadNotesForFolder,
    moveNoteToFolder,
    moveFolderToTrash,
    renameFolder,
    toggleFolderPinned,
    updateFolderAccess,
  } = useAppData()

  const folder = findFolderById(id)
  const isAdmin = isAdminEmail(currentUserEmail)
  const isOwner = Boolean(folder && (!folder.ownerId || (currentUserId && folder.ownerId === currentUserId)))
  const canDelete = isOwner || isAdmin

  // Prüfe ob dieser Ordner ODER ein Elternordner readonly ist
  let isReadonly = folder?.access === 'readonly'
  if (!isReadonly && folder?.parentId) {
    let ancestor = findFolderById(folder.parentId)
    while (ancestor) {
      if (ancestor.access === 'readonly') { isReadonly = true; break }
      ancestor = ancestor.parentId ? findFolderById(ancestor.parentId) : undefined
    }
  }

  const canEdit = isOwner || isAdmin || !isReadonly
  const path = folder ? getFolderPathItems(folder.id) : []
  const subfolders = folder ? getSubfolderItems(folder.id) : []
  const folderNotes = folder ? getFolderNoteItems(folder.id) : []

  useEffect(() => {
    if (!isActionsMenuOpen) return

    function handleOutsidePointer(event: globalThis.MouseEvent | globalThis.TouchEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (!actionsMenuRef.current?.contains(target)) {
        setActionsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsidePointer)
    document.addEventListener('touchstart', handleOutsidePointer)

    return () => {
      document.removeEventListener('mousedown', handleOutsidePointer)
      document.removeEventListener('touchstart', handleOutsidePointer)
    }
  }, [isActionsMenuOpen])

  useEffect(() => {
    if (!folder) return
    void loadNotesForFolder(folder.id)
  }, [folder, loadNotesForFolder])

  if (!folder) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-xl bg-[var(--color-bg-app)] px-4 py-8">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Ordner nicht gefunden</h1>
          <Link to="/" className="mt-4 inline-flex rounded-xl bg-blue-500 px-4 py-2 text-sm text-white">
            Zurück zum Dashboard
          </Link>
        </div>
      </main>
    )
  }

  function startRename() {
    if (!folder) return
    setRenameValue(folder.name)
    setRenameMode(true)
  }

  function saveRename() {
    if (!folder) return
    const cleanName = renameValue.trim()
    if (!cleanName) return
    void renameFolder(folder.id, cleanName)
    setFeedback(`Ordner wurde umbenannt in "${cleanName}".`)
    setRenameMode(false)
  }

  return (
    <SidebarLayout title={folder?.name || 'Ordner'} showCreate={canEdit}>
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link to={path.length > 1 ? `/folder/${path[path.length - 2].id}` : '/'} className="text-sm font-medium text-blue-500">
            ‹ Zurück
          </Link>
          <div className="flex items-center gap-2">
            <div className="relative" ref={actionsMenuRef}>
              <button
                type="button"
                onClick={() => setActionsMenuOpen((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                aria-label="Aktionen"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <circle cx="12" cy="6" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="18" r="1.5" />
                </svg>
              </button>

              {isActionsMenuOpen ? (
                <div className="absolute right-0 top-12 z-20 w-52 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      void toggleFolderPinned(folder.id)
                      setActionsMenuOpen(false)
                      setFeedback(folder.pinned ? 'Fixierung gelöst.' : 'Ordner fixiert.')
                    }}
                    className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <span className="text-base">{folder.pinned ? '📌' : '📍'}</span>
                    {folder.pinned ? 'Fixierung lösen' : 'Fixieren'}
                  </button>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => {
                        void updateFolderAccess(folder.id, isReadonly ? 'team' : 'readonly')
                        setActionsMenuOpen(false)
                        setFeedback(isReadonly ? 'Ordner ist jetzt bearbeitbar.' : 'Ordner ist jetzt schreibgeschützt.')
                      }}
                      className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 ${isReadonly ? 'text-amber-500' : 'text-[var(--color-text-muted)]'}`}>
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                      {isReadonly ? 'Schreibschutz aufheben' : 'Schreibschutz aktivieren'}
                    </button>
                  ) : null}
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => {
                        startRename()
                        setActionsMenuOpen(false)
                      }}
                      className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <span className="text-base">✏️</span>
                      Umbenennen
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await moveFolderToTrash(folder.id)
                          setActionsMenuOpen(false)
                          setFeedback('Ordner wurde in den Papierkorb verschoben.')
                        } catch {
                          setActionsMenuOpen(false)
                        }
                      }}
                      className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    >
                      <span className="text-base">🗑️</span>
                      In Papierkorb
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {canEdit ? (
              <div className="flex items-center gap-1.5">
                {/* Neuer Ordner */}
                <button
                  type="button"
                  onClick={async () => {
                    const created = await createFolder('Neuer Ordner', {
                      parentId: folder.id,
                      access: folder.access,
                    })
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
                    const created = await createNote(folder.id, 'Neue Notiz')
                    if (created) navigate(`/note/${created.id}`)
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
        </div>

        {/* Title */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{folder.name}</h1>
            {isReadonly ? (
              <span title="Nur Lesen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg></span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
            {subfolders.length} Unterordner · {folderNotes.length} Notizen
          </p>
        </div>

        {/* Rename */}
        {isRenameMode ? (
          <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-sm">
            <p className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">Ordner umbenennen</p>
            <div className="flex items-center gap-2">
              <input
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-app)] px-3 text-sm text-[var(--color-text-primary)] focus:border-blue-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={saveRename}
                className="h-10 rounded-xl bg-blue-500 px-4 text-sm font-medium text-white"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setRenameMode(false)}
                className="h-10 rounded-xl border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-secondary)]"
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : null}

        {/* Breadcrumb */}
        {path.length > 1 ? (
          <nav className="mt-3 flex flex-wrap items-center gap-1 text-xs text-[var(--color-text-muted)]">
            <Link to="/" className="hover:text-blue-500">Start</Link>
            {path.map((entry, index) => (
              <span key={entry.id} className="flex items-center gap-1">
                <span>/</span>
                {index === path.length - 1 ? (
                  <span className="font-medium text-[var(--color-text-primary)]">{entry.name}</span>
                ) : (
                  <Link to={`/folder/${entry.id}`} className="hover:text-blue-500">{entry.name}</Link>
                )}
              </span>
            ))}
          </nav>
        ) : null}

        {apiError ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {apiError}
          </div>
        ) : null}

        {feedback ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            {feedback}
          </div>
        ) : null}

        {/* Unterordner */}
        {subfolders.length > 0 ? (
          <section className="mt-6">
            <div className="flex flex-col gap-3">
              {subfolders.map((entry) => {
                const isSubReadonly = entry.access === 'readonly'
                const iconId = 'folder'
                const color = isSubReadonly
                  ? { bg: '', stroke: 'stroke-amber-500', text: 'text-amber-500' }
                  : getStableColor(entry.id)
                const isDragOver = dragOverFolderId === entry.id
                return (
                  <Link
                    key={entry.id}
                    to={`/folder/${entry.id}`}
                    className={`flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3.5 shadow-sm transition-colors active:bg-slate-100 dark:active:bg-slate-700 ${isDragOver ? 'ring-2 ring-inset ring-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    onDragOver={(e: DragEvent) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      setDragOverFolderId(entry.id)
                    }}
                    onDragLeave={() => setDragOverFolderId(null)}
                    onDrop={(e: DragEvent) => {
                      e.preventDefault()
                      setDragOverFolderId(null)
                      if (!canEdit) return
                      const noteId = e.dataTransfer.getData('text/note-id')
                      if (noteId) {
                        void moveNoteToFolder(noteId, entry.id).then(() => {
                          setFeedback(`Notiz wurde nach „${entry.name}" verschoben.`)
                        })
                      }
                    }}
                  >
                    <FolderIcon icon={iconId} className={`h-5 w-5 shrink-0 ${color.stroke}`} />
                    <p className="min-w-0 flex-1 text-sm font-medium text-[var(--color-text-primary)]">{entry.name}</p>
                  </Link>
                )
              })}
            </div>
          </section>
        ) : null}

        {/* Notizen */}
        {folderNotes.length > 0 ? (
          <section className={subfolders.length > 0 ? 'mt-4' : 'mt-6'}>
            <div className="flex flex-col gap-3">
              {folderNotes.map((note) => {
                const noteColor = getStableColor(note.id)
                return (
                  <div
                    key={note.id}
                    draggable={canEdit}
                    onDragStart={canEdit ? (e: DragEvent<HTMLDivElement>) => {
                      e.dataTransfer.setData('text/note-id', note.id)
                      e.dataTransfer.effectAllowed = 'move'
                    } : undefined}
                    className={`flex items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  >
                    <Link
                      to={`/note/${note.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 transition-colors active:bg-slate-100 dark:active:bg-slate-700 rounded-2xl"
                    >
                      <NoteIcon className={`h-5 w-5 shrink-0 ${noteColor.stroke}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{note.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-[var(--color-text-secondary)]">{note.excerpt}</p>
                      </div>
                    </Link>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() =>
                          setMoveNoteTarget({
                            id: note.id,
                            title: note.title,
                            folderId: note.folderId,
                          })
                        }
                        className="flex shrink-0 items-center px-3 text-[var(--color-text-muted)] transition-colors hover:text-blue-500"
                        title="Notiz verschieben"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <path d="M15 3h6v6" />
                          <path d="M10 14L21 3" />
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>

      {moveNoteTarget ? (
        <MoveNoteModal
          noteId={moveNoteTarget.id}
          noteTitle={moveNoteTarget.title}
          currentFolderId={moveNoteTarget.folderId}
          onClose={() => setMoveNoteTarget(null)}
          onMoved={(targetName) => {
            setFeedback(`Notiz wurde nach „${targetName}" verschoben.`)
            setMoveNoteTarget(null)
          }}
        />
      ) : null}
    </SidebarLayout>
  )
}
