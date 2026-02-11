import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BottomNavigation } from '../components/BottomNavigation'
import { CreateItemModal } from '../components/CreateItemModal'
import { getAccessLabel } from '../data/mockData'
import { useAppData } from '../state/useAppData'

export function DashboardPage() {
  const [isModalOpen, setModalOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const { createFolder, createNote, getMainFolderItems, getPinnedNoteItems, getSubfolderItems } =
    useAppData()

  const pinnedNotes = getPinnedNoteItems()
  const rootFolders = getMainFolderItems()

  return (
    <>
      <main className="mx-auto min-h-screen w-full max-w-xl bg-slate-50 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-6 text-slate-900">
        <header className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-200">Guten Tag, Team</p>
              <h1 className="mt-1 text-2xl font-semibold">Dashboard</h1>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="h-11 w-11 rounded-2xl bg-white/15 text-2xl leading-none hover:bg-white/25"
              aria-label="Neues Element"
            >
              +
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-200">
            Notizen und Ordner werden jetzt ueber Supabase geladen.
          </p>
        </header>

        {feedback ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {feedback}
          </div>
        ) : null}

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Fixierte Projekte</h2>
            <span className="text-xs text-slate-500">max. 4</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {pinnedNotes.map((note) => (
              <Link
                key={note.id}
                to={`/note/${note.id}`}
                className="min-w-56 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-sm font-semibold text-slate-900">{note.title}</p>
                <p className="mt-2 text-sm text-slate-600">{note.excerpt}</p>
                <p className="mt-3 text-xs text-slate-500">{note.updatedLabel}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-7">
          <h2 className="mb-3 text-lg font-semibold">Alle Projekte</h2>
          <div className="space-y-2">
            {rootFolders.map((folder) => (
              <Link
                key={folder.id}
                to={`/folder/${folder.id}`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{folder.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {getSubfolderItems(folder.id).length} Unterordner
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {getAccessLabel(folder.access)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <BottomNavigation active="team" />

      {isModalOpen ? (
        <CreateItemModal
          title="Neu erstellen"
          options={['Ordner', 'Notiz/Projekt']}
          onClose={() => setModalOpen(false)}
          onSubmit={async ({ type, name }) => {
            if (type === 'Ordner') {
              const createdFolder = await createFolder(name)
              if (createdFolder) {
                setFeedback(`Ordner "${createdFolder.name}" wurde erstellt.`)
              }
            } else {
              const targetFolder = rootFolders[0]
              if (!targetFolder) {
                setFeedback('Lege zuerst einen Ordner an, damit eine Notiz erstellt werden kann.')
                setModalOpen(false)
                return
              }

              const createdNote = await createNote(targetFolder.id, name)
              if (createdNote) {
                setFeedback(`Notiz "${createdNote.title}" wurde in "${targetFolder.name}" erstellt.`)
              }
            }

            setModalOpen(false)
          }}
        />
      ) : null}
    </>
  )
}
