# Sales Swipe Challenge – RLS Smoke Test (Schritt 2)

Nach dem Ausführen der Migration `20250213150000_sales_swipe_challenge_rls.sql` kannst du folgendes prüfen.

## 1) Als normaler User (nicht in sales_admin_emails)

- **sales_challenges:** Nur Zeilen mit `status IN ('active','frozen','revealed','archived')` sichtbar. `draft` nicht sichtbar.
- **sales_entries:** Nur eigene Einträge (`author_user_id = ich`) oder `is_published = true`. Eigene Entries bearbeitbar bis `edit_deadline_at`.
- **sales_votes:** Nur eigene Votes sichtbar; eigene Votes anlegbar/änderbar bis `vote_deadline_at`, Gewicht 0/1/2.
- **sales_winners:** Nur sichtbar, wenn `reveal_at <= now()` oder `status = 'revealed'`.
- **sales_bestof:** Lesbar.
- **sales_admin_emails:** Sollte leer sein (oder nur für Admins lesbar).

## 2) Als Admin (E-Mail in sales_admin_emails)

- **sales_challenges:** Alle Zeilen inkl. `draft`. INSERT/UPDATE/DELETE erlaubt.
- **sales_entries:** Wie Team; zusätzlich INSERT mit `source = 'ai'` erlaubt.
- **sales_winners / sales_bestof:** INSERT/UPDATE als Admin erlaubt.

## 3) Vote-Limits (Trigger)

- Pro User und Challenge: Summe der `weight` maximal 3.
- Pro Eintrag und User: `weight` maximal 2.
- Nach `vote_deadline_at`: INSERT/UPDATE auf `sales_votes` von RLS geblockt; Trigger würde zusätzlich werfen.

## Manuelle Prüfung im SQL Editor

Nach Login als Test-User in der App kannst du in Supabase (oder mit `supabase db execute`) nicht ohne weiteres „als anderer User“ laufen. Sinnvoll:

1. In der **App** als normaler User einloggen → Team-Seite / spätere Sales-Quiz-Seite → prüfen, dass nur erlaubte Daten sichtbar sind.
2. In der **App** als Admin einloggen → prüfen, dass Draft-Challenges und Admin-Aktionen sichtbar/funktionieren.
3. **Vote-Limit:** In der App 3 Votes vergeben → 4. Vote muss fehlschlagen (oder per API/Console prüfen).

Build bleibt unverändert (keine App-Änderung in Schritt 2).
