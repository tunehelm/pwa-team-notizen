import { Link } from 'react-router-dom'
import { mainNavigationFolderIds } from '../data/mockData'
import { useAppData } from '../state/useAppData'

interface BottomNavigationProps {
  activeFolderId?: string
}

export function BottomNavigation({ activeFolderId }: BottomNavigationProps) {
  const { findFolderById } = useAppData()

  return (
    <nav
      aria-label="Hauptordner"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] pt-3 backdrop-blur"
    >
      <ul className="mx-auto grid w-full max-w-xl grid-cols-4 gap-3">
        {mainNavigationFolderIds.map((folderId) => {
          const folder = findFolderById(folderId)
          if (!folder) return null

          const isActive = activeFolderId === folder.id

          return (
            <li key={folder.id} className="min-w-0">
              <Link
                to={`/folder/${folder.id}`}
                className={`flex h-16 w-full min-w-0 flex-col items-center justify-center rounded-2xl px-3 py-3 text-center transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span className="h-6 w-6 shrink-0" aria-hidden="true">
                  <FolderIcon folderId={folder.id} />
                </span>
                <span className="mt-1 max-w-[72px] truncate whitespace-nowrap text-[11px] font-medium leading-none">
                  {folder.name}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

interface FolderIconProps {
  folderId: string
}

function FolderIcon({ folderId }: FolderIconProps) {
  if (folderId === 'team-hub') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full stroke-current">
        <path strokeWidth="1.8" strokeLinecap="round" d="M4 18a4 4 0 0 1 8 0" />
        <path strokeWidth="1.8" strokeLinecap="round" d="M12 18a4 4 0 0 1 8 0" />
        <circle cx="9" cy="9" r="2.5" strokeWidth="1.8" />
        <circle cx="15.5" cy="8.5" r="2" strokeWidth="1.8" />
      </svg>
    )
  }

  if (folderId === 'projects') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full stroke-current">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" strokeWidth="1.8" />
        <path strokeWidth="1.8" strokeLinecap="round" d="M8 3.5v4M16 3.5v4M3.5 10h17" />
      </svg>
    )
  }

  if (folderId === 'private-space') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full stroke-current">
        <rect x="4.5" y="10.5" width="15" height="9" rx="2.5" strokeWidth="1.8" />
        <path
          strokeWidth="1.8"
          strokeLinecap="round"
          d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full stroke-current">
      <path
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 4.5h9l3 3V18a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z"
      />
      <path strokeWidth="1.8" strokeLinecap="round" d="M8.5 12h7M8.5 15h5" />
    </svg>
  )
}
