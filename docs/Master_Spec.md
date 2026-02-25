# MASTER_SPEC.md

# Arbeitsvertrag für Claude Code & Codex

# Projekt: PWA Team-Notizen App

## 1. Zweck dieses Dokuments

Dieses Dokument ist die **oberste Arbeitsgrundlage** für Claude und Codex.

Es definiert:

- wie gearbeitet wird
- in welcher Reihenfolge
- was erlaubt ist
- was ausdrücklich verboten ist
- wann gestoppt und getestet wird

Dieses Dokument hat **höchste Priorität**.

---

## 2. Dokument-Hierarchie (Priorität)

Bei Widersprüchen gilt immer diese Reihenfolge:

1. MASTER_SPEC.md (dieses Dokument)
2. pwa-team-notizen-app.md (fachliche Anforderungen)
3. Kollaborative-PWA-Ideen-Projekte.md (technische Ausgestaltung)
4. Alle anderen Dateien, Chats, Ideen → ignorieren

---

## 3. Rollen: Claude vs. Codex

### Claude

Claude wird genutzt für:

- Architektur- und Strukturentscheidungen
- Klärung von Konzepten
- Bewertung von Alternativen
- Review und Erklärung

Claude schreibt **keinen umfangreichen Code**, außer ausdrücklich angefordert.

---

### Codex

Codex ist verantwortlich für:

- Erstellen und Ändern von Code
- Projekt-Setup
- Implementierung einzelner Features
- Fehlerbehebung
- kurze Zusammenfassung der Änderungen

Codex hält sich **strikt** an die Spezifikationen.

---

## 4. Tech-Stack (fix, nicht verhandelbar)

Frontend:

- Vite
- React
- TypeScript
- Tailwind CSS
- React Router

Backend / Services:

- Supabase (Auth, DB, Storage)
- Realtime optional (V1 ohne CRDT)

PWA:

- Vite PWA Plugin
- Service Worker
- Web App Manifest

⚠️ Kein Wechsel des Tech-Stacks ohne explizite Freigabe.

---

## 5. Arbeitsmodus

### Plan-Mode

- Wird genutzt für neue Phasen oder komplexe Features.
- Erst Plan, dann Umsetzung.

### Auto-Accept Mode

- Nur für klar abgegrenzte Aufgaben.
- Keine Architekturänderungen erlaubt.

---

## 6. Phasen- und Stopp-Regel (sehr wichtig)

- Arbeit erfolgt **phasweise**.
- Nach jeder Phase **STOP**.
- Kein neues Feature, bevor das vorherige geprüft wurde.

Nach jeder Phase MUSS geliefert werden:

1. Liste der geänderten Dateien
2. Befehl zum Starten der App im Browser
3. HTTPS-Vorschau für iPhone (z. B. Vercel Preview)
4. Kurze Testliste (3–6 Punkte)

---

## 7. Test- & Abnahmekriterien (Pflicht)

Ein Feature gilt nur als „fertig“, wenn:

- Browser-Test erfolgreich
- iPhone-PWA installierbar
- Offline-Funktion getestet (falls relevant)
- Keine UI-Elemente durch Tastatur verdeckt
- Keine Console Errors
- Anforderungen der Specs erfüllt

---

## 8. PWA-Pflichtanforderungen

### Manifest

- name / short_name
- Icons (192px, 512px)
- display: standalone
- start_url korrekt

### Service Worker

- App-Shell gecacht
- Offline-Fallback-Seite vorhanden
- Sinnvolle Cache-Strategie

### Qualität

- HTTPS überall
- Lighthouse PWA Audit erfolgreich
- Responsive Design
- Barrierefreiheit berücksichtigt

---

## 9. Was ausdrücklich NICHT getan wird (V1)

- Keine CRDT / echte Echtzeit-Kollaboration
- Keine @Mentions
- Keine Kommentar-Threads
- Keine neuen Libraries ohne Notwendigkeit
- Kein Feature außerhalb der Specs
- Kein Refactoring „aus Schönheitsgründen“

---

## 10. Änderungsregeln

- Änderungen an Specs nur nach expliziter Zustimmung
- Keine stillen Anpassungen
- Keine impliziten Annahmen

---

## 11. Zielzustand V1

- Stabil
- Offline nutzbar
- Klar verständlich
- Kollaborativ ohne Konflikt-Chaos
- Saubere Basis für spätere Erweiterungen

