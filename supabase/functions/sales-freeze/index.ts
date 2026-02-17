// Sales Swipe Challenge: Freeze (Freitag 15:00 Europe/Berlin)
// Setzt status der aktuellen aktiven Challenge auf 'frozen'. Weitere Votes werden durch RLS/Trigger blockiert.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getWeekKey } from "../_shared/sales-challenge-utils.ts"

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
    const { data: challenge, error: fetchError } = await supabase
      .from("sales_challenges")
      .select("id, freeze_at, status")
      .eq("week_key", weekKey)
      .in("status", ["active", "frozen", "revealed"])
      .maybeSingle()

    if (fetchError) {
      console.error("[sales-freeze] fetch error", fetchError)
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 })
    }

    if (!challenge) {
      return new Response(
        JSON.stringify({ ok: true, message: "No challenge for this week", week_key: weekKey }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    if (challenge.status !== "active") {
      return new Response(
        JSON.stringify({ ok: true, message: "Challenge already frozen or revealed", week_key: weekKey }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    const freezeAt = challenge.freeze_at ? new Date(challenge.freeze_at) : null
    if (freezeAt && now < freezeAt) {
      return new Response(
        JSON.stringify({ ok: true, message: "Freeze not yet (freeze_at in future)", week_key: weekKey }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    const { error: updateError } = await supabase
      .from("sales_challenges")
      .update({ status: "frozen" })
      .eq("id", challenge.id)

    if (updateError) {
      console.error("[sales-freeze] update error", updateError)
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 })
    }

    return new Response(
      JSON.stringify({ ok: true, week_key: weekKey, challenge_id: challenge.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("[sales-freeze] error", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
