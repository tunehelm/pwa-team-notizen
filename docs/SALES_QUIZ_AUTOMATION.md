# Sales Quiz – Automation & Cron (Europe/Berlin)

Übersicht der Edge Functions, Cron-Zeiten und manueller Auslösung.

## Jobs (Zeiten Europe/Berlin)

| Job | Zeit (Berlin) | Function | Aktion |
|-----|----------------|----------|--------|
| **Archive** | Montag 11:00 | `sales-archive-and-rollover` | Vorwoche: Top 3 in `sales_bestof` (inkl. winner_notes_md), Challenge → `archived` |
| **Week Start** | Montag 11:00 | `sales-week-start` | Aktuelle Woche: Challenge anlegen (falls nicht vorhanden), status `active`, 2–3 KI-Inspirationen |
| **Freeze** | Freitag 15:00 | `sales-freeze` | Challenge dieser Woche: status → `frozen` (nur wenn `now >= freeze_at`) |
| **Reveal** | Freitag 16:00 | `sales-reveal` | Top 3 aus Votes berechnen, `sales_winners` schreiben, status → `revealed` (nur wenn `now >= reveal_at`) |

**Reihenfolge Montag 11:00:** Zuerst **Archive** (Vorwoche), danach **Week Start** (neue Woche).

## Cron-Ausdrücke

Supabase hat kein eingebautes Cron für Edge Functions. Optionen:

### Option A: Vercel Cron

Zeiten in **UTC** (Berlin Winter UTC+1, Sommer UTC+2). Beispiel Winter:

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

Die API-Routen müssen die Supabase Edge Function per `fetch` mit Service-Role/Secret aufrufen.

### Option B: Externer Cron (z. B. cron-job.org)

- Montag 11:00 Berlin: `sales-archive-and-rollover`, dann `sales-week-start`
- Freitag 15:00: `sales-freeze`
- Freitag 16:00: `sales-reveal`

URLs: `https://<project-ref>.supabase.co/functions/v1/<function-name>`

### Option C: Supabase Scheduled Triggers (pg_cron)

Falls ihr pg_cron nutzt: HTTP-Requests an Edge Functions erfordern z. B. die Extension `pg_net` oder einen externen Aufruf.

## Manuell triggern

Aus dem Projektroot (oder mit curl):

```bash
# Projekt-Ref aus Supabase Dashboard → Project Settings → General
PROJECT_REF="<dein-project-ref>"
BASE="https://${PROJECT_REF}.supabase.co/functions/v1"

# Mit Anon Key (falls Function öffentlich) oder Service Role Key
curl -X POST "${BASE}/sales-week-start" -H "Authorization: Bearer <KEY>"
curl -X POST "${BASE}/sales-freeze"    -H "Authorization: Bearer <KEY>"
curl -X POST "${BASE}/sales-reveal"   -H "Authorization: Bearer <KEY>"
curl -X POST "${BASE}/sales-archive-and-rollover" -H "Authorization: Bearer <KEY>"
```

**Woche manuell anstoßen:** Zuerst `sales-archive-and-rollover` (archiviert Vorwoche), dann `sales-week-start` (legt aktuelle Woche an, falls noch nicht da).

## Idempotenz

| Function | Verhalten bei erneutem Aufruf |
|----------|-------------------------------|
| **sales-week-start** | Wenn Challenge für `week_key` existiert → 200, "Challenge already exists", keine Duplikate. |
| **sales-freeze** | Nur Update wenn status = `active` und `now >= freeze_at`. Bereits frozen/revealed → 200, "already frozen or revealed". |
| **sales-reveal** | Nur Berechnung wenn status ≠ `revealed` und `now >= reveal_at`. Bereits revealed → 200, "Already revealed". |
| **sales-archive-and-rollover** | Sucht Vorwoche mit status `revealed`. Keine gefunden → 200, "No revealed challenge to archive". |

## Secrets

- `SUPABASE_SERVICE_ROLE_KEY` in Supabase (Dashboard → Project Settings → API → service_role) als Secret setzen, damit die Functions mit Service Role laufen.

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<dein-service-role-key>
```

## Deploy

```bash
supabase functions deploy sales-week-start
supabase functions deploy sales-freeze
supabase functions deploy sales-reveal
supabase functions deploy sales-archive-and-rollover
```

Siehe auch: `docs/sales-swipe-cron.md` (Details zu Secrets und Vercel).
