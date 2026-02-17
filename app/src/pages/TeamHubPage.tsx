import { useCallback, useEffect, useState } from 'react'
import { SidebarLayout } from '../components/SidebarLayout'
import { UserAvatar } from '../components/UserAvatar'
import { useAppData } from '../state/useAppData'
import { supabase } from '../lib/supabase'
import { isAdminEmail } from '../lib/admin'

interface TeamMember {
  id: string
  email: string
  name?: string
}

interface Message {
  id: string
  sender_id: string
  sender_name: string | null
  sender_email: string | null
  content: string
  created_at: string
  read: boolean
}

export function TeamHubPage() {
  const { currentUserId, currentUserEmail, currentUserName, folders, notes } = useAppData()
  const [members, setMembers] = useState<TeamMember[]>([])
  const isAdmin = isAdminEmail(currentUserEmail)

  // Nachricht-an-Admin State (für normale User)
  const [msgText, setMsgText] = useState('')
  const [msgSending, setMsgSending] = useState(false)
  const [msgSent, setMsgSent] = useState(false)
  const [msgError, setMsgError] = useState('')

  // Admin-Nachrichteneingang
  const [messages, setMessages] = useState<Message[]>([])
  const [showMessages, setShowMessages] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)

  // Lade alle Profile aus der profiles-Tabelle und ergänze Owner-IDs
  useEffect(() => {
    async function loadMembers() {
      const ownerIds = new Set<string>()
      for (const f of folders) {
        if (f.ownerId) ownerIds.add(f.ownerId)
      }
      for (const n of notes) {
        if (n.ownerId) ownerIds.add(n.ownerId)
      }
      if (currentUserId) ownerIds.add(currentUserId)

      const profileMap = new Map<string, { email: string; name: string }>()
      const { data: profiles, error } = await supabase.from('profiles').select('id, email, display_name')
      if (error) {
        console.warn('[TeamHub] Profile konnten nicht geladen werden:', error.message)
      }
      if (profiles) {
        for (const p of profiles) {
          profileMap.set(p.id, { email: p.email || '', name: p.display_name || '' })
        }
      }

      const memberList: TeamMember[] = Array.from(ownerIds).map((id) => {
        const profile = profileMap.get(id)
        if (id === currentUserId) {
          return { id, email: currentUserEmail || profile?.email || id, name: currentUserName || profile?.name }
        }
        return { id, email: profile?.email || id, name: profile?.name || undefined }
      })

      memberList.sort((a, b) => {
        if (a.id === currentUserId) return -1
        if (b.id === currentUserId) return 1
        return (a.name || a.email).localeCompare(b.name || b.email)
      })

      setMembers(memberList)
    }

    void loadMembers()
  }, [currentUserId, currentUserEmail, currentUserName, folders, notes])

  // Admin: Nachrichten laden (und nach Mark-as-read neu laden)
  const loadMessages = useCallback(async () => {
    if (!isAdmin) return
    setMessagesLoading(true)
    setMessagesError(null)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
    setMessagesLoading(false)
    if (error) {
      console.warn('[TeamHub] Nachrichten laden fehlgeschlagen:', error.message)
      setMessagesError('Nachrichten konnten nicht geladen werden. Bitte Seite neu laden.')
      setMessages([])
      return
    }
    setMessages((data ?? []) as Message[])
  }, [isAdmin])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  const unreadCount = messages.filter((m) => !m.read).length

  // Nachricht senden (normale User)
  async function sendMessage() {
    const text = msgText.trim()
    if (!text || !currentUserId) return
    setMsgSending(true)
    setMsgError('')

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUserId,
      sender_name: currentUserName || null,
      sender_email: currentUserEmail || null,
      content: text,
    })

    setMsgSending(false)
    if (error) {
      console.error('[TeamHub] Nachricht senden fehlgeschlagen:', error.message)
      setMsgError('Nachricht konnte nicht gesendet werden. Bitte erneut versuchen.')
    } else {
      setMsgText('')
      setMsgSent(true)
      setTimeout(() => setMsgSent(false), 4000)
    }
  }

  // Admin: Nachricht als gelesen markieren (inkl. Refetch für Badge)
  async function markAsRead(msgId: string) {
    const { error } = await supabase.from('messages').update({ read: true }).eq('id', msgId)
    if (error) {
      console.warn('[TeamHub] Als gelesen markieren fehlgeschlagen:', error.message)
      return
    }
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, read: true } : m)))
  }

  // Admin: Alle als gelesen markieren
  async function markAllAsRead() {
    const unreadIds = messages.filter((m) => !m.read).map((m) => m.id)
    if (unreadIds.length === 0) return
    const { error } = await supabase.from('messages').update({ read: true }).in('id', unreadIds)
    if (error) {
      console.warn('[TeamHub] Alle als gelesen fehlgeschlagen:', error.message)
      return
    }
    setMessages((prev) => prev.map((m) => ({ ...m, read: true })))
  }

  // Zeitformat
  function formatTime(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Gerade eben'
    if (diffMin < 60) return `Vor ${diffMin} Min.`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `Vor ${diffH} Std.`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return `Vor ${diffD} Tag${diffD > 1 ? 'en' : ''}`
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  // Statistiken
  const teamFolders = folders.filter((f) => f.access !== 'private')
  const teamNotes = notes.filter((n) => {
    const folder = folders.find((f) => f.id === n.folderId)
    return !folder || folder.access !== 'private'
  })

  return (
    <SidebarLayout title="Team" showCreate={false}>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Team</h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
          {members.length} Mitglieder
        </p>

        {/* Mitglieder */}
        <section className="mt-6">
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm">
            {members.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                Noch keine Team-Mitglieder aktiv.
              </div>
            ) : (
              members.map((member, i) => {
                const isCurrentUser = member.id === currentUserId
                const displayName = member.name
                  ? member.name
                  : member.email.includes('@')
                    ? member.email.split('@')[0]
                    : member.email.slice(0, 8)
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 px-4 py-3.5 ${
                      i > 0 ? 'border-t border-[var(--color-border)]' : ''
                    }`}
                  >
                    <div className="relative">
                      <UserAvatar email={member.email} name={member.name} size="lg" />
                      {isCurrentUser ? (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--color-bg-card)] bg-emerald-400" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {displayName}
                        {isCurrentUser ? ' (du)' : ''}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {isCurrentUser ? 'Online' : 'Aktiv'}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* ── Nachricht an Admin (nur für normale User, nicht für Admin selbst) ── */}
        {!isAdmin ? (
          <section className="mt-6">
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/30">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-violet-500" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Nachricht an Admin</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Änderungswünsche, Fehler melden</p>
                </div>
              </div>
              <div className="border-t border-[var(--color-border)] px-4 py-3">
                <textarea
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="Deine Nachricht…"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-400 focus:outline-none"
                />
                {msgError ? (
                  <p className="mt-1.5 text-xs text-red-500">{msgError}</p>
                ) : null}
                <div className="mt-2 flex items-center justify-between">
                  {msgSent ? (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Nachricht gesendet
                    </div>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    disabled={!msgText.trim() || msgSending}
                    onClick={() => void sendMessage()}
                    className="rounded-xl bg-blue-500 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {msgSending ? 'Sende…' : 'Senden'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Admin: Nachrichteneingang ── */}
        {isAdmin ? (
          <section className="mt-6">
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm">
              <button
                type="button"
                onClick={() => setShowMessages(!showMessages)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/30">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-violet-500" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Nachrichten
                    {unreadCount > 0 ? (
                      <span className="ml-1.5 text-xs font-normal text-red-500">{unreadCount} ungelesen</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {messages.length === 0 ? 'Keine Nachrichten' : `${messages.length} Nachricht${messages.length > 1 ? 'en' : ''}`}
                  </p>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform ${showMessages ? 'rotate-90' : ''}`}
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>

              {showMessages ? (
                <div className="border-t border-[var(--color-border)]">
                  {messagesError ? (
                    <div className="px-4 py-6 text-center text-sm text-red-500">
                      {messagesError}
                    </div>
                  ) : messagesLoading ? (
                    <div className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                      Nachrichten werden geladen…
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                      Noch keine Nachrichten eingegangen.
                    </div>
                  ) : (
                    <>
                      {unreadCount > 0 ? (
                        <div className="flex justify-end border-b border-[var(--color-border)] px-4 py-2">
                          <button
                            type="button"
                            onClick={() => void markAllAsRead()}
                            className="text-xs font-medium text-blue-500 hover:underline"
                          >
                            Alle als gelesen markieren
                          </button>
                        </div>
                      ) : null}
                      {messages.map((msg, i) => (
                        <div
                          key={msg.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (!msg.read) void markAsRead(msg.id)
                          }}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && !msg.read) void markAsRead(msg.id)
                          }}
                          className={`cursor-pointer px-4 py-3 ${i > 0 ? 'border-t border-[var(--color-border)]' : ''} ${!msg.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <UserAvatar email={msg.sender_email ?? undefined} name={msg.sender_name ?? undefined} size="sm" />
                                <div>
                                  <p className="text-xs font-medium text-[var(--color-text-primary)]">
                                    {msg.sender_name || msg.sender_email || 'Unbekannt'}
                                  </p>
                                  <p className="text-[10px] text-[var(--color-text-muted)]">{formatTime(msg.created_at)}</p>
                                </div>
                              </div>
                              <p className="mt-1.5 whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">
                                {msg.content}
                              </p>
                            </div>
                            {!msg.read ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void markAsRead(msg.id)
                                }}
                                title="Als gelesen markieren"
                                className="mt-1 shrink-0 rounded-lg p-1.5 text-blue-500 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </button>
                            ) : (
                              <span className="mt-1 shrink-0 p-1.5 text-emerald-400" aria-hidden>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Workspace-Statistik */}
        <section className="mt-6">
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-blue-500" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="9" cy="7" r="3" />
                  <path d="M2 20a7 7 0 0114 0" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                  <path d="M21 20c0-2.5-1.7-4.6-4-5.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">Team-Workspace</p>
                <p className="text-xs text-[var(--color-text-muted)]">Gemeinsame Inhalte</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-px border-t border-[var(--color-border)] bg-[var(--color-border)]">
              <div className="bg-[var(--color-bg-card)] px-3 py-4 text-center">
                <p className="text-xl font-bold text-[var(--color-text-primary)]">{teamNotes.length}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">Notizen</p>
              </div>
              <div className="bg-[var(--color-bg-card)] px-3 py-4 text-center">
                <p className="text-xl font-bold text-[var(--color-text-primary)]">{teamFolders.length}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">Ordner</p>
              </div>
              <div className="bg-[var(--color-bg-card)] px-3 py-4 text-center">
                <p className="text-xl font-bold text-[var(--color-text-primary)]">{members.length}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">Mitglieder</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SidebarLayout>
  )
}
