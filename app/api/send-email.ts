import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(
  req: { method?: string; body?: { to?: string; subject?: string; html?: string } },
  res: { status: (code: number) => { json: (data: unknown) => void }; setHeader: (name: string, value: string) => void }
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).json({})
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY ist nicht konfiguriert' })
  }

  try {
    const { to = 'tunehelm@gmail.com', subject = 'Hello World', html } = req.body ?? {}

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: typeof to === 'string' ? to : 'tunehelm@gmail.com',
      subject: typeof subject === 'string' ? subject : 'Hello World',
      html: typeof html === 'string' ? html : '<p>Congrats on sending your <strong>first email</strong>!</p>',
    })

    if (error) {
      return res.status(400).json({ error: String(error.message) })
    }

    return res.status(200).json({ success: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return res.status(500).json({ error: message })
  }
}
