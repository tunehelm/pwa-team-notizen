import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BottomNavigation } from '../components/BottomNavigation'
import { CreateItemModal } from '../components/CreateItemModal'
import { getAccessLabel } from '../data/mockData'
import { useAppData } from '../state/useAppData'

export function FolderPage() {
  const { id = '' } = useParams()
  const [isModalOpen, setModalOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isRenameMode, setRenameMode] = useState(false)
  const [isActionsMenuOpen, setActionsMenuOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const actionsMenuRef = useRef<HTMLDivElement>(null)
  const {
    findFolderById,
    getFolderPathItems,
    getFolderNoteItems,
    getSubfolderItems,
    createFolder,
    createNote,
    loadNotesForFolder,
    moveFolderToTrash,
    renameFolder,
  } = useAppData()

  const folder = findFolderById(id)
  const path = folder ? getFolderPathItems(folder.id) : []
  const subfolders = folder ? getSubfolderItems(folder.id) : []
  const folderNotes = folder ? getFolderNoteItems(folder.id) : []
  const rootFolderId = path[0]?.id
  const activeNav =
    rootFolderId === 'projects'
      ? 'projects'
      : rootFolderId === 'private-space'
        ? 'private'
        : rootFolderId === 'archive' || rootFolderId === 'read-only'
          ? 'archive'
          : 'team'

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
      <main className="mx-auto min-h-screen w-full max-w-xl bg-slate-50 px-4 py-8 text-slate-900">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Ordner nicht gefunden</h1>
          <p className="mt-2 text-sm text-slate-600">
            Dieser Dummy-Ordner existiert nicht in der aktuellen UI-Shell.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          >
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
    <>
      <main className="mx-auto min-h-screen w-full max-w-xl bg-slate-50 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-5 text-slate-900">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
                ← Zurück
              </Link>
              <h1 className="mt-2 text-2xl font-semibold">{folder.name}</h1>
              <p className="mt-1 text-xs text-slate-500">
                Bereich: {getAccessLabel(folder.access)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={actionsMenuRef}>
                <button
                  type="button"
                  onClick={() => setActionsMenuOpen((prev) => !prev)}
                  className="h-11 min-w-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  aria-label="Ordneraktionen öffnen"
                >
                  ...
                </button>

                {isActionsMenuOpen ? (
                  <div className="absolute right-0 top-12 z-20 w-48 rounded-2xl border border-slate-200 bg-white p-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        startRename()
                        setActionsMenuOpen(false)
                      }}
                      className="flex h-11 w-full items-center rounded-xl px-3 text-left text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Umbenennen
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await moveFolderToTrash(folder.id)
                        setActionsMenuOpen(false)
                        setFeedback('Ordner wurde in den Papierkorb verschoben.')
                      }}
                      className="flex h-11 w-full items-center rounded-xl px-3 text-left text-sm text-rose-600 hover:bg-rose-50"
                    >
                      In Papierkorb
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionsMenuOpen(false)}
                      className="flex h-11 w-full items-center rounded-xl px-3 text-left text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Abbrechen/Schließen
                    </button>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="h-11 w-11 rounded-2xl bg-slate-900 text-2xl leading-none text-white hover:bg-slate-800"
                aria-label="Neues Element im Ordner"
              >
                +
              </button>
            </div>
          </div>

          {isRenameMode ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-medium text-slate-600">Ordner umbenennen</p>
              <div className="flex items-center gap-2">
                <input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={saveRename}
                  className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white"
                >
                  Speichern
                </button>
                <button
                  type="button"
                  onClick={() => setRenameMode(false)}
                  className="h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-700"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : null}

          <nav className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Link to="/" className="hover:text-slate-700">
              Dashboard
            </Link>
            {path.map((entry, index) => (
              <span key={entry.id} className="flex items-center gap-2">
                <span>/</span>
                {index === path.length - 1 ? (
                  <span className="font-medium text-slate-700">{entry.name}</span>
                ) : (
                  <Link to={`/folder/${entry.id}`} className="hover:text-slate-700">
                    {entry.name}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        </header>

        {feedback ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {feedback}
          </div>
        ) : null}

        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Subordner</h2>
          {subfolders.length === 0 ? (
            <EmptyState text="Noch keine Unterordner. Erstelle den ersten Unterordner über +." />
          ) : (
            <div className="space-y-2">
              {subfolders.map((entry) => (
                <Link
                  key={entry.id}
                  to={`/folder/${entry.id}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <span className="font-medium text-slate-900">{entry.name}</span>
                  <span className="text-xs text-slate-500">
                    {getAccessLabel(entry.access)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-7">
          <h2 className="mb-3 text-lg font-semibold">Notizen / Projekte</h2>
          {folderNotes.length === 0 ? (
            <EmptyState text="Noch keine Notizen in diesem Ordner. Erstelle eine neue Notiz über +." />
          ) : (
            <div className="space-y-2">
              {folderNotes.map((note) => (
                <Link
                  key={note.id}
                  to={`/note/${note.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <p className="font-medium text-slate-900">{note.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{note.excerpt}</p>
                  <p className="mt-2 text-xs text-slate-500">{note.updatedLabel}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNavigation active={activeNav} />

      {isModalOpen ? (
        <CreateItemModal
          title="Im Ordner erstellen"
          options={['Unterordner', 'Notiz/Projekt']}
          onClose={() => setModalOpen(false)}
          onSubmit={async ({ type, name }) => {
            if (type === 'Notiz/Projekt') {
              const createdNote = await createNote(folder.id, name)
              if (createdNote) {
                setFeedback(`Notiz "${createdNote.title}" wurde erstellt.`)
              }
            } else {
              const createdFolder = await createFolder(name, {
                parentId: folder.id,
                access: folder.access,
              })
              if (createdFolder) {
                setFeedback(`Ordner "${createdFolder.name}" wurde erstellt.`)
              }
            }
            setModalOpen(false)
          }}
        />
      ) : null}
    </>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  )
}
