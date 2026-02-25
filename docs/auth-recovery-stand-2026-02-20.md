# Auth / Recovery – Stand 20.02.2026 (Fortsetzung morgen)

Kurze Übersicht, was gemacht wurde und was als Nächstes ansteht. Damit du morgen ohne Informationsverlust weitermachen kannst.

---

## Was erledigt ist

### 1. Supabase Custom SMTP mit Resend

- Resend-Domain (sm-teamnotes.com) verifiziert (DKIM, SPF, MX in Vercel DNS).
- Supabase → Authentication → Email → SMTP Settings: Custom SMTP mit Resend (Host `smtp.resend.com`, Port 465, User `resend`, Password = Resend API Key, Sender z. B. `auth@sm-teamnotes.com`).
- Passwort-Reset-Mails kommen an (Gmail getestet); bei @sedanamedical.com werden sie vom Firmen-Mailserver gefiltert/quarantänt.

### 2. Recovery-Link landet auf Login statt „Neues Passwort setzen“

- **Ursache:** Supabase leitet auf **Site URL** (`/`) mit Hash weiter, nicht auf `/auth/callback`.
- **Lösung:** In `App.tsx` Redirect eingebaut: Wenn URL `/#...access_token=...&type=recovery` (oder `code=`), sofort nach `/auth/callback` + Hash umleiten.

### 3. AuthCallbackPage fehlte / „The operation was aborted“

- **AuthCallbackPage** (`app/src/pages/AuthCallbackPage.tsx`) angelegt: verarbeitet `?code=` (PKCE) und Hash-Flow.
- Callback-Route in `App.tsx` **zuerst** geprüft (vor authError/loading), damit keine Fehlermeldung beim Verarbeiten des Links kommt.
- Hash-Flow: statt `getSession()` (löst „aborted“ aus) jetzt **onAuthStateChange** + Fallback mit Timeout; Cleanup für Listener/Timeouts.

### 4. Nach Callback direkt in der App statt „Neues Passwort setzen“

- **Ursache:** Recovery-Flag (sessionStorage) wurde beim Redirect nicht zuverlässig gesetzt.
- **Lösung:** Callback leitet mit `?recovery=1` weiter; App liest diesen Parameter und setzt Recovery-Modus. Zusätzlich: Hash mit `type=recovery` auf `/` setzt Flag und räumt Hash aus der URL.

### 5. „Neues Passwort setzen“ – Timeout / Hängen

- Timeout von 15 s auf **30 s** erhöht.
- Fehlermeldung bei Timeout um Hinweis ergänzt: In Supabase **„Secure password change“** prüfen (Authentication → Providers → Email) und ggf. **deaktivieren**, da es den Recovery-Flow blockieren kann (User hat kein „aktuelles“ Passwort).

### 6. Weitere Doku/Dateien

- `docs/supabase-smtp-resend.md`: SMTP mit Resend, Troubleshooting, service_role, „Waiting for verification“, User-E-Mail per Skript ändern.
- `app/scripts/update-user-email.mjs`: Einmalig E-Mail eines Users per Admin-API ändern (z. B. für Vanessa mit privater Mail).

### 7. Noch nicht committed/gepusht (Stand Ende Session)

- **Polling 24 h:** `app/src/components/SidebarLayout.tsx` (POLL_INTERVAL) + ggf. `docs/SUPABASE_EGRESS_POLLING_VERLAUF.md` – waren in git status als „not staged“ / „untracked“.
- Die letzten Änderungen (Timeout 30 s, Hinweis „Secure password change“) in `App.tsx` – prüfen mit `git status`.

---

## Offen / Nächste Schritte (für morgen)

1. **Supabase „Secure password change“** prüfen und ggf. deaktivieren (Authentication → Providers → Email), dann Recovery erneut testen: neuer Link → „Neues Passwort setzen“ → Passwort eingeben → Speichern (sollte ohne Timeout durchgehen).
2. **Falls weiter Timeout:** Browser-Konsole (F12) beim Klick auf „Passwort speichern“ prüfen, ob eine konkrete Fehlermeldung von Supabase kommt.
3. **Polling-Commit:** Falls gewünscht, `SidebarLayout.tsx` + ggf. Egress-Doku committen und pushen.
4. **Optional:** Recovery-Flow einmal komplett durchtesten (Link → Passwort setzen → ausloggen → mit neuem Passwort einloggen).

---

## Prompt für morgen (Copy & Paste)

Du kannst Cursor morgen z. B. so starten:

```
Wir haben gestern am Auth-/Recovery-Flow für SM-TeamNotes gearbeitet. 
Lies bitte docs/auth-recovery-stand-2026-02-20.md – dort steht der Stand 
und die nächsten Schritte. Als Nächstes möchte ich [z. B.: Secure password change 
in Supabase prüfen und Recovery nochmal testen / die letzten Änderungen 
committen und pushen / …].
```

Oder kürzer:

```
Bitte docs/auth-recovery-stand-2026-02-20.md lesen und mir sagen, 
wo wir mit Auth/Recovery aufgehört haben und was als Nächstes ansteht.
```

Du musst keinen speziellen „magischen“ Prompt nennen – der Inhalt der .md reicht, damit der Kontext wiederhergestellt ist. Wenn du dazu sagst, was du als Nächstes tun willst (z. B. „Recovery nochmal testen“ oder „Rest committen“), kann direkt daran angeknüpft werden.