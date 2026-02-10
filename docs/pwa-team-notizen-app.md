---
name: PWA Team-Notizen App
overview: Vollständiger Plan für eine kollaborative, rollenbasierte PWA inkl. Offline-first, Suche, Ladezustände, Konflikte, Push/Badge (abschaltbar), Einladung, Profil/Einstellungen, Export, Barrierefreiheit, Themes, Fixierte Projekte, Lazy Loading, Papierkorb (1 Woche), Leere Zustände, Onboarding, Versionsverlauf, iPhone-Topbar (Tastatur verdeckt nichts), Vorschau nach jedem Schritt.
todos: []
isProject: false
---

# PWA Team-Notizen App – Gesamtplan (konsolidiert)

## Tech-Stack (festgelegt, damit nichts vermischt wird)

Frontend:
- Vite + React + TypeScript
- Tailwind CSS
- React Router

Backend/Services:
- Supabase (Auth, Postgres, Storage, optional Realtime)

PWA:
- Vite PWA Plugin (Manifest, Service Worker)

Ziel:
- Nach jedem neuen Element muss eine Vorschau möglich sein: Browser + iPhone (PWA über HTTPS)

---

## UI-Referenzbilder (Ihre Beispiele)

Die Bilder sind als Idee/Inspiration zu verstehen, nicht als exakte Vorgabe. Die App soll in dieser Art wirken: modern, ruhig, iOS-inspiriert, klar.

| Inhalt | Datei im Projekt |
| --- | --- |
| Dashboard | `assets/Dashboard-fda1a24b-77c8-4af8-aff7-131890ffc3af.png` |
| Unterordner-Ansicht | `assets/Unterordner-fa1ede92-4635-483d-be4d-ecaf681859dc.png` |
| Notiz-/Projektseite | `assets/Notizen-9265dfe5-789d-4861-8d95-70d35c732fb0.png` |
| Layout-Idee | `assets/Layout-Idee-c39b00a6-3ce4-4a58-915b-aaaddf2a7d66.png` |
| App-Icon | `assets/App-Icon-6a5fab32-1e44-4c85-a74b-dd0c2363fe53.png` |

Optional: Kopien in `design-reference/` mit kurzen Namen ablegen.

---

## Während der Erstellung: Speichern und Weiterarbeiten

- Projekt liegt in einem Ordner auf dem Rechner.
- Änderungen an Dateien sind sofort gespeichert.
- Weiterarbeiten: Ordner wieder in Cursor öffnen.

---

## Rollen, Rechte und Ownership (klar)

Rollen:
- Admin: Einladungen, Mitglieder verwalten, Rechte/Settings verwalten
- Editor: Team-Inhalte bearbeiten (wenn nicht read-only), private Inhalte
- Viewer: Lesen, keine Bearbeitung

Bereiche:
- Privat: nur der Nutzer sieht und bearbeitet
- Team: alle Teammitglieder sehen, Standard: alle dürfen bearbeiten
- Read-only: alle sehen, nur definierte Personen dürfen bearbeiten (z. B. Admin/Owner)

Ownership:
- Jede Notiz/Projekt hat einen Owner (Ersteller).
- Team-Inhalte bleiben im Team, auch wenn Owner das Team verlässt.
- Private Inhalte bleiben privat und werden nicht geteilt.

---

## Hinzufügen-Button „+“ und Benennung

- „+“-Button zentral sichtbar, kontextabhängig (Dashboard, Ordner, Notiz/Projekt).
- Neue Ordner/Notizen/Projekte müssen direkt benannt werden können.
- Keine anonymen Einträge.

---

## Editor: Schnellfunktionen

- Undo/Redo (Buttons + Cmd+Z / Cmd+Shift+Z)
- Copy/Paste, Alles auswählen
- Einfache Formatierung: Fett, Kursiv, Listen, Überschrift, Bild einfügen
- iPhone: wichtige Aktionen bleiben sichtbar, auch wenn Tastatur offen ist (Topbar/Header)

Nicht in V1:
- separate Kommentar-Threads
- @Mentions

---

## Offline-first + Sync

- Änderungen zuerst lokal speichern (IndexedDB).
- Sync sobald online (Supabase).
- UI Status: Offline / Sync läuft / Synchronisiert.

Konflikte (Standard):
- Server-Version ist Quelle der Wahrheit nach Sync.
- Lokale Änderungen gehen nicht verloren: als „lokale Version“ sichtbar halten (kopierbar/übernehmbar).
- Hinweisbanner: „Von [Name] aktualisiert. Aktualisieren?“ + Option lokale Änderungen anzeigen.

---

## Gleichzeitige Bearbeitung (beide arbeiten am selben Text)

V1 (robust, wenig Komplexität):
- Beide können gleichzeitig editieren.
- Abgleich über Autosave und regelmäßiges Nachladen.
- Bei Überschneidungen greift Konflikt-Handling (Server gewinnt, lokale Änderungen bleiben sichtbar).

V2 (optional später):
- echte Echtzeit mit CRDT (z. B. Yjs) und Live-Cursor.

---

## Suche

- Suchfeld oben, gut erreichbar.
- Standard: Titel + Inhalt.
- Treffer anklickbar, optional Filter (aktueller Ordner / nur Titel).

---

## Ladezustände und Fehlerbehandlung

- Skeleton/Spinner beim Laden.
- Fehler: kurze Meldung + „Erneut versuchen“.

---

## Push & Badge (abschaltbar)

- Push nur nach Zustimmung (Opt-in).
- Badge nur nach Zustimmung (Opt-in).
- In Settings abschaltbar:
  - Push an/aus
  - Badge an/aus
  - optional: nur Einladungen / nur Fixierte Projekte

Trigger (V1):
- Einladung
- Änderung in fixierten Projekten

Nicht:
- jede Kleinänderung am Text

---

## Einladung von Teammitgliedern

- Einladung per E-Mail, kein offenes Registrieren.
- Login via Magic Link oder Passwort nach Einladung.
- Nur eingeladene Nutzer erhalten Zugriff.

---

## Profil/Account und Einstellungen

- Profil: Anzeigename, optional Avatar, Abmelden.
- Einstellungen: Theme (Hell/Dunkel/System), Push/Badge toggles.

---

## Export und Limits

- Export eigener Notizen/Projekte als PDF oder Markdown.
- Bilder vor Upload komprimieren.
- Soft-Limit: Warnung bei sehr großen Bildern/Notizen.

---

## Papierkorb

- Löschen immer mit Bestätigung.
- Papierkorb: Restore möglich.
- Nach 1 Woche endgültig löschen (automatisch).
- Ordner löschen: Inhalt wandert mit in den Papierkorb, Restore stellt Struktur wieder her.

---

## Leere Zustände und Onboarding

- Leere Bereiche: kurze Hilfe + „+“ als nächster Schritt.
- Onboarding beim ersten Start und später in Settings abrufbar.

---

## Versionsverlauf

- „Änderungsverlauf“ im „…“-Menü.
- Versionen nicht pro Tastendruck, sondern z. B. bei Save / alle X Minuten / wichtige Aktionen.
- Einträge: Autor, Datum, optional Vorschau.

---

## Vorschau nach jedem Schritt (Pflicht)

Nach jedem Feature liefert Codex:
1) Liste der geänderten Dateien
2) Browser-Startbefehl (z. B. `npm run dev`)
3) iPhone-Testweg über HTTPS:
   - bevorzugt: Vercel Preview URL
   - alternativ: Tunnel URL (cloudflared/ngrok)
4) Mini-Testliste (3–6 Punkte) für dieses Feature

