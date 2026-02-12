export type AccessType = 'team' | 'private' | 'readonly'

export interface FolderItem {
  id: string
  name: string
  parentId: string | null
  access: AccessType
  pinned: boolean
  ownerId: string
  icon?: string
}

export interface NoteItem {
  id: string
  folderId: string
  title: string
  excerpt: string
  content: string
  updatedLabel: string
  pinned: boolean
  ownerId: string
}

export const initialFolders: FolderItem[] = [
  { id: 'team-hub', name: 'Team Hub', parentId: null, access: 'team', pinned: false, ownerId: 'mock' },
  { id: 'projects', name: 'Projekte', parentId: null, access: 'team', pinned: false, ownerId: 'mock' },
  { id: 'private-space', name: 'Privat', parentId: null, access: 'private', pinned: false, ownerId: 'mock' },
  { id: 'read-only', name: 'Read-only', parentId: null, access: 'readonly', pinned: false, ownerId: 'mock' },
  { id: 'archive', name: 'Archiv', parentId: null, access: 'readonly', pinned: false, ownerId: 'mock' },
  { id: 'roadmap', name: 'Roadmap 2026', parentId: 'projects', access: 'team', pinned: true, ownerId: 'mock' },
  { id: 'mobile', name: 'Mobile UX', parentId: 'projects', access: 'team', pinned: false, ownerId: 'mock' },
  { id: 'weekly', name: 'Weekly Notizen', parentId: 'team-hub', access: 'team', pinned: false, ownerId: 'mock' },
  {
    id: 'private-brainstorm',
    name: 'Brainstorm privat',
    parentId: 'private-space',
    access: 'private',
    pinned: false,
    ownerId: 'mock',
  },
]

export const initialNotes: NoteItem[] = [
  {
    id: 'note-kickoff',
    folderId: 'projects',
    title: 'Kickoff – Team-Notizen',
    excerpt: 'Umfang der ersten Release-Phase und Timeline.',
    content: 'Kickoff-Notiz mit Zielen, Scope und den ersten UI-Shell-Bausteinen.',
    updatedLabel: 'vor 2 Std.',
    pinned: true,
    ownerId: 'mock',
  },
  {
    id: 'note-ux',
    folderId: 'mobile',
    title: 'iPhone UX Checkliste',
    excerpt: 'Topbar sichtbar, Keyboard-Flow, sichere Tap-Flächen.',
    content: 'Checkliste für iOS-optimierte Bedienung in der PWA.',
    updatedLabel: 'gestern',
    pinned: true,
    ownerId: 'mock',
  },
  {
    id: 'note-sync',
    folderId: 'team-hub',
    title: 'Sync-Status UI',
    excerpt: 'Offline, Synchronisiere, Synchronisiert als visuelle States.',
    content: 'Dummy-Notiz für spätere Zustände ohne Backend-Anbindung.',
    updatedLabel: 'vor 3 Tagen',
    pinned: false,
    ownerId: 'mock',
  },
  {
    id: 'note-retro',
    folderId: 'weekly',
    title: 'Retro Woche 05',
    excerpt: 'Was lief gut, was wird nächste Woche verbessert?',
    content: 'Retro-Inhalte als Beispiel für die Ordneransicht.',
    updatedLabel: 'vor 5 Tagen',
    pinned: true,
    ownerId: 'mock',
  },
  {
    id: 'note-private',
    folderId: 'private-brainstorm',
    title: 'Ideenskizzen',
    excerpt: 'Persönliche Notizen für nächste Features.',
    content: 'Lokale Dummy-Inhalte ohne Persistenz.',
    updatedLabel: 'vor 1 Woche',
    pinned: false,
    ownerId: 'mock',
  },
  {
    id: 'note-readonly',
    folderId: 'read-only',
    title: 'Projektleitlinien',
    excerpt: 'Referenzseite mit Regeln für das Team.',
    content: 'Read-only Demo-Inhalt.',
    updatedLabel: 'vor 8 Tagen',
    pinned: true,
    ownerId: 'mock',
  },
]

export const mainNavigationFolderIds = [
  'team-hub',
  'projects',
  'private-space',
  'archive',
]

export function getFolderById(folders: FolderItem[], folderId: string) {
  return folders.find((folder) => folder.id === folderId)
}

export function getNoteById(notes: NoteItem[], noteId: string) {
  return notes.find((note) => note.id === noteId)
}

export function getPinnedNotes(notes: NoteItem[]) {
  return notes.filter((note) => note.pinned).slice(0, 4)
}

export function getPinnedFolders(folders: FolderItem[]) {
  return folders.filter((folder) => folder.pinned && folder.access !== 'private')
}

export function getMainFolders(folders: FolderItem[]) {
  return folders.filter((folder) => folder.parentId === null && folder.access !== 'private')
}

export function getSubfolders(folders: FolderItem[], folderId: string) {
  return folders.filter((folder) => folder.parentId === folderId)
}

export function getNotesByFolder(notes: NoteItem[], folderId: string) {
  return notes.filter((note) => note.folderId === folderId)
}

export function getFolderPath(folders: FolderItem[], folderId: string) {
  const path: FolderItem[] = []
  let current = getFolderById(folders, folderId)
  let guard = 0

  while (current && guard < 20) {
    path.unshift(current)
    current = current.parentId ? getFolderById(folders, current.parentId) : undefined
    guard += 1
  }

  return path
}

export function getAccessLabel(access: AccessType) {
  if (access === 'private') return 'Privat'
  if (access === 'readonly') return 'Read-only'
  return 'Team'
}
