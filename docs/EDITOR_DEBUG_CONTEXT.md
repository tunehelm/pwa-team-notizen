# Editor Debug Context

## Ziel
Markdown-Tabellen werden in unserer Team-Notizen-PWA aktuell nicht als Tabelle gerendert, sondern nur als Fließtext angezeigt.

## Tech-Kontext
- PWA mit Rich-Text-Editor
- Supabase angebunden
- Vercel Deployment
- Vite + TypeScript Frontend

## Problem
Folgende Markdown-Tabelle wird nicht korrekt dargestellt:

| kg | 3 | 6 | 12 |
|----|---|---|----|
| mg | 7.5 | 15 | 30 |

Statt Tabelle erscheint nur Text.

## Aufgabe für die Analyse
Bitte:

1. Prüfen, welchen Editor wir verwenden (z.B. TipTap, Markdown-it, etc.)
2. Prüfen, ob Tabellen-Support aktiviert ist
3. Falls nicht:
   - minimale Änderung implementieren
   - benötigte Extensions/Libraries hinzufügen
4. Betroffene Dateien auflisten
5. Kurze Begründung der Ursache

Ziel: Markdown-Tabellen sollen korrekt gerendert werden.
