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

Supabase bietet kein eingebautes Cron für Edge Functions. Die App ist eine **Vite SPA** (keine Next.js), daher existieren keine Vercel API Routes – Cron läuft über einen **externen Dienst**.

### Empfohlen: cron-job.org (oder GitHub Actions)

- **URLs:** `https://<project-ref>.supabase.co/functions/v1/<function-name>` (sales-week-start, sales-freeze, sales-reveal, sales-archive-and-rollover).
- **Methode:** POST.
- **Header:** `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`.

Zeitpläne (cron-job.org, Zeitzone Europe/Berlin):

- **Montag 11:00:** sales-archive-and-rollover, danach (z. B. 11:05) sales-week-start.
- **Freitag 15:00:** sales-freeze.
- **Freitag 16:00:** sales-reveal.

Ausführliche curl-Beispiele und Tabellen: **docs/SALES_QUIZ_AUTOMATION.md**.

### Vercel Cron (nicht nutzbar mit Vite)

Vercel Cron kann nur **interne** Pfade (z. B. `/api/cron/...`) aufrufen. Bei einer Vite-App gibt es keine API-Routen → 404. Die ehemaligen `app/api/cron/*` wurden entfernt; siehe **docs/deprecated-cron-api.md**.

## Manueller Test

Nach Deploy kannst du die Functions manuell aufrufen:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sales-week-start" \
  -H "Authorization: Bearer <ANON_OR_SERVICE_ROLE_KEY>"
```

Dry Run: Zuerst eine Test-Challenge anlegen (z. B. über SQL oder App), dann nacheinander freeze → reveal → archive aufrufen und in der DB prüfen.
