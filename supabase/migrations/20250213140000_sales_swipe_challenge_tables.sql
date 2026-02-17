-- Sales Swipe Challenge – Datenmodell (Schritt 1)
-- Tabellen: sales_challenges, sales_entries, sales_votes, sales_winners, sales_bestof

-- 1) sales_challenges (Woche/Instanz)
CREATE TABLE IF NOT EXISTS public.sales_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_key text NOT NULL UNIQUE,
  starts_at timestamptz NOT NULL,
  edit_deadline_at timestamptz NOT NULL,
  vote_deadline_at timestamptz NOT NULL,
  freeze_at timestamptz NOT NULL,
  reveal_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  title text,
  original_text text,
  context_md text,
  rules_md text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'frozen', 'revealed', 'archived')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) sales_entries (Varianten / Inspirationen)
CREATE TABLE IF NOT EXISTS public.sales_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.sales_challenges(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES auth.users(id),
  author_initials text,
  source text NOT NULL CHECK (source IN ('human', 'ai')),
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  text text NOT NULL,
  draft_text text,
  my_card_color text,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_entries_challenge_id ON public.sales_entries(challenge_id);
CREATE INDEX IF NOT EXISTS idx_sales_entries_published_at ON public.sales_entries(challenge_id, published_at) WHERE is_published = true;

-- 3) sales_votes (Votes anonym, nur für eigenen Zugriff sichtbar)
CREATE TABLE IF NOT EXISTS public.sales_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.sales_challenges(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.sales_entries(id) ON DELETE CASCADE,
  voter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight int NOT NULL CHECK (weight IN (0, 1, 2)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, entry_id, voter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_votes_challenge_voter ON public.sales_votes(challenge_id, voter_user_id);

-- 4) sales_winners (Top 3 Snapshot)
CREATE TABLE IF NOT EXISTS public.sales_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL UNIQUE REFERENCES public.sales_challenges(id) ON DELETE CASCADE,
  place1_entry_id uuid REFERENCES public.sales_entries(id) ON DELETE SET NULL,
  place2_entry_id uuid REFERENCES public.sales_entries(id) ON DELETE SET NULL,
  place3_entry_id uuid REFERENCES public.sales_entries(id) ON DELETE SET NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  total_votes int NOT NULL DEFAULT 0
);

-- 5) sales_bestof (Archiv)
CREATE TABLE IF NOT EXISTS public.sales_bestof (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  challenge_week_key text NOT NULL,
  place int NOT NULL CHECK (place IN (1, 2, 3)),
  entry_text text NOT NULL,
  original_text text,
  context_md text,
  author_initials text,
  source text NOT NULL CHECK (source IN ('human', 'ai')),
  votes int NOT NULL DEFAULT 0,
  winner_notes_md text,
  archived_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_bestof_category_archived ON public.sales_bestof(category, archived_at DESC);

-- updated_at Trigger für sales_entries und sales_votes
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sales_entries_updated_at ON public.sales_entries;
CREATE TRIGGER sales_entries_updated_at
  BEFORE UPDATE ON public.sales_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS sales_votes_updated_at ON public.sales_votes;
CREATE TRIGGER sales_votes_updated_at
  BEFORE UPDATE ON public.sales_votes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Validierung nach Ausführung (im SQL Editor):
-- SELECT 'sales_challenges' AS t, count(*) FROM public.sales_challenges
-- UNION ALL SELECT 'sales_entries', count(*) FROM public.sales_entries
-- UNION ALL SELECT 'sales_votes', count(*) FROM public.sales_votes
-- UNION ALL SELECT 'sales_winners', count(*) FROM public.sales_winners
-- UNION ALL SELECT 'sales_bestof', count(*) FROM public.sales_bestof;
