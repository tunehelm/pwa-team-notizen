# Deprecated: Vercel Cron API Routes (app/api/cron/*)

Die ehemaligen API-Routen unter `app/api/cron/*` (sales-archive, sales-week-start, sales-freeze, sales-reveal) wurden **entfernt**.

**Grund:** Die App ist eine **Vite/React SPA**, keine Next.js-App. Vercel API Routes existieren nur bei Next.js; unter Vite liefern `/api/cron/*` in Production **404**.

**Lösung:** Cron wird über einen **externen Dienst** (z. B. [cron-job.org](https://cron-job.org)) abgewickelt. Dieser ruft die **Supabase Edge Functions direkt** auf:

- `POST https://<project-ref>.supabase.co/functions/v1/<function-name>`
- Header: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

Details und curl-Beispiele: **docs/SALES_QUIZ_AUTOMATION.md**.
