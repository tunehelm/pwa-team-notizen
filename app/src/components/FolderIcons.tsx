/* ─── Folder Icon System ─── */

/** Auswählbare Icons (für normale Ordner) */
export const SELECTABLE_ICONS: { id: string; label: string }[] = [
  { id: 'folder', label: 'Ordner' },
  { id: 'bulb', label: 'Idee' },
  { id: 'megaphone', label: 'Ankündigung' },
  { id: 'palette', label: 'Design' },
  { id: 'gear', label: 'Einstellungen' },
  { id: 'chart', label: 'Statistik' },
  { id: 'star', label: 'Favorit' },
  { id: 'heart', label: 'Herz' },
  { id: 'chat', label: 'Chat' },
  { id: 'calendar', label: 'Kalender' },
  { id: 'book', label: 'Buch' },
  { id: 'code', label: 'Code' },
  { id: 'globe', label: 'Web' },
  { id: 'camera', label: 'Kamera' },
  { id: 'music', label: 'Musik' },
  { id: 'plane', label: 'Reise' },
  { id: 'car', label: 'Auto' },
  { id: 'thought', label: 'Gedanke' },
  { id: 'alert', label: 'Wichtig' },
  { id: 'pill', label: 'Gesundheit' },
  { id: 'bolt', label: 'Blitz' },
  { id: 'clock', label: 'Uhr' },
  { id: 'pencil', label: 'Stift' },
  { id: 'key', label: 'Schlüssel' },
  { id: 'users', label: 'Team' },
  { id: 'check', label: 'Erledigt' },
  { id: 'euro', label: 'Finanzen' },
  { id: 'phone', label: 'Telefon' },
  { id: 'mail', label: 'E-Mail' },
]

/** Farb-Rotation für Ordner und Notizen – nur Outline, kein Backdrop */
export const FOLDER_COLOR_CYCLE = [
  { bg: 'bg-violet-100 dark:bg-violet-900/30', stroke: 'stroke-violet-500', text: 'text-violet-500' },
  { bg: 'bg-rose-100 dark:bg-rose-900/30', stroke: 'stroke-rose-500', text: 'text-rose-500' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/30', stroke: 'stroke-cyan-500', text: 'text-cyan-500' },
  { bg: 'bg-amber-100 dark:bg-amber-900/30', stroke: 'stroke-amber-500', text: 'text-amber-500' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/30', stroke: 'stroke-emerald-500', text: 'text-emerald-500' },
  { bg: 'bg-blue-100 dark:bg-blue-900/30', stroke: 'stroke-blue-500', text: 'text-blue-500' },
  { bg: 'bg-pink-100 dark:bg-pink-900/30', stroke: 'stroke-pink-500', text: 'text-pink-500' },
  { bg: 'bg-teal-100 dark:bg-teal-900/30', stroke: 'stroke-teal-500', text: 'text-teal-500' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/30', stroke: 'stroke-indigo-500', text: 'text-indigo-500' },
  { bg: 'bg-orange-100 dark:bg-orange-900/30', stroke: 'stroke-orange-500', text: 'text-orange-500' },
]

/** Stabile Farbe basierend auf einer ID (Hash) – gleicher Ordner = gleiche Farbe überall */
export function getStableColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return FOLDER_COLOR_CYCLE[Math.abs(hash) % FOLDER_COLOR_CYCLE.length]
}

/** Notiz-Icon: Dokument mit Textlinien (wie Apple Notes / Layout-Idee) */
export function NoteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeWidth="1.3" />
      <path d="M14 2v6h6" strokeWidth="1.3" />
      <line x1="16" y1="13" x2="8" y2="13" strokeWidth="0.75" />
      <line x1="16" y1="17" x2="8" y2="17" strokeWidth="0.75" />
      <line x1="10" y1="9" x2="8" y2="9" strokeWidth="0.75" />
    </svg>
  )
}

/** Renders a folder icon SVG by ID */
export function FolderIcon({ icon, className }: { icon: string; className: string }) {
  switch (icon) {
    case 'folder':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      )
    case 'bulb':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6M10 22h4" />
          <path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z" />
        </svg>
      )
    case 'megaphone':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      )
    case 'palette':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="8" r="1.5" /><circle cx="8" cy="12" r="1.5" />
          <circle cx="16" cy="12" r="1.5" /><circle cx="12" cy="16" r="1.5" />
        </svg>
      )
    case 'gear':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      )
    case 'chart':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      )
    case 'star':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )
    case 'heart':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      )
    case 'chat':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      )
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    case 'book':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        </svg>
      )
    case 'code':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
      )
    case 'globe':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
      )
    case 'camera':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" />
        </svg>
      )
    case 'music':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
      )
    case 'plane':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      )
    case 'car':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 17h14M5 17a2 2 0 01-2-2v-4l2.6-5.2A2 2 0 017.4 4h9.2a2 2 0 011.8 1.1L21 10v5a2 2 0 01-2 2M5 17a2 2 0 100 4 2 2 0 000-4zM19 17a2 2 0 100 4 2 2 0 000-4z" />
          <path d="M3 10h18" />
        </svg>
      )
    case 'thought':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          <circle cx="9" cy="10" r="1" fill="currentColor" /><circle cx="12" cy="10" r="1" fill="currentColor" /><circle cx="15" cy="10" r="1" fill="currentColor" />
        </svg>
      )
    case 'alert':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'pill':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.5 1.5l-8 8a5.66 5.66 0 008 8l8-8a5.66 5.66 0 00-8-8z" />
          <line x1="6" y1="14" x2="14" y2="6" />
        </svg>
      )
    case 'bolt':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      )
    case 'pencil':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
      )
    case 'key':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
      )
    case 'users':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      )
    case 'check':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )
    case 'euro':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 7A6.5 6.5 0 007 12a6.5 6.5 0 0010.5 5" /><line x1="4" y1="10" x2="14" y2="10" /><line x1="4" y1="14" x2="14" y2="14" />
        </svg>
      )
    case 'phone':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
        </svg>
      )
    case 'mail':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22 6 12 13 2 6" />
        </svg>
      )
    case 'shield':
      // Einzigartiges Readonly-Symbol – Schild mit Schloss
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <rect x="9" y="11" width="6" height="5" rx="1" />
          <path d="M10 11V9a2 2 0 014 0v2" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      )
  }
}


