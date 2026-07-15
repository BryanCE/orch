# Proposal: make-orch-general-purpose

## Why

orch today is an excellent remote control for one exact stack: pi agents, inside herdr panes, on Bryan's machine. Every hard-coded assumption (pi-only, herdr-required, imperative pane-targeted dispatch, shared working tree, poll-driven monitoring, hand-tuned setup) limits the audience to "people running pi in herdr" — a very small circle. Removing these assumptions, in an agreed priority order, turns orch from personal software into a general-purpose fleet orchestration tool. All six features were approved; this change specs them coherently because the earlier decisions (adapter contract) constrain the later ones (headless backend, task queue).

## What Changes

- **Agent adapters** — introduce an adapter interface (spawn command, state detection, steer/answer mechanism, result extraction) that decouples orch from pi. Ship three adapters: `pi` (current behavior, via orchestrator-bridge extension), `claude` (Claude Code CLI), and `codex` (Codex CLI). All target resolution, status, dispatch, and result commands become adapter-aware.
- **Headless backend** — make herdr optional. A backend abstraction (`herdr` | `headless`) lets the whole fleet run as plain background processes (extending the existing `pif` pattern), unlocking CI/server/cron use and removing the install-herdr-first adoption barrier. `orch spawn`, `close`, `status`, `events` work against either backend.
- **Task queue** — new `orch queue add "<task>"` / `orch work` semantics: pick an idle agent, queue when none, retry on error, record outcomes to a persistent history. Today's `orch dispatch <pane>` stays as the imperative escape hatch. DAG/dependency support is explicitly deferred.
- **Git worktree isolation + review flow** — spawn agents into per-agent git worktrees; `orch review` presents finished diffs as a queue to approve/merge or reject/re-dispatch. Makes N agents safe in one repository.
- **Notifications** — hook the existing state-transition stream (`orch events`) to pluggable sinks: desktop notification (with WSL bridge), webhook, and shell command. Blocked/done/error states find the user instead of the user polling.
- **`orch doctor` + config file** — diagnose common breakage (extension not symlinked, stale presence dirs, herdr version mismatch, missing bins) and add `~/.orch/config.toml` for defaults (adapter, backend, model, spawn count, notification sinks, hosts).
- **Remote hosts via SSH federation** — declare hosts in `config.toml`; target agents on other machines as `<host>/<target>`; `orch status` merges remote fleets; `orch doctor` onboards SSH connectivity (key, orch installed remotely, version match). Each remote machine runs the full local orch stack; the laptop federates over `ssh <host> orch … --json`.

**Standing design constraint — orchd-ready.** The long-term path is a small daemon (`orchd`) per agent host exposing the presence protocol over HTTP/WebSocket with auth. This change does NOT build it, but everything is built so orchd is a thin adapter later, not a rearchitecture: all `~/.orch` access behind one store module, the presence protocol versioned and documented as the wire contract, every observe/control command machine-readable (`--json`), no interactive-only critical paths.

No breaking changes: existing commands keep their behavior; pi + herdr remains the default adapter + backend.

**Non-goals / deferred** *(revised by operator order 2026-07-13: orchd-minimal pulled forward — see change add-orchd-minimal; resident-process behavior belongs in the daemon, not faked in one-shot CLIs)*: ~~building orchd itself~~, task DAGs/dependencies, `orch ui` web dashboard, multi-tenant auth, non-SSH transports.

## Capabilities

### New Capabilities

- `agent-adapters`: pluggable per-agent-CLI adapter contract (spawn, state detection, steer, answer, result extraction) with pi, claude, and codex implementations; adapter selection per pane/agent and via config.
- `fleet-backends`: backend abstraction for where agents live — herdr panes or headless background processes; spawn/close/observe lifecycle, and the `spawned.jsonl` safety invariant (orch only reaps what orch created) enforced across backends.
- `task-queue`: queued task dispatch — enqueue tasks, auto-assign to idle agents, retry on error, persistent task history and outcomes.
- `worktree-review`: per-agent git worktree isolation and a review queue for finished work — approve/merge, reject/re-dispatch, and worktree lifecycle cleanup.
- `notifications`: event-driven notification sinks (desktop, webhook, command) on state transitions, WSL-compatible.
- `doctor-config`: environment diagnostics (`orch doctor`) and a declarative config file (`~/.orch/config.toml`) for fleet defaults.
- `remote-hosts`: SSH-federated control of fleets on other machines — host declarations in config, `<host>/<target>` addressing, merged status, doctor-driven onboarding — with the presence protocol versioned as the future orchd wire contract.

### Modified Capabilities

<!-- none — openspec/specs/ is empty; this change introduces the first specs -->

## Impact

- **Code**: `bin/orch.ts` (all dispatch/status/spawn paths become adapter- and backend-aware; likely split into modules under `src/`), `bin/pif` (basis of the headless backend), `extensions/orchestrator-bridge.ts` (stays the pi adapter's state source), new adapter/backend/queue/review/notify/doctor modules.
- **State**: `~/.orch/` grows — `config.toml`, `queue/` (task queue + history), `worktrees/` metadata; existing `agents/<key>/` presence-dir and `spawned.jsonl` contracts are preserved and become the adapter-neutral protocol.
- **Dependencies**: none required beyond bun/node built-ins; TOML parsing via a tiny vendored parser or `Bun.TOML` if available. herdr moves from required to optional.
- **Compatibility**: Windows/WSL2 must work for headless backend and notifications. orch stays MIT — herdr interaction remains at the process boundary (CLI/socket), never vendored. Remote hosts require only OpenSSH + orch installed on the far side; no daemon, no open ports beyond SSH.
