import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  createFolder as createFolderApi,
  createNote as createNoteApi,
  deleteFolderToTrash as deleteFolderToTrashApi,
  deleteNoteToTrash as deleteNoteToTrashApi,
  fetchFolders,
  fetchNotes,
  fetchTrashFolders,
  fetchTrashNotes,
  moveFolderToParent as moveFolderToParentApi,
  moveNoteToFolder as moveNoteToFolderApi,
  renameFolder as renameFolderApi,
  restoreFolderFromTrash as restoreFolderFromTrashApi,
  restoreNoteFromTrash as restoreNoteFromTrashApi,
  togglePinFolder as togglePinFolderApi,
  updateFolderIcon as updateFolderIconApi,
  updateNote as updateNoteApi,
  permanentlyDeleteFolder as permanentlyDeleteFolderApi,
  permanentlyDeleteNote as permanentlyDeleteNoteApi,
  emptyTrash as emptyTrashApi,
} from '../lib/api'
import { supabase } from '../lib/supabase'
import {
  cacheFolders,
  cacheNotes,
  loadCachedFolders,
  loadCachedNotes,
  addPendingChange,
  getPendingChanges,
  clearPendingChanges,
  setLastSync,
  isOnline,
} from '../lib/localCache'
import {
  getFolderById,
  getFolderPath,
  getMainFolders,
  getNotesByFolder,
  getNoteById,
  getPinnedFolders,
  getPinnedNotes,
  getSubfolders,
  initialFolders,
  initialNotes,
  type FolderItem,
  type NoteItem,
} from '../data/mockData'
import { AppDataContext, type AppDataContextValue, type TrashFolderItem, type TrashNoteItem } from './appDataStore'

const CONTENT_SAVE_DEBOUNCE_MS = 450

export function AppDataProvider({ children, userId }: { children: ReactNode; userId?: string | null }) {
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [trash, setTrash] = useState<{ folders: TrashFolderItem[]; notes: TrashNoteItem[] }>({
    folders: [],
    notes: [],
  })
  const contentSaveTimersRef = useRef<Map<string, number>>(new Map())

  const [apiError, setApiError] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [currentUserName, setCurrentUserName] = useState('')

  // Load current user profile (email + display_name from user_metadata)
  useEffect(() => {
    if (!userId) return
    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      if (!user) return
      if (user.email) setCurrentUserEmail(user.email)
      const meta = user.user_metadata
      if (meta?.display_name) {
        setCurrentUserName(meta.display_name as string)
      } else if (meta?.full_name) {
        setCurrentUserName(meta.full_name as string)
      }
    })
  }, [userId])

  const showApiError = useCallback((message: string, error: unknown) => {
    console.error('[AppDataContext] API Error:', message, error)

    let detail = ''
    if (error && typeof error === 'object') {
      const err = error as { message?: string; status?: number; code?: string; details?: string; hint?: string }
      detail = [err.message, err.details, err.hint, err.code ? `(code: ${err.code})` : '']
        .filter(Boolean)
        .join(' – ')
    }

    const fullMessage = detail ? `${message} ${detail}` : message
    setApiError(fullMessage)

    // Auto-clear after 8 seconds
    window.setTimeout(() => setApiError(null), 8000)
  }, [])

  const replaceFolderNotes = useCallback((folderId: string, nextNotes: NoteItem[]) => {
    setNotes((prev) => {
      const keep = prev.filter((item) => item.folderId !== folderId)
      return [...keep, ...nextNotes]
    })
  }, [])

  const loadFoldersAndNotes = useCallback(async () => {
    // 1) Load from local cache first (instant)
    const [cachedFolders, cachedNotes] = await Promise.all([
      loadCachedFolders(),
      loadCachedNotes(),
    ])
    if (cachedFolders && cachedFolders.length > 0) {
      console.log('[AppDataContext] Using cached folders', cachedFolders.length)
      setFolders(cachedFolders)
    }
    if (cachedNotes && cachedNotes.length > 0) {
      console.log('[AppDataContext] Using cached notes', cachedNotes.length)
      setNotes(cachedNotes)
    }

    // 2) If offline, stop here
    if (!isOnline()) {
      console.log('[AppDataContext] Offline – using cached data only')
      return
    }

    // 3) Sync pending changes before fetching
    try {
      const pending = await getPendingChanges()
      if (pending.length > 0) {
        console.log('[AppDataContext] Syncing', pending.length, 'pending changes')
        for (const change of pending) {
          try {
            if (change.type === 'updateNote') {
              await updateNoteApi(change.noteId, { content: change.payload.content as string })
            } else if (change.type === 'updateTitle') {
              await updateNoteApi(change.noteId, { title: change.payload.title as string })
            } else if (change.type === 'togglePin') {
              await updateNoteApi(change.noteId, { pinned: change.payload.pinned as boolean })
            }
          } catch (e) {
            console.warn('[AppDataContext] Failed to sync pending change', change, e)
          }
        }
        await clearPendingChanges()
      }
    } catch {
      // ignore sync errors
    }

    // 4) Fetch fresh data from Supabase
    try {
      const loadedFolders = await fetchFolders()
      console.log('[AppDataContext] loadFoldersAndNotes folders', loadedFolders)
      setFolders(loadedFolders)

      const notesByFolder = await Promise.all(loadedFolders.map((folder: FolderItem) => fetchNotes(folder.id)))
      console.log('[AppDataContext] loadFoldersAndNotes notesByFolder', notesByFolder)
      const allNotes = notesByFolder.flat()
      setNotes(allNotes)

      const [trashFolders, trashNotes] = await Promise.all([fetchTrashFolders(), fetchTrashNotes()])
      console.log('[AppDataContext] loadFoldersAndNotes trash', { trashFolders, trashNotes })
      setTrash({
        folders: trashFolders,
        notes: trashNotes,
      })

      // 5) Update local cache
      await Promise.all([
        cacheFolders(loadedFolders),
        cacheNotes(allNotes),
        setLastSync(),
      ])
    } catch (error) {
      // If we already have cached data, don't show error – just warn
      if (cachedFolders && cachedFolders.length > 0) {
        console.warn('[AppDataContext] Failed to fetch from Supabase, using cache', error)
      } else {
        showApiError(
          'Supabase-Laden fehlgeschlagen. Bitte pruefe Login, Policies und Netzwerk.',
          error,
        )

        if (import.meta.env.DEV) {
          setFolders(initialFolders)
          setNotes(initialNotes)
          setTrash({ folders: [], notes: [] })
        }
      }
    }
  }, [showApiError])

  useEffect(() => {
    if (!userId) return

    const timeoutId = window.setTimeout(() => {
      void loadFoldersAndNotes()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadFoldersAndNotes, userId])

  // Re-sync when coming back online
  useEffect(() => {
    function handleOnline() {
      console.log('[AppDataContext] Back online – re-syncing')
      void loadFoldersAndNotes()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [loadFoldersAndNotes])

  useEffect(() => {
    const timers = contentSaveTimersRef.current
    return () => {
      for (const timeoutId of timers.values()) {
        window.clearTimeout(timeoutId)
      }
      timers.clear()
    }
  }, [])

  const value = useMemo<AppDataContextValue>(
    () => ({
      currentUserId: userId ?? '',
      currentUserEmail,
      currentUserName,
      apiError,
      folders,
      notes,
      trash,
      createFolder: async (title, options) => {
        const cleanTitle = title.trim()
        if (!cleanTitle) return null

        try {
          const created = await createFolderApi(cleanTitle, options)
          setFolders((prev) => [created, ...prev])
          return created
        } catch (error) {
          showApiError('Ordner konnte nicht erstellt werden.', error)
          return null
        }
      },
      createNote: async (folderId, title) => {
        const cleanTitle = title.trim()
        if (!cleanTitle) return null

        console.log('[AppDataContext] createNote before', { folderId, title: cleanTitle })
        try {
          const created = await createNoteApi(folderId, cleanTitle)
          console.log('[AppDataContext] createNote after', { created })
          setNotes((prev) => [created, ...prev])
          return created
        } catch (error) {
          console.log('[AppDataContext] createNote error', { folderId, title: cleanTitle, error })
          showApiError('Notiz konnte nicht erstellt werden.', error)
          return null
        }
      },
      moveFolderToParent: async (folderId, parentId) => {
        const previous = folders
        setFolders((prev) =>
          prev.map((folder) =>
            folder.id === folderId
              ? {
                  ...folder,
                  parentId,
                }
              : folder,
          ),
        )

        try {
          await moveFolderToParentApi(folderId, parentId)
        } catch (error) {
          setFolders(previous)
          showApiError('Ordner konnte nicht verschoben werden.', error)
        }
      },
      loadNotesForFolder: async (folderId) => {
        try {
          const loaded = await fetchNotes(folderId)
          replaceFolderNotes(folderId, loaded)
        } catch (error) {
          showApiError('Notizen konnten nicht geladen werden.', error)
        }
      },
      findFolderById: (folderId) => getFolderById(folders, folderId),
      findNoteById: (noteId) => getNoteById(notes, noteId),
      getPinnedNoteItems: () => {
        const privateFolderIds = new Set(folders.filter((f) => f.access === 'private').map((f) => f.id))
        return getPinnedNotes(notes).filter((n) => !privateFolderIds.has(n.folderId))
      },
      getPinnedFolderItems: () => getPinnedFolders(folders),
      getMainFolderItems: () => getMainFolders(folders),
      getSubfolderItems: (folderId) => getSubfolders(folders, folderId),
      getFolderNoteItems: (folderId) => getNotesByFolder(notes, folderId),
      getFolderPathItems: (folderId) => getFolderPath(folders, folderId),
      renameFolder: async (folderId, name) => {
        const cleanName = name.trim()
        if (!cleanName) return

        const previous = folders
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

        try {
          await renameFolderApi(folderId, cleanName)
        } catch (error) {
          setFolders(previous)
          showApiError('Ordner konnte nicht umbenannt werden.', error)
        }
      },
      updateFolderIcon: async (folderId, icon) => {
        const previous = folders
        setFolders((prev) =>
          prev.map((folder) =>
            folder.id === folderId ? { ...folder, icon } : folder,
          ),
        )
        try {
          await updateFolderIconApi(folderId, icon)
        } catch (error) {
          setFolders(previous)
          showApiError('Icon konnte nicht gespeichert werden.', error)
        }
      },
      toggleFolderPinned: async (folderId) => {
        const previous = folders
        const target = folders.find((item) => item.id === folderId)
        if (!target) return

        const nextPinned = !target.pinned
        setFolders((prev) =>
          prev.map((folder) =>
            folder.id === folderId ? { ...folder, pinned: nextPinned } : folder,
          ),
        )

        try {
          await togglePinFolderApi(folderId)
        } catch (error) {
          setFolders(previous)
          showApiError('Pin-Status des Ordners konnte nicht gespeichert werden.', error)
        }
      },
      updateNoteTitle: async (noteId, title) => {
        const previous = notes
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

        try {
          const updated = await updateNoteApi(noteId, { title })
          // Merge server response but keep local title (user may have kept typing)
          setNotes((prev) =>
            prev.map((note) =>
              note.id === noteId ? { ...updated, title: note.title } : note,
            ),
          )
        } catch (error) {
          setNotes(previous)
          showApiError('Notiztitel konnte nicht gespeichert werden.', error)
        }
      },
      updateNoteContent: async (noteId, content) => {
        setNotes((prev) => {
          const next = prev.map((note) =>
            note.id === noteId ? { ...note, content } : note,
          )
          // Update local cache in background
          void cacheNotes(next)
          return next
        })

        const existingTimer = contentSaveTimersRef.current.get(noteId)
        if (existingTimer) {
          window.clearTimeout(existingTimer)
        }

        const timeoutId = window.setTimeout(() => {
          if (!isOnline()) {
            // Queue for later sync
            void addPendingChange({ type: 'updateNote', noteId, payload: { content } })
            return
          }
          void updateNoteApi(noteId, { content })
            .then((updated: NoteItem) => {
              // Update with server response but keep the local content (may have changed since)
              setNotes((prev) =>
                prev.map((note) =>
                  note.id === noteId
                    ? { ...updated, content: note.content }
                    : note,
                ),
              )
            })
            .catch((error: unknown) => {
              // Save to pending queue so it can sync later
              void addPendingChange({ type: 'updateNote', noteId, payload: { content } })
              showApiError('Notizinhalte konnten nicht gespeichert werden.', error)
            })
        }, CONTENT_SAVE_DEBOUNCE_MS)

        contentSaveTimersRef.current.set(noteId, timeoutId)
      },
      toggleNotePinned: async (noteId) => {
        const previous = notes
        const target = notes.find((item) => item.id === noteId)
        if (!target) return

        const nextPinned = !target.pinned
        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  pinned: nextPinned,
                }
              : note,
          ),
        )

        try {
          const updated = await updateNoteApi(noteId, { pinned: nextPinned })
          // Only apply server response if pinned matches what we wanted
          if (updated.pinned === nextPinned) {
            setNotes((prev) => prev.map((note) => (note.id === noteId ? updated : note)))
          } else {
            // Server didn't persist the change – keep optimistic state but warn
            console.warn('[AppDataContext] toggleNotePinned: Server returned different pinned state', {
              expected: nextPinned,
              got: updated.pinned,
            })
            showApiError(
              'Pin-Status konnte auf dem Server nicht gespeichert werden. Bitte Supabase RLS-Policies für die Notes-Tabelle prüfen (UPDATE muss für den eingeloggten User erlaubt sein).',
              new Error('RLS policy may be blocking UPDATE on notes table'),
            )
          }
        } catch (error) {
          setNotes(previous)
          showApiError('Pin-Status konnte nicht gespeichert werden.', error)
        }
      },
      moveFolderToTrash: async (folderId) => {
        const previousFolders = folders
        const previousNotes = notes
        const previousTrash = trash

        setFolders((prev) => prev.filter((item) => item.id !== folderId))
        setNotes((prev) => prev.filter((item) => item.folderId !== folderId))

        try {
          const moved = await deleteFolderToTrashApi(folderId)
          setTrash((prev) => ({
            folders: [moved, ...prev.folders.filter((item) => item.id !== moved.id)],
            notes: prev.notes,
          }))
        } catch (error) {
          setFolders(previousFolders)
          setNotes(previousNotes)
          setTrash(previousTrash)
          showApiError('Ordner konnte nicht in den Papierkorb verschoben werden.', error)
        }
      },
      moveNoteToFolder: async (noteId, targetFolderId) => {
        const previous = notes
        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId ? { ...note, folderId: targetFolderId } : note,
          ),
        )

        try {
          const updated = await moveNoteToFolderApi(noteId, targetFolderId)
          setNotes((prev) => prev.map((note) => (note.id === noteId ? updated : note)))
        } catch (error) {
          setNotes(previous)
          showApiError('Notiz konnte nicht verschoben werden.', error)
        }
      },
      moveNoteToTrash: async (noteId) => {
        const previousNotes = notes
        const previousTrash = trash

        setNotes((prev) => prev.filter((item) => item.id !== noteId))

        try {
          const moved = await deleteNoteToTrashApi(noteId)
          setTrash((prev) => ({
            folders: prev.folders,
            notes: [moved, ...prev.notes.filter((item) => item.id !== moved.id)],
          }))
        } catch (error) {
          setNotes(previousNotes)
          setTrash(previousTrash)
          showApiError('Notiz konnte nicht in den Papierkorb verschoben werden.', error)
        }
      },
      restoreFolderFromTrash: async (folderId) => {
        try {
          const restoredFolder = await restoreFolderFromTrashApi(folderId)
          setTrash((prev) => ({
            folders: prev.folders.filter((item) => item.id !== folderId),
            notes: prev.notes.filter((item) => item.folderId !== folderId),
          }))
          setFolders((prev) => [...prev.filter((item) => item.id !== restoredFolder.id), restoredFolder])
          const restoredNotes = await fetchNotes(restoredFolder.id)
          replaceFolderNotes(restoredFolder.id, restoredNotes)
        } catch (error) {
          showApiError('Ordner konnte nicht aus dem Papierkorb wiederhergestellt werden.', error)
        }
      },
      restoreNoteFromTrash: async (noteId) => {
        try {
          const restoredNote = await restoreNoteFromTrashApi(noteId)
          setTrash((prev) => ({
            folders: prev.folders,
            notes: prev.notes.filter((item) => item.id !== noteId),
          }))
          setNotes((prev) => [restoredNote, ...prev.filter((item) => item.id !== restoredNote.id)])
        } catch (error) {
          showApiError('Notiz konnte nicht aus dem Papierkorb wiederhergestellt werden.', error)
        }
      },
      permanentlyDeleteFolder: async (folderId) => {
        try {
          await permanentlyDeleteFolderApi(folderId)
          setTrash((prev) => ({
            folders: prev.folders.filter((item) => item.id !== folderId),
            notes: prev.notes.filter((item) => item.folderId !== folderId),
          }))
        } catch (error) {
          showApiError('Ordner konnte nicht endgültig gelöscht werden.', error)
        }
      },
      permanentlyDeleteNote: async (noteId) => {
        try {
          await permanentlyDeleteNoteApi(noteId)
          setTrash((prev) => ({
            folders: prev.folders,
            notes: prev.notes.filter((item) => item.id !== noteId),
          }))
        } catch (error) {
          showApiError('Notiz konnte nicht endgültig gelöscht werden.', error)
        }
      },
      emptyTrash: async () => {
        try {
          await emptyTrashApi()
          setTrash({ folders: [], notes: [] })
        } catch (error) {
          showApiError('Papierkorb konnte nicht geleert werden.', error)
        }
      },
    }),
    [apiError, currentUserEmail, currentUserName, folders, notes, replaceFolderNotes, showApiError, trash, userId],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}
