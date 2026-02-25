---

name: Kollaborative PWA für Ideen & Projekte
overview: Plan für eine iOS-inspirierte, kollaborative PWA zur Ideen-, Projekt- und Wissenssammlung mit hierarchischer Ordnerstruktur, rollenbasierten Zugriffsrechten, Offline-first-Ansatz und kontrollierter Kollaboration (V1 ohne CRDT).
todos:

- id: setup
content: "Projekt-Setup: Vite + React + TypeScript + Tailwind CSS + PWA-Plugin initialisieren"
status: pending
- id: backend
content: "Supabase-Projekt erstellen: Auth, Datenbank-Schema, Storage, RLS Policies"
status: pending
- id: design-system
content: "Design System: Tailwind Config mit iOS-inspirierter Farbpalette, Typografie, Basis-Komponenten"
status: pending
- id: auth
content: "Auth-Flow: Einladung, Login mit Magic Link oder Passwort, geschützte Routen"
status: pending
- id: dashboard
content: "Dashboard: Fixierte Projekte, Ordner-Hierarchie, Hauptnavigation"
status: pending
- id: editor
content: "Projekt-/Notiz-Editor: Rich Text, Autosave, Bilder, Undo/Redo"
status: pending
- id: collaboration
content: "Kollaboration: gleichzeitige Bearbeitung, Live-Hinweise, Konfliktbehandlung"
status: pending
- id: pwa
content: "PWA-Features: Offline-Support, Service Worker, App-Icon, Splash Screen"
status: pending
isProject: false

---

# Kollaborative PWA für Ideen & Projekte

## Ziel der Anwendung

Die Anwendung ist eine **mobile-first, iOS-inspirierte PWA**, mit der ein Team gemeinsam:

- Ideen sammelt
- Projekte dokumentiert
- Wissen strukturiert ablegt

Der Fokus liegt auf:

- Klarer Struktur
- Einfacher Bedienung
- Kollaboration ohne Chaos
- Offline-Nutzung mit späterem Sync

---

## Festgelegter Tech-Stack

Frontend:

- Vite
- React
- TypeScript
- Tailwind CSS
- React Router

Backend / Services:

- Supabase
  - PostgreSQL
  - Auth (E-Mail / Magic Link / Passwort nach Einladung)
  - Storage (Bilder)
  - Realtime optional (V1 nicht zwingend live-typing)

PWA:

- Vite PWA Plugin
- Service Worker + Manifest

---

## Grundprinzipien

- Mobile-first (iPhone als Referenz)
- Offline-first (lokal speichern, später synchronisieren)
- Klare Rollen & Rechte
- Keine Feature-Explosion in V1
- Jede Funktion muss testbar sein (Browser + iPhone)

---

## Rollen und Zugriffsmodell

### Rollen

- **Admin**
  - Mitglieder einladen/entfernen
  - Rechte verwalten
  - Team-Einstellungen ändern
- **Editor**
  - Team-Inhalte bearbeiten (sofern nicht read-only)
  - Eigene private Inhalte
- **Viewer**
  - Inhalte lesen
  - Keine Bearbeitung

---

### Bereiche / Sichtbarkeit

- **Privat**
  - Nur für den Ersteller sichtbar
  - Nicht teilbar
- **Team**
  - Für alle Teammitglieder sichtbar
  - Standard: alle dürfen bearbeiten
- **Read-only**
  - Für alle sichtbar
  - Schreiben nur für Admin/Owner oder explizit freigegebene Editoren

---

### Ownership (Besitz)

- Jede Notiz / jedes Projekt hat einen Owner (Ersteller)
- Team-Inhalte bleiben im Team, auch wenn der Owner das Team verlässt
- Private Inhalte bleiben ausschließlich beim Nutzer

---

## Datenmodell (konzeptionell)

### Tabellen

**users**  

- id  
- email  
- name

**folders**  

- id  
- name  
- parent_id (NULL = Hauptordner)  
- type (`private` | `team` | `readonly`)  
- owner_id  
- created_at  
- updated_at

**projects**  

- id  
- folder_id  
- name  
- content (Rich Text / JSON)  
- owner_id  
- pinned (boolean)  
- created_at  
- updated_at

**project_collaborators**  

- project_id  
- user_id  
- role (`viewer` | `editor`)

**images**  

- id  
- project_id  
- url  
- uploaded_by  
- created_at

---

### Priorität der Rechte (wichtig)

- Grundrechte kommen immer aus dem Ordner-Typ
- `private` bleibt immer privat (nicht durch Collaborators aufhebbar)
- `readonly`: lesen für alle, schreiben nur für explizit freigegebene Nutzer
- Project-Collaborators können Rechte **erweitern**, aber keine Privatheit aufheben

---

## UI/UX – Grundstruktur

### Login / Auth

- Minimalistisch
- E-Mail eingeben
- Magic Link senden
- Kein offenes Registrieren

---

### Dashboard

- Header: Name, Avatar (Initialen), Logout
- Fixierte Projekte (horizontal scrollend, max. 4)
- Ordner-Hierarchie
- Feste Hauptordner in der Bottom-Navigation

---

### Ordner-Ansicht

- Breadcrumb-Navigation
- Trennung: Subordner / Projekte
- Badges für privat / read-only
- „+“-Button für neue Projekte oder Unterordner

---

### Projekt- / Notiz-Seite

- iOS-Notizen-ähnlicher Editor
- Freier Text
- Bilder einfügen
- Autosave
- Undo / Redo
- Anzeige:
  - Erstellt von
  - Zuletzt bearbeitet von

Auf dem iPhone:

- Wichtige Aktionen in der oberen Leiste
- Tastatur verdeckt keine Funktionen

---

## Kollaboration

### Version 1 (V1 – Start)

- Mehrere Nutzer können dieselbe Notiz gleichzeitig bearbeiten
- Kein buchstaben-live Co-Editing
- Autosave + regelmäßiger Abgleich
- Live-Hinweis:
  - „XY bearbeitet gerade…“

### Konfliktverhalten

- Server-Version ist Quelle der Wahrheit nach Sync
- Lokale Änderungen gehen nicht verloren
- Lokale Version wird sichtbar gehalten und kann manuell übernommen oder kopiert werden
- Hinweis:
  - „Diese Notiz wurde von [Name] aktualisiert“

---

### Version 2 (optional, später)

- Echte Echtzeit-Kollaboration
- CRDT (z. B. Yjs)
- Live-Cursor, konfliktfreies Tippen

---

## Offline-first & Sync

- Änderungen werden sofort lokal gespeichert
- Bei bestehender Verbindung:
  - Sync mit Supabase
- UI-Status:
  - Offline
  - Synchronisiere…
  - Synchronisiert

---

## Suche

- Globales Suchfeld
- Suche in:
  - Projekt-/Notiznamen
  - Inhalten
- Ergebnisse anklickbar

---

## Papierkorb

- Löschen immer mit Bestätigung
- Gelöschte Projekte/Ordner landen im Papierkorb
- Wiederherstellung möglich
- Automatische endgültige Löschung nach 7 Tagen
- Ordner-Restore stellt komplette Struktur wieder her

---

## Leere Zustände & Onboarding

- Leere Bereiche zeigen kurze Erklärung + nächste Aktion
- Onboarding beim ersten Start
- Onboarding später über Einstellungen abrufbar

---

## PWA-Funktionen

- Installierbar (Add to Home Screen)
- App-Icon & Splash Screen
- Offline nutzbar
- HTTPS erforderlich für volle Funktion

---

## Push & Badge (optional, abschaltbar)

- Push nur nach Opt-in
- Badge nur nach Opt-in
- In Einstellungen:
  - Push an/aus
  - Badge an/aus

Trigger (V1):

- Einladung
- Änderung in fixierten Projekten

---

## Export

- Export eigener Projekte/Notizen
- Formate:
  - PDF
  - Markdown

---

## Testbarkeit (Pflicht)

Nach jedem Feature:

1. Browser-Test (lokal)
2. iPhone-Test (PWA über HTTPS, z. B. Vercel Preview)
3. Kurze Testliste (3–6 Punkte)
4. Kein neues Feature, bevor der Test passt

---

## Abgrenzung (bewusst nicht in V1)

- Keine Kommentar-Threads
- Keine @Mentions
- Keine komplexe Rechte-Matrix
- Keine echte Echtzeit (CRDT)

---

## Zielzustand V1

- Stabil
- Verständlich
- Offline nutzbar
- Kollaborativ ohne Konflikt-Chaos
- Saubere Basis für spätere Erweiterungen

