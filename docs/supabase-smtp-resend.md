# Supabase Custom SMTP mit Resend

Anleitung: Was du in **Supabase → Authentication → Email → SMTP Settings** eintragen musst, wenn du Resend nutzt (z. B. bereits für „Nachrichten“ unter Team).

---

## 1. Resend vorbereiten

- **Domain prüfen:** In Resend muss die **Absender-Domain** verifiziert sein (z. B. `sm-teamnotes.com` oder `yourdomain.com`).  
  Resend Dashboard → **Domains** → Domain hinzufügen/verifizieren, falls noch nicht geschehen.
- **API-Key:** Resend Dashboard → **API Keys** → einen Key erstellen (oder einen bestehenden nutzen).  
  Diesen Key brauchst du als **SMTP-Passwort** in Supabase (siehe unten).

---

## 2. Felder in Supabase (SMTP Settings)

Gehe zu: **Supabase Dashboard → Authentication → Email → Tab „SMTP Settings“**.

### Sender (Absender)

| Feld | Was eintragen | Beispiel |
|------|----------------|----------|
| **Sender email address** | E-Mail-Adresse von deiner **in Resend verifizierten Domain**. Wird als Absender von Passwort-Reset-, Einladungs- und Magic-Link-Mails angezeigt. | `noreply@sm-teamnotes.com` oder `auth@sm-teamnotes.com` |
| **Sender name** | Name, der in der Inbox des Empfängers angezeigt wird. | `SM-TeamNotes` oder `Team Notizen` |

**Wichtig:** Die E-Mail-Adresse muss zu einer Domain gehören, die in Resend als verifiziert eingetragen ist. Sonst lehnt Resend den Versand ab oder die Mails landen im Spam.

---

### SMTP Provider Settings

| Feld | Was eintragen | Hinweis |
|------|----------------|---------|
| **Host** | `smtp.resend.com` | Resend-SMTP-Server (fest). |
| **Port number** | `465` | Empfohlen (SMTPS, verschlüsselt). Alternative: `587` (STARTTLS). |
| **Username** | `resend` | Resend verlangt immer genau diesen Benutzernamen (Kleinbuchstaben). |
| **Password** | Dein **Resend API Key** | Aus Resend Dashboard → API Keys. Nicht dein Resend-Login-Passwort, sondern der generierte API Key (z. B. `re_...`). Nach dem Speichern wird er in Supabase nicht mehr angezeigt – sicher aufbewahren. |

**Minimum interval per user:** Kann z. B. auf `60` (Sekunden) bleiben – verhindert, dass derselbe User in kurzer Zeit zu viele Mails bekommt.

---

## 3. Kurz-Checkliste

1. **Resend:** Domain verifiziert, API Key erstellt (und kopiert).
2. **Supabase SMTP Settings:**
   - Sender email: `noreply@deine-verifizierte-domain.com` (oder ähnlich).
   - Sender name: z. B. `SM-TeamNotes`.
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: Resend API Key (z. B. `re_...`) einfügen.
3. **„Enable custom SMTP“** aktivieren (Toggle an).
4. **„Save changes“** klicken.

---

## 4. Resend und „Nachrichten“ in der App

Du nutzt Resend bereits für **Nachrichten** (Feedback unter Team). Das läuft vermutlich über die **Resend API** (z. B. Edge Function oder Backend).  

Die **Supabase SMTP**-Einstellung betrifft nur die **Auth-Mails** (Passwort vergessen, Einladung, Magic Link usw.), die Supabase selbst verschickt. Beides kann parallel laufen:

- **Supabase Custom SMTP (Resend):** Auth-Mails (Passwort-Reset, Invite, …).
- **App „Nachrichten“:** weiterhin über deine bestehende Resend-Integration (API).

Du kannst denselben Resend-Account und denselben API Key für Supabase SMTP verwenden. Wenn du einen separaten Key nur für Auth-Mails willst, kannst du in Resend einen zweiten API Key anlegen und nur diesen in Supabase eintragen.

---

## 5. Nach dem Speichern

- Einmal **Passwort vergessen** testen (E-Mail eingeben, Link anfordern) und prüfen, ob die Mail ankommt und der Absender stimmt.
- Falls die Mail nicht ankommt: Resend Dashboard → **Emails** prüfen (Fehler/Status); Supabase **Auth Logs** prüfen (ob „sent“ oder Fehler).

---

## 6. Troubleshooting: Mail kommt nicht an

Wenn „Send password recovery“ geklickt wird, die Mail aber weder in Inbox noch in Spam ankommt:

### A. Resend prüfen (wichtigste Stelle)

- **Resend Dashboard → Emails** (oder **Logs**): Siehst du dort einen Eintrag für die Passwort-Reset-Mail (Empfänger, Zeitstempel)?
  - **Ja, Status „Delivered“:** Mail wurde zugestellt – dann blockiert oder filtert der **Empfänger-Mailserver** (z. B. Firmen-Mail). Teste mit einer anderen Adresse (z. B. Gmail).
  - **Ja, Status „Bounced“ / Fehler:** Empfänger-Adresse oder Domain problematisch; oder Absender-Domain nicht korrekt.
  - **Nein, kein Eintrag:** Supabase schickt die Mail **nicht** an Resend → weiter mit B.

### B. Supabase prüfen

- **Supabase → Authentication → Logs:** Nach „Send password recovery“ einen Eintrag suchen. Steht dort ein Fehler (z. B. SMTP error, authentication failed)?
- **Supabase → Authentication → Email → SMTP Settings:**
  - Ist **„Enable custom SMTP“** aktiviert (Toggle an)?
  - **Sender email address** = Adresse von deiner **in Resend verifizierten** Domain (z. B. `noreply@sm-teamnotes.com`)? Keine andere Domain.
  - Host `smtp.resend.com`, Port `465`, Username `resend`, Password = Resend API Key („Sending access“ reicht).
  - Nach Änderungen **„Save changes“** geklickt?

### C. service_role Key gedreht – betrifft das Auth-Mails?

**Nein.** Die Passwort-Reset-Mails werden von **Supabase Auth** (Supabase-Backend) mit deiner SMTP-Konfiguration (Resend) verschickt. Dafür wird **nicht** der Projekt-API-Key (anon/service_role) deines Projekts genutzt. Ein Rotieren des **service_role** Keys (z. B. weil er versehentlich im Chat stand) hat **keinen Einfluss** auf den E-Mail-Versand.  
**Hinweis:** Den service_role Key niemals im Frontend oder in Chats verwenden; nur serverseitig und als Secret. Nach einem Leak: Key in Supabase Dashboard rotieren und in allen Secrets (z. B. Vercel, Cron-Jobs) aktualisieren – siehe z. B. `docs/sales-swipe-cron.md`.

### D. Resend zeigt „Delivered“, Mail ist aber nicht im Postfach

„Delivered“ bedeutet: Der **Empfänger-Mailserver** (z. B. Microsoft Outlook/365 für `@sedanamedical.com`) hat die Mail angenommen (SMTP 250). Wenn sie trotzdem nicht in Inbox/Spam liegt:

- **Firmen-Postfach:** Oft filtert oder quarantänt der **Organisations-Mailserver** Mails von unbekannten Absendern, ohne sie in „Spam“ zu legen. In Outlook/365: **Quarantäne** prüfen (Admin-Quarantäne oder „Junk-E-Mail“ / Sicherheitsbereich im Admin-Center). Alternativ: IT fragen, ob Mails von `noreply@sm-teamnotes.com` oder mit Links zu `supabase.co` geblockt oder zurückgehalten werden.
- **Test mit privater Adresse:** E-Mail des Users temporär auf eine **Gmail-Adresse** stellen (oder zweiten Test-User mit Gmail anlegen) und „Send password recovery“ erneut auslösen. Kommt die Mail bei Gmail an, funktioniert Supabase + Resend; das Problem liegt dann beim Firmen-Mailserver.
- **Resend Insights:** Hinweise wie „Link URLs match sending domain“ (Reset-Link geht auf supabase.co), „No DMARC record“, „no-reply“ können bei strengen Filtern die Zustellung erschweren. Für bessere Zustellung bei Firmen: optional DMARC-Eintrag in Resend anlegen; der Reset-Link bleibt aus technischen Gründen erstmal auf Supabase – das ist normal und führt bei vielen Anbietern trotzdem zur Inbox.

### E. Andere Empfänger-Adresse testen

- Firmen-Adressen (z. B. `@sedanamedical.com`) können Mails von externen Diensten blockieren oder in interne Ordner/Quarantäne leiten. **Test mit einer privaten Adresse** (z. B. Gmail) – kommt die Mail dort an?

### F. User-E-Mail im Dashboard nicht editierbar – Skript nutzen

Im Supabase-Dashboard gibt es bei **Authentication → Users** oft keine direkte „E-Mail bearbeiten“-Option. Stattdessen kannst du die E-Mail eines Users per **Admin-API** ändern – einmalig mit dem Skript:

1. **User-ID (UID)** besorgen: Supabase Dashboard → **Authentication** → **Users** → gewünschten User anklicken → in der rechten Spalte bzw. in den Details die **UID** (lange UUID) kopieren.
2. **Skript ausführen** (im Terminal, aus dem `app/`-Ordner, **niemals** service_role Key committen oder teilen):

   ```bash
   cd app
   SUPABASE_URL="https://DEINE_PROJECT_REF.supabase.co" \
   SUPABASE_SERVICE_ROLE_KEY="dein_service_role_key" \
   node scripts/update-user-email.mjs "<USER_UID>" "neue@email.com"
   ```

   Beispiel für Vanessa (UID aus Dashboard, neue private E-Mail):

   ```bash
   SUPABASE_URL="https://xxx.supabase.co" SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
   node scripts/update-user-email.mjs "abc123-uuid-von-vanessa" "vanessa.privat@gmail.com"
   ```

3. Danach meldet sich der User mit der **neuen** E-Mail und seinem bestehenden Passwort an; Passwort-Reset-Links gehen an die neue Adresse.

### G. „Neues Passwort setzen“ hängt / User „Waiting for verification“

Wenn der Nutzer den Reset-Link aus der E-Mail öffnet, ein neues Passwort eingibt und auf „Passwort speichern“ klickt, aber nichts passiert (keine Fehlermeldung, kein Weiterkommen):

- **Ursache oft:** In Supabase steht der User unter **Authentication → Users** auf **„Waiting for verification“** (E-Mail nicht bestätigt). Dann kann `updateUser({ password })` blockieren oder fehlschlagen, ohne dass die App eine klare Meldung anzeigte.
- **Lösung:** In Supabase Dashboard → **Authentication** → **Users** → betroffenen User öffnen → **E-Mail bestätigen** (z. B. „Confirm email“ / E-Mail als verifiziert markieren). Danach erneut „Passwort vergessen“ auslösen und den neuen Link nutzen, oder direkt auf der „Neues Passwort setzen“-Seite nochmal speichern.
- Die App zeigt jetzt nach einem Timeout (15 s) eine Fehlermeldung und bei API-Fehlern den genauen Text inkl. Hinweis auf „Waiting for verification“.
