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

    const weekKey = getWeekKey(new Date())
    const { data: challenge, error: updateError } = await supabase
      .from("sales_challenges")
      .update({ status: "frozen" })
      .eq("week_key", weekKey)
      .in("status", ["active"])
      .select("id")
      .maybeSingle()

    if (updateError) {
      console.error("[sales-freeze] update error", updateError)
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 })
    }

    if (!challenge) {
      return new Response(
        JSON.stringify({ ok: true, message: "No active challenge to freeze", week_key: weekKey }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
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
