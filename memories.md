
# orch — the one memory file (consolidated 2026-07-20 on Bryan's order; keep it ONE file)

## Hard rules (fireable)
- **Any runtime, both ways.** orch runs for any user on node, deno, OR bun. Runtime code = node-compatible ESM (`node:*` only; `bun:sqlite` only as guarded fallback); bun is a BUILD tool. Installed commands probe the user's runtime, never hardcode one. The rule also bans REMOVING bun support: `engines.bun` stays alongside `engines.node`; bun users are first-class.
- **SETTINGS_SCHEMA stays `1` until Bryan explicitly says bump** (trigger = publishing; nothing is published). Shape changes go on the one live schema, all writers/readers/tests fixed in the same change. Agents once bumped 1→2→3 and broke the installed CLI — every dispatch touching settings carries "DO NOT bump SETTINGS_SCHEMA"; grep it when reviewing agent output.
- **Never run gates myself** — no `bun test` (not even one file), `bun run check`, fallow, or builds, from WSL or PowerShell. WSL↔Windows FS makes them hang (~17 min once). Hand Bryan the command; never claim green unless he ran it.
- **Agents never test/check/build either** — dispatch prompts say "implementation only." One serialized verification pass after ALL agents report done (never mid-edit; later edits void the check). Genuinely needed targeted runs go through `orch lock run -- <cmd>`.
- **Subagents (Agent tool / Workflow) always pass `model` explicitly**: `sonnet` default, `opus` cap for hardest audit/verify. Omitting inherits fable = forbidden.

## Fleet operations
- **Routing ladder** (start `luna:medium`; `luna:low` if trivially mechanical): `luna:low → luna:medium → luna:high → luna:xhigh → sol:low → sol:medium → sol:high (HARD STOP)`. Escalate one rung per retry only when the task fights back; never start high; terra is benched. Repin after `orch new` (it can revert the pane's model).
- **Announce every dispatch in chat**: `**<agent> → \`<model:thinking>\`** — <task>`; flag escalations above `luna:medium` with the reason.
- **End of task batch**: `orch new` panes you'll reuse, `orch close` throwaways. Never leave dirty sessions.
- **One persistent `orch events` Monitor is the only wake channel** — never background-poll status.json/`orch status`, never per-fan-out watchers. Its cards are noise to Bryan (his feed is herdr toasts); don't narrate routine transitions. Verify "done" on disk — it's a claim.
- **Never dispatch an agent just to read a file** — Read it directly; agents are for separate-context work only.
- **Strict workspace walls**: an orchestrator touches ONLY its own workspace (events, status, messaging, work assignment). Toasts are the one crosser and carry workspace name + color. Enforced in product now (`src/policy/workspace.ts` + workspace-policy tests); still applies to my own conduct.
- **Notifications lead with the outcome token**: `DONE <agent>: …` / `ERROR …` / `BLOCKED …` — never mixed labels or "state changed".

## Product & architecture facts
- **Cockpit thesis**: orch = live VISIBLE cockpit — never invisible background work; multi-orchestrator each owning a fleet is first-class; webUI is an observability + steer surface, NOT a task board.
- **Installed CLI is a real global npm install** (`dist/bin/orch.js`, node shebang) — NOT live-from-source; repo edits need `bun run build:dev` (build + npm pack + install -g). Presence store `~/.orch/agents/`. "No agents reporting" usually = stale installed CLI → `orch doctor`. Config = `$ORCH_DIR/settings.json` (JSON — never TOML; a leftover config.toml is an error, CLAUDE.md Rule 9).
- **`orch setup` = interactive onboarding wizard** (pick harness + plexer from what adapters/backends actually support, recorded to settings.json); `-y --agent --backend` noninteractive path exists for automation. No default harness is baked in.
- **Web app** (`packages/web`, root workspace member, TanStack Start v1, dev port 3717, structure copied from workspace-onboarding): REAL-wired — server fns do real `rpcCall`, `loadPresence()`, herdr tab names; TanStack Query polling; `DaemonGate` down-screen. Pending: SSE push, steer/control wiring, real `/queue` + `/events` pages (placeholders). **SHIPS IN 0.1.0 — "if web ui comes out ever then it comes out on first release"; never propose deferring.** One npm package: `build:web` → `dist/web/`, served by `orch web`; React/vite stay build-time-only. UI: sidebar nav, workspace NAME as title (herdr id muted secondary).
- **Adapter-facade audit RESOLVED 2026-07-20**: `src/control/dispatch.ts` branches on `adapter.caps.*`; codex has a presence writer. Pattern stack in `docs/reference/design-patterns.md` (L0 Hexagonal → L6 static enforcement) stays authoritative; never land adapter/backend work without the L6 checks.

## Invariants landed by fix-audit-findings (archived 2026-07-20; gates green 523/0)
- **ONE identity key per agent, minted from the name-based handle BEFORE launch**, passed via `ORCH_AGENT_KEY`; registry/presence/ack all join on it; backend pane id / pid is a stored field, NEVER re-minted into a second key. `mintIdentity` is GONE from the backend port; headless `spawn` THROWS without a caller-minted key. Two keys was the root cause of the "can't control my fleet" dogfood disaster.
- **orch model strings carry a `:thinking` suffix** (`provider/id:effort`). Any registry lookup must strip the suffix first and apply model + thinking separately (extensions/pi/model-control.ts `splitThinkingSuffix`) — "Model not in registry" for a listed model = suffix leaked into the lookup.
- **Interactive/pane launches must carry `--model`** (pi/claude/codex `interactiveCmd` + pi restricted) — dropping it launches workers on the harness's saved default (the everyone-on-sol:high incident).
- **Workers launch with `--no-extensions` + orch's bridge only** — never the user's full extension set (SQLITE_BUSY with 4 workers).
- **check-bridge enforces**: no concrete backend/adapter imports in packages/*, `.steer/.answer/.setModel` only in dispatch.ts+adapters, no quoted-id equality/`?? "pi"` fallbacks in core, no parseSession under commands. Exemptions live in `CORE_SCOPE_ALLOWLIST` keyed by trimmed line content, each with a comment.

## Monorepo (bun workspaces)
- **Exactly ONE `bun.lock`, at the root.** NEVER `bun install` inside `packages/*` — that mints a second lockfile and forks resolution (caused version skews + `@types/node` vanishing). All installs from repo root.
- **Root `package.json` never carries web UI deps** (react/vite/tanstack live ONLY in packages/web) — they were once in orch's runtime `dependencies`, making every global install pull React. `@types/node` is explicitly pinned in root devDeps so it can't vanish transitively.

## Test conventions (bite hard)
- **`die()` in any code path a test invokes calls `process.exit` and KILLS the whole bun runner** — output truncates mid-file with no summary, remaining suites silently never run. Repeated "tests end at the same file with no summary" = a die, not a hang. Command tests must seed settings.json (`writeSettingsFixture`) because target resolution loads config and dies without it.
- **Cleanup is best-effort, never a verdict**: `test/helpers/removeTempDir` closes sqlite stores, hand-retries EBUSY ~10s (bun's rmSync IGNORES node's maxRetries/retryDelay — proven by identical timings), then leaks with a warning. Never raw `fs.rmSync` in afterEach. Tests that auto-start a daemon must wait for its pid to die before cleanup (review.test.ts `stopDaemon`).
- Real-process spawn tests: generous waitFor (~15s) + explicit bun timeout arg — a loaded Windows box runs 10-25× slower (oxlint 3s→46s observed) and tight deadlines flake.

## Code & environment
- **Frontend hard rules**: NO `useEffect` in hand-authored components, NO raw DOM/key listeners (use a hotkey lib), ONLY shadcn components from `packages/web/src/components/ui/`. Vendor-copied code using effects internally is fine.
- **Self-evident organization**: folders = kind + status (`current/`, `old/` with dates), names = content, applies to code too; renames sweep ALL references in the same change.
- **WSL timeouts**: repo on `/mnt/c`; tests spawning `bin/orch.ts` pay ~5-7s import cost — CLI-spawning tests need `}, 15_000)`, git-heavy `}, 30_000)`. Failure at exactly ~5s = missing timeout, not a code bug.
