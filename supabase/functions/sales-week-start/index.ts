// Sales Swipe Challenge: Woche starten (Montag 11:00 Europe/Berlin)
// Erstellt Challenge für aktuelle Woche falls nicht vorhanden, setzt status 'active', legt 2–3 KI-Inspirationen an.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getWeekKey, getWeekTimestamps } from "../_shared/sales-challenge-utils.ts"

const WEEK_KEY_REGEX = /^\d{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$/
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

async function readRequestedWeekKey(req: Request): Promise<string | null> {
  const url = new URL(req.url)
  const fromQuery = url.searchParams.get("week_key") ?? url.searchParams.get("week")
  if (fromQuery && WEEK_KEY_REGEX.test(fromQuery)) return fromQuery

  try {
    const body = await req.json() as { week_key?: string; week?: string } | null
    const fromBody = body?.week_key ?? body?.week ?? null
    if (fromBody && WEEK_KEY_REGEX.test(fromBody)) return fromBody
  } catch {
    // ignore non-json / empty body
  }

  return null
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const now = new Date()
    const weekKey = (await readRequestedWeekKey(req)) ?? getWeekKey(now)
    const timestamps = getWeekTimestamps(weekKey)
    const { data, error } = await supabase.rpc("sales_activate_week", {
      p_week_key: weekKey,
      p_starts_at: timestamps.starts_at,
      p_edit_deadline_at: timestamps.edit_deadline_at,
      p_vote_deadline_at: timestamps.vote_deadline_at,
      p_freeze_at: timestamps.freeze_at,
      p_reveal_at: timestamps.reveal_at,
      p_ends_at: timestamps.ends_at,
    })

    if (error) {
      console.error("[sales-week-start] rpc error", error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("[sales-week-start] error", err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
