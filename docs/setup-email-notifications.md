# E-Mail-Benachrichtigung bei neuer Nachricht an Admin

## Übersicht

Wenn ein Team-Mitglied auf der "Team"-Seite eine Nachricht sendet, erhält der Admin
automatisch eine E-Mail über Resend.

**Ablauf:** INSERT in `messages` → Database Webhook → Edge Function → Resend → E-Mail

---

## Schritt 1: Resend API-Key

1. Gehe zu [resend.com](https://resend.com) → Dashboard → API Keys
2. Erstelle einen neuen API-Key (z.B. "team-notizen")
3. Kopiere den Key (beginnt mit `re_...`)

## Schritt 2: Supabase CLI installieren (falls nicht vorhanden)

```bash
npm install -g supabase
```

## Schritt 3: Supabase-Projekt verknüpfen

```bash
# Im Projektverzeichnis:
supabase login
supabase link --project-ref DEIN_PROJECT_REF
```

Die Project-Ref findest du unter: Supabase Dashboard → Settings → General → Reference ID

## Schritt 4: Resend API-Key als Secret setzen

```bash
supabase secrets set RESEND_API_KEY=re_DEIN_API_KEY
```

## Schritt 5: Edge Function deployen

```bash
supabase functions deploy notify-admin
```

## Schritt 6: Database Webhook einrichten

### Option A: Über das Supabase Dashboard (einfacher)

1. Gehe zu: Supabase Dashboard → **Database** → **Webhooks**
2. Klicke **"Create a new hook"**
3. Konfiguration:
   - **Name:** `notify-admin-on-message`
   - **Table:** `messages`
   - **Events:** nur **Insert** aktivieren
   - **Type:** Supabase Edge Functions
   - **Edge Function:** `notify-admin`
   - **Method:** POST
4. Speichern

### Option B: Per SQL

```sql
-- Webhook für neue Nachrichten erstellen
CREATE OR REPLACE FUNCTION public.notify_admin_webhook()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://DEIN_PROJECT_REF.supabase.co/functions/v1/notify-admin',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer DEIN_ANON_KEY'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'messages',
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_webhook();
```

> **Hinweis:** Ersetze `DEIN_PROJECT_REF` und `DEIN_ANON_KEY` mit deinen Werten
> aus dem Supabase Dashboard (Settings → API).

---

## Testen

1. Logge dich als normaler User (nicht Admin) ein
2. Gehe auf "Team" und sende eine Nachricht
3. Prüfe dein E-Mail-Postfach (tunehelm@gmail.com)

## Hinweise

- **Resend Free Tier:** 3.000 E-Mails/Monat, 100/Tag
- **Absender-Adresse:** Standardmäßig `onboarding@resend.dev` (Resend Test-Domain).
  Für eine eigene Domain (z.B. `noreply@deine-firma.de`): Domain in Resend verifizieren.
- **Edge Function Logs:** Supabase Dashboard → Edge Functions → notify-admin → Logs
