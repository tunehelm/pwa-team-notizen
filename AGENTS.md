# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt
PWA Team-Notizen-App — https://sm-teamnotes.com
Stack: Vite + React + TypeScript + Tailwind + Supabase + vite-plugin-pwa
Working dir für Build: `app/`

## Wichtige Befehle

```bash
# Entwicklung
cd app && npm run dev          # Dev-Server auf :5173 (tötet Port automatisch)

# Build & Type-Check
cd app && npm run build        # tsc -b && vite build
cd app && npx tsc --noEmit     # Nur Type-Check ohne Build

# Lint
cd app && npm run lint

# Tests
cd app && npm run test                                        # Vitest einmalig
cd app && npm run test:watch                                  # Vitest im Watch-Modus
cd app && npx vitest run src/lib/iso/calculateIso.test.ts     # Einzelner Test

# Deployment
cd app && vercel --prod        # → sm-app (sm-app-sigma.vercel.app)
git push                       # → sm-teamnotes (GitHub Auto-Deploy) — BEIDE müssen grün sein
```

Nach jedem Deploy: Browser braucht **"Clear site data"** (DevTools → Application → Storage) um den Service Worker zu aktualisieren. Hard Reload (Cmd+Shift+R) reicht oft nicht.

## Architektur

### Domaintypen
- `src/data/mockData.ts` — **trotz Dateiname** die kanonischen Typen `FolderItem`, `NoteItem`, `AccessType`; enthält auch statische Fallback-Daten
- DB-Spalte `kind` → wird in `api.ts` auf `FolderItem.access: AccessType` gemappt

### Datenschicht
- `src/lib/api.ts` — alle Supabase-Operationen; mappt DB-Rows auf `FolderItem`/`NoteItem`
- `src/lib/storage.ts` — Bild-Upload zu Supabase Storage (Bucket: `note-media`, PUBLIC)
- `src/lib/localCache.ts` — IndexedDB-Cache via `idb-keyval`; offline-first: Cache sofort laden → Server fetchen; PendingChange-Queue für Offline-Saves (`addPendingChange/getPendingChanges/clearPendingChanges`); `isOnline()` für Connectivity-Check
- `src/lib/supabase.ts` — Supabase-Client-Instanz + `hasValidAuthConfig`
- `src/lib/sanitizeTable.ts` — HTML-Tabellen-Sanitizer für Editor-Input
- `src/lib/admin.ts` — Admin-spezifische Supabase-Operationen
- `src/lib/salesChallengeUtils.ts` — Hilfsfunktionen für Sales-Quiz/Challenge
- `src/lib/iso/calculateIso.ts` — Isofluran-MAC-Berechnungslogik (hat Unit-Tests)

### State
- `src/state/AppDataContext.tsx` — Haupt-Provider; hält `folders`, `notes`, `trash`, `lastRefreshAt`
- `src/state/appDataStore.ts` — Interface `AppDataContextValue` (Typdefinition des Contexts)
- `src/state/useAppData.ts` — Hook zum Konsumieren des Contexts
- `src/context/LayoutContext.tsx` — Layout-Actions für nested Components: `setSidebarOpen`, `onRefresh`, `isRefreshing`, `onSearch`

### Auth
- `src/hooks/useRequirePasswordSetup.ts` — Session-Initialisierung; liefert `{ loading, session, needsPasswordSetup }`
- `src/App.tsx` — Auth-Gate: `authError → loading → kein Session → Recovery → PasswordSetup → App`
- Recovery-Flow: URL-Parameter `?recovery=1` + Hash-Fragment

### Routes & Seiten
| Route | Seite | Beschreibung |
|---|---|---|
| `/` | `DashboardPage` | Pinned + Root-Ordner; Avatar via `ownerProps()` + `profileMap` |
| `/folder/:id` | `FolderPage` | Unterordner + Notizen eines Ordners |
| `/note/:id` | `NotePage` | Editor (contenteditable), Smart Blocks, Bild-Upload, Toolbar |
| `/team` | `TeamHubPage` | Team-Chat + Mitgliederliste |
| `/trash` | `TrashPage` | Papierkorb mit Restore/Delete |
| `/search` | `SearchPage` | Volltext-Suche über Notizen |
| `/private` | `PrivatePage` | Private Notizen (access = 'private') |
| `/sales-quiz` | `SalesQuizPage` | Sales-Challenge / Quiz |
| `/admin` | `AdminDashboardPage` | Admin-Übersicht |
| `/admin/sales-backlog` | `SalesBacklogPage` | Sales-Backlog-Verwaltung |
| `/admin/sales-stats` | `AdminSalesStatsPage` | Sales-Statistiken |
| `/auth/callback` | `AuthCallbackPage` | Supabase OAuth/Recovery-Redirect-Handler |

## Editor-Refs (NotePage.tsx — NoteEditor)
- `initAppliedForNoteIdRef` — verhindert doppelte Initialisierung pro Note
- `lastAppliedContentRef` — letzter in Editor geschriebener HTML-String (verhindert useEffect-Feedback-Loop)
- `lastRefreshAtAppliedRef` — zuletzt angewendeter Refresh-Timestamp (verhindert `applyServer()` nach jeder note.content-Änderung)
- `syncEditorContent()` — klont Editor, entfernt `.img-resize-handle/.img-delete-btn/.img-selected` vor innerHTML

## Draft-Logik
- Draft key: `pwa_notes_draft:{noteId}` in localStorage (Felder: `title`, `content`, `updatedAt`)
- Draft gewinnt nur wenn: `draft.updatedAt > serverUpdatedAt` UND `draft.updatedAt > lastRefreshAt`
- `lastRefreshAt` (AppDataContext) wird nach jedem `refreshData()` gesetzt — verhindert Uhrzeitabweichungs-Bug zwischen Geräten

## Sync / Race Condition
- `inProgressSavesRef` (Map<noteId, Promise>) trackt laufende API-Calls
- `refreshData()` wartet per `Promise.allSettled()` auf alle in-progress Saves bevor es fetcht
- `pendingContentRef` (Set) für noch nicht gefeuerte Debounce-Timer (450ms)

## Bild-Upload
- Bucket: `note-media` (PUBLIC) in Supabase Storage; Upload-Pfad: `{userId}/{timestamp}-{random}.{ext}`
- `savedRange` vor file-picker speichern, nach picker-close wiederherstellen → dann `execCommand('insertHTML')`
- Supabase anon key kann NICHT `listBuckets()` (immer leeres Array) — Bucket-Existenz via Dateioperationen testen

## Service Worker (vite.config.ts)
- Alle Supabase-Requests müssen `NetworkOnly` sein — für **alle** HTTP-Methoden (GET/POST/PUT/PATCH/DELETE) separat registrieren; Workbox matcht standardmäßig nur GET
- Regex `/supabase\.co/` statt Funktion verwenden — Funktionen werden beim SW-Build ggf. falsch serialisiert
- `navigateFallbackAllowlist` enthält alle SPA-Routen (`/`, `/folder/`, `/note/`, `/team`, `/trash`, `/search`, `/private`, `/sales`, `/admin`) — neue Routen hier eintragen
- `navigateFallbackDenylist: [/^\/auth/, /supabase/]` — Auth-Callbacks und Supabase-Requests nicht durch SW leiten
- `controllerchange`-Reload-Listener in `main.tsx` (via `registerSW`) — Seite lädt automatisch neu wenn neuer SW aktiv wird
- Bei SW-Problemen: DevTools → Application → Storage → "Clear site data" (nicht nur Hard Reload)

## Auth (useRequirePasswordSetup.ts)
- `getSession()` → App zeigt sofort; `getUser()` läuft im Hintergrund für frische `user_metadata`
- Timeout: `finishLoading(null)` (kein Error) → `onAuthStateChange` liefert Session wenn Token-Refresh fertig
- `password_set: true` in `user_metadata` = Passwort gesetzt (Recovery-Flow)

## Supabase DB
- `profiles`-Tabelle: `id, email, display_name` — muss für alle User befüllt sein damit Avatare korrekte Initialen zeigen
- `updateNote()` schreibt nie `owner_id` — Ersteller bleibt dauerhaft erhalten, auch wenn andere editieren
- `moveNoteToFolder()` schreibt nur `folder_id` — owner_id bleibt unverändert
- ARCHITECTURE.md ist verbindliche Quelle für Datenmodell, RLS-Policies, UX-Regeln

## Env-Variablen (app/.env.local)
```
VITE_SUPABASE_URL=       # Supabase-Projekt-URL
VITE_SUPABASE_ANON_KEY=  # Supabase anon/public key
VITE_DEBUG_AUTH=true     # Optional: Auth-Debug-Logs (nur Dev)
```
`hasValidAuthConfig` in `supabase.ts` prüft URL+Key — fehlen sie, zeigt die App direkt einen Fehler.

## Smart Calculator System
- Registry: `src/components/calculators/registry.ts` — `CalculatorType`, `CALCULATORS`
- Jeder Block: `data-smart-block="calculator"`, `data-calculator-type`, `data-config` (JSON), `data-version`
- `mountSmartBlocks(container)` nach Editor-Inhalt-Wechsel aufrufen
- Details: `docs/SMART_BLOCKS.md`
