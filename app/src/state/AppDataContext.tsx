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
  fetchUserPins,
  addUserPin as addUserPinApi,
  removeUserPin as removeUserPinApi,
  moveFolderToParent as moveFolderToParentApi,
  moveNoteToFolder as moveNoteToFolderApi,
  renameFolder as renameFolderApi,
  restoreFolderFromTrash as restoreFolderFromTrashApi,
  restoreNoteFromTrash as restoreNoteFromTrashApi,
  updateFolderAccess as updateFolderAccessApi,
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
  const [userPinIds, setUserPinIds] = useState<Set<string>>(new Set())

  // Load current user profile (email + display_name from user_metadata)
  // and upsert into profiles table so other team members can see the name
  useEffect(() => {
    if (!userId) return
    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      if (!user) return
      const email = user.email ?? ''
      if (email) setCurrentUserEmail(email)
      const meta = user.user_metadata
      const name = (meta?.display_name as string) || (meta?.full_name as string) || ''
      if (name) setCurrentUserName(name)

      // Upsert into profiles table (so team members can see each other's names)
      void supabase
        .from('profiles')
        .upsert({ id: user.id, email, display_name: name, updated_at: new Date().toISOString() }, { onConflict: 'id' })
        .then(({ error }) => { if (error) console.warn('[profiles] upsert failed:', error.message) })
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
              const pinned = change.payload.pinned as boolean
              if (pinned) {
                await addUserPinApi(change.noteId, 'note')
              } else {
                await removeUserPinApi(change.noteId)
              }
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
      const [loadedFolders, userPins] = await Promise.all([fetchFolders(), fetchUserPins()])
      const pinIdSet = new Set(userPins.map((p) => p.item_id))
      setUserPinIds(pinIdSet)

      // Override pinned based on user_pins
      const foldersWithPins = loadedFolders.map((f) => ({ ...f, pinned: pinIdSet.has(f.id) }))
      console.log('[AppDataContext] loadFoldersAndNotes folders', foldersWithPins)
      setFolders(foldersWithPins)

      const notesByFolder = await Promise.all(loadedFolders.map((folder: FolderItem) => fetchNotes(folder.id)))
      console.log('[AppDataContext] loadFoldersAndNotes notesByFolder', notesByFolder)
      const allNotes = notesByFolder.flat().map((n) => ({ ...n, pinned: pinIdSet.has(n.id) }))
      setNotes(allNotes)

      const [trashFolders, trashNotes] = await Promise.all([fetchTrashFolders(), fetchTrashNotes()])
      console.log('[AppDataContext] loadFoldersAndNotes trash', { trashFolders, trashNotes })
      setTrash({
        folders: trashFolders,
        notes: trashNotes,
      })

      // 5) Update local cache
      await Promise.all([
        cacheFolders(foldersWithPins),
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
        return notes.filter((n) => userPinIds.has(n.id) && !privateFolderIds.has(n.folderId))
      },
      getPinnedFolderItems: () => folders.filter((f) => userPinIds.has(f.id) && f.access !== 'private'),
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
      updateFolderAccess: async (folderId, access) => {
        const previous = folders
        // Alle Unterordner rekursiv sammeln
        function getDescendantIds(parentId: string, allFolders: typeof folders): string[] {
          const children = allFolders.filter((f) => f.parentId === parentId)
          const ids: string[] = []
          for (const child of children) {
            ids.push(child.id)
            ids.push(...getDescendantIds(child.id, allFolders))
          }
          return ids
        }
        const allIds = new Set([folderId, ...getDescendantIds(folderId, folders)])
        // Optimistisches Update für alle betroffenen Ordner
        setFolders((prev) =>
          prev.map((folder) =>
            allIds.has(folder.id) ? { ...folder, access } : folder,
          ),
        )
        try {
          // Alle betroffenen Ordner in Supabase updaten
          await Promise.all(
            Array.from(allIds).map((id) => updateFolderAccessApi(id, access)),
          )
        } catch (error) {
          setFolders(previous)
          showApiError('Zugriffsmodus konnte nicht geändert werden.', error)
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
        const target = folders.find((item) => item.id === folderId)
        if (!target) return

        const nextPinned = !target.pinned
        const previousFolders = folders
        const previousPins = userPinIds

        // Optimistic update
        setFolders((prev) =>
          prev.map((folder) =>
            folder.id === folderId ? { ...folder, pinned: nextPinned } : folder,
          ),
        )
        setUserPinIds((prev) => {
          const next = new Set(prev)
          if (nextPinned) next.add(folderId)
          else next.delete(folderId)
          return next
        })

        try {
          if (nextPinned) {
            await addUserPinApi(folderId, 'folder')
          } else {
            await removeUserPinApi(folderId)
          }
        } catch (error) {
          setFolders(previousFolders)
          setUserPinIds(previousPins)
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
        const target = notes.find((item) => item.id === noteId)
        if (!target) return

        const nextPinned = !target.pinned
        const previousNotes = notes
        const previousPins = userPinIds

        // Optimistic update
        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId ? { ...note, pinned: nextPinned } : note,
          ),
        )
        setUserPinIds((prev) => {
          const next = new Set(prev)
          if (nextPinned) next.add(noteId)
          else next.delete(noteId)
          return next
        })

        try {
          if (nextPinned) {
            await addUserPinApi(noteId, 'note')
          } else {
            await removeUserPinApi(noteId)
          }
        } catch (error) {
          setNotes(previousNotes)
          setUserPinIds(previousPins)
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
          throw error
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
          throw error
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
          throw error
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
      refreshData: async () => {
        await loadFoldersAndNotes()
      },
    }),
    [apiError, currentUserEmail, currentUserName, folders, loadFoldersAndNotes, notes, replaceFolderNotes, showApiError, trash, userId],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}
