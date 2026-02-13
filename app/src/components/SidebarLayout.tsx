import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNavigation } from './BottomNavigation'
import { LayoutProvider } from '../context/LayoutContext'
import { useAppData } from '../state/useAppData'

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

/** Auto-Polling Intervall in ms */
const POLL_INTERVAL = 30_000


export function SidebarLayout({ children, title }: SidebarLayoutProps) {
  // Auf Desktop standardmäßig offen, auf Mobile standardmäßig geschlossen
  const [sidebarOpen, setSidebarOpen] = useState(() => isDesktop())
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const navigate = useNavigate()
  const { refreshData } = useAppData()

  // ── Pull-to-Refresh State ──
  const mainRef = useRef<HTMLElement>(null)
  const pullStartY = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)
  const isPulling = useRef(false)

  // Sidebar automatisch ein-/ausblenden bei Resize
  useEffect(() => {
    function handleResize() {
      setSidebarOpen(isDesktop())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── Auto-Polling alle 30 Sekunden ──
  useEffect(() => {
    const interval = setInterval(() => {
      void refreshData()
    }, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [refreshData])

  // ── Refresh-Handler ──
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshData()
    } finally {
      setTimeout(() => setIsRefreshing(false), 600)
    }
  }, [refreshData])

  // ── Pull-to-Refresh Touch-Handler ──
  useEffect(() => {
    const el = mainRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop <= 0) {
        pullStartY.current = e.touches[0].clientY
        isPulling.current = true
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!isPulling.current) return
      const delta = e.touches[0].clientY - pullStartY.current
      if (delta > 0) {
        setPullDistance(Math.min(delta * 0.4, 80))
      }
    }

    function onTouchEnd() {
      if (pullDistance > 50) {
        void handleRefresh()
      }
      isPulling.current = false
      setPullDistance(0)
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [pullDistance, handleRefresh])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setShowSearch(false)
      setSearchQuery('')
    }
  }

  const location = useLocation()
  const isNotePage = /^\/note\/[^/]+$/.test(location.pathname)

  const layoutValue = {
    setSidebarOpen,
    onRefresh: () => void handleRefresh(),
    isRefreshing,
    onSearch: () => {
      if (isDesktop()) {
        setShowSearch(true)
      } else {
        navigate('/search')
      }
    },
  }

  return (
    <LayoutProvider value={layoutValue}>
      <div className="flex h-screen overflow-hidden bg-[var(--color-bg-app)]">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => { if (!isDesktop()) setSidebarOpen(false) }} />

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Header Bar – auf Mobile bei Notiz-Seite ausgeblendet (Menu+Refresh in NotePage) */}
          <header
            className={`flex h-14 shrink-0 items-center gap-3 px-4 ${isNotePage ? 'hidden lg:flex' : ''}`}
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
            <div className="flex items-center gap-1">
              {/* Refresh-Button */}
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={isRefreshing}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--color-sidebar-text-muted)' }}
                aria-label="Aktualisieren"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-4.5 w-4.5 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
                >
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </button>
              {/* Suche-Button */}
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
            </div>
          )}
        </header>

        {/* Pull-to-Refresh Indikator */}
        {pullDistance > 0 ? (
          <div
            className="flex items-center justify-center overflow-hidden transition-[height]"
            style={{ height: `${pullDistance}px`, backgroundColor: 'var(--color-bg-app)' }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-[var(--color-accent)]"
              style={{ opacity: Math.min(pullDistance / 50, 1), transform: `rotate(${pullDistance * 4}deg)` }}
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </div>
        ) : null}

        {/* Scrollable Content */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto"
        >
          {children}
        </main>

        {/* Bottom Navigation – nur Mobile */}
        <div className="lg:hidden">
          <BottomNavigation />
        </div>
      </div>
      </div>
    </LayoutProvider>
  )
}
