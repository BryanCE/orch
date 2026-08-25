# Design: agent-spawn-limits

## Context

`orch spawn` creates as many agents as asked, every time. Today several concurrent fleets (multiple orchestrators in one machine) exhausted CPU/RAM. Settings live in `$ORCH_DIR/settings.json` — one strict zod schema in `src/config.ts` stamped with `SETTINGS_SCHEMA` (currently 1), validated loudly on load, no legacy acceptance (CLAUDE.md Rule 8). Spawn flows live in `src/commands/spawn.ts` and each records the new agent via `recordSpawned` (three call sites: tab spawn, worktree root, single spawn). Live-agent truth is the established cross-reference: spawn registry (`spawned.jsonl`) ∩ live presence (`status.json` with a live pid) — the same join `orch close --all` uses.

## Goals / Non-Goals

**Goals:**
- One `limits` section in settings.json: global `maxAgents` plus per-workspace caps.
- Whole-request fail-fast at spawn time: a request that would exceed a limit spawns nothing.
- Actionable errors naming the limit, live count, requested count, and the settings key.
- Unset = unlimited; omission is the only "off" state.

**Non-Goals:**
- No reservations/quotas per workspace (a per-workspace entry is a cap, not a guaranteed share).
- No throttling, queueing, or wait-for-slot behavior — exceed means refuse.
- No enforcement on foreign (non-orch-spawned) panes; only orch-spawned agents count.
- No runtime kill of agents already over a newly lowered limit — limits gate future spawns only.

## Decisions

- **D1 — Shape.** `limits: { maxAgents?: number, workspaces?: Record<string, number> }`, all positive integers, `strictObject`. Per-workspace values are keyed by workspace id and are plain numbers (a cap needs no sub-object). Workspace ids are dynamic (herdr/tmux session ids), so keys are NOT validated against a closed set.
- **D2 — Cap semantics.** The global cap bounds the machine-wide total of live orch-spawned agents. A workspace cap bounds that workspace's total. Both are checked; the stricter one wins. With only a global cap set, one workspace may consume the full allotment by design. A workspace cap larger than the global cap is legal but unsatisfiable beyond the global — doctor surfaces it as a report-only warning.
- **D3 — Counting.** Live count = registry records whose presence shows a live pid, grouped by the identity `workspace` field (never parsed from key text — workspace-policy invariant). Counting is a pure function over (registry, presence) injected the same way the existing liveness checks are, so it is unit-testable without live agents.
- **D4 — Gate placement.** One shared guard `assertSpawnCapacity(settings, workspace, requested)` in the command layer, called before ANY pane/process is created in each spawn flow (tab spawn, worktree spawn, single spawn). Whole-request check: `live + requested > cap` refuses the entire request — no partial fleets.
- **D5 — Schema version stays 1.** `SETTINGS_SCHEMA` is NOT bumped. Pre-publish (0.1.0) there is exactly one live schema; the `limits` field is added to it and all writers/readers/tests fixed in the same change. There is no old data to migrate, so the stamp never increments (bumping it created a stale-binary mismatch — the installed CLI expected an older stamp — and was reverted).
- **D6 — Error text.** `spawn refused: would put <workspace> at <n>/<cap> agents (limits.workspaces.<id>)` and the global analog naming `limits.maxAgents`. Exit 1, nothing spawned.

## Risks / Trade-offs

- **TOCTOU between concurrent orchestrators**: two simultaneous spawns can each pass the check then exceed the cap. Accepted — the gate is a resource guard, not a mutex; the daemon-brokered spawn path can tighten this later without a schema change.
- **Stale presence inflates counts** (dead agents not yet reaped): a refused spawn may follow `orch clean`. The error message includes the live count so the state is visible; `orch clean` already exists as the remedy.
- **Adding a field to the live schema**: a settings.json written before the field simply omits it (optional, normalized to empty). No version bump, so no forced re-setup.
