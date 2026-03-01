-- Transaktionaler Week-Start fuer Sales Quiz.
-- Aktivierung/Neuanlage, AI-Seeding und Backlog-Reconciliation laufen in EINER DB-Transaktion.

CREATE OR REPLACE FUNCTION public.sales_activate_week(
  p_week_key text,
  p_starts_at timestamptz,
  p_edit_deadline_at timestamptz,
  p_vote_deadline_at timestamptz,
  p_freeze_at timestamptz,
  p_reveal_at timestamptz,
  p_ends_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.sales_challenges%ROWTYPE;
  v_backlog public.sales_backlog%ROWTYPE;
  v_challenge_id uuid;
  v_ai_inserted integer := 0;
  v_backlog_reconciled boolean := false;
  v_status text;
  v_source text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('sales-week-start'), hashtext(p_week_key));

  SELECT *
  INTO v_existing
  FROM public.sales_challenges
  WHERE week_key = p_week_key
  FOR UPDATE;

  IF FOUND THEN
    v_challenge_id := v_existing.id;

    IF v_existing.status = 'draft' THEN
      DELETE FROM public.sales_entries
      WHERE challenge_id = v_challenge_id
        AND source = 'ai';

      INSERT INTO public.sales_entries (
        challenge_id,
        author_user_id,
        author_initials,
        source,
        is_published,
        published_at,
        text
      )
      VALUES
        (v_challenge_id, NULL, NULL, 'ai', true, p_starts_at, 'KI-Inspiration 1: Kurzer knackiger Spruch.'),
        (v_challenge_id, NULL, NULL, 'ai', true, p_starts_at, 'KI-Inspiration 2: Zweiter Vorschlag für diese Woche.'),
        (v_challenge_id, NULL, NULL, 'ai', true, p_starts_at, 'KI-Inspiration 3: Dritter Impuls.');

      GET DIAGNOSTICS v_ai_inserted = ROW_COUNT;
      IF v_ai_inserted <> 3 THEN
        RAISE EXCEPTION 'Expected 3 AI entries for %, inserted %', p_week_key, v_ai_inserted;
      END IF;

      UPDATE public.sales_challenges
      SET starts_at = p_starts_at,
          edit_deadline_at = p_edit_deadline_at,
          vote_deadline_at = p_vote_deadline_at,
          freeze_at = p_freeze_at,
          reveal_at = p_reveal_at,
          ends_at = p_ends_at,
          status = 'active',
          ai_entries_seeded = true
      WHERE id = v_challenge_id;

      v_status := 'active';
      v_source := 'draft_activated';
    ELSE
      v_status := v_existing.status;
      v_source := 'existing';
    END IF;

    UPDATE public.sales_backlog
    SET status = 'used',
        used_in_challenge_id = v_challenge_id
    WHERE status = 'planned'
      AND planned_week_key = p_week_key;

    GET DIAGNOSTICS v_ai_inserted = ROW_COUNT;
    v_backlog_reconciled := v_ai_inserted > 0;

    RETURN jsonb_build_object(
      'ok', true,
      'week_key', p_week_key,
      'challenge_id', v_challenge_id,
      'source', v_source,
      'status', v_status,
      'message', CASE WHEN v_source = 'existing' THEN 'Challenge already exists' ELSE NULL END,
      'backlog_reconciled', v_backlog_reconciled,
      'ai_entries_seeded', CASE WHEN v_source = 'existing' THEN COALESCE(v_existing.ai_entries_seeded, false) ELSE true END
    );
  END IF;

  SELECT *
  INTO v_backlog
  FROM public.sales_backlog
  WHERE status = 'planned'
    AND planned_week_key = p_week_key
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    SELECT *
    INTO v_backlog
    FROM public.sales_backlog
    WHERE status = 'draft'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  END IF;

  INSERT INTO public.sales_challenges (
    week_key,
    starts_at,
    edit_deadline_at,
    vote_deadline_at,
    freeze_at,
    reveal_at,
    ends_at,
    title,
    original_text,
    context_md,
    rules_md,
    category,
    status,
    ai_entries_seeded
  )
  VALUES (
    p_week_key,
    p_starts_at,
    p_edit_deadline_at,
    p_vote_deadline_at,
    p_freeze_at,
    p_reveal_at,
    p_ends_at,
    COALESCE(v_backlog.title, 'Verkaufssprüche ' || p_week_key),
    COALESCE(v_backlog.original_text, 'Placeholder: Original-Spruch (aus Backlog oder manuell pflegen)'),
    COALESCE(v_backlog.context_md, 'Kontext zur Woche (optional).'),
    COALESCE(v_backlog.rules_md, 'Max 3 Stimmen pro Person, max 2 pro Karte. Tap: 1, 2 oder 3 (Reset).'),
    v_backlog.category,
    'draft',
    false
  )
  RETURNING id INTO v_challenge_id;

  INSERT INTO public.sales_entries (
    challenge_id,
    author_user_id,
    author_initials,
    source,
    is_published,
    published_at,
    text
  )
  VALUES
    (v_challenge_id, NULL, NULL, 'ai', true, p_starts_at, 'KI-Inspiration 1: Kurzer knackiger Spruch.'),
    (v_challenge_id, NULL, NULL, 'ai', true, p_starts_at, 'KI-Inspiration 2: Zweiter Vorschlag für diese Woche.'),
    (v_challenge_id, NULL, NULL, 'ai', true, p_starts_at, 'KI-Inspiration 3: Dritter Impuls.');

  GET DIAGNOSTICS v_ai_inserted = ROW_COUNT;
  IF v_ai_inserted <> 3 THEN
    RAISE EXCEPTION 'Expected 3 AI entries for new challenge %, inserted %', p_week_key, v_ai_inserted;
  END IF;

  UPDATE public.sales_challenges
  SET status = 'active',
      ai_entries_seeded = true
  WHERE id = v_challenge_id;

  IF v_backlog.id IS NOT NULL THEN
    UPDATE public.sales_backlog
    SET status = 'used',
        used_in_challenge_id = v_challenge_id
    WHERE id = v_backlog.id;
    v_backlog_reconciled := true;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'week_key', p_week_key,
    'challenge_id', v_challenge_id,
    'source', CASE WHEN v_backlog.id IS NULL THEN 'placeholder' ELSE 'backlog' END,
    'status', 'active',
    'message', NULL,
    'backlog_id', v_backlog.id,
    'backlog_reconciled', v_backlog_reconciled,
    'ai_entries_seeded', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sales_activate_week(text, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sales_activate_week(text, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.sales_activate_week(text, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sales_activate_week(text, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz) TO service_role;
