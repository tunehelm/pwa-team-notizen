import { createContext } from 'react'
import type { AccessType, FolderItem, NoteItem } from '../data/mockData'

export interface TrashFolderItem extends FolderItem {
  deletedAt: string
}

export interface TrashNoteItem extends NoteItem {
  deletedAt: string
}

export interface AppDataContextValue {
  currentUserId: string
  currentUserEmail: string
  currentUserName: string
  /** True after getUser() has run once (email/name resolved or known missing). */
  profileLoaded: boolean
  apiError: string | null
  folders: FolderItem[]
  notes: NoteItem[]
  trash: {
    folders: TrashFolderItem[]
    notes: TrashNoteItem[]
  }
  createFolder: (
    title: string,
    options?: { pinned?: boolean; parentId?: string | null; access?: AccessType; icon?: string },
  ) => Promise<FolderItem | null>
  updateFolderAccess: (folderId: string, access: 'team' | 'readonly') => Promise<void>
  updateFolderIcon: (folderId: string, icon: string) => Promise<void>
  createNote: (folderId: string, title: string) => Promise<NoteItem | null>
  moveFolderToParent: (folderId: string, parentId: string | null) => Promise<void>
  loadNotesForFolder: (folderId: string) => Promise<void>
  findFolderById: (folderId: string) => FolderItem | undefined
  findNoteById: (noteId: string) => NoteItem | undefined
  getPinnedNoteItems: () => NoteItem[]
  getPinnedFolderItems: () => FolderItem[]
  getMainFolderItems: () => FolderItem[]
  getSubfolderItems: (folderId: string) => FolderItem[]
  getFolderNoteItems: (folderId: string) => NoteItem[]
  getFolderPathItems: (folderId: string) => FolderItem[]
  renameFolder: (folderId: string, name: string) => Promise<void>
  toggleFolderPinned: (folderId: string) => Promise<void>
  updateNoteTitle: (noteId: string, title: string) => Promise<void>
  updateNoteContent: (noteId: string, content: string) => Promise<void>
  toggleNotePinned: (noteId: string) => Promise<void>
  moveFolderToTrash: (folderId: string) => Promise<void>
  moveNoteToFolder: (noteId: string, targetFolderId: string) => Promise<void>
  moveNoteToTrash: (noteId: string) => Promise<void>
  restoreFolderFromTrash: (folderId: string) => Promise<void>
  restoreNoteFromTrash: (noteId: string) => Promise<void>
  permanentlyDeleteFolder: (folderId: string) => Promise<void>
  permanentlyDeleteNote: (noteId: string) => Promise<void>
  emptyTrash: () => Promise<void>
  refreshData: (forceFromServer?: boolean) => Promise<void>
  /** Wird nach jedem refreshData-Aufruf inkrementiert – NotePage kann Drafts danach verwerfen. */
  lastRefreshAt: number
}

export const AppDataContext = createContext<AppDataContextValue | undefined>(undefined)
