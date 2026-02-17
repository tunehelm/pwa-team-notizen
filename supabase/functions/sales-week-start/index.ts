// Sales Swipe Challenge: Woche starten (Montag 11:00 Europe/Berlin)
// Erstellt Challenge für aktuelle Woche falls nicht vorhanden, setzt status 'active', legt 2–3 KI-Inspirationen an.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getWeekKey, getWeekTimestamps } from "../_shared/sales-challenge-utils.ts"

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }), { status: 500 })
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const now = new Date()
    const weekKey = getWeekKey(now)
    const timestamps = getWeekTimestamps(weekKey)

    const { data: existing } = await supabase.from("sales_challenges").select("id").eq("week_key", weekKey).maybeSingle()
    if (existing) {
      return new Response(JSON.stringify({ ok: true, message: "Challenge already exists", week_key: weekKey }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { data: challenge, error: insertChallengeError } = await supabase
      .from("sales_challenges")
      .insert({
        week_key: weekKey,
        starts_at: timestamps.starts_at,
        edit_deadline_at: timestamps.edit_deadline_at,
        vote_deadline_at: timestamps.vote_deadline_at,
        freeze_at: timestamps.freeze_at,
        reveal_at: timestamps.reveal_at,
        ends_at: timestamps.ends_at,
        title: `Verkaufssprüche ${weekKey}`,
        /* TODO: Backlog: Wenn sales_backlog existiert, geplanten Eintrag für week_key oder nächsten draft nehmen. */
        original_text: "Placeholder: Original-Spruch (aus Backlog oder manuell pflegen)",
        context_md: "Kontext zur Woche (optional).",
        rules_md: "Max 3 Stimmen pro Person, max 2 pro Karte. Tap: 1, 2 oder 3 (Reset).",
        status: "active",
      })
      .select("id")
      .single()

    if (insertChallengeError) {
      console.error("[sales-week-start] insert challenge error", insertChallengeError)
      return new Response(JSON.stringify({ error: insertChallengeError.message }), { status: 500 })
    }

    const challengeId = challenge.id
    const aiEntries = [
      { text: "KI-Inspiration 1: Kurzer knackiger Spruch.", source: "ai" as const },
      { text: "KI-Inspiration 2: Zweiter Vorschlag für diese Woche.", source: "ai" as const },
      { text: "KI-Inspiration 3: Dritter Impuls.", source: "ai" as const },
    ]

    for (const e of aiEntries) {
      const { error: entryError } = await supabase.from("sales_entries").insert({
        challenge_id: challengeId,
        author_user_id: null,
        author_initials: null,
        source: e.source,
        is_published: true,
        published_at: timestamps.starts_at,
        text: e.text,
      })
      if (entryError) console.error("[sales-week-start] insert ai entry error", entryError)
    }

    return new Response(
      JSON.stringify({ ok: true, week_key: weekKey, challenge_id: challengeId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("[sales-week-start] error", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
