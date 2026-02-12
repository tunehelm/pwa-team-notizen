import { useState } from 'react'

interface ShareModalProps {
  /** Titel der Notiz / des Ordners */
  title: string
  /** Textinhalt oder Zusammenfassung */
  text: string
  /** Optionale URL (z.B. zum Öffnen) */
  url?: string
  onClose: () => void
}

/**
 * Teilen-Dialog: Nutzt die Web Share API (nativ auf iOS/Android/macOS),
 * mit Fallback für E-Mail und Link kopieren.
 */
export function ShareModal({ title, text, url, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)

  const shareData = {
    title,
    text: text.length > 500 ? text.slice(0, 500) + '…' : text,
    url: url || window.location.href,
  }

  /** Natives Teilen (iOS Share Sheet, Android, macOS) */
  async function handleNativeShare() {
    try {
      await navigator.share(shareData)
      onClose()
    } catch {
      // User hat abgebrochen – kein Fehler
    }
  }

  /** Link in Zwischenablage kopieren */
  async function handleCopyLink() {
    const content = `${title}\n\n${text}\n\n${shareData.url}`
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: unsichtbares Input
      const el = document.createElement('textarea')
      el.value = content
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  /** Per E-Mail teilen */
  function handleEmailShare() {
    const subject = encodeURIComponent(title)
    const body = encodeURIComponent(`${text}\n\n${shareData.url}`)
    if (email.trim()) {
      window.open(`mailto:${email.trim()}?subject=${subject}&body=${body}`, '_self')
    } else {
      window.open(`mailto:?subject=${subject}&body=${body}`, '_self')
    }
    onClose()
  }

  const supportsNativeShare = typeof navigator.share === 'function'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 mx-4 mb-4 w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-2xl sm:mb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Teilen</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Vorschau */}
        <div className="border-b border-[var(--color-border)] px-5 py-3">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-text-muted)]">
            {text || 'Kein Inhalt'}
          </p>
        </div>

        {/* Share-Optionen */}
        <div className="space-y-1 px-3 py-3">
          {/* Native Share (wenn verfügbar) */}
          {supportsNativeShare ? (
            <button
              type="button"
              onClick={() => void handleNativeShare()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </div>
              <div>
                <p className="font-medium">Teilen…</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">AirDrop, WhatsApp, Nachrichten und mehr</p>
              </div>
            </button>
          ) : null}

          {/* Per E-Mail teilen */}
          {showEmailForm ? (
            <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-800/50">
              <p className="mb-2 text-xs font-medium text-[var(--color-text-primary)]">Per E-Mail senden</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-Mail-Adresse (optional)"
                className="mb-2 h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-400 focus:outline-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="flex-1 rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-text-muted)] hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleEmailShare}
                  className="flex-1 rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600"
                >
                  Senden
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 7l-10 7L2 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium">Per E-Mail</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">Inhalt als E-Mail versenden</p>
              </div>
            </button>
          )}

          {/* Link kopieren */}
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
              {copied ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 text-emerald-600">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </div>
            <div>
              <p className="font-medium">{copied ? 'Kopiert!' : 'Inhalt kopieren'}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Titel und Text in die Zwischenablage</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
