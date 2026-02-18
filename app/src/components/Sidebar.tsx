import { useState, useCallback, type DragEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAppData } from '../state/useAppData'
import { FolderIcon, getStableColor, NoteIcon } from './FolderIcons'
import { isAdminEmail } from '../lib/admin'
import { supabase } from '../lib/supabase'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const FOLDER_ORDER_KEY = 'sidebar-folder-order'

function loadFolderOrder(): string[] {
  try {
    const raw = localStorage.getItem(FOLDER_ORDER_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveFolderOrder(ids: string[]) {
  localStorage.setItem(FOLDER_ORDER_KEY, JSON.stringify(ids))
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const {
    currentUserName,
    currentUserEmail,
    currentUserId,
    profileLoaded,
    folders: allFolders,
    getMainFolderItems,
    getPinnedFolderItems,
    getFolderNoteItems,
    findNoteById,
    moveNoteToFolder,
  } = useAppData()

  const isAdmin = profileLoaded && isAdminEmail(currentUserEmail)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isEditingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [folderDragOverId, setFolderDragOverId] = useState<string | null>(null)
  const [folderDragOverPosition, setFolderDragOverPosition] = useState<'above' | 'below' | null>(null)
  const [folderOrder, setFolderOrder] = useState<string[]>(loadFolderOrder)

  const [manualState, setManualState] = useState<{
    expanded: Set<string>
    collapsed: Set<string>
  }>({ expanded: new Set(), collapsed: new Set() })

  const unsortedRootFolders = getMainFolderItems()
  const pinnedFolders = getPinnedFolderItems()

  // Sortiere Root-Ordner nach gespeicherter Reihenfolge
  const rootFolders = [...unsortedRootFolders].sort((a, b) => {
    const aIdx = folderOrder.indexOf(a.id)
    const bIdx = folderOrder.indexOf(b.id)
    if (aIdx === -1 && bIdx === -1) return 0 // beide nicht in Order → Originalreihenfolge
    if (aIdx === -1) return 1 // a nicht in Order → nach hinten
    if (bIdx === -1) return -1 // b nicht in Order → nach hinten
    return aIdx - bIdx
  })

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

  // ── Drag & Drop Helpers ──

  /** Kann die Notiz vom User gezogen werden? (Nur eigene Notizen oder Admin) */
  function canDragNote(noteOwnerId?: string): boolean {
    if (isAdmin) return true
    if (noteOwnerId && currentUserId && noteOwnerId === currentUserId) return true
    return false
  }

  /** Kann in diesen Ordner gedroppt werden? (Nicht in readonly) */
  function canDropInFolder(folderAccess?: string): boolean {
    if (isAdmin) return true
    return folderAccess !== 'readonly'
  }

  function handleNotesDragStart(e: DragEvent, noteId: string) {
    e.dataTransfer.setData('text/note-id', noteId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleFolderDragOver(e: DragEvent, folderId: string, folderAccess?: string) {
    // Nicht reagieren wenn es ein Folder-Reorder ist (nicht Notiz-Drop)
    if (e.dataTransfer.types.includes('text/folder-reorder-id')) return
    if (!canDropInFolder(folderAccess)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverFolderId(folderId)
  }

  function handleFolderDrop(e: DragEvent, folderId: string, folderAccess?: string) {
    // Nicht reagieren wenn es ein Folder-Reorder ist
    if (e.dataTransfer.types.includes('text/folder-reorder-id')) return
    e.preventDefault()
    setDragOverFolderId(null)
    if (!canDropInFolder(folderAccess)) return
    const noteId = e.dataTransfer.getData('text/note-id')
    if (noteId) {
      void moveNoteToFolder(noteId, folderId)
    }
  }

  // ── Ordner-Reihenfolge Drag & Drop ──

  function handleFolderReorderDragStart(e: DragEvent, folderId: string) {
    e.dataTransfer.setData('text/folder-reorder-id', folderId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleFolderReorderDragOver(e: DragEvent, targetFolderId: string) {
    const hasFolderReorder = e.dataTransfer.types.includes('text/folder-reorder-id')
    if (!hasFolderReorder) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    // Position bestimmen: obere Hälfte → above, untere → below
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const pos = e.clientY < midY ? 'above' : 'below'
    setFolderDragOverId(targetFolderId)
    setFolderDragOverPosition(pos)
  }

  function handleFolderReorderDrop(e: DragEvent, targetFolderId: string) {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/folder-reorder-id')
    setFolderDragOverId(null)
    setFolderDragOverPosition(null)
    if (!draggedId || draggedId === targetFolderId) return

    // Neue Reihenfolge berechnen
    const currentIds = rootFolders.map((f) => f.id)
    const fromIdx = currentIds.indexOf(draggedId)
    const toIdx = currentIds.indexOf(targetFolderId)
    if (fromIdx === -1 || toIdx === -1) return

    const newOrder = [...currentIds]
    newOrder.splice(fromIdx, 1) // Entfernen
    const insertIdx = folderDragOverPosition === 'above'
      ? newOrder.indexOf(targetFolderId)
      : newOrder.indexOf(targetFolderId) + 1
    newOrder.splice(insertIdx, 0, draggedId) // Einfügen

    setFolderOrder(newOrder)
    saveFolderOrder(newOrder)
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
          'safe-area-top flex h-full w-64 shrink-0 flex-col border-r transition-all duration-300',
          // Mobile: Fixed Overlay
          'fixed left-0 top-0 z-40',
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
        <div className="relative" style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}>
          <div className="flex items-center gap-3 px-4 py-4">
            <button
              type="button"
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white transition-transform active:scale-95"
            >
              {userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </button>
            <button
              type="button"
              onClick={() => setShowUserMenu((v) => !v)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-sidebar-text)' }}>{userName}</p>
              <p className="truncate text-[10px]" style={{ color: 'var(--color-sidebar-text-muted)' }}>{currentUserEmail}</p>
            </button>
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

          {/* User-Menü Dropdown */}
          {showUserMenu ? (
            <div className="absolute left-3 right-3 top-full z-50 mt-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1 shadow-xl">
              {isEditingName ? (
                <form
                  className="flex gap-1.5 px-2 py-1.5"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const trimmed = nameInput.trim()
                    if (!trimmed) return
                    try {
                      const { error: updateErr } = await supabase.auth.updateUser({ data: { display_name: trimmed } })
                      if (updateErr) throw updateErr
                      // Also update profiles table so team members see the new name
                      const { data, error: getUserErr } = await supabase.auth.getUser()
                      if (getUserErr) throw getUserErr
                      if (data.user) {
                        await supabase.from('profiles').upsert({
                          id: data.user.id,
                          email: data.user.email ?? '',
                          display_name: trimmed,
                          updated_at: new Date().toISOString(),
                        }, { onConflict: 'id' })
                      }
                      window.location.reload()
                    } catch (err) {
                      console.error('[Sidebar] Name konnte nicht gespeichert werden:', err)
                      alert('Name konnte nicht gespeichert werden. Bitte erneut versuchen.')
                    }
                  }}
                >
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Vor- und Nachname"
                    className="h-9 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-app)] px-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-400 focus:outline-none"
                    autoFocus
                  />
                  <button type="submit" className="h-9 rounded-lg bg-blue-500 px-3 text-xs font-medium text-white active:bg-blue-600">
                    OK
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => { setNameInput(currentUserName); setEditingName(true) }}
                  className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="text-base">✏️</span>
                  {currentUserName ? 'Name ändern' : 'Name eingeben'}
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  setShowUserMenu(false)
                  await supabase.auth.signOut()
                }}
                className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              >
                <span className="text-base">🚪</span>
                Abmelden
              </button>
            </div>
          ) : null}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-none">
          {/* Fixierte Ordner */}
          {pinnedFolders.length > 0 ? (
            <div className="mb-5">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-sidebar-text-muted)' }}>
                Fixiert
              </p>
              {pinnedFolders.map((folder) => {
                const isRo = folder.access === 'readonly'
                const iconId = 'folder'
                const color = isRo
                  ? { bg: 'bg-amber-900/30', stroke: 'stroke-amber-500' }
                  : getStableColor(folder.id)
                return (
                  <Link
                    key={folder.id}
                    to={`/folder/${folder.id}`}
                    onClick={onClose}
                    onDragOver={(e: DragEvent<HTMLAnchorElement>) => handleFolderDragOver(e, folder.id, folder.access)}
                    onDragLeave={() => setDragOverFolderId(null)}
                    onDrop={(e: DragEvent<HTMLAnchorElement>) => handleFolderDrop(e, folder.id, folder.access)}
                    className={`sidebar-link flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${dragOverFolderId === folder.id ? 'ring-2 ring-inset ring-blue-400 bg-blue-500/10' : ''}`}
                    style={{ color: 'var(--color-sidebar-text)' }}
                  >
                    <FolderIcon icon={iconId} className={`h-4 w-4 shrink-0 ${color.stroke}`} />
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
            {rootFolders.map((folder) => {
              const isRo = folder.access === 'readonly'
              const iconId = 'folder'
              const color = isRo
                ? { bg: 'bg-amber-900/30', stroke: 'stroke-amber-500' }
                : getStableColor(folder.id)
              const children = allFolders.filter((f) => f.parentId === folder.id)
              const folderNotes = getFolderNoteItems(folder.id)
              const hasExpandableContent = children.length > 0 || folderNotes.length > 0
              const expanded = isFolderExpanded(folder.id)
              const isFolderReorderTarget = folderDragOverId === folder.id
              const showReorderAbove = isFolderReorderTarget && folderDragOverPosition === 'above'
              const showReorderBelow = isFolderReorderTarget && folderDragOverPosition === 'below'
              return (
                <div
                  key={folder.id}
                  className="mb-0.5 relative"
                  draggable={isAdmin}
                  onDragStart={isAdmin ? (e: DragEvent<HTMLDivElement>) => handleFolderReorderDragStart(e, folder.id) : undefined}
                  onDragOver={(e: DragEvent<HTMLDivElement>) => {
                    handleFolderReorderDragOver(e, folder.id)
                    handleFolderDragOver(e, folder.id, folder.access)
                  }}
                  onDragLeave={() => { setDragOverFolderId(null); setFolderDragOverId(null); setFolderDragOverPosition(null) }}
                  onDrop={(e: DragEvent<HTMLDivElement>) => {
                    const hasFolderReorder = e.dataTransfer.types.includes('text/folder-reorder-id')
                    if (hasFolderReorder) {
                      handleFolderReorderDrop(e, folder.id)
                    } else {
                      handleFolderDrop(e, folder.id, folder.access)
                    }
                  }}
                >
                  {/* Reorder-Indikator oben */}
                  {showReorderAbove ? <div className="absolute left-2 right-2 top-0 h-0.5 rounded-full bg-blue-400" /> : null}
                  <div
                    className={`flex items-center rounded-lg transition-colors group ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''} ${dragOverFolderId === folder.id ? 'ring-2 ring-inset ring-blue-400 bg-blue-500/10' : ''}`}
                  >
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
                      <FolderIcon icon={iconId} className={`h-4 w-4 shrink-0 ${color.stroke}`} />
                      <span className="truncate">{folder.name}</span>
                      {isRo ? (
                        <span title="Nur Lesen" className="ml-auto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 shrink-0 text-amber-400">
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg></span>
                      ) : null}
                    </Link>
                  </div>
                  {/* Reorder-Indikator unten */}
                  {showReorderBelow ? <div className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-blue-400" /> : null}
                  {/* Unterordner + Notizen – weiche Einrückung */}
                  {expanded && hasExpandableContent ? (
                    <div className="ml-3 pl-3 mt-0.5">
                      {children.map((child) => {
                        const cIsRo = child.access === 'readonly'
                        const cIconId = 'folder'
                        const cColor = cIsRo
                          ? { bg: 'bg-amber-900/30', stroke: 'stroke-amber-500' }
                          : getStableColor(child.id)
                        const grandchildren = allFolders.filter((f) => f.parentId === child.id)
                        const childNotes = getFolderNoteItems(child.id)
                        const childHasExpandable = grandchildren.length > 0 || childNotes.length > 0
                        const cIsExpanded = isFolderExpanded(child.id)
                        return (
                          <div key={child.id} className="mb-0.5">
                            <div
                              className={`flex items-center ${dragOverFolderId === child.id ? 'rounded-md ring-2 ring-inset ring-blue-400 bg-blue-500/10' : ''}`}
                              onDragOver={(e: DragEvent<HTMLDivElement>) => handleFolderDragOver(e, child.id, child.access)}
                              onDragLeave={() => setDragOverFolderId(null)}
                              onDrop={(e: DragEvent<HTMLDivElement>) => handleFolderDrop(e, child.id, child.access)}
                            >
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
                                <FolderIcon icon={cIconId} className={`h-3.5 w-3.5 shrink-0 ${cColor.stroke}`} />
                                <span className="truncate">{child.name}</span>
                              </Link>
                            </div>
                            {/* Grandchildren + Notizen im Child – weiche Einrückung */}
                            {cIsExpanded && (grandchildren.length > 0 || childNotes.length > 0) ? (
                              <div className="ml-3 pl-3 mt-0.5">
                                {grandchildren.map((gc) => {
                                  const gcIsRo = gc.access === 'readonly'
                                  const gcIconId = 'folder'
                                  const gcColor = gcIsRo
                                    ? { bg: 'bg-amber-900/30', stroke: 'stroke-amber-500' }
                                    : getStableColor(gc.id)
                                  const gcNotes = getFolderNoteItems(gc.id)
                                  const gcHasExpandable = gcNotes.length > 0
                                  const gcIsExpanded = isFolderExpanded(gc.id)
                                  return (
                                    <div key={gc.id} className="mb-0.5">
                                      <div
                                        className={`flex items-center ${dragOverFolderId === gc.id ? 'rounded-md ring-2 ring-inset ring-blue-400 bg-blue-500/10' : ''}`}
                                        onDragOver={(e: DragEvent<HTMLDivElement>) => handleFolderDragOver(e, gc.id, gc.access)}
                                        onDragLeave={() => setDragOverFolderId(null)}
                                        onDrop={(e: DragEvent<HTMLDivElement>) => handleFolderDrop(e, gc.id, gc.access)}
                                      >
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
                                          <FolderIcon icon={gcIconId} className={`h-3 w-3 shrink-0 ${gcColor.stroke}`} />
                                          <span className="truncate">{gc.name}</span>
                                        </Link>
                                      </div>
                                      {/* Notizen im Grandchild-Ordner – eigene Ebene mit vertikaler Linie */}
                                      {gcIsExpanded && gcNotes.length > 0 ? (
                                        <div className="ml-3 mt-0.5 pl-3">
                                          {gcNotes.map((note) => (
                                            <Link
                                              key={note.id}
                                              to={`/note/${note.id}`}
                                              onClick={onClose}
                                              draggable={canDragNote(note.ownerId)}
                                              onDragStart={canDragNote(note.ownerId) ? (e: DragEvent<HTMLAnchorElement>) => handleNotesDragStart(e, note.id) : undefined}
                                              className="sidebar-link flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors"
                                              style={{ color: 'var(--color-sidebar-text)' }}
                                            >
                                              <NoteIcon className="h-3 w-3 shrink-0 stroke-blue-400" />
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
                                  <div className="ml-3 mt-0.5 pl-3">
                                    {childNotes.map((note) => (
                                      <Link
                                        key={note.id}
                                        to={`/note/${note.id}`}
                                        onClick={onClose}
                                        draggable={canDragNote(note.ownerId)}
                                        onDragStart={canDragNote(note.ownerId) ? (e: DragEvent<HTMLAnchorElement>) => handleNotesDragStart(e, note.id) : undefined}
                                        className="sidebar-link flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors"
                                        style={{ color: 'var(--color-sidebar-text)' }}
                                      >
                                        <NoteIcon className="h-3.5 w-3.5 shrink-0 stroke-blue-400" />
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
                        <div className="ml-3 mt-0.5 pl-3">
                          {folderNotes.map((note) => (
                            <Link
                              key={note.id}
                              to={`/note/${note.id}`}
                              onClick={onClose}
                              draggable={canDragNote(note.ownerId)}
                              onDragStart={canDragNote(note.ownerId) ? (e: DragEvent<HTMLAnchorElement>) => handleNotesDragStart(e, note.id) : undefined}
                              className="sidebar-link flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors"
                              style={{ color: 'var(--color-sidebar-text)' }}
                            >
                              <NoteIcon className="h-4 w-4 shrink-0 stroke-blue-400" />
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
        <div className="safe-area-bottom shrink-0 px-3 py-3" style={{ borderTop: '1px solid var(--color-sidebar-border)' }}>
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
            to="/sales-quiz"
            onClick={onClose}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
              location.pathname === '/sales-quiz'
                ? 'bg-blue-500/20 text-blue-400 font-medium'
                : ''
            }`}
            style={location.pathname === '/sales-quiz' ? undefined : { color: 'var(--color-sidebar-text-muted)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" />
            </svg>
            Montags-Quiz
          </Link>
          {isAdmin && (
            <>
              <Link
                to="/admin"
                onClick={onClose}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  location.pathname === '/admin'
                    ? 'bg-blue-500/20 text-blue-400 font-medium'
                    : ''
                }`}
                style={location.pathname === '/admin' ? undefined : { color: 'var(--color-sidebar-text-muted)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                </svg>
                Admin Dashboard
              </Link>
              <Link
                to="/admin/sales-backlog"
                onClick={onClose}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  location.pathname === '/admin/sales-backlog'
                    ? 'bg-blue-500/20 text-blue-400 font-medium'
                    : ''
                }`}
                style={location.pathname === '/admin/sales-backlog' ? undefined : { color: 'var(--color-sidebar-text-muted)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" />
                </svg>
                Quiz-Backlog
              </Link>
              <Link
                to="/admin/sales-stats"
                onClick={onClose}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  location.pathname === '/admin/sales-stats'
                    ? 'bg-blue-500/20 text-blue-400 font-medium'
                    : ''
                }`}
                style={location.pathname === '/admin/sales-stats' ? undefined : { color: 'var(--color-sidebar-text-muted)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Quiz Statistik
              </Link>
            </>
          )}
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
