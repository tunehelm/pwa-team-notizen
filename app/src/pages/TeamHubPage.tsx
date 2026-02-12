import { useEffect, useState } from 'react'
import { SidebarLayout } from '../components/SidebarLayout'
import { UserAvatar } from '../components/UserAvatar'
import { useAppData } from '../state/useAppData'

interface TeamMember {
  id: string
  email: string
  name?: string
}

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? '').toLowerCase()

export function TeamHubPage() {
  const { currentUserId, currentUserEmail, currentUserName, folders, notes } = useAppData()
  const [members, setMembers] = useState<TeamMember[]>([])

  const isAdmin = Boolean(ADMIN_EMAIL && currentUserEmail.toLowerCase() === ADMIN_EMAIL)

  // Sammle eindeutige Owner-IDs aus den Daten und löse den aktuellen User auf
  useEffect(() => {
    const ownerIds = new Set<string>()
    for (const f of folders) {
      if (f.ownerId) ownerIds.add(f.ownerId)
    }
    for (const n of notes) {
      if (n.ownerId) ownerIds.add(n.ownerId)
    }

    // Admin-User nicht als Mitglied hinzufügen (nur wenn aktueller User Admin ist)
    if (currentUserId && !isAdmin) ownerIds.add(currentUserId)
    // Falls Admin: eigene ID aus der Liste entfernen
    if (isAdmin && currentUserId) ownerIds.delete(currentUserId)

    const memberList: TeamMember[] = Array.from(ownerIds).map((id) => ({
      id,
      email: id === currentUserId && currentUserEmail ? currentUserEmail : id,
      name: id === currentUserId ? currentUserName : undefined,
    }))

    // Aktuellen User nach oben sortieren (falls nicht Admin)
    memberList.sort((a, b) => {
      if (a.id === currentUserId) return -1
      if (b.id === currentUserId) return 1
      return 0
    })

    setMembers(memberList)
  }, [currentUserId, currentUserEmail, currentUserName, folders, notes, isAdmin])

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
