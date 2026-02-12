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
    getMainFolderItems,
    getPinnedFolderItems,
  } = useAppData()

  const rootFolders = getMainFolderItems()
  const pinnedFolders = getPinnedFolderItems()

  const userName = currentUserName || (currentUserEmail ? currentUserEmail.split('@')[0] : 'Team')

  // Aktiver Ordner aus URL ermitteln
  const activeFolderId = location.pathname.startsWith('/folder/')
    ? location.pathname.split('/folder/')[1]
    : null

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
          // Basis
          'flex h-full w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-card)] transition-all duration-300',
          // Mobile: Fixed Overlay
          'fixed left-0 top-0 z-40 pt-[env(safe-area-inset-top)]',
          // Desktop: Static, im Flex-Layout
          'lg:relative lg:z-0',
          // Toggle
          isOpen ? 'translate-x-0' : '-translate-x-full lg:-ml-64',
        ].join(' ')}
      >
        {/* User Header */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
            {userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{userName}</p>
            <p className="truncate text-[10px] text-[var(--color-text-muted)]">{currentUserEmail}</p>
          </div>
          {/* Sidebar schließen (nur mobile) */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-slate-200 dark:hover:bg-slate-700 lg:hidden"
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
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Fixiert
              </p>
              {pinnedFolders.map((folder, idx) => {
                const isRo = folder.access === 'readonly'
                const iconId = isRo ? READONLY_ICON : (folder.icon || 'folder')
                const color = isRo
                  ? { bg: 'bg-amber-100 dark:bg-amber-900/30', stroke: 'stroke-amber-600' }
                  : FOLDER_COLOR_CYCLE[idx % FOLDER_COLOR_CYCLE.length]
                const isActive = activeFolderId === folder.id
                return (
                  <Link
                    key={folder.id}
                    to={`/folder/${folder.id}`}
                    onClick={onClose}
                    className={`flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-500 text-white font-medium'
                        : 'text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
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
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Bereiche
            </p>
            {rootFolders.map((folder, idx) => {
              const isRo = folder.access === 'readonly'
              const iconId = isRo ? READONLY_ICON : (folder.icon || 'folder')
              const color = isRo
                ? { bg: 'bg-amber-100 dark:bg-amber-900/30', stroke: 'stroke-amber-600' }
                : FOLDER_COLOR_CYCLE[idx % FOLDER_COLOR_CYCLE.length]
              const isActive = activeFolderId === folder.id
              return (
                <Link
                  key={folder.id}
                  to={`/folder/${folder.id}`}
                  onClick={onClose}
                  className={`flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-500 text-white font-medium'
                      : 'text-[var(--color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-white/20' : color.bg}`}>
                    <FolderIcon icon={iconId} className={`h-3.5 w-3.5 ${isActive ? 'stroke-white' : color.stroke}`} />
                  </div>
                  <span className="truncate">{folder.name}</span>
                  {isRo ? (
                    <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      Nur Lesen
                    </span>
                  ) : null}
                </Link>
              )
            })}
            {rootFolders.length === 0 ? (
              <p className="px-2 py-3 text-xs text-[var(--color-text-muted)]">Keine Ordner vorhanden</p>
            ) : null}
          </div>
        </nav>

        {/* Bottom Nav Links */}
        <div className="border-t border-[var(--color-border)] px-2 py-2">
          <Link
            to="/"
            onClick={onClose}
            className={`flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition-colors ${
              location.pathname === '/'
                ? 'bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-[var(--color-text-muted)] hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
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
                ? 'bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-[var(--color-text-muted)] hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
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
                ? 'bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-[var(--color-text-muted)] hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
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
