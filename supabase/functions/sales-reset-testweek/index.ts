// Testwoche 2099-W01 zurücksetzen: alle zugehörigen Daten löschen (FK-sicher).

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const TEST_WEEK_KEY = "2099-W01"

serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }), { status: 500 })
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: challenge, error: chErr } = await supabase
      .from("sales_challenges")
      .select("id")
      .eq("week_key", TEST_WEEK_KEY)
      .maybeSingle()

    if (chErr || !challenge) {
      return new Response(
        JSON.stringify({ ok: true, message: "nothing to delete", week_key: TEST_WEEK_KEY }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }
    const ids = [challenge.id]

    await supabase.from("sales_votes").delete().in("challenge_id", ids)
    await supabase.from("sales_winners").delete().in("challenge_id", ids)
    await supabase.from("sales_entries").delete().in("challenge_id", ids)
    await supabase.from("sales_bestof").delete().eq("challenge_week_key", TEST_WEEK_KEY)
    await supabase.from("sales_backlog").delete().eq("planned_week_key", TEST_WEEK_KEY)
    await supabase.from("sales_backlog").delete().in("used_in_challenge_id", ids)
    await supabase.from("sales_challenges").delete().in("id", ids)

    return new Response(
      JSON.stringify({ ok: true, message: "reset done", week_key: TEST_WEEK_KEY }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("[sales-reset-testweek] error", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
