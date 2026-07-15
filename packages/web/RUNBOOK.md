# orch-web — runbook

Self-contained TanStack Start app (its own `package.json` + install), structure
mirrored from `WebApps/workspace-onboarding`. **Not yet wired to orch** — this is
the base scaffold. Boot it first, then we tie in the daemon.

## 1. Install + run (you run these — I can't run bun/dev servers)

```bash
cd packages/web
bun install          # pulls react19 + tanstack start v1 + shadcn deps
bun run dev          # http://localhost:3717  (vite generates src/routeTree.gen.ts on first start)
```

- First `bun run dev` GENERATES `src/routeTree.gen.ts` — it's gitignored and does
  not exist until then, so don't run `bun run tc` before the first `dev`.
- If a dep version resolves oddly, `bun add <pkg>@latest` — versions here were
  pinned from the proven `workspace-onboarding` set.

## 2. What's in place (copied building blocks)

```
packages/web/
  package.json        trimmed base deps (dropped ssh2/google/mysql/drizzle/canvas/…)
  vite.config.ts      tanstackStart + react + tailwind v4 + nitro(bun) + tsconfig-paths
  tsconfig.json       @/* -> ./src/*   @shadcn/* -> ./src/components/ui/*
  components.json     shadcn new-york, neutral, css=src/styles.css
  src/
    styles.css        tailwind v4 entry + @theme tokens (IBM Plex Mono, synthwave)
    router.tsx        getRouter()
    routes/__root.tsx theme system + react-query + toaster + devtools + shell (domain providers stripped)
    routes/index.tsx  placeholder god-view (3 fake workspace cards)
    components/ui/*    47 shadcn components
    components/ColorSchemeDialog.tsx   theme picker (used by animated-theme-toggler)
    lib/               utils(cn), color-scheme, theme-mode
    hooks/             use-mobile, use-fuzzy-filter, use-session-storage-state
    themes/            20 color schemes (import.meta.glob wired)
```

Deliberately NOT copied: domain routes/components/servers (vici, lms, wiw, google,
onboard, intake, print, sigs), domain hooks, `env.ts`, drizzle/db.

## 3. NEXT — wire to orch (do after the base boots)

The daemon (`orchd`) surface the UI binds to (already exists, no new HTTP API needed):
- **Reads** (topology): `import { loadPresence, spawnedRecords } from '<orch>/src/store.ts'`,
  group by `workspaceOf(key)` then `owner`. Agent key grammar: `<backend>~<workspace>~<handle>`.
- **Live events**: `subscribeEvents(orchDir, {since}, onEvent)` from `src/daemon/rpc.ts`
  → re-emit as **SSE** from a server route (`src/routes/api/events.ts`, returns a
  `ReadableStream` of `text/event-stream`) → browser `EventSource` → TanStack DB collections.
- **Writes** (control, first-class): server fns calling `rpcCall(orchDir, 'dispatch'|'steer'|'set-model', params)`.
  Governance (workspace wall + ownership) is enforced daemon-side for free.

Route plan: `/` god-view → `/ws/$slug` workspace detail → `/ws/$slug/agent/$handle` focus panel.

**Runtime note (orch Rule 6):** orch's `src/` is node-safe. The SSE bridge/server fns
run under nitro(node) — keep any orch imports node-safe, no `Bun.*`.

## 4. LATER — monorepo extraction (the "move daemon and all that" step)

Right now `orch` is still one root package and `orch-web` is standalone. To make the
web app import orch code as a real workspace dep instead of deep relative paths:

1. **Root `package.json`** — add workspaces (root edit — do this manually):
   ```json
   "workspaces": ["packages/*"]
   ```
2. **Extract orch into packages** (sequenced so the CLI never breaks — do one at a time,
   run `bun test` after each):
   - `packages/core/`  ← `src/store.ts`, `src/store/`, `src/entities.ts`, `src/policy/`, `src/backends/identity.ts`
   - `packages/daemon/` ← `src/daemon/`, `src/notify.ts`, outbox
   - `packages/cli/`    ← `src/commands.ts`, `bin/orch.ts`, `bin/pif`
   - keep `extensions/` where the pi runtime expects it
   - each gets a `package.json` with `name` `@orch/core` etc. and `exports`
   - fix import paths (relative → `@orch/core`), update root `bin` map, `build:ext`/`build:bin`
3. **orch-web depends on them**: add `"@orch/core": "workspace:*"` etc.; swap the deep
   relative imports in the SSE bridge/server fns for the package names.
4. Verify: `bun test` (231/0) green, `orch status` still works, `bun run check` clean.

Until step 4, `orch-web` reaches orch code via relative import (`../../../src/...`) or a
vite alias — fine for local dev.
