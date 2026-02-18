# Vercel – benötigte ENV-Variablen (Frontend Build)

Die App ist eine **Vite SPA**. Es gibt **keine** Vercel API Routes mehr (Cron läuft über cron-job.org → Supabase Edge Functions).

## Für den Frontend-Build (Vercel) benötigt

| Variable | Beschreibung |
|----------|--------------|
| `VITE_SUPABASE_URL` | Supabase Projekt-URL (z. B. `https://<project-ref>.supabase.co`) – **Pflicht** für Login |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public Key (Dashboard → API → anon public) – **Pflicht** für Login |

Optional:

| Variable | Beschreibung |
|----------|--------------|
| `VITE_ADMIN_EMAIL` | E-Mail für Admin-Erkennung (z. B. für Backlog/Statistik) |
| `VITE_DEBUG_AUTH` | `true` = Auth-Debug-Logs in der Konsole |

## Kann in Vercel entfernt werden (Cron-Umstellung)

Diese Variablen wurden früher für die **entfernten** `/api/cron/*`-Routen genutzt. Der Code greift **nicht** mehr darauf zu:

- `CRON_ENABLED`
- `CRON_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` (gehört **nicht** ins Frontend; nur in Supabase als Secret für Edge Functions / cron-job.org)
- `SUPABASE_URL` (wird im Frontend nicht verwendet – nur `VITE_SUPABASE_URL`)

**Hinweis:** Wenn du `SUPABASE_SERVICE_ROLE_KEY` in Vercel hattest, nur für die alten Cron-API-Routen: Du kannst ihn in Vercel löschen. Er muss weiterhin in **Supabase** (Dashboard → Project Settings → Edge Functions → Secrets) gesetzt sein, damit cron-job.org die Edge Functions mit Bearer-Token aufrufen kann.

## Nach Änderung an ENV

- **Neuer Build nötig:** Vite baut `VITE_*` zur Build-Zeit ein. Nach Anpassung in Vercel → Redeploy auslösen.
