# orch — Claude's one memory file (readable export)

Consolidated 2026-07-20 on Bryan's order: 22 fragment files → ONE memory (`orch-rules.md` in Claude's memory dir). This export mirrors it. Safe to delete; don't commit.

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

## Code & environment
- **Frontend hard rules**: NO `useEffect` in hand-authored components, NO raw DOM/key listeners (use a hotkey lib), ONLY shadcn components from `packages/web/src/components/ui/`. Vendor-copied code using effects internally is fine.
- **Self-evident organization**: folders = kind + status (`current/`, `old/` with dates), names = content, applies to code too; renames sweep ALL references in the same change.
- **WSL timeouts**: repo on `/mnt/c`; tests spawning `bin/orch.ts` pay ~5-7s import cost — CLI-spawning tests need `}, 15_000)`, git-heavy `}, 30_000)`. Failure at exactly ~5s = missing timeout, not a code bug.
