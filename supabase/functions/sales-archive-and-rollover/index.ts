// Sales Swipe Challenge: Archivieren & Rollover (Montag 11:00 Europe/Berlin)
// Schreibt Top 3 in sales_bestof, setzt Challenge auf 'archived'. Neue Woche startet separat via sales-week-start.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getPreviousWeekKey } from "../_shared/sales-challenge-utils.ts"

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }), { status: 500 })
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const now = new Date()
    const weekKey = getPreviousWeekKey(now)
    const { data: challenge, error: chErr } = await supabase
      .from("sales_challenges")
      .select("id, week_key, original_text, context_md")
      .eq("week_key", weekKey)
      .eq("status", "revealed")
      .maybeSingle()

    if (chErr || !challenge) {
      return new Response(
        JSON.stringify({ ok: true, message: "No revealed challenge to archive", week_key: weekKey }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    const { data: winner } = await supabase
      .from("sales_winners")
      .select("place1_entry_id, place2_entry_id, place3_entry_id, total_votes")
      .eq("challenge_id", challenge.id)
      .single()

    if (!winner) {
      await supabase.from("sales_challenges").update({ status: "archived" }).eq("id", challenge.id)
      return new Response(
        JSON.stringify({ ok: true, message: "No winners row, challenge archived", week_key: challenge.week_key }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    const entryIds = [winner.place1_entry_id, winner.place2_entry_id, winner.place3_entry_id].filter(Boolean)
    if (entryIds.length === 0) {
      await supabase.from("sales_challenges").update({ status: "archived" }).eq("id", challenge.id)
      return new Response(
        JSON.stringify({ ok: true, message: "No top3 entries, challenge archived", week_key: challenge.week_key }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    const { data: entries } = await supabase
      .from("sales_entries")
      .select("id, text, author_initials, source, created_at")
      .in("id", entryIds)

    const order = [winner.place1_entry_id, winner.place2_entry_id, winner.place3_entry_id].filter(Boolean)
    const entryMap = new Map((entries ?? []).map((e) => [e.id, e]))

    const { data: votes } = await supabase
      .from("sales_votes")
      .select("entry_id, weight")
      .eq("challenge_id", challenge.id)
    const votesByEntry: Record<string, number> = {}
    for (const v of votes ?? []) {
      votesByEntry[v.entry_id] = (votesByEntry[v.entry_id] ?? 0) + (v.weight ?? 0)
    }

    const category = "Verkaufssprüche"
    const bestofRows = order.map((entryId, idx) => {
      const e = entryMap.get(entryId)
      const place = idx + 1
      const source = e?.source ?? "human"
      return {
        category: source === "ai" ? "KI Gewinner" : category,
        challenge_week_key: challenge.week_key,
        place,
        entry_text: e?.text ?? "",
        original_text: challenge.original_text ?? null,
        context_md: challenge.context_md ?? null,
        author_initials: e?.author_initials ?? null,
        source: source,
        votes: votesByEntry[entryId] ?? 0,
        winner_notes_md: null,
      }
    })

    const { error: insertErr } = await supabase.from("sales_bestof").insert(bestofRows)
    if (insertErr) {
      console.error("[sales-archive-and-rollover] insert bestof error", insertErr)
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 500 })
    }

    await supabase.from("sales_challenges").update({ status: "archived" }).eq("id", challenge.id)

    return new Response(
      JSON.stringify({
        ok: true,
        week_key: challenge.week_key,
        archived_count: bestofRows.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("[sales-archive-and-rollover] error", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
