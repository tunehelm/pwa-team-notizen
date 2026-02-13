import { Link, useLocation } from 'react-router-dom'

export type BottomNavigationActive = 'start' | 'search' | 'private' | 'team'

interface BottomNavigationProps {
  active?: BottomNavigationActive
}

const tabs: { id: BottomNavigationActive; label: string; path: string }[] = [
  { id: 'start', label: 'Start', path: '/' },
  { id: 'search', label: 'Suche', path: '/search' },
  { id: 'private', label: 'Privat', path: '/private' },
  { id: 'team', label: 'Team', path: '/team' },
]

export function BottomNavigation({ active }: BottomNavigationProps) {
  const location = useLocation()

  return (
    <nav
      aria-label="Navigation"
      className="shrink-0 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/90"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)' }}
    >
      <ul className="mx-auto grid w-full max-w-xl grid-cols-4">
        {tabs.map((tab) => {
          const isActive = active
            ? active === tab.id
            : location.pathname === tab.path

          return (
            <li key={tab.id}>
              <Link
                to={tab.path}
                className={`flex flex-col items-center gap-0.5 px-2 pb-1 pt-2 text-center transition-colors ${
                  isActive
                    ? 'text-blue-500 dark:text-blue-400'
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
              >
                <TabIcon id={tab.id} active={isActive} />
                <span className="text-[10px] font-medium leading-tight">
                  {tab.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function TabIcon({ id, active }: { id: BottomNavigationActive; active: boolean }) {
  const cls = `h-6 w-6 ${active ? 'stroke-blue-500 dark:stroke-blue-400' : 'stroke-current'}`

  if (id === 'start') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={cls} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 9.5V19a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V9.5" />
      </svg>
    )
  }

  if (id === 'search') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={cls} strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M16.5 16.5L21 21" />
      </svg>
    )
  }

  if (id === 'private') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={cls} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4.5" y="10.5" width="15" height="9" rx="2" />
        <path d="M8 10.5V8a4 4 0 018 0v2.5" />
      </svg>
    )
  }

  // team
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cls} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="9" cy="7" r="3" />
      <path d="M2 20a7 7 0 0114 0" />
      <path d="M16 3.13a4 4 0 010 7.75" />
      <path d="M21 20c0-2.5-1.7-4.6-4-5.5" />
    </svg>
  )
}
