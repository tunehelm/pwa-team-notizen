/**
 * Client-Helper zum Aufrufen der E-Mail-API.
 * Die API-Route läuft unter /api/send-email (Vercel).
 */

export type SendEmailParams = {
  to?: string
  subject?: string
  html?: string
}

export async function sendEmail(params: SendEmailParams = {}): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const base = typeof import.meta.env.VITE_API_BASE === 'string' ? import.meta.env.VITE_API_BASE : ''
  const url = `${base}/api/send-email`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { success: false, error: (data as { error?: string }).error ?? `HTTP ${res.status}` }
  }
  return { success: true, data: (data as { data?: unknown }).data }
}
