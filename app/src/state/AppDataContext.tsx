import { useMemo, useState, type ReactNode } from 'react'
import {
  getFolderById,
  getFolderPath,
  getMainFolders,
  getNotesByFolder,
  getNoteById,
  getPinnedNotes,
  getSubfolders,
  initialFolders,
  initialNotes,
  type FolderItem,
  type NoteItem,
} from '../data/mockData'
import { AppDataContext, type AppDataContextValue } from './appDataStore'

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<FolderItem[]>(initialFolders)
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes)

  const value = useMemo<AppDataContextValue>(
    () => ({
      folders,
      notes,
      findFolderById: (folderId) => getFolderById(folders, folderId),
      findNoteById: (noteId) => getNoteById(notes, noteId),
      getPinnedNoteItems: () => getPinnedNotes(notes),
      getMainFolderItems: () => getMainFolders(folders),
      getSubfolderItems: (folderId) => getSubfolders(folders, folderId),
      getFolderNoteItems: (folderId) => getNotesByFolder(notes, folderId),
      getFolderPathItems: (folderId) => getFolderPath(folders, folderId),
      renameFolder: (folderId, name) => {
        const cleanName = name.trim()
        if (!cleanName) return

        setFolders((prev) =>
          prev.map((folder) =>
            folder.id === folderId
              ? {
                  ...folder,
                  name: cleanName,
                }
              : folder,
          ),
        )
      },
      updateNoteTitle: (noteId, title) => {
        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  title,
                }
              : note,
          ),
        )
      },
      updateNoteContent: (noteId, content) => {
        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  content,
                }
              : note,
          ),
        )
      },
      toggleNotePinned: (noteId) => {
        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  pinned: !note.pinned,
                }
              : note,
          ),
        )
      },
    }),
    [folders, notes],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}
