/**
 * Local cache layer using IndexedDB (via idb-keyval).
 * Provides offline-first data storage with sync capability.
 *
 * Strategy:
 * - On load: Read from local cache immediately, then fetch from Supabase
 * - On save: Write to local cache immediately, then push to Supabase
 * - If offline: Use local cache, queue changes for later sync
 */
import { get, set, del } from 'idb-keyval'
import type { FolderItem, NoteItem } from '../data/mockData'

const CACHE_KEYS = {
  folders: 'cache:folders',
  notes: 'cache:notes',
  pendingChanges: 'cache:pendingChanges',
  lastSync: 'cache:lastSync',
} as const

export interface PendingChange {
  id: string
  type: 'updateNote' | 'updateTitle' | 'togglePin'
  noteId: string
  payload: Record<string, unknown>
  timestamp: number
}

/** Save folders to local cache */
export async function cacheFolders(folders: FolderItem[]): Promise<void> {
  try {
    await set(CACHE_KEYS.folders, folders)
  } catch (e) {
    console.warn('[localCache] Failed to cache folders', e)
  }
}

/** Load folders from local cache */
export async function loadCachedFolders(): Promise<FolderItem[] | null> {
  try {
    const data = await get<FolderItem[]>(CACHE_KEYS.folders)
    return data ?? null
  } catch (e) {
    console.warn('[localCache] Failed to load cached folders', e)
    return null
  }
}

/** Save notes to local cache */
export async function cacheNotes(notes: NoteItem[]): Promise<void> {
  try {
    await set(CACHE_KEYS.notes, notes)
  } catch (e) {
    console.warn('[localCache] Failed to cache notes', e)
  }
}

/** Load notes from local cache */
export async function loadCachedNotes(): Promise<NoteItem[] | null> {
  try {
    const data = await get<NoteItem[]>(CACHE_KEYS.notes)
    return data ?? null
  } catch (e) {
    console.warn('[localCache] Failed to load cached notes', e)
    return null
  }
}

/** Ordner- und Notiz-Cache leeren (z. B. für „Vom Server laden“). Pending Changes bleiben. */
export async function clearFoldersAndNotesCache(): Promise<void> {
  try {
    await Promise.all([del(CACHE_KEYS.folders), del(CACHE_KEYS.notes)])
  } catch (e) {
    console.warn('[localCache] Failed to clear folders/notes cache', e)
  }
}

/** Add a pending change for later sync */
export async function addPendingChange(change: Omit<PendingChange, 'id' | 'timestamp'>): Promise<void> {
  try {
    const pending = (await get<PendingChange[]>(CACHE_KEYS.pendingChanges)) ?? []
    // Remove older changes for same noteId+type to avoid duplicates
    const filtered = pending.filter(
      (p) => !(p.noteId === change.noteId && p.type === change.type),
    )
    filtered.push({
      ...change,
      id: `${change.noteId}-${change.type}-${Date.now()}`,
      timestamp: Date.now(),
    })
    await set(CACHE_KEYS.pendingChanges, filtered)
  } catch (e) {
    console.warn('[localCache] Failed to add pending change', e)
  }
}

/** Get all pending changes */
export async function getPendingChanges(): Promise<PendingChange[]> {
  try {
    return (await get<PendingChange[]>(CACHE_KEYS.pendingChanges)) ?? []
  } catch {
    return []
  }
}

/** Clear all pending changes */
export async function clearPendingChanges(): Promise<void> {
  try {
    await del(CACHE_KEYS.pendingChanges)
  } catch (e) {
    console.warn('[localCache] Failed to clear pending changes', e)
  }
}

/** Record the last sync timestamp */
export async function setLastSync(): Promise<void> {
  try {
    await set(CACHE_KEYS.lastSync, Date.now())
  } catch (e) {
    console.warn('[localCache] Failed to set last sync', e)
  }
}

/** Check if we're online */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}
