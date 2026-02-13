import { useState } from 'react'
import { useAppData } from '../state/useAppData'
import { FolderIcon, FOLDER_COLOR_CYCLE } from './FolderIcons'
import { isAdminEmail } from '../lib/admin'

interface MoveNoteModalProps {
  noteId: string
  noteTitle: string
  /** Aktueller Ordner der Notiz (wird ausgegraut) */
  currentFolderId: string
  onClose: () => void
  onMoved?: (targetFolderName: string) => void
}

export function MoveNoteModal({ noteId, noteTitle, currentFolderId, onClose, onMoved }: MoveNoteModalProps) {
  const { folders, moveNoteToFolder, currentUserEmail, currentUserId } = useAppData()
  const isAdmin = isAdminEmail(currentUserEmail)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)
  // Standardmäßig alle Ordner ausklappen, die Kinder haben
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const ids = new Set<string>()
    for (const f of folders) {
      if (folders.some((c) => c.parentId === f.id)) {
        ids.add(f.id)
      }
    }
    return ids
  })

  // Alle Root-Ordner
  const rootFolders = folders.filter((f) => !f.parentId)

  // Kinder eines Ordners
  function getChildren(parentId: string) {
    return folders.filter((f) => f.parentId === parentId)
  }

  function toggleExpand(folderId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  async function handleMove() {
    if (!selectedFolderId || moving) return
    setMoving(true)
    try {
      await moveNoteToFolder(noteId, selectedFolderId)
      const targetFolder = folders.find((f) => f.id === selectedFolderId)
      onMoved?.(targetFolder?.name || 'Ordner')
      onClose()
    } catch {
      setMoving(false)
    }
  }

  function renderFolder(folder: typeof folders[0], index: number, depth: number) {
    const isRo = folder.access === 'readonly'
    const iconId = 'folder'
    const color = isRo
      ? { bg: 'bg-amber-100 dark:bg-amber-900/30', stroke: 'stroke-amber-600' }
      : FOLDER_COLOR_CYCLE[index % FOLDER_COLOR_CYCLE.length]
    const isCurrent = folder.id === currentFolderId
    const isSelected = folder.id === selectedFolderId
    const children = getChildren(folder.id)
    const isExpanded = expandedIds.has(folder.id)
    // Readonly-Ordner sind nur für Admin/Owner als Ziel wählbar
    const isOwnerOfFolder = Boolean(!folder.ownerId || (currentUserId && folder.ownerId === currentUserId))
    const isReadonlyTarget = isRo && !isAdmin && !isOwnerOfFolder
    const isDisabled = isCurrent || isReadonlyTarget

    return (
      <div key={folder.id}>
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => setSelectedFolderId(folder.id)}
          className={[
            'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
            isDisabled
              ? 'cursor-not-allowed opacity-40'
              : isSelected
                ? 'bg-blue-500 text-white font-medium'
                : 'text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-700',
          ].join(' ')}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          {/* Expand/Collapse Toggle */}
          {children.length > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(folder.id)
              }}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors ${
                isSelected ? 'text-white/70 hover:text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}

          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-white/20' : color.bg}`}>
            <FolderIcon icon={iconId} className={`h-3.5 w-3.5 ${isSelected ? 'stroke-white' : color.stroke}`} />
          </div>

          <span className="min-w-0 flex-1 truncate">{folder.name}</span>

          {isReadonlyTarget ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0 text-amber-400" title="Nur Lesen">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          ) : isCurrent ? (
            <span className={`shrink-0 text-[10px] ${isSelected ? 'text-white/60' : 'text-[var(--color-text-muted)]'}`}>
              Aktuell
            </span>
          ) : null}
        </button>

        {/* Kinder (rekursiv) */}
        {isExpanded && children.length > 0 ? (
          <div>
            {children.map((child, idx) => renderFolder(child, idx, depth + 1))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Notiz verschieben</h2>
          <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
            „{noteTitle}" — Wähle den Zielordner
          </p>
        </div>

        {/* Ordner-Liste */}
        <div className="max-h-72 overflow-y-auto px-2 py-2">
          {rootFolders.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
              Keine Ordner vorhanden.
            </p>
          ) : (
            rootFolders.map((folder, idx) => renderFolder(folder, idx, 0))
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={!selectedFolderId || moving}
            onClick={() => void handleMove()}
            className="rounded-xl bg-blue-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {moving ? 'Verschiebe…' : 'Verschieben'}
          </button>
        </div>
      </div>
    </div>
  )
}
