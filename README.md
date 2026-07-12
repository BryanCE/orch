# orch

Fleet orchestration control plane for [pi](https://github.com/earendil-works/pi) agents running in [herdr](https://herdr.dev) panes. One CLI to spawn, watch, steer, and reap a fleet of coding agents — plus the pi extensions that make every agent's state visible from the outside.

## What's in the box

| Piece | What it does |
|---|---|
| `bin/orch.ts` | The `orch` CLI — status, events stream, dispatch, steer, answer, pipe, spawn/tile/close panes, model switching, recovery |
| `bin/pif` | Headless pi dispatch under bun — fast startup with discovery off, control-plane extensions always loaded |
| `extensions/orchestrator-bridge.ts` | pi extension: presence dir (`~/.orch/agents/<pane>`), status.json heartbeat, inbox (steer/answer), result.json |
| `extensions/herdr-agent-state.ts` | pi extension: reports agent state to herdr so pane borders/status reflect working/idle/blocked |
| `skills/claude/` | Claude Code skills (`herdr`, `pi-agent`) that teach an orchestrating Claude how to drive the fleet |
| `agents/pi-dispatch.md` | Claude Code subagent definition for off-loading work to pi without polluting orchestrator context |

## Prerequisites

- [bun](https://bun.sh) — runs the CLI and pi
- [herdr](https://herdr.dev) — terminal agent multiplexer (panes/tabs)
- [pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) — the coding agent the fleet runs
- [Claude Code](https://claude.com/claude-code) — optional, as the orchestrator seat

## Install

As a global CLI:

```sh
bun add -g orch          # installs `orch` and `pif` bins
orch setup               # bootstraps extensions, skills, ~/.orch
```

Or as a pi package (extensions auto-load in every pi run — no setup needed for the pi side):

```jsonc
// ~/.pi/agent/settings.json
{ "packages": ["npm:orch"] }
```

From a repo clone:

```sh
git clone <this repo> ~/orch
~/orch/bin/orch.ts setup   # symlinks bins into ~/.local/bin, extensions into ~/.pi/agent/extensions
```

## `orch setup`

Idempotent guided bootstrap. It:

1. Checks for `bun`, `herdr`, `pi`, `claude` — and for each missing one, offers to run its
   installer right there (`--yes` auto-accepts all, `--no-install` just prints the commands)
2. Creates `~/.orch/agents` (presence dir)
3. Symlinks the two pi extensions into `~/.pi/agent/extensions/` so interactive pi loads them
4. Copies Claude Code skills into `~/.claude/skills/` and the `pi-dispatch` agent into `~/.claude/agents/`
5. Symlinks `orch` and `pif` into `~/.local/bin` if they're not already on PATH

Use `--copy` instead of symlinks (e.g. filesystems where symlinks are awkward).

## Quick start

```sh
orch spawn 4 --tab Team1            # 4 pi agents, tiled on a fresh tab, no focus stolen
orch status                          # glanceable table: state, cost, ctx, task
orch dispatch pi1 "fix the tests" --wait
orch events --status done,error &    # stream state transitions
orch close --all --stream            # reap ONLY panes orch created + kill the stream
```

`orch close --all` can never touch panes it didn't create — every spawned pane is recorded in `~/.orch/spawned.jsonl` and `--all` closes only from that registry.

## Layout

```
bin/orch.ts        the CLI (bun, plain TS, node built-ins only)
bin/pif            headless dispatch wrapper (bash)
extensions/        pi extensions (control plane)
skills/claude/     Claude Code skills for the orchestrator seat
agents/            Claude Code subagent definitions
```
