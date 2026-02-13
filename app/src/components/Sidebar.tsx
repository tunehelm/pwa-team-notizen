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
    getFolderNoteItems,
    findNoteById,
  } = useAppData()

  const [manualState, setManualState] = useState<{
    expanded: Set<string>
    collapsed: Set<string>
  }>({ expanded: new Set(), collapsed: new Set() })

  const rootFolders = getMainFolderItems()
  const pinnedFolders = getPinnedFolderItems()

  const userName = currentUserName || (currentUserEmail ? currentUserEmail.split('@')[0] : 'Team')

  // Aktiver Ordner aus URL ermitteln (für Hierarchie-Aufklappung)
  let activeFolderId: string | null = null
  if (location.pathname.startsWith('/folder/')) {
    activeFolderId = location.pathname.split('/folder/')[1]?.split('/')[0] || null
  } else if (location.pathname.startsWith('/note/')) {
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

  const toggleExpand = useCallback(
    (folderId: string, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setManualState((prev) => {
        const isExpanded =
          !prev.collapsed.has(folderId) &&
          (folderId === activeFolderId ||
            prev.expanded.has(folderId) ||
            activeAncestorIds.has(folderId) ||
            allFolders.filter((f) => f.parentId === folderId).some((c) => c.id === activeFolderId))
        const nextExpanded = new Set(prev.expanded)
        const nextCollapsed = new Set(prev.collapsed)
        if (isExpanded) {
          nextExpanded.delete(folderId)
          nextCollapsed.add(folderId)
        } else {
          nextExpanded.add(folderId)
          nextCollapsed.delete(folderId)
        }
        return { expanded: nextExpanded, collapsed: nextCollapsed }
      })
    },
    [activeAncestorIds, activeFolderId, allFolders]
  )

  // Ein Ordner ist expanded wenn:
  // 1. User hat explizit zugeklappt → immer zugeklappt
  // 2. Wir sind in diesem Ordner (activeFolderId) → aufgeklappt (Hierarchie widerspiegeln)
  // 3. User hat explizit aufgeklappt
  // 4. Ordner ist Vorfahre des aktiven Ordners
  // 5. Ein Kind von ihm ist aktiv
  function isFolderExpanded(folderId: string): boolean {
    if (manualState.collapsed.has(folderId)) return false
    if (folderId === activeFolderId) return true
    if (manualState.expanded.has(folderId)) return true
    if (activeAncestorIds.has(folderId)) return true
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
        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-none">
          {/* Fixierte Ordner */}
          {pinnedFolders.length > 0 ? (
            <div className="mb-5">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-sidebar-text-muted)' }}>
                Fixiert
              </p>
              {pinnedFolders.map((folder, idx) => {
                const isRo = folder.access === 'readonly'
                const iconId = isRo ? READONLY_ICON : (folder.icon || 'folder')
                const color = isRo
                  ? { bg: 'bg-amber-900/30', stroke: 'stroke-amber-500' }
                  : FOLDER_COLOR_CYCLE[idx % FOLDER_COLOR_CYCLE.length]
                return (
                  <Link
                    key={folder.id}
                    to={`/folder/${folder.id}`}
                    onClick={onClose}
                    className="sidebar-link flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors"
                    style={{ color: 'var(--color-sidebar-text)' }}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${color.bg}`}>
                      <FolderIcon icon={iconId} className={`h-3.5 w-3.5 ${color.stroke}`} />
                    </div>
                    <span className="truncate">{folder.name}</span>
                  </Link>
                )
              })}
            </div>
          ) : null}

          {/* Alle Ordner */}
          <div>
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-sidebar-text-muted)' }}>
              Bereiche
            </p>
            {rootFolders.map((folder, idx) => {
              const isRo = folder.access === 'readonly'
              const iconId = isRo ? READONLY_ICON : (folder.icon || 'folder')
              const color = isRo
                ? { bg: 'bg-amber-900/30', stroke: 'stroke-amber-500' }
                : FOLDER_COLOR_CYCLE[idx % FOLDER_COLOR_CYCLE.length]
              const children = allFolders.filter((f) => f.parentId === folder.id)
              const folderNotes = getFolderNoteItems(folder.id)
              const hasExpandableContent = children.length > 0 || folderNotes.length > 0
              const expanded = isFolderExpanded(folder.id)
              return (
                <div key={folder.id} className="mb-0.5">
                  <div className="flex items-center rounded-lg transition-colors group">
                    {/* Pfeil: indiziert Unterordner/Notizen, klickbar zum Auf-/Zuklappen */}
                    {hasExpandableContent ? (
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(folder.id, e)}
                        className="flex h-8 w-6 shrink-0 cursor-pointer items-center justify-center rounded-l-lg transition-colors hover:bg-white/5"
                        style={{ color: 'var(--color-sidebar-text-muted)' }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`h-3 w-3 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
                        >
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </button>
                    ) : (
                      <span className="flex h-8 w-6 shrink-0 items-center justify-center" />
                    )}
                    <Link
                      to={`/folder/${folder.id}`}
                      onClick={onClose}
                      className="sidebar-link flex flex-1 items-center gap-2.5 rounded-r-lg px-2.5 py-2 text-sm transition-colors"
                      style={{ color: 'var(--color-sidebar-text)' }}
                    >
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${color.bg}`}>
                        <FolderIcon icon={iconId} className={`h-3.5 w-3.5 ${color.stroke}`} />
                      </div>
                      <span className="truncate">{folder.name}</span>
                      {isRo ? (
                        <span className="ml-auto rounded-full bg-amber-900/30 px-1.5 py-0.5 text-[8px] font-semibold text-amber-400">
                          Nur Lesen
                        </span>
                      ) : null}
                    </Link>
                  </div>
                  {/* Unterordner + Notizen – weiche Einrückung */}
                  {expanded && hasExpandableContent ? (
                    <div className="ml-3 border-l border-slate-500/30 pl-3 mt-0.5">
                      {children.map((child, childIdx) => {
                        const cIsRo = child.access === 'readonly'
                        const cIconId = cIsRo ? READONLY_ICON : (child.icon || 'folder')
                        const cColor = cIsRo
                          ? { bg: 'bg-amber-900/30', stroke: 'stroke-amber-500' }
                          : FOLDER_COLOR_CYCLE[childIdx % FOLDER_COLOR_CYCLE.length]
                        const grandchildren = allFolders.filter((f) => f.parentId === child.id)
                        const childNotes = getFolderNoteItems(child.id)
                        const childHasExpandable = grandchildren.length > 0 || childNotes.length > 0
                        const cIsExpanded = isFolderExpanded(child.id)
                        return (
                          <div key={child.id} className="mb-0.5">
                            <div className="flex items-center">
                              {childHasExpandable ? (
                                <button
                                  type="button"
                                  onClick={(e) => toggleExpand(child.id, e)}
                                  className="flex h-7 w-5 shrink-0 cursor-pointer items-center justify-center rounded-l-md transition-colors hover:bg-white/5"
                                  style={{ color: 'var(--color-sidebar-text-muted)' }}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className={`h-2.5 w-2.5 transition-transform duration-150 ${cIsExpanded ? 'rotate-90' : ''}`}
                                  >
                                    <path d="M9 6l6 6-6 6" />
                                  </svg>
                                </button>
                              ) : (
                                <span className="flex h-7 w-5 shrink-0" />
                              )}
                              <Link
                                to={`/folder/${child.id}`}
                                onClick={onClose}
                                className="sidebar-link flex flex-1 items-center gap-2 rounded-r-md px-2 py-1.5 text-[13px] transition-colors"
                                style={{ color: 'var(--color-sidebar-text)' }}
                              >
                                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${cColor.bg}`}>
                                  <FolderIcon icon={cIconId} className={`h-3 w-3 ${cColor.stroke}`} />
                                </div>
                                <span className="truncate">{child.name}</span>
                              </Link>
                            </div>
                            {/* Grandchildren + Notizen im Child – weiche Einrückung */}
                            {cIsExpanded && (grandchildren.length > 0 || childNotes.length > 0) ? (
                              <div className="ml-3 border-l border-slate-500/25 pl-3 mt-0.5">
                                {grandchildren.map((gc, gcIdx) => {
                                  const gcIsRo = gc.access === 'readonly'
                                  const gcIconId = gcIsRo ? READONLY_ICON : (gc.icon || 'folder')
                                  const gcColor = gcIsRo
                                    ? { bg: 'bg-amber-900/30', stroke: 'stroke-amber-500' }
                                    : FOLDER_COLOR_CYCLE[gcIdx % FOLDER_COLOR_CYCLE.length]
                                  const gcNotes = getFolderNoteItems(gc.id)
                                  const gcHasExpandable = gcNotes.length > 0
                                  const gcIsExpanded = isFolderExpanded(gc.id)
                                  return (
                                    <div key={gc.id} className="mb-0.5">
                                      <div className="flex items-center">
                                        {gcHasExpandable ? (
                                          <button
                                            type="button"
                                            onClick={(e) => toggleExpand(gc.id, e)}
                                            className="flex h-6 w-5 shrink-0 cursor-pointer items-center justify-center rounded-l-md transition-colors hover:bg-white/5"
                                            style={{ color: 'var(--color-sidebar-text-muted)' }}
                                          >
                                            <svg
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              className={`h-2 w-2 transition-transform duration-150 ${gcIsExpanded ? 'rotate-90' : ''}`}
                                            >
                                              <path d="M9 6l6 6-6 6" />
                                            </svg>
                                          </button>
                                        ) : (
                                          <span className="flex h-6 w-5 shrink-0" />
                                        )}
                                        <Link
                                          to={`/folder/${gc.id}`}
                                          onClick={onClose}
                                          className="sidebar-link flex flex-1 items-center gap-2 rounded-r-md px-2 py-1.5 text-[12px] transition-colors"
                                          style={{ color: 'var(--color-sidebar-text)' }}
                                        >
                                          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${gcColor.bg}`}>
                                            <FolderIcon icon={gcIconId} className={`h-2.5 w-2.5 ${gcColor.stroke}`} />
                                          </div>
                                          <span className="truncate">{gc.name}</span>
                                        </Link>
                                      </div>
                                      {/* Notizen im Grandchild-Ordner – eigene Ebene mit vertikaler Linie */}
                                      {gcIsExpanded && gcNotes.length > 0 ? (
                                        <div className="ml-3 mt-0.5 border-l border-slate-500/25 pl-3">
                                          {gcNotes.map((note) => (
                                            <Link
                                              key={note.id}
                                              to={`/note/${note.id}`}
                                              onClick={onClose}
                                              className="sidebar-link flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors"
                                              style={{ color: 'var(--color-sidebar-text)' }}
                                            >
                                              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-blue-500/20">
                                                <svg
                                                  viewBox="0 0 24 24"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="1.8"
                                                  className="h-2 w-2 stroke-blue-400"
                                                >
                                                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                                                </svg>
                                              </div>
                                              <span className="truncate">{note.title}</span>
                                            </Link>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  )
                                })}
                                {/* Notizen im Child-Ordner – eigene Ebene mit vertikaler Linie */}
                                {childNotes.length > 0 ? (
                                  <div className="ml-3 mt-0.5 border-l border-slate-500/25 pl-3">
                                    {childNotes.map((note) => (
                                      <Link
                                        key={note.id}
                                        to={`/note/${note.id}`}
                                        onClick={onClose}
                                        className="sidebar-link flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors"
                                        style={{ color: 'var(--color-sidebar-text)' }}
                                      >
                                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue-500/20">
                                          <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            className="h-2.5 w-2.5 stroke-blue-400"
                                          >
                                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                                          </svg>
                                        </div>
                                        <span className="truncate">{note.title}</span>
                                      </Link>
                                    ))}
                                  </div>
                                ) : null}
                            </div>
                          ) : null}
                          </div>
                        )
                      })}
                      {/* Notizen im Root-Ordner – eigene Ebene mit vertikaler Linie */}
                      {folderNotes.length > 0 ? (
                        <div className="ml-3 mt-0.5 border-l border-slate-500/25 pl-3">
                          {folderNotes.map((note) => (
                            <Link
                              key={note.id}
                              to={`/note/${note.id}`}
                              onClick={onClose}
                              className="sidebar-link flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors"
                              style={{ color: 'var(--color-sidebar-text)' }}
                            >
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500/20">
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  className="h-3 w-3 stroke-blue-400"
                                >
                                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                              </svg>
                            </div>
                            <span className="truncate">{note.title}</span>
                          </Link>
                        ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
            {rootFolders.length === 0 ? (
              <p className="px-3 py-4 text-xs" style={{ color: 'var(--color-sidebar-text-muted)' }}>Keine Ordner vorhanden</p>
            ) : null}
          </div>
        </nav>

        {/* Bottom Nav Links – statisch fixiert */}
        <div className="shrink-0 px-3 py-3" style={{ borderTop: '1px solid var(--color-sidebar-border)' }}>
          <Link
            to="/"
            onClick={onClose}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
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
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
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
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
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
          <Link
            to="/trash"
            onClick={onClose}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
              location.pathname === '/trash'
                ? 'bg-blue-500/20 text-blue-400 font-medium'
                : ''
            }`}
            style={location.pathname === '/trash' ? undefined : { color: 'var(--color-sidebar-text-muted)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
              <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Papierkorb
          </Link>
        </div>
      </aside>
    </>
  )
}
