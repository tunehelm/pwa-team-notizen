# Admin-Inbox: Read/Unread und Badge

## Kurz

- Die Admin-Inbox unter **Team → Nachrichten** zeigt alle Nachrichten aus der Tabelle `messages`.
- Die Badge zählt Zeilen mit `read = false`. Nachrichten können in der App als gelesen markiert werden (einzeln oder „Alle als gelesen“).
- E-Mail-Versand über Resend bleibt unverändert (Webhook bei INSERT in `messages`).

## Supabase: Tabelle und RLS

1. **Supabase Dashboard** → **SQL Editor**.
2. Migration ausführen: Inhalt von  
   `supabase/migrations/20250213120000_messages_read_and_rls.sql`  
   einfügen und ausführen.
   - Fügt die Spalte `read` hinzu, falls sie fehlt.
   - Aktiviert RLS und setzt Policies: authentifizierte User dürfen SELECT, INSERT, UPDATE auf `messages`.

Falls die Tabelle `messages` noch nicht existiert, zuerst anlegen (z. B. über Table Editor oder SQL):

```sql
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  sender_id uuid REFERENCES auth.users(id),
  sender_name text,
  sender_email text,
  content text NOT NULL,
  "read" boolean NOT NULL DEFAULT false
);
```

Dann die Migration (read + RLS) wie oben ausführen.

## Vercel Deploy

- Wie gewohnt: Push auf die Branch, die mit Vercel verbunden ist (z. B. `main`).  
- Keine neuen ENV-Variablen nötig.

## Tests

1. **Badge und Liste**
   - Als Admin einloggen → Team → Nachrichten öffnen.
   - Badge zeigt die Anzahl ungelesener Nachrichten.
   - Liste zeigt alle Nachrichten (Absender, Zeit, Inhalt).

2. **Als gelesen markieren**
   - Eine ungelesene Nachricht anklicken (oder Haken-Button) → Badge verringert sich um 1.
   - „Alle als gelesen markieren“ → Badge wird 0.

3. **Neue Nachricht**
   - Als anderer User eine Nachricht an Admin senden → E-Mail geht raus (Resend), neue Zeile in `messages` mit `read = false` → Badge erhöht sich.

4. **Fehlerfall**
   - Wenn die Abfrage fehlschlägt (z. B. RLS blockiert), erscheint die Meldung: „Nachrichten konnten nicht geladen werden. Bitte Seite neu laden.“
