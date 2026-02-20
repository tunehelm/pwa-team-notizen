# Verlauf: Supabase Egress, Polling, Auth Recovery

Dokumentation der Änderungen und Entscheidungen zu Egress-Limit, Polling-Intervall, Auth/Recovery und Pro/Free-Plan. Dient als Referenz für spätere Sessions und das Team.

---

## Aktueller Stand

- **Supabase-Plan: Pro** (250 GB Egress, 7 Tage Logs, tägliche Backups 7 Tage, kein Pausieren bei Inaktivität).
- **Polling:** 24 Stunden (manueller Refresh bei Bedarf).
- **Referenz im Projekt:** **docs/PROJECT_STATUS_2026-02-18.md** verweist auf dieses Dokument.

---

## 1. Ausgangslage (Stand ca. Feb 2026)

- **Supabase Free Plan (damals):** 5 GB Egress/Monat, 5 GB cached.
- **Projekt:** PWA Team-Notizen, ~14 User, Supabase (Auth, DB, ggf. Storage).
- **Problem:** „EXCEEDING USAGE LIMITS“ – Egress-Anzeige im Dashboard bei **45.248 GB** (massiv über 5 GB).
- **Folgen:** Auth-Instabilität („context canceled“, „config reloader is exiting“), Password-Recovery (z. B. Vanessa) schlägt teils fehl (otp_expired), Worker-Neustarts.

---

## 2. Egress-Ursache in der App

- **Hauptursache:** Automatisches **Polling alle 30 Sekunden** in `app/src/components/SidebarLayout.tsx` (POLL_INTERVAL = 30_000 ms).
- **Ablauf:** `refreshData()` → `loadFoldersAndNotes()` → für **jeden Ordner** `fetchNotes(folder.id)` mit **NOTE_COLUMNS inkl. `content`** (Volltext jeder Notiz).
- **Effekt:** Sehr viele Requests mit großen Payloads → hoher Egress. Bei 14 Usern und vielen Notizen schnell 45k+ GB.
- **Weitere relevante Stellen:** `app/src/lib/api.ts` (NOTE_COLUMNS, fetchNotes, fetchTrashNotes etc.), `app/src/state/AppDataContext.tsx` (loadFoldersAndNotes).

Details und Optionen (Listen ohne content, Trash on-demand) stehen in **docs/egress-analyse.md** (falls vorhanden).

---

## 3. Umgesetzte Änderungen

### 3.1 Polling auf 24 Stunden

- **Datei:** `app/src/components/SidebarLayout.tsx`
- **Änderung:** `POLL_INTERVAL` von **30_000** (30 Sekunden) auf **24 * 60 * 60 * 1000** (24 Stunden) gesetzt.
- **Kommentar:** „Auto-Polling alle 24 Stunden (manueller Refresh bei Bedarf)“.
- **Begründung:** Weniger automatische Refreshes → deutlich weniger Egress. Nutzer können bei Bedarf **manuell refreshen** (Pull-to-Refresh). Bei geringer Nutzungshäufigkeit reicht 24-h-Polling; Intervall kann später bei Bedarf wieder verkürzt werden (z. B. 1 h, 4 h).

### 3.2 Auth Recovery / Auth Callback (bereits zuvor umgesetzt)

- **Neue Seite:** `app/src/pages/AuthCallbackPage.tsx` – tauscht `?code=…` in Session um, behandelt Error-Hash (otp_expired) mit klarer Meldung.
- **App.tsx:** Route `/auth/callback` vor Session-Gate erreichbar; `redirectTo` für Passwort-Reset auf `/auth/callback`; Recovery-Flag via sessionStorage; `detectSessionInUrl: false` in `app/src/lib/supabase.ts`.
- **Dokumentation:** Anleitung für User (Vanessa) und Admin in **docs/auth-recovery-anleitung.md** (falls vorhanden).

---

## 4. Pro/Free-Plan und Wechsel

- **Free:** 5 GB Egress, ~1 Tag Logs, Projekte pausieren nach 1 Woche Inaktivität, max. 2 aktive Projekte.
- **Pro:** 250 GB Egress, 7 Tage Logs, tägliche Backups (7 Tage), kein Pausieren bei Inaktivität; ab 25 $/Monat.
- **Wechsel Pro → Free:** Möglich (Billing → Free Plan → „Change subscription plan“). Gilt sofort; nicht genutzte Zeit wird als Credits gutgeschrieben. Nach Wechsel gelten wieder Free-Limits (5 GB Egress etc.).
- **Empfehlung:** Für 14 User und Stabilität (Auth, Recovery) war Pro sinnvoll. Mit 24-h-Polling + manuellem Refresh kann der Egress so niedrig bleiben, dass ein späterer Wechsel zurück auf Free (mit 5 GB) je nach Nutzung möglich ist.

---

## 5. Typische Polling-Intervalle (Referenz)

- **30 Sekunden:** aggressiv, hoher Egress – oft nur bei echtem Echtzeit-Bedarf.
- **1–2 Minuten:** üblich für „fast live“ (z. B. Chat).
- **2–5 Minuten:** Standard für viele Team-/Notizen-Apps.
- **15–30 Minuten:** für weniger zeitkritische Daten.
- **Stunden / 24 h:** wenn „bei Bedarf manuell refreshen“ reicht (z. B. wenig genutzte interne Tools).

---

## 6. Nützliche Dateien (Übersicht)

| Datei | Inhalt |
|-------|--------|
| **docs/SUPABASE_EGRESS_POLLING_VERLAUF.md** | Dieser Verlauf (Egress, Polling, Pro/Free, Änderungen). |
| **docs/egress-analyse.md** | Detaillierte Egress-Analyse, Optionen A/B/C, Code-Stellen. |
| **docs/auth-recovery-anleitung.md** | Anleitung Passwort setzen/zurücksetzen für User + Admin; Supabase-Limits prüfen. |

---

*Zuletzt ergänzt: Pro-Plan aktiv; Referenz in PROJECT_STATUS; Verlauf dokumentiert.*
