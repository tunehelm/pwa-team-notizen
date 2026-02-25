# CODEX.md

This file provides project context to OpenAI Codex when working with code in this repository.

## Project

PWA Team-Notizen-App — https://sm-teamnotes.com
Stack: Vite + React + TypeScript + Tailwind + Supabase + vite-plugin-pwa
Working dir for builds: `app/`

## Commands

```bash
# Dev server
cd app && npm run dev          # starts on :5173

# Build & type-check
cd app && npm run build        # tsc -b && vite build
cd app && npx tsc --noEmit     # type-check only, no build

# Lint
cd app && npm run lint

# Tests
cd app && npm run test                                        # Vitest once
cd app && npm run test:watch                                  # Vitest watch mode
cd app && npx vitest run src/lib/iso/calculateIso.test.ts     # single test file

# Deploy
cd app && vercel --prod        # → sm-app (sm-app-sigma.vercel.app)
git push                       # → sm-teamnotes (GitHub auto-deploy) — BOTH must pass
```

After every deploy: browsers need **"Clear site data"** (DevTools → Application → Storage) to pick up the new service worker. Hard reload (Cmd+Shift+R) is often not enough.

## Architecture

### Domain types
- `src/data/mockData.ts` — despite the filename, this is the canonical home for `FolderItem`, `NoteItem`, `AccessType`; also holds static fallback data
- DB column `kind` → mapped to `FolderItem.access: AccessType` in `api.ts`

### Data layer
- `src/lib/api.ts` — all Supabase operations; maps DB rows to `FolderItem`/`NoteItem`
- `src/lib/storage.ts` — image upload to Supabase Storage (bucket: `note-media`, PUBLIC)
- `src/lib/localCache.ts` — IndexedDB cache via `idb-keyval`; offline-first: load cache immediately → fetch from server; PendingChange queue for offline saves (`addPendingChange/getPendingChanges/clearPendingChanges`); `isOnline()` for connectivity check
- `src/lib/supabase.ts` — Supabase client instance + `hasValidAuthConfig`
- `src/lib/sanitizeTable.ts` — HTML table sanitizer for editor input
- `src/lib/admin.ts` — admin-specific Supabase operations
- `src/lib/salesChallengeUtils.ts` — helpers for sales quiz/challenge
- `src/lib/iso/calculateIso.ts` — isoflurane MAC calculation logic (has unit tests)

### State
- `src/state/AppDataContext.tsx` — main provider; holds `folders`, `notes`, `trash`, `lastRefreshAt`
- `src/state/appDataStore.ts` — interface `AppDataContextValue` (context type definition)
- `src/state/useAppData.ts` — hook to consume the context
- `src/context/LayoutContext.tsx` — layout actions for nested components: `setSidebarOpen`, `onRefresh`, `isRefreshing`, `onSearch`

### Auth
- `src/hooks/useRequirePasswordSetup.ts` — session init; returns `{ loading, session, needsPasswordSetup }`
- `src/App.tsx` — auth gate: `authError → loading → no session → Recovery → PasswordSetup → App`
- Recovery flow: URL param `?recovery=1` + hash fragment

### Routes
| Route | Page | Description |
|---|---|---|
| `/` | `DashboardPage` | Pinned + root folders; avatar via `ownerProps()` + `profileMap` |
| `/folder/:id` | `FolderPage` | Sub-folders + notes of a folder |
| `/note/:id` | `NotePage` | Editor (contenteditable), Smart Blocks, image upload, toolbar |
| `/team` | `TeamHubPage` | Team chat + member list |
| `/trash` | `TrashPage` | Trash with restore/delete |
| `/search` | `SearchPage` | Full-text search across notes |
| `/private` | `PrivatePage` | Private notes (access = 'private') |
| `/sales-quiz` | `SalesQuizPage` | Sales challenge / quiz |
| `/admin` | `AdminDashboardPage` | Admin overview |
| `/admin/sales-backlog` | `SalesBacklogPage` | Sales backlog management |
| `/admin/sales-stats` | `AdminSalesStatsPage` | Sales statistics |
| `/auth/callback` | `AuthCallbackPage` | Supabase OAuth/recovery redirect handler |

## Editor refs (NotePage.tsx — NoteEditor)
- `initAppliedForNoteIdRef` — prevents double initialization per note
- `lastAppliedContentRef` — last HTML string written to the editor (prevents useEffect feedback loop)
- `lastRefreshAtAppliedRef` — last applied refresh timestamp (prevents `applyServer()` after every note.content change)
- `syncEditorContent()` — clones editor, strips `.img-resize-handle/.img-delete-btn/.img-selected` before reading innerHTML

## Draft logic
- Draft key: `pwa_notes_draft:{noteId}` in localStorage (fields: `title`, `content`, `updatedAt`)
- Draft wins only when: `draft.updatedAt > serverUpdatedAt` AND `draft.updatedAt > lastRefreshAt`
- `lastRefreshAt` (AppDataContext) is set after every `refreshData()` — prevents clock-skew bug across devices

## Sync / race conditions
- `inProgressSavesRef` (Map<noteId, Promise>) tracks in-flight API calls
- `refreshData()` waits via `Promise.allSettled()` for all in-progress saves before fetching
- `pendingContentRef` (Set) for debounce timers not yet fired (450 ms)

## Image upload
- Bucket: `note-media` (PUBLIC) in Supabase Storage; upload path: `{userId}/{timestamp}-{random}.{ext}`
- Save `savedRange` before opening file picker, restore after picker closes → then `execCommand('insertHTML')`
- Supabase anon key cannot `listBuckets()` (always returns empty array) — test bucket existence via file operations

## Service Worker (vite.config.ts)
- All Supabase requests must use `NetworkOnly` — register separately for **all** HTTP methods (GET/POST/PUT/PATCH/DELETE); Workbox only matches GET by default
- Use regex `/supabase\.co/` instead of a function — functions may be serialized incorrectly during SW build
- `navigateFallbackAllowlist` must include all SPA routes (`/`, `/folder/`, `/note/`, `/team`, `/trash`, `/search`, `/private`, `/sales`, `/admin`) — add new routes here
- `navigateFallbackDenylist: [/^\/auth/, /supabase/]` — do not route auth callbacks or Supabase requests through SW
- `controllerchange` reload listener in `main.tsx` (via `registerSW`) — page auto-reloads when new SW becomes active
- SW issues: DevTools → Application → Storage → "Clear site data" (not just hard reload)

## Auth detail (useRequirePasswordSetup.ts)
- `getSession()` → app renders immediately; `getUser()` runs in background for fresh `user_metadata`
- Timeout: `finishLoading(null)` (no error) → `onAuthStateChange` delivers session when token refresh completes
- `password_set: true` in `user_metadata` = password set (recovery flow)

## Supabase DB
- `profiles` table: `id, email, display_name` — must be populated for all users for avatars to show correct initials
- `updateNote()` never writes `owner_id` — creator is preserved permanently even when others edit
- `moveNoteToFolder()` only writes `folder_id` — owner_id stays unchanged
- `ARCHITECTURE.md` is the authoritative source for data model, RLS policies, and UX rules

## Environment variables (app/.env.local)
```
VITE_SUPABASE_URL=       # Supabase project URL
VITE_SUPABASE_ANON_KEY=  # Supabase anon/public key
VITE_DEBUG_AUTH=true     # Optional: auth debug logs (dev only)
```
`hasValidAuthConfig` in `supabase.ts` validates URL + key — if missing, the app shows an error immediately.

## Smart Calculator System
- Registry: `src/components/calculators/registry.ts` — `CalculatorType`, `CALCULATORS`
- Each block: `data-smart-block="calculator"`, `data-calculator-type`, `data-config` (JSON), `data-version`
- Call `mountSmartBlocks(container)` after editor content changes
- Details: `docs/SMART_BLOCKS.md`
