const ADMIN_EMAILS: string[] = [
  (import.meta.env.VITE_ADMIN_EMAIL ?? '').toLowerCase(),
  'tunehelm@gmail.com',
].filter(Boolean)

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
