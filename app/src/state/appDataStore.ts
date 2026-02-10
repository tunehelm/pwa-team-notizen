import { createContext } from 'react'
import type { FolderItem, NoteItem } from '../data/mockData'

export interface AppDataContextValue {
  folders: FolderItem[]
  notes: NoteItem[]
  findFolderById: (folderId: string) => FolderItem | undefined
  findNoteById: (noteId: string) => NoteItem | undefined
  getPinnedNoteItems: () => NoteItem[]
  getMainFolderItems: () => FolderItem[]
  getSubfolderItems: (folderId: string) => FolderItem[]
  getFolderNoteItems: (folderId: string) => NoteItem[]
  getFolderPathItems: (folderId: string) => FolderItem[]
  renameFolder: (folderId: string, name: string) => void
  updateNoteTitle: (noteId: string, title: string) => void
  updateNoteContent: (noteId: string, content: string) => void
  toggleNotePinned: (noteId: string) => void
}

export const AppDataContext = createContext<AppDataContextValue | undefined>(undefined)
