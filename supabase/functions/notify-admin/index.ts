// Supabase Edge Function: E-Mail-Benachrichtigung an Admin bei neuer Nachricht
// Wird per Database Webhook bei INSERT in "messages" getriggert.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
const ADMIN_EMAIL = "tunehelm@gmail.com"

interface WebhookPayload {
  type: "INSERT"
  table: string
  record: {
    id: string
    sender_id: string
    sender_name: string | null
    sender_email: string | null
    content: string
    created_at: string
    read: boolean
  }
}

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json()
    const { record } = payload

    const senderName = record.sender_name || record.sender_email || "Unbekannt"
    const senderEmail = record.sender_email || ""
    const timestamp = new Date(record.created_at).toLocaleString("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    })

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Team-Notizen <onboarding@resend.dev>",
        to: ADMIN_EMAIL,
        subject: `📩 Neue Nachricht von ${senderName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
            <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 18px;">Neue Nachricht im Team-Notizen</h2>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
              <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #334155;">
                ${senderName}
              </p>
              ${senderEmail ? `<p style="margin: 0 0 12px; font-size: 12px; color: #94a3b8;">${senderEmail}</p>` : ""}
              <p style="margin: 0; font-size: 14px; color: #1e293b; white-space: pre-wrap;">${record.content}</p>
            </div>
            <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8;">
              Gesendet am ${timestamp}
            </p>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error("[notify-admin] Resend error:", res.status, errBody)
      return new Response(JSON.stringify({ error: errBody }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("[notify-admin] Error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
