import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SidebarLayout } from '../components/SidebarLayout'
import { CreateItemModal } from '../components/CreateItemModal'
import { MoveNoteModal } from '../components/MoveNoteModal'
import { FolderIcon, FOLDER_COLOR_CYCLE, IconPicker, READONLY_ICON } from '../components/FolderIcons'
import { UserAvatar } from '../components/UserAvatar'
import { useAppData } from '../state/useAppData'

import { isAdminEmail } from '../lib/admin'

export function FolderPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [isModalOpen, setModalOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isRenameMode, setRenameMode] = useState(false)
  const [isActionsMenuOpen, setActionsMenuOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [showIconPicker, setShowIconPicker] = useState(false)
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
    updateFolderIcon,
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
                  {canEdit && !isReadonly ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowIconPicker(true)
                        setActionsMenuOpen(false)
                      }}
                      className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <span className="text-base">🎨</span>
                      Symbol ändern
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
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-lg font-medium text-white shadow-md shadow-blue-500/30 transition-transform active:scale-95"
                aria-label="Neues Element"
              >
                +
              </button>
            ) : null}
          </div>
        </div>

        {/* Title */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{folder.name}</h1>
            {isReadonly ? (
              <span className="inline-flex items-center justify-center rounded-full bg-amber-100 p-1 dark:bg-amber-900/30" title="Nur Lesen">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </span>
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

        {/* Icon Picker */}
        {showIconPicker ? (
          <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-sm">
            <p className="mb-3 text-xs font-medium text-[var(--color-text-muted)]">Symbol wählen</p>
            <IconPicker
              selected={folder.icon || 'folder'}
              onSelect={async (icon) => {
                await updateFolderIcon(folder.id, icon)
                setShowIconPicker(false)
                setFeedback('Symbol wurde geändert.')
              }}
            />
            <button
              type="button"
              onClick={() => setShowIconPicker(false)}
              className="mt-3 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              Abbrechen
            </button>
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
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Unterordner
            </h2>
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm">
              {subfolders.map((entry, index) => {
                const isSubReadonly = entry.access === 'readonly'
                const iconId = isSubReadonly ? READONLY_ICON : (entry.icon || 'folder')
                const color = isSubReadonly
                  ? { bg: 'bg-amber-100 dark:bg-amber-900/30', stroke: 'stroke-amber-600' }
                  : FOLDER_COLOR_CYCLE[index % FOLDER_COLOR_CYCLE.length]
                const isDragOver = dragOverFolderId === entry.id
                return (
                  <Link
                    key={entry.id}
                    to={`/folder/${entry.id}`}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors active:bg-slate-100 dark:active:bg-slate-700 ${
                      index > 0 ? 'border-t border-[var(--color-border)]' : ''
                    } ${isDragOver ? 'ring-2 ring-inset ring-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    onDragOver={(e: DragEvent) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      setDragOverFolderId(entry.id)
                    }}
                    onDragLeave={() => setDragOverFolderId(null)}
                    onDrop={(e: DragEvent) => {
                      e.preventDefault()
                      setDragOverFolderId(null)
                      if (!canEdit) return // Readonly-Ordner: kein Verschieben erlaubt
                      const noteId = e.dataTransfer.getData('text/note-id')
                      if (noteId) {
                        void moveNoteToFolder(noteId, entry.id).then(() => {
                          setFeedback(`Notiz wurde nach „${entry.name}" verschoben.`)
                        })
                      }
                    }}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color.bg}`}>
                      <FolderIcon icon={iconId} className={`h-4.5 w-4.5 ${color.stroke}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{entry.name}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ) : (
          <section className="mt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Unterordner
            </h2>
            {canEdit ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="w-full rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-sm text-[var(--color-text-muted)] transition-colors hover:border-blue-300 hover:text-blue-500"
              >
                Tippe hier, um einen Unterordner zu erstellen
              </button>
            ) : (
              <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                Keine Unterordner vorhanden.
              </p>
            )}
          </section>
        )}

        {/* Notizen */}
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Notizen
          </h2>
          {folderNotes.length === 0 ? (
            canEdit ? (
              <button
                type="button"
                onClick={async () => {
                  const created = await createNote(folder.id, 'Neue Notiz')
                  if (created) {
                    navigate(`/note/${created.id}`)
                  }
                }}
                className="w-full rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-sm text-[var(--color-text-muted)] transition-colors hover:border-blue-300 hover:text-blue-500"
              >
                Noch keine Notizen. Tippe hier, um eine zu erstellen.
              </button>
            ) : (
              <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                Noch keine Notizen vorhanden.
              </p>
            )
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm">
              {folderNotes.map((note, index) => (
                <div
                  key={note.id}
                  draggable={canEdit}
                  onDragStart={canEdit ? (e: DragEvent<HTMLDivElement>) => {
                    e.dataTransfer.setData('text/note-id', note.id)
                    e.dataTransfer.effectAllowed = 'move'
                  } : undefined}
                  className={`flex ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''} items-center gap-0 ${
                    index > 0 ? 'border-t border-[var(--color-border)]' : ''
                  }`}
                >
                  <Link
                    to={`/note/${note.id}`}
                    className="block min-w-0 flex-1 px-4 py-3 transition-colors active:bg-slate-100 dark:active:bg-slate-700"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{note.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-[var(--color-text-secondary)]">{note.excerpt}</p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <UserAvatar email={note.ownerId || undefined} size="sm" />
                      <span className="text-[10px] text-[var(--color-text-muted)]">{note.updatedLabel}</span>
                    </div>
                  </Link>
                  {/* Verschieben-Button – nur wenn Bearbeitungsrechte */}
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
                      className="flex h-full shrink-0 items-center px-3 text-[var(--color-text-muted)] transition-colors hover:text-blue-500"
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
              ))}
            </div>
          )}
        </section>
      </div>

      {isModalOpen ? (
        <CreateItemModal
          title="Im Ordner erstellen"
          options={['Unterordner', 'Notiz/Projekt']}
          onClose={() => setModalOpen(false)}
          onSubmit={async ({ type, name, icon }) => {
            setModalOpen(false)
            if (type === 'Notiz/Projekt') {
              const createdNote = await createNote(folder.id, name)
              if (createdNote) {
                navigate(`/note/${createdNote.id}`)
              }
            } else {
              const createdFolder = await createFolder(name, {
                parentId: folder.id,
                access: folder.access,
                icon,
              })
              if (createdFolder) {
                navigate(`/folder/${createdFolder.id}`)
              }
            }
          }}
        />
      ) : null}

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
