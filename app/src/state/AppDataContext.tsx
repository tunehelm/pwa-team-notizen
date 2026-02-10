import { useEffect, useMemo, useState, type ReactNode } from 'react'
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

const STORAGE_KEY = 'pwa-team-notizen:v1'
const STORAGE_VERSION = 1
const WRITE_DEBOUNCE_MS = 300

interface PersistedAppData {
  folders: FolderItem[]
  notes: NoteItem[]
  meta: {
    savedAt: string
    version: number
  }
}

let initialDataCache: Pick<PersistedAppData, 'folders' | 'notes'> | null = null

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<FolderItem[]>(() => getInitialAppData().folders)
  const [notes, setNotes] = useState<NoteItem[]>(() => getInitialAppData().notes)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      persistAppData({ folders, notes })
    }, WRITE_DEBOUNCE_MS)

    return () => window.clearTimeout(timeout)
  }, [folders, notes])

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

function getInitialAppData() {
  if (!initialDataCache) {
    initialDataCache = loadInitialAppData()
  }

  return initialDataCache
}

function loadInitialAppData(): Pick<PersistedAppData, 'folders' | 'notes'> {
  if (typeof window === 'undefined') {
    return {
      folders: initialFolders,
      notes: initialNotes,
    }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        folders: initialFolders,
        notes: initialNotes,
      }
    }

    const parsed = JSON.parse(raw) as unknown

    if (isPersistedAppData(parsed)) {
      return {
        folders: parsed.folders,
        notes: parsed.notes,
      }
    }
  } catch {
    // Ignore invalid localStorage and fall back to defaults.
  }

  return {
    folders: initialFolders,
    notes: initialNotes,
  }
}

function persistAppData(data: Pick<PersistedAppData, 'folders' | 'notes'>) {
  if (typeof window === 'undefined') return

  const payload: PersistedAppData = {
    folders: data.folders,
    notes: data.notes,
    meta: {
      savedAt: new Date().toISOString(),
      version: STORAGE_VERSION,
    },
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage write failures (quota/private mode).
  }
}

function isPersistedAppData(value: unknown): value is PersistedAppData {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<PersistedAppData>
  if (!Array.isArray(candidate.folders) || !Array.isArray(candidate.notes)) return false

  if (!candidate.meta || typeof candidate.meta !== 'object') return false
  if (candidate.meta.version !== STORAGE_VERSION) return false
  if (typeof candidate.meta.savedAt !== 'string') return false

  return candidate.folders.every(isFolderItem) && candidate.notes.every(isNoteItem)
}

function isFolderItem(value: unknown): value is FolderItem {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<FolderItem>

  const access =
    candidate.access === 'team' ||
    candidate.access === 'private' ||
    candidate.access === 'readonly'

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    (typeof candidate.parentId === 'string' || candidate.parentId === null) &&
    access
  )
}

function isNoteItem(value: unknown): value is NoteItem {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<NoteItem>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.folderId === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.excerpt === 'string' &&
    typeof candidate.content === 'string' &&
    typeof candidate.updatedLabel === 'string' &&
    typeof candidate.pinned === 'boolean'
  )
}
