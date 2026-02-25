# Projekt Status – 18.02.2026

## Produktionsstatus
- Vercel Deployment: OK (main)
- Admin Dashboard: sichtbar
- Quiz Statistik: sichtbar
- Login funktioniert

## Supabase
- **Plan: Pro** (250 GB Egress, 7 Tage Logs, tägliche Backups)
- Neuer Secret Key erstellt
- Service Role Secret in Edge Functions gesetzt (Name: SERVICE_ROLE_KEY)
- verify_jwt = false für Cron-Functions
- Egress/Polling/Auth-Recovery: Verlauf und Änderungen → **docs/SUPABASE_EGRESS_POLLING_VERLAUF.md**

## Edge Functions Status
- sales-week-start: OK
- sales-freeze: OK
- sales-reveal: OK
- sales-archive-and-rollover: OK

## Service Worker
- Bypass for network deaktiviert
- Kein Cache-Problem mehr

## Nächste Schritte
- Cron Jobs weiter beobachten
- Reveal & Freeze am Freitag testen
