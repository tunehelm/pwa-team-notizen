import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNavigation } from './BottomNavigation'

interface SidebarLayoutProps {
  children: ReactNode
  /** Titel im Header */
  title?: string
  /** @deprecated – Plus-Button wurde entfernt */
  showCreate?: boolean
}

/** Breakpoint für Desktop (lg = 1024px) */
function isDesktop() {
  return typeof window !== 'undefined' && window.innerWidth >= 1024
}

export function SidebarLayout({ children, title }: SidebarLayoutProps) {
  // Auf Desktop standardmäßig offen, auf Mobile standardmäßig geschlossen
  const [sidebarOpen, setSidebarOpen] = useState(() => isDesktop())
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const navigate = useNavigate()

  // Sidebar automatisch ein-/ausblenden bei Resize
  useEffect(() => {
    function handleResize() {
      setSidebarOpen(isDesktop())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setShowSearch(false)
      setSearchQuery('')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-app)]">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header
          className="flex h-14 shrink-0 items-center gap-3 px-4 pt-[env(safe-area-inset-top)]"
          style={{
            backgroundColor: 'var(--color-sidebar)',
            borderBottom: '1px solid var(--color-sidebar-border)',
          }}
        >
          {/* Sidebar Toggle */}
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--color-sidebar-text-muted)' }}
            aria-label="Sidebar"
          >
            {/* Mobile: Hamburger Icon | Desktop: Sidebar Panel Icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5 lg:hidden">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="hidden h-5 w-5 lg:block">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>

          {/* Title */}
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold" style={{ color: 'var(--color-sidebar-text)' }}>
            {title || 'Dashboard'}
          </h1>

          {/* Search */}
          {showSearch ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suchen…"
                className="h-8 w-44 rounded-lg border px-3 text-sm focus:border-blue-400 focus:outline-none"
                style={{
                  backgroundColor: 'var(--color-sidebar-hover)',
                  borderColor: 'var(--color-sidebar-border)',
                  color: 'var(--color-sidebar-text)',
                }}
              />
              <button
                type="button"
                onClick={() => { setShowSearch(false); setSearchQuery('') }}
                className="text-xs"
                style={{ color: 'var(--color-sidebar-text-muted)' }}
              >
                Abbrechen
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--color-sidebar-text-muted)' }}
              aria-label="Suche"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4.5 w-4.5">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
          )}
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Bottom Navigation – nur Mobile */}
        <div className="lg:hidden">
          <BottomNavigation />
        </div>
      </div>

    </div>
  )
}
