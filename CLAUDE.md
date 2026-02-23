# CLAUDE.md — PWA Team-Notizen

## Projekt
PWA Team-Notizen-App — https://sm-teamnotes.com
Stack: Vite + React + TypeScript + Tailwind + Supabase + vite-plugin-pwa
Working dir für Build: `app/`

## Deployment
- `vercel --prod` (aus `app/`) → Projekt `sm-app` → sm-app-sigma.vercel.app
- GitHub Push → Projekt `sm-teamnotes` (Auto-Deploy) — BEIDE müssen grün sein
- Nach Deploy: Shift+F5 (Hard Reload) nötig wegen Service Worker Cache

## Editor-Refs (NotePage.tsx — NoteEditor Komponente)
- `initAppliedForNoteIdRef` — verhindert doppelte Initialisierung pro Note
- `lastAppliedContentRef` — letzter in Editor geschriebener HTML-String (verhindert useEffect-Feedback-Loop)
- `lastRefreshAtAppliedRef` — zuletzt angewendeter Refresh-Timestamp (verhindert applyServer() nach jeder note.content-Änderung)
- `syncEditorContent()` — klont Editor, entfernt .img-resize-handle/.img-delete-btn/.img-selected vor innerHTML

## Draft-Logik
- Draft gewinnt nur wenn: `draft.updatedAt > serverUpdatedAt` UND `draft.updatedAt > lastRefreshAt`
- `lastRefreshAt` (AppDataContext) wird nach jedem refreshData() gesetzt — verhindert Uhrzeitabweichungs-Bug zwischen Geräten

## Sync / Race Condition
- `inProgressSavesRef` (Map<noteId, Promise>) trackt laufende API-Calls
- `refreshData()` wartet per `Promise.allSettled()` auf alle in-progress Saves bevor es fetcht
- `pendingContentRef` (Set) für noch nicht gefeuerte Debounce-Timer

## Bild-Upload
- Bucket: `note-media` (PUBLIC) in Supabase Storage
- Upload-Pfad: `{userId}/{timestamp}-{random}.{ext}`
- `savedRange` vor file-picker speichern, nach picker-close wiederherstellen → dann `execCommand('insertHTML')`
- Supabase anon key kann NICHT `listBuckets()` (immer leeres Array) — Bucket-Existenz via Dateioperationen testen

## Auth (useRequirePasswordSetup.ts)
- `getSession()` → App zeigt sofort; `getUser()` läuft im Hintergrund für frische user_metadata
- Timeout: `finishLoading(null)` (kein Error) → `onAuthStateChange` liefert Session wenn Token-Refresh fertig
- `password_set: true` in `user_metadata` = Passwort gesetzt (Recovery-Flow)

## ARCHITECTURE.md
Verbindliche Quelle für Datenmodell, RLS-Policies, UX-Regeln — immer erst dort nachsehen.
