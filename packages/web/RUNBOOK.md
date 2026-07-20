# orch-web — runbook

Self-contained TanStack Start app (its own `package.json` + install), with a TCP
JSON-RPC boundary to orchd and an SSE event bridge.

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
renders from server data when the daemon exposes the required topology RPC. The web
server never reads `$ORCH_DIR`.

Deliberately NOT copied: domain routes/components/servers (vici, lms, wiw, google,
onboard, intake, print, sigs), domain hooks, `env.ts`, drizzle/db.

## 3. Daemon connection

The web server connects to orchd over TCP:

- `ORCH_DAEMON_HOST` — daemon host, default `127.0.0.1`.
- `ORCH_DAEMON_PORT` — daemon TCP port, default `3716`.

All RPC connection/refused/reset failures become `{ daemon: "down" }`; they never
escape a server function or kill Vite. `GET /api/events` bridges `subscribe-events`
to SSE, sends a comment heartbeat every 15 seconds, and reconnects with bounded
backoff. Browser reconnect is handled by native `EventSource`.

### Missing daemon RPC

The daemon currently exposes no presence/topology read RPC. `getFleet` returns
`{ daemon: "missing-rpc", rpc: "presence" }` rather than reading `$ORCH_DIR`.
Add that daemon RPC before wiring live fleet cards.

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
