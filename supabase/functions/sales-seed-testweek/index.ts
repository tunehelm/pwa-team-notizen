// Testwoche 2099-W01 anlegen: Challenge + Entries + optional Votes. Nur für Preview-Tests.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const TEST_WEEK_KEY = "2099-W01"

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }), { status: 500 })
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    let voterUserId: string | null = null
    try {
      const body = req.method === "POST" && req.body ? await req.json() : {}
      voterUserId = body.voter_user_id ?? null
    } catch {
      // no body
    }

    const { data: existing } = await supabase.from("sales_challenges").select("id").eq("week_key", TEST_WEEK_KEY).maybeSingle()
    if (existing) {
      return new Response(
        JSON.stringify({ ok: true, message: "Challenge already exists", week_key: TEST_WEEK_KEY }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    const now = new Date()
    const freezeAt = new Date(now.getTime() - 60 * 60 * 1000)
    const revealAt = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const endsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const startsAt = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const editDeadline = new Date(now.getTime() + 1 * 60 * 60 * 1000)
    const voteDeadline = new Date(now.getTime() + 90 * 60 * 1000)

    const { data: challenge, error: insertChErr } = await supabase
      .from("sales_challenges")
      .insert({
        week_key: TEST_WEEK_KEY,
        starts_at: startsAt.toISOString(),
        edit_deadline_at: editDeadline.toISOString(),
        vote_deadline_at: voteDeadline.toISOString(),
        freeze_at: freezeAt.toISOString(),
        reveal_at: revealAt.toISOString(),
        ends_at: endsAt.toISOString(),
        title: "Test Challenge 2099-W01",
        category: "Test",
        status: "active",
        original_text: "Test Original",
        context_md: null,
        rules_md: null,
      })
      .select("id")
      .single()

    if (insertChErr || !challenge) {
      return new Response(JSON.stringify({ error: insertChErr?.message ?? "insert challenge failed" }), { status: 500 })
    }
    const challengeId = challenge.id

    const humanEntries = [
      { text: "Human Test 1", author_initials: "H1" },
      { text: "Human Test 2", author_initials: "H2" },
      { text: "Human Test 3", author_initials: "H3" },
    ]
    const aiEntries = [
      { text: "AI Test 1", source: "ai" as const },
      { text: "AI Test 2", source: "ai" as const },
    ]

    for (const e of humanEntries) {
      await supabase.from("sales_entries").insert({
        challenge_id: challengeId,
        source: "human",
        is_published: true,
        published_at: now.toISOString(),
        text: e.text,
        author_initials: e.author_initials,
      })
    }
    for (const e of aiEntries) {
      await supabase.from("sales_entries").insert({
        challenge_id: challengeId,
        source: e.source,
        is_published: true,
        published_at: now.toISOString(),
        text: e.text,
      })
    }

    const { data: entries } = await supabase
      .from("sales_entries")
      .select("id")
      .eq("challenge_id", challengeId)
      .order("created_at", { ascending: true })
    const entryIds = (entries ?? []).map((r) => r.id)
    if (voterUserId && entryIds.length >= 2) {
      const weights: (0 | 1 | 2)[] = [1, 2, 0, 1, 2]
      for (let i = 0; i < Math.min(5, entryIds.length); i++) {
        await supabase.from("sales_votes").insert({
          challenge_id: challengeId,
          entry_id: entryIds[i % entryIds.length],
          voter_user_id: voterUserId,
          weight: weights[i],
        })
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        week_key: TEST_WEEK_KEY,
        challenge_id: challengeId,
        entries: 5,
        votes: voterUserId ? 5 : 0,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("[sales-seed-testweek] error", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
