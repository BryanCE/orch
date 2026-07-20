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

## 2. What's in place (real app structure)

Primary nav is a **collapsible-to-icon sidebar** (the LMS sub-tool pattern promoted
to app chrome), NOT a header. Breadcrumbs are route-`staticData.crumbs`-driven.

```
packages/web/
  package.json / vite.config.ts / tsconfig.json / components.json   (base config)
  src/
    styles.css                      tailwind v4 @theme tokens (IBM Plex Mono, synthwave)
    router.tsx                      getRouter()
    routes/
      __root.tsx                    SidebarProvider shell: <AppSidebar/> + <SidebarInset>(crumbs + Outlet)
      index.tsx                     GOD-VIEW — workspace cards (NAME + herdr id badge, agent rollup, Σcost)
      ws/$slug.tsx                  workspace detail — Fleet/Activity/Overview tabs + agent focus panel
                                    (focus panel has steer/message boxes = first-class control scaffolding)
      events.tsx / queue.tsx        placeholder global views (sidebar targets)
    components/
      AppSidebar.tsx                primary collapsible sidebar: Cockpit group + Workspaces (by name)
      AgentCard.tsx                 live agent tile (state/model/cost/file/lastText/ctx)
      SubToolSidebar.tsx            per-section collapsible sidebar (copied — for later nested tools)
      PageBreadcrumbs.tsx           AppBreadcrumbs (staticData.crumbs) — copied
      ColorSchemeDialog.tsx         theme picker
      common/NotFoundPage.tsx       404
      ui/*                          47 shadcn components
    lib/
      mock-fleet.ts                 typed WORKSPACES data, shaped to orch PresenceStatus — swap for server fns
      utils.ts / color-scheme.ts / theme-mode.ts
    hooks/    use-mobile, use-fuzzy-filter, use-session-storage-state
    themes/   19 color schemes (import.meta.glob wired) + index/types
```

Workspace display: **name is the title, herdr id (`wD`) is a muted secondary** — real
data resolves the name from herdr's workspace list (the CLI does the same). Everything
renders off `src/lib/mock-fleet.ts` today; wiring = replace that module with server fns
reading `loadPresence()` + `subscribeEvents()` (see §3).

Deliberately NOT copied: domain routes/components/servers (vici, lms, wiw, google,
onboard, intake, print, sigs), domain hooks, `env.ts`, drizzle/db.

## 3. NEXT — wire to orch (do after the base boots)

The daemon (`orchd`) surface the UI binds to (already exists, no new HTTP API needed):
- **Reads** (topology): `import { loadPresence, spawnedRecords } from '<orch>/src/presence/store.ts'`,
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
   - `packages/core/`  ← `src/presence/store.ts`, `src/store/`, `src/entities.ts`, `src/policy/`, `src/backends/identity.ts`
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
