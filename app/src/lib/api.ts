import type { FolderItem, NoteItem } from '../data/mockData'
import type { TrashFolderItem, TrashNoteItem } from '../state/appDataStore'
import { supabase } from './supabase'

/** Returns the current user's ID or throws if not logged in. */
async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser()
  const uid = data.user?.id
  if (!uid) throw new Error('Nicht eingeloggt – bitte neu anmelden.')
  return uid
}

type FolderRow = {
  id: string
  title: string
  pinned: boolean
  created_at: string
  owner_id: string
  parent_id: string | null
  kind: 'team' | 'private' | 'readonly' | null
  icon?: string | null
}

type NoteRow = {
  id: string
  folder_id: string | null
  title: string
  content: string
  excerpt?: string
  updated_label?: string
  pinned: boolean
  created_at: string
  updated_at: string
  owner_id?: string
  user_id?: string
}

type TrashFolderRow = FolderRow & {
  deleted_at: string
}

type TrashNoteRow = NoteRow & {
  deleted_at: string
}

const FOLDER_COLUMNS = 'id,title,pinned,created_at,owner_id,parent_id,kind,icon'
const FOLDER_COLUMNS_FALLBACK = 'id,title,pinned,created_at,owner_id,parent_id,kind'
const NOTE_COLUMNS = 'id,folder_id,title,content,excerpt,updated_label,pinned,created_at,updated_at,owner_id,user_id'
const TRASH_FOLDER_COLUMNS = 'id,title,pinned,created_at,owner_id,parent_id,kind,icon,deleted_at'
const TRASH_FOLDER_COLUMNS_FALLBACK = 'id,title,pinned,created_at,owner_id,deleted_at'
const TRASH_NOTE_COLUMNS = 'id,folder_id,title,content,excerpt,updated_label,pinned,created_at,updated_at,owner_id,user_id,deleted_at'

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildExcerpt(content: string) {
  const plain = stripHtml(content)
  if (plain.length === 0) return 'Leere Notiz'
  return plain.length > 120 ? `${plain.slice(0, 117)}...` : plain
}

function formatUpdatedLabel(updatedAt: string | null | undefined) {
  if (!updatedAt) return 'gerade eben'

  const updated = new Date(updatedAt).getTime()
  if (Number.isNaN(updated)) return 'gerade eben'

  const diffMinutes = Math.max(0, Math.floor((Date.now() - updated) / 60000))
  if (diffMinutes < 1) return 'gerade eben'
  if (diffMinutes < 60) return `vor ${diffMinutes} Min.`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `vor ${diffHours} Std.`

  const diffDays = Math.floor(diffHours / 24)
  return `vor ${diffDays} Tagen`
}

function mapFolderRow(row: FolderRow): FolderItem {
  return {
    id: row.id,
    name: row.title,
    parentId: row.parent_id ?? null,
    access: row.kind ?? 'team',
    pinned: Boolean(row.pinned),
    ownerId: row.owner_id ?? '',
    icon: row.icon ?? undefined,
  }
}

function mapNoteRow(row: NoteRow): NoteItem {
  const content = typeof row.content === 'string' ? row.content : ''

  return {
    id: row.id,
    folderId: row.folder_id ?? '',
    title: row.title,
    content,
    excerpt: buildExcerpt(content),
    updatedLabel: formatUpdatedLabel(row.updated_at ?? row.created_at),
    pinned: Boolean(row.pinned),
    ownerId: row.user_id ?? row.owner_id ?? '',
  }
}

function mapTrashFolderRow(row: TrashFolderRow): TrashFolderItem {
  return {
    ...mapFolderRow(row),
    deletedAt: row.deleted_at,
  }
}

function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : ''
  const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : ''
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    message.includes('schema cache') ||
    message.includes('Could not find') ||
    message.includes('parent_id') ||
    message.includes('kind') ||
    message.includes('title') ||
    message.includes('name') ||
    message.includes('access')
  )
}

async function selectTrashFolderById(folderId: string): Promise<TrashFolderRow> {
  const full = await supabase
    .from('trash_folders')
    .select(TRASH_FOLDER_COLUMNS)
    .eq('id', folderId)
    .single()

  console.log('[api.selectTrashFolderById] full response', { data: full.data, error: full.error })

  if (!full.error && full.data) {
    return full.data as TrashFolderRow
  }

  if (!isMissingColumnError(full.error)) {
    throw full.error
  }

  const fallback = await supabase
    .from('trash_folders')
    .select(TRASH_FOLDER_COLUMNS_FALLBACK)
    .eq('id', folderId)
    .single()

  console.log('[api.selectTrashFolderById] fallback response', {
    data: fallback.data,
    error: fallback.error,
  })

  if (fallback.error) throw fallback.error
  const row = fallback.data as Omit<TrashFolderRow, 'parent_id' | 'kind'>
  return {
    ...row,
    parent_id: null,
    kind: 'team',
  }
}

async function selectAllTrashFolders(): Promise<TrashFolderRow[]> {
  const full = await supabase
    .from('trash_folders')
    .select(TRASH_FOLDER_COLUMNS)
    .order('deleted_at', { ascending: false })

  console.log('[api.selectAllTrashFolders] full response', { data: full.data, error: full.error })

  if (!full.error) {
    return (full.data ?? []) as TrashFolderRow[]
  }

  if (!isMissingColumnError(full.error)) {
    throw full.error
  }

  const fallback = await supabase
    .from('trash_folders')
    .select(TRASH_FOLDER_COLUMNS_FALLBACK)
    .order('deleted_at', { ascending: false })

  console.log('[api.selectAllTrashFolders] fallback response', {
    data: fallback.data,
    error: fallback.error,
  })

  if (fallback.error) throw fallback.error
  return ((fallback.data ?? []) as Array<Omit<TrashFolderRow, 'parent_id' | 'kind'>>).map((row) => ({
    ...row,
    parent_id: null,
    kind: 'team',
  }))
}

async function upsertTrashFolder(sourceFolder: FolderRow, deletedAt: string) {
  const userId = await requireUserId()
  const folderAccess = sourceFolder.kind ?? 'team'

  // Build all possible payloads, from most complete to minimal
  const payloads = [
    // Attempt 1: all columns with both naming conventions
    {
      id: sourceFolder.id,
      title: sourceFolder.title,
      name: sourceFolder.title,
      pinned: sourceFolder.pinned,
      created_at: sourceFolder.created_at,
      owner_id: sourceFolder.owner_id,
      user_id: userId,
      parent_id: sourceFolder.parent_id,
      kind: folderAccess,
      access: folderAccess,
      deleted_at: deletedAt,
    },
    // Attempt 2: without 'kind' and 'parent_id' (trash_folders may only have 'access')
    {
      id: sourceFolder.id,
      title: sourceFolder.title,
      name: sourceFolder.title,
      pinned: sourceFolder.pinned,
      created_at: sourceFolder.created_at,
      owner_id: sourceFolder.owner_id,
      user_id: userId,
      access: folderAccess,
      deleted_at: deletedAt,
    },
    // Attempt 3: without 'title' (trash_folders may only have 'name')
    {
      id: sourceFolder.id,
      name: sourceFolder.title,
      pinned: sourceFolder.pinned,
      created_at: sourceFolder.created_at,
      owner_id: sourceFolder.owner_id,
      user_id: userId,
      access: folderAccess,
      deleted_at: deletedAt,
    },
    // Attempt 4: minimal
    {
      id: sourceFolder.id,
      name: sourceFolder.title,
      owner_id: sourceFolder.owner_id,
      user_id: userId,
      access: folderAccess,
      deleted_at: deletedAt,
    },
  ]

  for (let i = 0; i < payloads.length; i++) {
    const { error } = await supabase.from('trash_folders').upsert(payloads[i], { onConflict: 'id' })
    console.log(`[api.upsertTrashFolder] attempt ${i + 1}`, { error })
    if (!error) return
    if (i === payloads.length - 1) throw error
    if (!isMissingColumnError(error)) throw error
  }
}

function mapTrashNoteRow(row: TrashNoteRow): TrashNoteItem {
  return {
    ...mapNoteRow(row),
    deletedAt: row.deleted_at,
  }
}

export async function fetchFolders(): Promise<FolderItem[]> {
  const { data, error } = await supabase
    .from('folders')
    .select(FOLDER_COLUMNS)
    .order('created_at', { ascending: false })

  console.log('[api.fetchFolders] response', { data, error })

  // Fallback falls die icon-Spalte noch nicht existiert
  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from('folders')
      .select(FOLDER_COLUMNS_FALLBACK)
      .order('created_at', { ascending: false })
    if (fallback.error) throw fallback.error
    return ((fallback.data ?? []) as FolderRow[]).map(mapFolderRow)
  }

  if (error) throw error
  return ((data ?? []) as FolderRow[]).map(mapFolderRow)
}

export async function createFolder(
  title: string,
  options?: { pinned?: boolean; parentId?: string | null; access?: FolderItem['access']; icon?: string },
): Promise<FolderItem> {
  const cleanTitle = title.trim()
  const ownerId = await requireUserId()
  const insertPayload: Record<string, unknown> = {
    title: cleanTitle,
    pinned: options?.pinned ?? false,
    parent_id: options?.parentId ?? null,
    kind: options?.access ?? 'team',
    owner_id: ownerId,
  }
  if (options?.icon) insertPayload.icon = options.icon

  let { data, error } = await supabase
    .from('folders')
    .insert(insertPayload)
    .select(FOLDER_COLUMNS)
    .single()

  // Falls icon-Spalte nicht existiert, ohne icon erneut versuchen
  if (error && isMissingColumnError(error) && insertPayload.icon) {
    delete insertPayload.icon
    const retry = await supabase
      .from('folders')
      .insert(insertPayload)
      .select(FOLDER_COLUMNS_FALLBACK)
      .single()
    data = retry.data as typeof data
    error = retry.error
  }

  if (error) throw error
  return mapFolderRow(data as FolderRow)
}

export async function renameFolder(folderId: string, title: string): Promise<void> {
  const cleanTitle = title.trim()
  const { error } = await supabase.from('folders').update({ title: cleanTitle }).eq('id', folderId)
  if (error) throw error
}

export async function updateFolderIcon(folderId: string, icon: string): Promise<void> {
  const { error } = await supabase.from('folders').update({ icon }).eq('id', folderId)
  // Graceful: Wenn die icon-Spalte nicht existiert, ignorieren wir den Fehler
  if (error && !isMissingColumnError(error)) throw error
}

export async function moveFolderToParent(folderId: string, parentId: string | null): Promise<void> {
  const { error } = await supabase.from('folders').update({ parent_id: parentId }).eq('id', folderId)
  if (error) throw error
}

export async function togglePinFolder(folderId: string): Promise<void> {
  const { data, error } = await supabase.from('folders').select('pinned').eq('id', folderId).single()
  if (error) throw error

  const pinned = Boolean((data as { pinned?: unknown }).pinned)
  const { error: updateError } = await supabase
    .from('folders')
    .update({ pinned: !pinned })
    .eq('id', folderId)

  if (updateError) throw updateError
}

export async function deleteFolderToTrash(folderId: string): Promise<TrashFolderItem> {
  const { data: folder, error: folderError } = await supabase
    .from('folders')
    .select(FOLDER_COLUMNS)
    .eq('id', folderId)
    .single()

  if (folderError) throw folderError
  const sourceFolder = folder as FolderRow

  const deletedAt = new Date().toISOString()
  const currentUserId = await requireUserId()

  // Recursively collect all descendant folder IDs (children, grandchildren, etc.)
  async function collectDescendantFolderIds(parentId: string): Promise<string[]> {
    const { data: children, error } = await supabase
      .from('folders')
      .select('id')
      .eq('parent_id', parentId)
    if (error) throw error
    const childIds = ((children ?? []) as Array<{ id: string }>).map((c) => c.id)
    const grandChildIds: string[] = []
    for (const childId of childIds) {
      const descendants = await collectDescendantFolderIds(childId)
      grandChildIds.push(...descendants)
    }
    return [...childIds, ...grandChildIds]
  }

  const descendantIds = await collectDescendantFolderIds(folderId)
  // All folder IDs to process: descendants first (deepest last), then the main folder
  const allFolderIds = [...descendantIds, folderId]

  // For each folder: trash its notes, then trash the folder itself
  for (const fId of allFolderIds) {
    // Fetch & trash notes in this folder
    const { data: notesInFolder, error: notesFetchError } = await supabase
      .from('notes')
      .select(NOTE_COLUMNS)
      .eq('folder_id', fId)
    if (notesFetchError) throw notesFetchError

    const notesRows = (notesInFolder ?? []) as NoteRow[]
    if (notesRows.length > 0) {
      const { error: trashNotesError } = await supabase.from('trash_notes').upsert(
        notesRows.map((note) => ({
          id: note.id,
          folder_id: note.folder_id ?? null,
          title: note.title,
          content: typeof note.content === 'string' ? note.content : '',
          excerpt: note.excerpt ?? buildExcerpt(typeof note.content === 'string' ? note.content : ''),
          updated_label: note.updated_label ?? formatUpdatedLabel(note.updated_at),
          pinned: note.pinned,
          created_at: note.created_at,
          updated_at: note.updated_at,
          owner_id: note.user_id ?? note.owner_id,
          user_id: note.user_id ?? note.owner_id ?? currentUserId,
          deleted_at: deletedAt,
        })),
        { onConflict: 'id' },
      )
      if (trashNotesError) throw trashNotesError
    }

    // Delete notes from original table
    const { error: deleteNotesError } = await supabase.from('notes').delete().eq('folder_id', fId)
    if (deleteNotesError) throw deleteNotesError

    // Trash the folder itself (only for main folder – subfolders just get trashed too)
    if (fId === folderId) {
      await upsertTrashFolder(sourceFolder, deletedAt)
    } else {
      // Fetch subfolder data and trash it
      const { data: subFolder } = await supabase.from('folders').select(FOLDER_COLUMNS).eq('id', fId).single()
      if (subFolder) {
        await upsertTrashFolder(subFolder as FolderRow, deletedAt)
      }
    }
  }

  // Delete all folders from original table – children first, then parent
  // Reverse so deepest children are deleted first
  const deleteOrder = [...descendantIds].reverse()
  for (const dId of deleteOrder) {
    const { error } = await supabase.from('folders').delete().eq('id', dId)
    if (error) throw error
  }
  // Finally delete the main folder
  const { error: deleteFolderError } = await supabase.from('folders').delete().eq('id', folderId)
  if (deleteFolderError) throw deleteFolderError

  return mapTrashFolderRow({
    ...sourceFolder,
    deleted_at: deletedAt,
  })
}

export async function restoreFolderFromTrash(folderId: string): Promise<FolderItem> {
  const row = await selectTrashFolderById(folderId)

  const { data: trashedNotes, error: trashedNotesError } = await supabase
    .from('trash_notes')
    .select(TRASH_NOTE_COLUMNS)
    .eq('folder_id', folderId)

  if (trashedNotesError) throw trashedNotesError

  const { error: restoreFolderError } = await supabase.from('folders').upsert(
    {
      id: row.id,
      title: row.title,
      pinned: row.pinned,
      created_at: row.created_at,
      owner_id: row.owner_id,
      parent_id: row.parent_id,
      kind: row.kind ?? 'team',
    },
    { onConflict: 'id' },
  )
  if (restoreFolderError) throw restoreFolderError

  const trashNotesRows = (trashedNotes ?? []) as TrashNoteRow[]
  if (trashNotesRows.length > 0) {
    const { error: restoreNotesError } = await supabase.from('notes').upsert(
      trashNotesRows.map((note) => ({
        id: note.id,
        folder_id: note.folder_id ?? null,
        title: note.title,
        content: typeof note.content === 'string' ? note.content : '',
        pinned: note.pinned,
        created_at: note.created_at,
        updated_at: note.updated_at,
        owner_id: note.owner_id,
      })),
      { onConflict: 'id' },
    )

    if (restoreNotesError) throw restoreNotesError

    const { error: deleteTrashNotesError } = await supabase
      .from('trash_notes')
      .delete()
      .eq('folder_id', folderId)
    if (deleteTrashNotesError) throw deleteTrashNotesError
  }

  const { error: deleteTrashFolderError } = await supabase
    .from('trash_folders')
    .delete()
    .eq('id', folderId)
  if (deleteTrashFolderError) throw deleteTrashFolderError

  return mapFolderRow(row)
}

export async function fetchNotes(folderId: string): Promise<NoteItem[]> {
  const { data, error } = await supabase
    .from('notes')
    .select(NOTE_COLUMNS)
    .eq('folder_id', folderId)
    .order('updated_at', { ascending: false })

  console.log('[api.fetchNotes] response', { folderId, data, error })
  if (error) throw error
  return ((data ?? []) as NoteRow[]).map(mapNoteRow)
}

export async function createNote(folderId: string, title: string): Promise<NoteItem> {
  const cleanTitle = title.trim()
  const ownerId = await requireUserId()
  console.log('[api.createNote] before', { folderId, title: cleanTitle, ownerId })

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('notes')
    .insert({
      folder_id: folderId,
      title: cleanTitle,
      content: '',
      excerpt: '',
      updated_label: 'gerade eben',
      pinned: false,
      user_id: ownerId,
      owner_id: ownerId,
      created_at: now,
      updated_at: now,
    })
    .select(NOTE_COLUMNS)
    .single()

  console.log('[api.createNote] after', { data, error })
  if (error) throw error
  return mapNoteRow(data as NoteRow)
}

export async function updateNote(
  noteId: string,
  patch: { title?: string; content?: string; pinned?: boolean },
): Promise<NoteItem> {
  const payload: Record<string, unknown> = {}
  if (typeof patch.title === 'string') payload.title = patch.title
  if (typeof patch.content === 'string') {
    payload.content = patch.content
    payload.excerpt = buildExcerpt(patch.content)
  }
  if (typeof patch.pinned === 'boolean') payload.pinned = patch.pinned
  payload.updated_label = 'gerade eben'
  payload.updated_at = new Date().toISOString()

  if (Object.keys(payload).length === 0) {
    const { data, error } = await supabase.from('notes').select(NOTE_COLUMNS).eq('id', noteId).single()
    if (error) throw error
    return mapNoteRow(data as NoteRow)
  }

  const { data, error } = await supabase
    .from('notes')
    .update(payload)
    .eq('id', noteId)
    .select(NOTE_COLUMNS)

  if (error) throw error

  // data is an array – should contain exactly one row if update succeeded
  const rows = (data ?? []) as NoteRow[]
  if (rows.length === 0) {
    // RLS might block the update – try a direct select to check if the note exists
    const { data: existing } = await supabase
      .from('notes')
      .select(NOTE_COLUMNS)
      .eq('id', noteId)
      .maybeSingle()
    if (existing) {
      // Note exists but could not be updated (RLS policy) – return existing data
      console.warn('[api.updateNote] Update returned 0 rows, returning existing data for', noteId)
      return mapNoteRow(existing as NoteRow)
    }
    throw new Error('Notiz konnte nicht aktualisiert werden.')
  }
  return mapNoteRow(rows[0])
}

export async function moveNoteToFolder(noteId: string, targetFolderId: string): Promise<NoteItem> {
  const { data, error } = await supabase
    .from('notes')
    .update({ folder_id: targetFolderId })
    .eq('id', noteId)
    .select(NOTE_COLUMNS)
    .single()

  if (error) throw error
  return mapNoteRow(data as NoteRow)
}

export async function deleteNoteToTrash(noteId: string): Promise<TrashNoteItem> {
  const { data, error } = await supabase.from('notes').select(NOTE_COLUMNS).eq('id', noteId).single()
  if (error) throw error

  const note = data as NoteRow
  const deletedAt = new Date().toISOString()
  const currentUserId = await requireUserId()

  const { error: trashError } = await supabase.from('trash_notes').upsert(
    {
      id: note.id,
      folder_id: note.folder_id ?? null,
      title: note.title,
      content: typeof note.content === 'string' ? note.content : '',
      excerpt: note.excerpt ?? buildExcerpt(typeof note.content === 'string' ? note.content : ''),
      updated_label: note.updated_label ?? formatUpdatedLabel(note.updated_at),
      pinned: note.pinned,
      created_at: note.created_at,
      updated_at: note.updated_at,
      owner_id: note.user_id ?? note.owner_id,
      user_id: note.user_id ?? note.owner_id ?? currentUserId,
      deleted_at: deletedAt,
    },
    { onConflict: 'id' },
  )
  if (trashError) throw trashError

  const { error: deleteError } = await supabase.from('notes').delete().eq('id', noteId)
  if (deleteError) throw deleteError

  return mapTrashNoteRow({
    ...note,
    deleted_at: deletedAt,
  })
}

export async function restoreNoteFromTrash(noteId: string): Promise<NoteItem> {
  const { data, error } = await supabase
    .from('trash_notes')
    .select(TRASH_NOTE_COLUMNS)
    .eq('id', noteId)
    .single()
  if (error) throw error

  const note = data as TrashNoteRow

  const { error: restoreError } = await supabase.from('notes').upsert(
    {
      id: note.id,
      folder_id: note.folder_id ?? null,
      title: note.title,
      content: typeof note.content === 'string' ? note.content : '',
      excerpt: note.excerpt ?? buildExcerpt(typeof note.content === 'string' ? note.content : ''),
      updated_label: note.updated_label ?? formatUpdatedLabel(note.updated_at),
      pinned: note.pinned,
      created_at: note.created_at,
      updated_at: note.updated_at,
      user_id: note.user_id ?? note.owner_id,
    },
    { onConflict: 'id' },
  )
  if (restoreError) throw restoreError

  const { error: deleteTrashError } = await supabase.from('trash_notes').delete().eq('id', noteId)
  if (deleteTrashError) throw deleteTrashError

  return mapNoteRow(note)
}

export async function fetchTrashFolders(): Promise<TrashFolderItem[]> {
  const rows = await selectAllTrashFolders()
  return rows.map(mapTrashFolderRow)
}

export async function fetchTrashNotes(): Promise<TrashNoteItem[]> {
  const { data, error } = await supabase
    .from('trash_notes')
    .select(TRASH_NOTE_COLUMNS)
    .order('deleted_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as TrashNoteRow[]).map(mapTrashNoteRow)
}

/** Permanently delete a folder from trash */
export async function permanentlyDeleteFolder(folderId: string): Promise<void> {
  // Also delete any associated trash notes
  const { error: notesError } = await supabase
    .from('trash_notes')
    .delete()
    .eq('folder_id', folderId)
  if (notesError) throw notesError

  const { error } = await supabase
    .from('trash_folders')
    .delete()
    .eq('id', folderId)
  if (error) throw error
}

/** Permanently delete a note from trash */
export async function permanentlyDeleteNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('trash_notes')
    .delete()
    .eq('id', noteId)
  if (error) throw error
}

/** Empty entire trash */
export async function emptyTrash(): Promise<void> {
  const { error: notesError } = await supabase
    .from('trash_notes')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000') // match all rows
  if (notesError) throw notesError

  const { error: foldersError } = await supabase
    .from('trash_folders')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000')
  if (foldersError) throw foldersError
}
