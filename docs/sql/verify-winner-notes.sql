/* Winner Notes: Verifizierung nach Migration (20250213170000 + 20250213180000)
   Im Supabase Dashboard -> SQL Editor ausfuehren. */

/* 1) Spalte sales_entries.winner_notes_md existiert
   Erwartung: 2 Zeilen */
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sales_entries'
  AND column_name IN ('winner_notes_md', 'winner_notes_updated_at');

/* 2) Function is_sales_entry_winner(uuid) existiert
   Erwartung: 1 Zeile */
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'is_sales_entry_winner';

/* 3) UPDATE Policy auf sales_entries aktiv
   Erwartung: 1 Zeile sales_entries_update_own, has_using + has_with_check true */
SELECT policyname, cmd, qual IS NOT NULL AS has_using, with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'sales_entries' AND cmd = 'UPDATE';
