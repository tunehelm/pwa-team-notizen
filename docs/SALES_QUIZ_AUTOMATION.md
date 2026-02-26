# Sales Quiz – Automation & Cron (Europe/Berlin)

Übersicht der Edge Functions, Cron-Zeiten und manueller Auslösung.

## Hinweis: Vite SPA, keine Vercel API Routes

Die App ist eine **Vite/React SPA** (keine Next.js). Vercel API Routes (`/api/cron/*`) existieren nur bei Next.js; bei Vite liefern solche Pfade in Production **404**. Cron wird daher über einen **externen Dienst** (z. B. cron-job.org) erledigt, der die **Supabase Edge Functions direkt** aufruft – mit Service-Role-Key, ohne Umweg über die App.

---

## Jobs (Zeiten Europe/Berlin)

| Job | Zeit (Berlin) | Function | Aktion |
|-----|----------------|----------|--------|
| **Archive** | Montag 11:00 | `sales-archive-and-rollover` | Vorwoche: Top 3 in `sales_bestof` (inkl. winner_notes_md), Challenge → `archived` |
| **Week Start** | Montag 11:00 | `sales-week-start` | Aktuelle Woche: Challenge anlegen (falls nicht vorhanden), status `active`, 2–3 KI-Inspirationen |
| **Freeze** | Freitag 15:00 | `sales-freeze` | Challenge dieser Woche: status → `frozen` (nur wenn `now >= freeze_at`) |
| **Reveal** | Freitag 16:00 | `sales-reveal` | Top 3 aus Votes berechnen, `sales_winners` schreiben, status → `revealed` (nur wenn `now >= reveal_at`) |

**Reihenfolge Montag 11:00:** Zuerst **Archive** (Vorwoche), danach **Week Start** (neue Woche).

---

## Cron: Externer Dienst (cron-job.org, empfohlen)

Da Vercel Cron nur **interne** Pfade (z. B. `/api/cron/...`) triggern kann und bei einer Vite-SPA keine API-Routen existieren, rufen wir die **Supabase Edge Functions direkt** auf:

- **URL:** `https://<project-ref>.supabase.co/functions/v1/<function-name>`
- **Methode:** POST
- **Header:** `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

Den Service-Role-Key als geheimes Feld in cron-job.org (oder GitHub Actions Secret) hinterlegen; er wird **nicht** in der App benötigt.

### Zeitpläne (cron-job.org, Europe/Berlin)

| Function | Empfohlene Zeit (Berlin) | Cron (cron-job.org: „Jeden Montag 11:00“ etc.) |
|----------|--------------------------|--------------------------------------------------|
| **sales-archive-and-rollover** | Montag 11:00 | z. B. Montag 11:00 |
| **sales-week-start** | Montag 11:05 | 5 Min nach Archive |
| **sales-freeze** | Freitag 15:00 | Freitag 15:00 |
| **sales-reveal** | Freitag 16:00 | Freitag 16:00 |

Die Supabase-Functions prüfen intern `now >= freeze_at` / `now >= reveal_at` und sind idempotent. **DST (Winter-/Sommerzeit)** wird von cron-job.org berücksichtigt, wenn du die Zeitzone „Europe/Berlin“ wählst.

### Empfohlener Fallback für Week-Start (robust)

Zusätzlich zum Montag-Job:

- `sales-week-start` **täglich** (z. B. 12:00 Berlin) ausführen.
- Ergebnis ist idempotent: existiert die Woche bereits, kommt `Challenge already exists`.
- Dadurch werden verpasste Montag-Läufe automatisch nachgezogen.

### curl-Beispiele (zum Testen und für cron-job.org)

Ersetze `<PROJECT_REF>` und `<SUPABASE_SERVICE_ROLE_KEY>` durch deine Werte (Supabase Dashboard → Project Settings → API).

```bash
PROJECT_REF="dein-project-ref"
BASE="https://${PROJECT_REF}.supabase.co/functions/v1"
KEY="<SUPABASE_SERVICE_ROLE_KEY>"

# Montag: zuerst Archive, dann Week-Start
curl -X POST "${BASE}/sales-archive-and-rollover" -H "Authorization: Bearer ${KEY}"
curl -X POST "${BASE}/sales-week-start"           -H "Authorization: Bearer ${KEY}"

# Manuell eine bestimmte Woche erzeugen (z. B. 2026-W10)
curl -X POST "${BASE}/sales-week-start" \
  -H "Authorization: Bearer ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{"week_key":"2026-W10"}'

# Freitag
curl -X POST "${BASE}/sales-freeze"                -H "Authorization: Bearer ${KEY}"
curl -X POST "${BASE}/sales-reveal"                 -H "Authorization: Bearer ${KEY}"
```

In **cron-job.org**: Job anlegen → URL = `https://<PROJECT_REF>.supabase.co/functions/v1/sales-week-start` (bzw. freeze, reveal, sales-archive-and-rollover), Methode POST, optional „Request Headers“: `Authorization: Bearer <KEY>` (oder als „Authentification“ nutzen, falls angeboten).

---

## Vercel / vercel.json

- **Repo-Root:** `vercel.json` kann z. B. Build/Output der SPA steuern; **keine** Cron-Einträge, die auf `/api/cron/*` zeigen (diese Routen existieren nicht).
- **App ist Vite:** Keine Serverless Functions unter `app/api/`. Cron ausschließlich extern (cron-job.org o. ä.).

---

## Idempotenz

| Function | Verhalten bei erneutem Aufruf |
|----------|-------------------------------|
| **sales-week-start** | Wenn Challenge für `week_key` existiert → 200, "Challenge already exists", keine Duplikate. |
| **sales-freeze** | Nur Update wenn status = `active` und `now >= freeze_at`. Bereits frozen/revealed → 200. |
| **sales-reveal** | Nur Berechnung wenn status ≠ `revealed` und `now >= reveal_at`. Bereits revealed → 200. |
| **sales-archive-and-rollover** | Sucht Vorwoche mit status `revealed`. Keine gefunden → 200, "No revealed challenge to archive". |

---

## Secrets (Supabase)

Die Edge Functions laufen mit Service Role. Den Key in Supabase als Secret setzen (falls von den Functions genutzt):

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<dein-service-role-key>
```

Für **cron-job.org** wird der gleiche Key nur im externen Dienst gespeichert (nicht in der Vite-App).

---

## Deploy (Edge Functions)

```bash
supabase functions deploy sales-week-start
supabase functions deploy sales-freeze
supabase functions deploy sales-reveal
supabase functions deploy sales-archive-and-rollover
```

Siehe auch: `docs/sales-swipe-cron.md` (Übersicht Edge Functions & Optionen).
