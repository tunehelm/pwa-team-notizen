# Sales Swipe Challenge – Cron / Edge Functions (Schritt 3)

## Übersicht

Vier Edge Functions steuern den Wochenablauf (Europe/Berlin). Sie müssen mit **Service Role** laufen (RLS wird umgangen).

| Function | Zeit (Europe/Berlin) | Aktion |
|----------|----------------------|--------|
| `sales-week-start` | Montag 11:00 | Erstellt Challenge für aktuelle Woche (falls nicht vorhanden), status `active`, 2–3 KI-Inspirationen |
| `sales-freeze` | Freitag 15:00 | Setzt status auf `frozen` (keine weiteren Votes) |
| `sales-reveal` | Freitag 16:00 | Berechnet Top 3, schreibt `sales_winners`, status `revealed` |
| `sales-archive-and-rollover` | Montag 11:00 | Schreibt Top 3 in `sales_bestof`, setzt Challenge auf `archived` (Vorwoche) |

Reihenfolge Montag: zuerst **archive** (Vorwoche archivieren), danach **week-start** (neue Woche starten).

## Secrets

In Supabase müssen gesetzt sein:

- `SUPABASE_SERVICE_ROLE_KEY` – wird von den Functions genutzt (Dashboard → Project Settings → API → service_role key, dann als Secret setzen).

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<dein-service-role-key>
```

## Deploy der Functions

Aus dem Projektroot (wo `supabase/` liegt):

```bash
supabase functions deploy sales-week-start
supabase functions deploy sales-freeze
supabase functions deploy sales-reveal
supabase functions deploy sales-archive-and-rollover
```

Die Functions importieren aus `_shared/sales-challenge-utils.ts`. Beim Deploy wird der Ordner `supabase/functions/` mit abgegeben; falls der Import fehlschlägt, die Utils in die jeweilige Function kopieren oder den Import-Pfad anpassen.

## Cron (Europe/Berlin)

Supabase bietet kein eingebautes Cron für Edge Functions. Optionen:

### Option A: Vercel Cron (empfohlen, wenn App auf Vercel läuft)

In `vercel.json` (oder im Vercel Dashboard unter Cron Jobs):

- Zeitangaben in **UTC**. Europe/Berlin: Winter UTC+1, Sommer UTC+2.
  - Montag 11:00 Berlin = Montag 10:00 UTC (Winter) bzw. 09:00 UTC (Sommer).
  - Freitag 15:00 Berlin = Freitag 14:00 UTC (Winter) bzw. 13:00 UTC (Sommer).
  - Freitag 16:00 Berlin = Freitag 15:00 UTC (Winter) bzw. 14:00 UTC (Sommer).

Beispiel (Winterzeit, UTC+1):

```json
{
  "crons": [
    { "path": "/api/cron/sales-archive", "schedule": "0 10 * * 1" },
    { "path": "/api/cron/sales-week-start", "schedule": "0 10 * * 1" },
    { "path": "/api/cron/sales-freeze", "schedule": "0 14 * * 5" },
    { "path": "/api/cron/sales-reveal", "schedule": "0 15 * * 5" }
  ]
}
```

Die Pfade `/api/cron/...` müssen in der App als Serverless Functions existieren, die die Supabase Edge Function per `fetch` aufrufen (mit Authorization Header oder Secret).

### Option B: Externer Cron (z. B. cron-job.org)

- Jobs anlegen, die die Function-URLs per GET/POST aufrufen.
- URLs: `https://<project-ref>.supabase.co/functions/v1/sales-week-start` (analog für freeze, reveal, sales-archive-and-rollover).
- Optional: Authorization Header mit einem geheimen Token setzen und in der Edge Function prüfen.

### Option C: Supabase pg_cron (nur DB)

Mit `pg_cron` kann man keine HTTP-Requests an Edge Functions senden, ohne eine zusätzliche Extension (z. B. http). Daher eher Option A oder B.

## Manueller Test

Nach Deploy kannst du die Functions manuell aufrufen:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sales-week-start" \
  -H "Authorization: Bearer <ANON_OR_SERVICE_ROLE_KEY>"
```

Dry Run: Zuerst eine Test-Challenge anlegen (z. B. über SQL oder App), dann nacheinander freeze → reveal → archive aufrufen und in der DB prüfen.
