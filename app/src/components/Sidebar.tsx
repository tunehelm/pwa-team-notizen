import { useState, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAppData } from '../state/useAppData'
import { FolderIcon, FOLDER_COLOR_CYCLE, READONLY_ICON } from './FolderIcons'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const {
    currentUserName,
    currentUserEmail,
    folders: allFolders,
    getMainFolderItems,
    getPinnedFolderItems,
    findNoteById,
  } = useAppData()

  const [manualExpandedIds, setManualExpandedIds] = useState<Set<string>>(new Set())
  const [manualCollapsedIds, setManualCollapsedIds] = useState<Set<string>>(new Set())

  const toggleExpand = useCallback((folderId: string) => {
    setManualExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
    setManualCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }, [])

  const rootFolders = getMainFolderItems()
  const pinnedFolders = getPinnedFolderItems()

  const userName = currentUserName || (currentUserEmail ? currentUserEmail.split('@')[0] : 'Team')

  // Aktiver Ordner aus URL ermitteln – auch für Notizseiten den Elternordner finden
  let activeFolderId: string | null = null
  if (location.pathname.startsWith('/folder/')) {
    activeFolderId = location.pathname.split('/folder/')[1]?.split('/')[0] || null
  } else if (location.pathname.startsWith('/note/')) {
    // Notiz-Seite: Finde den Ordner der Notiz
    const noteId = location.pathname.split('/note/')[1]?.split('/')[0]
    if (noteId) {
      const note = findNoteById(noteId)
      if (note?.folderId) {
        activeFolderId = note.folderId
      }
    }
  }

  // Berechne welche Ordner IDs in der Hierarchie des aktiven Ordners sind
  const activeAncestorIds = new Set<string>()
  if (activeFolderId) {
    let current = allFolders.find((f) => f.id === activeFolderId)
    while (current?.parentId) {
      activeAncestorIds.add(current.parentId)
      current = allFolders.find((f) => f.id === current!.parentId)
    }
  }

  // Ein Ordner ist expanded wenn:
  // 1. Er manuell expanded wurde, ODER
  // 2. Er ein Vorfahre des aktiven Ordners ist (und nicht manuell collapsed)
  function isFolderExpanded(folderId: string): boolean {
    if (manualCollapsedIds.has(folderId) && !activeAncestorIds.has(folderId)) return false
    if (manualExpandedIds.has(folderId)) return true
    if (activeAncestorIds.has(folderId)) return true
    // Auch expandieren wenn ein Kind aktiv ist
    const children = allFolders.filter((f) => f.parentId === folderId)
    if (children.some((c) => c.id === activeFolderId)) return true
    return false
  }

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}

      {/* Sidebar Container */}
      <aside
        className={[
          // Basis – sidebar look via CSS vars
          'flex h-full w-64 shrink-0 flex-col border-r transition-all duration-300',
          // Mobile: Fixed Overlay
          'fixed left-0 top-0 z-40 pt-[env(safe-area-inset-top)]',
          // Desktop: Static, im Flex-Layout
          'lg:relative lg:z-0',
          // Toggle
          isOpen ? 'translate-x-0' : '-translate-x-full lg:-ml-64',
        ].join(' ')}
        style={{
          backgroundColor: 'var(--color-sidebar)',
          borderColor: 'var(--color-sidebar-border)',
          color: 'var(--color-sidebar-text)',
        }}
      >
        {/* User Header */}
        <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
            {userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-sidebar-text)' }}>{userName}</p>
            <p className="truncate text-[10px]" style={{ color: 'var(--color-sidebar-text-muted)' }}>{currentUserEmail}</p>
          </div>
          {/* Sidebar schließen (nur mobile) */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg lg:hidden"
            style={{ color: 'var(--color-sidebar-text-muted)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-none">
          {/* Fixierte Ordner */}
          {pinnedFolders.length > 0 ? (
            <div className="mb-4">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-sidebar-text-muted)' }}>
                Fixiert
              </p>
              {pinnedFolders.map((folder, idx) => {
                const isRo = folder.access === 'readonly'
                const iconId = isRo ? READONLY_ICON : (folder.icon || 'folder')
                const color = isRo
                  ? { bg: 'bg-amber-900/30', stroke: 'stroke-amber-500' }
                  : FOLDER_COLOR_CYCLE[idx % FOLDER_COLOR_CYCLE.length]
                const isActive = activeFolderId === folder.id
                return (
                  <Link
                    key={folder.id}
                    to={`/folder/${folder.id}`}
                    onClick={onClose}
                    className={`sidebar-link flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition-colors ${
                      isActive ? 'bg-blue-500 text-white font-medium' : ''
                    }`}
                    style={isActive ? undefined : { color: 'var(--color-sidebar-text)' }}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-white/20' : color.bg}`}>
                      <FolderIcon icon={iconId} className={`h-3.5 w-3.5 ${isActive ? 'stroke-white' : color.stroke}`} />
                    </div>
                    <span className="truncate">{folder.name}</span>
                  </Link>
                )
              })}
            </div>
          ) : null}

          {/* Alle Ordner */}
          <div>
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-sidebar-text-muted)' }}>
              Bereiche
            </p>
            {rootFolders.map((folder, idx) => {
              const isRo = folder.access === 'readonly'
              const iconId = isRo ? READONLY_ICON : (folder.icon || 'folder')
              const color = isRo
                ? { bg: 'bg-amber-900/30', stroke: 'stroke-amber-500' }
                : FOLDER_COLOR_CYCLE[idx % FOLDER_COLOR_CYCLE.length]
              const isActive = activeFolderId === folder.id
              const children = allFolders.filter((f) => f.parentId === folder.id)
              const expanded = isFolderExpanded(folder.id)
              return (
                <div key={folder.id}>
                  <div className="flex items-center">
                    {/* Expand toggle */}
                    {children.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(folder.id)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors"
                        style={{ color: 'var(--color-sidebar-text-muted)' }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
                        >
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </button>
                    ) : (
                      <span className="w-6 shrink-0" />
                    )}
                    <Link
                      to={`/folder/${folder.id}`}
                      onClick={onClose}
                      className={`sidebar-link flex flex-1 items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition-colors ${
                        isActive ? 'bg-blue-500 text-white font-medium' : ''
                      }`}
                      style={isActive ? undefined : { color: 'var(--color-sidebar-text)' }}
                    >
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-white/20' : color.bg}`}>
                        <FolderIcon icon={iconId} className={`h-3.5 w-3.5 ${isActive ? 'stroke-white' : color.stroke}`} />
                      </div>
                      <span className="truncate">{folder.name}</span>
                      {isRo ? (
                        <span className="ml-auto rounded-full bg-amber-900/30 px-1.5 py-0.5 text-[8px] font-semibold text-amber-400">
                          Nur Lesen
                        </span>
                      ) : null}
                    </Link>
                  </div>
                  {/* Unterordner */}
                  {expanded && children.length > 0 ? (
                    <div className="ml-6">
                      {children.map((child, childIdx) => {
                        const cIsRo = child.access === 'readonly'
                        const cIconId = cIsRo ? READONLY_ICON : (child.icon || 'folder')
                        const cColor = cIsRo
                          ? { bg: 'bg-amber-900/30', stroke: 'stroke-amber-500' }
                          : FOLDER_COLOR_CYCLE[childIdx % FOLDER_COLOR_CYCLE.length]
                        const cIsActive = activeFolderId === child.id
                        // Dritte Ebene
                        const grandchildren = allFolders.filter((f) => f.parentId === child.id)
                        const cIsExpanded = isFolderExpanded(child.id)
                        return (
                          <div key={child.id}>
                            <div className="flex items-center">
                              {grandchildren.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(child.id)}
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors"
                                  style={{ color: 'var(--color-sidebar-text-muted)' }}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className={`h-2.5 w-2.5 transition-transform ${cIsExpanded ? 'rotate-90' : ''}`}
                                  >
                                    <path d="M9 6l6 6-6 6" />
                                  </svg>
                                </button>
                              ) : (
                                <span className="w-5 shrink-0" />
                              )}
                              <Link
                                to={`/folder/${child.id}`}
                                onClick={onClose}
                                className={`sidebar-link flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors ${
                                  cIsActive ? 'bg-blue-500 text-white font-medium' : ''
                                }`}
                                style={cIsActive ? undefined : { color: 'var(--color-sidebar-text)' }}
                              >
                                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${cIsActive ? 'bg-white/20' : cColor.bg}`}>
                                  <FolderIcon icon={cIconId} className={`h-3 w-3 ${cIsActive ? 'stroke-white' : cColor.stroke}`} />
                                </div>
                                <span className="truncate">{child.name}</span>
                              </Link>
                            </div>
                            {/* Grandchildren */}
                            {cIsExpanded && grandchildren.length > 0 ? (
                              <div className="ml-5">
                                {grandchildren.map((gc, gcIdx) => {
                                  const gcIsRo = gc.access === 'readonly'
                                  const gcIconId = gcIsRo ? READONLY_ICON : (gc.icon || 'folder')
                                  const gcColor = gcIsRo
                                    ? { bg: 'bg-amber-900/30', stroke: 'stroke-amber-500' }
                                    : FOLDER_COLOR_CYCLE[gcIdx % FOLDER_COLOR_CYCLE.length]
                                  const gcIsActive = activeFolderId === gc.id
                                  return (
                                    <Link
                                      key={gc.id}
                                      to={`/folder/${gc.id}`}
                                      onClick={onClose}
                                      className={`sidebar-link flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] transition-colors ${
                                        gcIsActive ? 'bg-blue-500 text-white font-medium' : ''
                                      }`}
                                      style={gcIsActive ? undefined : { color: 'var(--color-sidebar-text)' }}
                                    >
                                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${gcIsActive ? 'bg-white/20' : gcColor.bg}`}>
                                        <FolderIcon icon={gcIconId} className={`h-2.5 w-2.5 ${gcIsActive ? 'stroke-white' : gcColor.stroke}`} />
                                      </div>
                                      <span className="truncate">{gc.name}</span>
                                    </Link>
                                  )
                                })}
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}
            {rootFolders.length === 0 ? (
              <p className="px-2 py-3 text-xs" style={{ color: 'var(--color-sidebar-text-muted)' }}>Keine Ordner vorhanden</p>
            ) : null}
          </div>
        </nav>

        {/* Bottom Nav Links – statisch fixiert */}
        <div className="shrink-0 px-2 py-2" style={{ borderTop: '1px solid var(--color-sidebar-border)' }}>
          <Link
            to="/"
            onClick={onClose}
            className={`flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition-colors ${
              location.pathname === '/'
                ? 'bg-blue-500/20 text-blue-400 font-medium'
                : ''
            }`}
            style={location.pathname === '/' ? undefined : { color: 'var(--color-sidebar-text-muted)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Start
          </Link>
          <Link
            to="/private"
            onClick={onClose}
            className={`flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition-colors ${
              location.pathname === '/private'
                ? 'bg-blue-500/20 text-blue-400 font-medium'
                : ''
            }`}
            style={location.pathname === '/private' ? undefined : { color: 'var(--color-sidebar-text-muted)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Privat
          </Link>
          <Link
            to="/team"
            onClick={onClose}
            className={`flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition-colors ${
              location.pathname === '/team'
                ? 'bg-blue-500/20 text-blue-400 font-medium'
                : ''
            }`}
            style={location.pathname === '/team' ? undefined : { color: 'var(--color-sidebar-text-muted)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            Team
          </Link>
        </div>
      </aside>
    </>
  )
}
