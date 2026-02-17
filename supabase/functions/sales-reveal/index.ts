// Sales Swipe Challenge: Reveal (Freitag 16:00 Europe/Berlin)
// Berechnet Top 3 aus sales_votes, schreibt sales_winners, setzt status 'revealed'.

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
    const { data: challenge, error: challengeError } = await supabase
      .from("sales_challenges")
      .select("id")
      .eq("week_key", weekKey)
      .maybeSingle()

    if (challengeError || !challenge) {
      return new Response(
        JSON.stringify({ ok: false, message: "Challenge not found", week_key: weekKey }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    const challengeId = challenge.id

    const { data: votes } = await supabase.from("sales_votes").select("entry_id, weight").eq("challenge_id", challengeId)
    const sumByEntry: Record<string, number> = {}
    for (const v of votes ?? []) {
      sumByEntry[v.entry_id] = (sumByEntry[v.entry_id] ?? 0) + (v.weight ?? 0)
    }

    const { data: entries } = await supabase
      .from("sales_entries")
      .select("id, published_at")
      .eq("challenge_id", challengeId)
      .eq("is_published", true)

    const withScore = (entries ?? []).map((e) => ({
      id: e.id,
      score: sumByEntry[e.id] ?? 0,
      published_at: e.published_at ?? "",
    }))
    withScore.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return (a.published_at || "").localeCompare(b.published_at || "") || (a.id < b.id ? -1 : 1)
    })

    const top3 = withScore.slice(0, 3)
    const totalVotes = Object.values(sumByEntry).reduce((a, b) => a + b, 0)

    const { error: winnerError } = await supabase.from("sales_winners").upsert(
      {
        challenge_id: challengeId,
        place1_entry_id: top3[0]?.id ?? null,
        place2_entry_id: top3[1]?.id ?? null,
        place3_entry_id: top3[2]?.id ?? null,
        total_votes: totalVotes,
      },
      { onConflict: "challenge_id" }
    )

    if (winnerError) {
      console.error("[sales-reveal] upsert winners error", winnerError)
      return new Response(JSON.stringify({ error: winnerError.message }), { status: 500 })
    }

    await supabase
      .from("sales_challenges")
      .update({ status: "revealed" })
      .eq("id", challengeId)

    return new Response(
      JSON.stringify({
        ok: true,
        week_key: weekKey,
        challenge_id: challengeId,
        place1: top3[0]?.id,
        place2: top3[1]?.id,
        place3: top3[2]?.id,
        total_votes: totalVotes,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("[sales-reveal] error", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
