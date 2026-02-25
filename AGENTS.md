# AGENTS.md

This file provides shared project context for AI agents (Claude, Gemini, Codex, etc.) when working with code in this repository.

## Context Governance (Multi-AI)

- `AGENTS.md` ist die einzige synchronisierte Shared-Context-Datei.
- `CLAUDE.md`, `gemini.md`, `CODEX.md` sind bewusst unterschiedliche Rollen-Dateien.
- Rollen-Dateien niemals gegenseitig überschreiben oder identisch machen.
- Sync bedeutet nur: `AGENTS.md` aktualisieren.
- Bei Konflikt gilt: Fakten in `AGENTS.md` vor Rollen-Anweisungen.

## Projekt

PWA Team-Notizen-App — https://sm-teamnotes.com  
Stack: Vite + React + TypeScript + Tailwind + Supabase + vite-plugin-pwa  
Working dir für Build: `app/`

## Wichtige Befehle

```bash
# Entwicklung
cd app && npm run dev

# Build & Type-Check
cd app && npm run build
cd app && npx tsc --noEmit

# Lint
cd app && npm run lint

# Tests
cd app && npm run test
cd app && npm run test:watch
cd app && npx vitest run src/lib/iso/calculateIso.test.ts

# Deployment
cd app && vercel --prod
git push
```

Nach jedem Deploy: Browser braucht "Clear site data" (DevTools → Application → Storage), um den Service Worker zu aktualisieren.

## Architektur (Kurzüberblick)

### Domaintypen
`mockData.ts` enthält kanonische Typen `FolderItem`, `NoteItem`, `AccessType`. DB-Spalte `kind` wird in `api.ts` auf `FolderItem.access` gemappt.

### Datenschicht
- `api.ts` — Supabase-Operationen + Mapping
- `storage.ts` — Bild-Upload (note-media, PUBLIC)
- `localCache.ts` — IndexedDB Cache + Offline PendingChange Queue
- `supabase.ts` — Client + hasValidAuthConfig
- `sanitizeTable.ts`, `admin.ts`, `salesChallengeUtils.ts`, `src/lib/sales/weekKey.ts`
- `calculateIso.ts` — Isofluran-Logik (mit Unit-Tests)

### State
- `AppDataContext.tsx` — folders, notes, trash, lastRefreshAt
- `appDataStore.ts`, `useAppData.ts`
- `LayoutContext.tsx`

### Auth
- `useRequirePasswordSetup.ts`
- `App.tsx` Auth-Gate
- Recovery-Flow: `?recovery=1` + Hash-Fragment

### Seiten
`/`, `/folder/:id`, `/note/:id`, `/team`, `/trash`, `/search`, `/private`, `/sales-quiz`, `/admin`, `/admin/sales-backlog`, `/admin/sales-stats`, `/auth/callback`

## Kritische Implementierungsdetails

### Editor / Draft / Sync
- Editor-Refs in `NotePage.tsx`: `initAppliedForNoteIdRef`, `lastAppliedContentRef`, `lastRefreshAtAppliedRef`
- Draft key: `pwa_notes_draft:{noteId}`
- Draft gewinnt nur bei neuerem `updatedAt` vs. Server + `lastRefreshAt`
- `inProgressSavesRef` + `Promise.allSettled()` vor `refreshData()`
- `pendingContentRef` für Debounce-Timer

### Service Worker
- Supabase-Requests: NetworkOnly für GET/POST/PUT/PATCH/DELETE
- Regex `/supabase\.co/` verwenden
- `navigateFallbackAllowlist` aktuell halten
- `navigateFallbackDenylist: [/^\/auth/, /supabase/]`
- `controllerchange`-Reload in `main.tsx`

### Supabase DB
- `profiles(id, email, display_name)` muss vollständig sein
- `updateNote()` schreibt nie `owner_id`
- `moveNoteToFolder()` schreibt nur `folder_id`
- `ARCHITECTURE.md` ist verbindliche Quelle für Datenmodell/RLS/UX

### Env (app/.env.local)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_DEBUG_AUTH=true
```

## Smart Calculator System
- Registry: `src/components/calculators/registry.ts`
- Block-Attribute: `data-smart-block="calculator"`, `data-calculator-type`, `data-config`, `data-version`
- Nach Content-Wechsel: `mountSmartBlocks(container)`
- Details: `docs/SMART_BLOCKS.md`

## Agent-Rollen (Multi-AI)

| Datei | Agent | Rolle |
|---|---|---|
| `CLAUDE.md` | Claude | Deep Work: Planung, Architektur, Long-form Writing |
| `gemini.md` | Gemini | Research & Speed: schnelle Recherche, Iteration |
| `CODEX.md` | Codex | Analysis & Review: Qualitaetsbewertung, Strategie |

Spezialisierte Agenten (via `/agents` CLI): `session-closer`, `gemini-research`, `bug-fixer`, `code-reviewer`, `context-sync-agent`, `production-bug-hunter`, `senior-code-reviewer`

---

## Session-Log

### 2026-02-25 — Session-Ende
- **Erledigt**:
  - `weekKey.ts` (`src/lib/sales/weekKey.ts`) in `CLAUDE.md` und `AGENTS.md` nachgetragen (war in `gemini.md` bereits vorhanden)
  - `AGENTS.md`-Header korrigiert (war faelschlicherweise als `# CLAUDE.md` mit Claude-spezifischer Beschreibung betitelt)
  - Governance-Struktur fuer Multi-AI-Kontext etabliert: `AGENTS.md` = einzige Shared-Context-Datei; `CLAUDE.md`, `gemini.md`, `CODEX.md` = separate, bewusst unterschiedliche Rollen-Dateien
  - `gemini-research`-Agent aktualisiert, neuen `session-closer`-Agenten erstellt (via `/agents` CLI)
  - Formatierungsfehler in `AGENTS.md` behoben: Architektur-Abschnitt war versehentlich im bash-Codeblock eingeschlossen (fehlende schliessende Backticks)
  - Architektur-Abschnitt in `AGENTS.md` in lesbares Markdown mit Headings und Listen umstrukturiert
  - Agenten-Rollentabelle und Liste spezialisierter Agenten in `AGENTS.md` ergaenzt
- **Offen / Next Steps**:
  - Kein spezifischer naechster Schritt aus dieser Session; Projekt-Governance-Setup ist abgeschlossen
  - Bei neuen Routen: `navigateFallbackAllowlist` in `vite.config.ts` aktuell halten

## Session-Log

### 2026-02-25 — PWA Update-Flow stabilisiert (Storage-Clear reduziert)

Erledigt:
- Service-Worker-Update-Strategie auf kontrollierten Prompt-Flow umgestellt (`registerType: 'prompt'`).
- Update-UX ergänzt: Banner bei neuer Version + expliziter „Jetzt aktualisieren“-Flow.
- Einmalige Legacy-Workbox-Cache-Migration beim App-Start eingebaut (Bestandsgeräte stabilisieren).
- Offline-Sync robuster gemacht: Pending-Queue entfernt nur erfolgreich synchronisierte Einträge (Teilfehler bleiben für Retry erhalten).

Betroffene App-Dateien:
- `app/vite.config.ts`
- `app/src/main.tsx`
- `app/src/components/PwaUpdateBanner.tsx`
- `app/src/lib/pwaUpdater.ts`
- `app/src/lib/localCache.ts`
- `app/src/state/AppDataContext.tsx`

Validierung:
- `npm run build` erfolgreich.
- `npm run lint` weiterhin projektweit rot (bestehende Alt-Themen, nicht durch diesen Patch verursacht).

Nächste Schritte:
1. Realtest mit bereits installierten PWA-Clients (Desktop + iPhone).
2. Prüfen, dass Updates ohne manuelles „Clear site data“ durchlaufen.
3. Optional: SW-Update-Telemetrie + Chunk-Splitting als Follow-up.

