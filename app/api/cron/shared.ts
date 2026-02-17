/**
 * Shared logic for cron API routes. Only runs on server (Vercel serverless).
 * ENV: CRON_ENABLED, CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CRON_SECRET = process.env.CRON_SECRET

export type CronResult =
  | { ok: true; disabled: true }
  | { ok: false; status: number; error: string }
  | { ok: true; status: number; data: unknown }

export async function runCron(
  fnName: string,
  secret: string | undefined
): Promise<CronResult> {
  if (process.env.CRON_ENABLED !== 'true') {
    return { ok: true, disabled: true }
  }

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return { ok: false, status: 500, error: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set' }
  }

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${fnName}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    const text = await res.text()
    let data: unknown = text
    try {
      data = JSON.parse(text)
    } catch {
      // keep text
    }
    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, status: 500, error: message }
  }
}
