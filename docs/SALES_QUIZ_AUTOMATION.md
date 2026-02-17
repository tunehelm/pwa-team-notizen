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

## Vercel Cron (aktiv)

Die App nutzt **Vercel Cron** über geschützte API-Routen (`app/api/cron/*`). Die Routen rufen die Supabase Edge Functions mit Service-Role auf; Secrets bleiben serverseitig (nur ENV).

### ENV-Variablen (Vercel Dashboard → Project → Settings → Environment Variables)

| Variable | Beschreibung |
|----------|--------------|
| `SUPABASE_URL` | Supabase Projekt-URL (z. B. `https://<project-ref>.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-Role-Key aus Supabase (API → service_role) |
| `CRON_SECRET` | Geheimes Token; Cron-Requests müssen Header `x-cron-secret: <CRON_SECRET>` senden. |
| `CRON_ENABLED` | `true` = Cron ausführen; anders (oder nicht gesetzt) = sofort 200 "Cron disabled", kein Aufruf an Supabase. |

### Cron deaktivieren

- In Vercel: `CRON_ENABLED` auf etwas anderes setzen als `true` (z. B. `false` oder Variable entfernen). Dann liefern alle Cron-Endpoints sofort 200 mit `{ "cron": "disabled" }` zurück, ohne Supabase zu callen.

### Schedules (vercel.json, UTC)

- **sales-archive:** täglich 09:05 UTC (`5 9 * * *`) – entspricht ~10:05 CET / 11:05 CEST.
- **sales-week-start:** täglich 09:10 UTC (`10 9 * * *`) – 5 min nach Archive (Reihenfolge Montag: erst Archive, dann Week-Start).
- **sales-freeze:** alle 10 Minuten (`*/10 * * * *`).
- **sales-reveal:** alle 10 Minuten (`*/10 * * * *`).

Die Supabase-Functions prüfen intern `now >= freeze_at` / `now >= reveal_at` und sind idempotent. Dadurch ist **DST (Winter-/Sommerzeit) unkritisch**: Die Cron-Jobs laufen regelmäßig, die Logik entscheidet, ob gerade Aktion nötig ist.

### Cron manuell testen (POST mit Secret)

```bash
# Basis-URL deiner App (Vercel Preview oder Production)
BASE="https://<deine-app>.vercel.app"

curl -X POST "${BASE}/api/cron/sales-archive" \
  -H "x-cron-secret: <CRON_SECRET>"

curl -X POST "${BASE}/api/cron/sales-week-start" \
  -H "x-cron-secret: <CRON_SECRET>"
```

Ohne gültiges `x-cron-secret` oder mit `CRON_ENABLED !== 'true'`: 401 bzw. 200 "Cron disabled".

---

## Weitere Optionen (ohne Vercel Cron)

### Externer Cron (z. B. cron-job.org)

- Montag 11:00 Berlin: zuerst Archive, dann Week-Start.
- Freitag 15:00: Freeze; Freitag 16:00: Reveal.
- URLs: `https://<deine-app>.vercel.app/api/cron/sales-archive` etc., mit Header `x-cron-secret`.

### Supabase Scheduled Triggers (pg_cron)

Falls ihr pg_cron nutzt: HTTP-Requests an Edge Functions erfordern z. B. die Extension `pg_net` oder einen externen Aufruf.

## Manuell triggern

**Empfohlen (über Vercel API):** Siehe Abschnitt „Cron manuell testen“ oben (POST an `/api/cron/...` mit `x-cron-secret`).

**Direkt Supabase (falls ohne Vercel):**

```bash
PROJECT_REF="<dein-project-ref>"
BASE="https://${PROJECT_REF}.supabase.co/functions/v1"
# Mit Service Role Key
curl -X POST "${BASE}/sales-archive-and-rollover" -H "Authorization: Bearer <KEY>"
curl -X POST "${BASE}/sales-week-start" -H "Authorization: Bearer <KEY>"
```

**Reihenfolge Montag:** Zuerst Archive (Vorwoche), dann Week-Start (neue Woche).

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
