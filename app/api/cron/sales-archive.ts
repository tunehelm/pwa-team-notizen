import { runCron } from './shared'

type Req = { method?: string; headers?: Record<string, string | undefined } }
type Res = { status: (code: number) => { json: (data: unknown) => void } }

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const secret = req.headers?.['x-cron-secret']
  const result = await runCron('sales-archive-and-rollover', secret)

  if (result.ok && 'disabled' in result) {
    res.status(200).json({ cron: 'disabled' })
    return
  }

  if (!result.ok) {
    res.status(result.status).json({ error: 'error' in result ? result.error : 'Unknown' })
    return
  }

  res.status(200).json(result.data)
}
