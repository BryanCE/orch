# Design: make-orch-general-purpose

## Context

orch is ~2,200 lines of TypeScript on Bun (`bin/orch.ts`) plus two pi extensions. Its truth channel is the **presence protocol**: per-agent directories `~/.orch/agents/<key>/` containing `status.json` (heartbeat: state/model/cost/task/pid), `result.json` (final text of last settled run), `inbox.jsonl` (append a line to steer), and `question.json`/`answer.json` (blocking ask/answer). The `orchestrator-bridge.ts` pi extension writes this protocol from inside pi; the CLI reads it and shells out to `herdr` for pane control. `spawned.jsonl` records which panes orch created — the only panes `close --all` may reap.

Everything below generalizes this stack along four axes — which agent (adapters), where it runs (backends), how work arrives (queue), and which machine (remote hosts) — without breaking the existing pi+herdr flow.

## Goals / Non-Goals

**Goals:**
- Drive Claude Code and Codex CLI fleets, not just pi.
- Run fleets with no herdr installed (headless background processes) — the same mode a cloud host will use.
- Queue work (`orch queue add` / `orch work`) instead of only imperative pane-targeted dispatch.
- Make N agents in one repo safe (worktrees) and reviewable (`orch review`).
- Push blocked/done/error to the user (notification sinks) instead of polling.
- Make setup diagnosable (`orch doctor`) and configurable (`~/.orch/config.toml`).
- Control fleets on other machines over SSH, onboarded by doctor.
- **Stay orchd-ready**: every decision must keep a future per-host HTTP/WS daemon a thin adapter over the presence protocol.

**Non-Goals:**
- Building orchd, TLS/token auth, or any listening service (SSH is the only transport).
- Task DAGs / dependencies (queue is FIFO + retry only).
- `orch ui` web dashboard.
- Rewriting in Go/Rust — revisit only if a long-running multi-tenant daemon materializes; the file protocol keeps that door open.

## Decisions

### D1: Stay TypeScript on Bun
The workload is I/O-bound subprocess-and-JSON glue; the pi extensions (and Claude Code hook scripts) must be JS/TS anyway, so a compiled-language port would split the repo across two languages for zero observable performance gain. Distribution stays `npm i -g`; `bun build --compile` is the escape hatch if a no-runtime binary is ever needed. Alternatives considered: Go (better daemon concurrency — irrelevant until orchd; single small binary — not needed by an audience that already runs npm-installed agent CLIs), Rust (same, plus slowest iteration).

### D2: Split `bin/orch.ts` into `src/` modules with a single store boundary
`bin/orch.ts` becomes a thin arg-parser over `src/`: `store.ts` (ALL `~/.orch` reads/writes — presence, registry, queue, config), `entities.ts` (merge/resolve targets), `session.ts` (.jsonl parsing), `herdr.ts` (subprocess wrapper), `adapters/`, `backends/`, `queue.ts`, `review.ts`, `notify.ts`, `doctor.ts`, `remote.ts`, `table.ts`. **The orchd guarantee lives here**: nothing outside `store.ts` and `remote.ts` touches a filesystem path or a transport, so "local files" can later be swapped for "HTTP to orchd" per host without touching command logic.

### D3: The presence protocol is the universal agent contract (not per-agent readers)
Rather than teaching orch core to read N agents' native state, **each adapter's job is to make its agent speak the presence protocol**. Core stays agent-agnostic; `status.json` gains a `schema` bump (already versioned, currently 1) and an `agent` field. This is also the orchd wire contract: `status.json` ⇄ GET, `inbox.jsonl` append ⇄ POST, `answer.json` ⇄ POST — documented in the spec so the daemon is a translation layer, not a redesign.
- **pi**: `orchestrator-bridge.ts`, unchanged (already speaks it).
- **Claude Code**: a hooks shim — `orch setup` installs a hooks config (SessionStart/Stop/Notification/PreToolUse) whose scripts write `status.json`/`result.json` into the same presence dir. Steering: no inbox equivalent in interactive mode → degraded steer via pane send-keys (herdr backend) or `claude -p --resume <session>` (headless backend).
- **Codex CLI**: thinnest viable shim (notify hook + output/session parsing); needs a short spike (see Open Questions).

### D4: Adapter interface with declared capabilities, degraded modes explicit
```ts
interface AgentAdapter {
  id: "pi" | "claude" | "codex";
  interactiveCmd(opts: SpawnOpts): string;     // command for a pane
  headlessCmd(prompt: string, opts: SpawnOpts): string[]; // argv for headless backend
  caps: { steer: "inbox" | "keys" | "resume" | "none";
          ask: boolean; setModel: boolean; sessionTail: boolean };
  installShim?(): void;                        // e.g. Claude hooks config
}
```
Commands check `caps` and either fall back (steer via keys, with a warning) or fail fast with an actionable message (`orch model` on an adapter without `setModel` → exit 1). Selection: `--agent <id>` on spawn/tile/queue, `adapter` default in config; recorded per-entity in the spawn registry so resolution is automatic afterward.

### D5: Backend abstraction — `herdr` and `headless`
```ts
interface Backend {
  id: "herdr" | "headless";
  spawn(n, adapter, opts): Handle[];   // pane ids | pids
  close(handle): boolean;
  list(): Handle[];
  sendKeys?(handle, keys): boolean;    // herdr only
}
```
Headless backend generalizes today's `pif`: detached child processes running `adapter.headlessCmd`, presence protocol as the only observation channel (it already keys headless runs as `session-<pid>`). `spawned.jsonl` entries gain `{backend, handle, adapter, host?}`; the reap-only-what-we-recorded invariant is enforced in core `close --all` regardless of backend. Default backend: `herdr` when `HERDR_ENV=1` or herdr responds, else `headless`; overridable by flag/config. Tmux as a third backend is deliberately out of scope (the interface leaves room).

### D6: Queue as append-only event log + explicit runner
State in `~/.orch/queue/`: `queue.jsonl` (events: `add`, `claim`, `done`, `fail`, `retry`, `cancel`) with derived state computed by replay — same pattern as `spawned.jsonl`, human-inspectable, trivially synced later. `orch queue add "<task>"` enqueues; `orch work [--once]` is the runner: watches presence dirs for idle agents, claims via atomic `O_EXCL` claim-file per task id (two runners cannot double-assign), dispatches through the adapter, records outcome, retries failures up to `max_retries` (config, default 1). The runner is a plain foreground process today; under orchd it becomes a daemon loop — same code, different supervisor. No DAG.

### D7: Worktrees per agent + CLI review queue
`orch spawn --worktree` (or `worktree = true` in config): for a repo at `<repo>`, create `git worktree add <repo>/.orch-worktrees/<agent-name> -b orch/<agent-name>` (dir gitignored via doctor check). The spawn registry records worktree+branch. `orch review` lists agents whose state is `done` and whose worktree has commits ahead of base: for each, show summary + `git diff base...branch`, then **a**pprove (merge into base: ff if possible, else merge commit; then remove worktree+branch), **r**eject (prompt for feedback → re-dispatch to the same agent via inbox, keep worktree), **s**kip. Plumbing subcommands (`orch review list --json`, `approve <target>`, `reject <target> -m`) exist so the interactive mode is sugar, not the only path (orchd-readiness rule D9).

### D8: Notifications ride the existing transition detector
`notify.ts` reuses the `orch events` state-transition detection. Sinks from config, each `{on = ["blocked","error","done"], type}`:
- `desktop`: try in order — `herdr notification show` (when HERDR_ENV), `notify-send`, WSL bridge via `powershell.exe -Command New-BurntToastNotification`-free fallback (`wsl-notify-send` if present, else `powershell.exe` toast script we ship).
- `webhook`: POST JSON `{host, key, name, state, task, cost, ts}`.
- `command`: run argv with the same JSON on stdin.
Delivery is best-effort with per-sink error logging; a failing sink never blocks fleet operations. `orch events --notify` runs the stream with sinks attached; `orch work` attaches them automatically.

### D9: Config = TOML at `~/.orch/config.toml`; orchd-readiness output rules
Parsed with Bun's built-in TOML support (fallback: minimal vendored parser to keep zero deps). Precedence: CLI flags > env (`ORCH_*`) > config > built-ins. Sections: `[defaults]` (adapter, backend, model, spawn cap, worktree), `[queue]` (max_retries), `[[notify]]` sinks, `[hosts.<name>]` (reserved now, used by remote-hosts). Two standing output rules enforced from this change on: **every observe/control command supports `--json`**, and **no critical path may require a TTY** (interactive flows are wrappers over plumbing commands).

### D10: Remote hosts = SSH federation of whole orch stacks
`[hosts.gpu1] ssh = "bryan@gpu1"` declares a host that runs its own complete orch install. Target grammar gains an optional host prefix: `gpu1/w6:p3`, `gpu1/pi-2` (`/` chosen because keys already use `:`). `remote.ts` executes `ssh -o BatchMode=yes <dest> orch <cmd> --json` with a timeout and merges results (status/questions get a HOST column; local host renders as blank/`local`). Writes (steer/answer/dispatch/queue add) route the same way. Fan-out is parallel with per-host timeout so one dead host can't hang `orch status`. Version skew: remote `orch --version` checked by doctor; commands warn on protocol `schema` mismatch. Doctor owns onboarding: BatchMode reachability, remote orch present+version, remote `~/.orch` initialized — each failure with a copy-paste fix. This is the deliberate stepping stone to orchd: when orchd exists, `remote.ts` gains an `http` transport next to `ssh`, and nothing above it changes.

## Risks / Trade-offs

- [Claude/Codex steering is weaker than pi's inbox] → capabilities are declared, degraded modes are explicit and warned; headless backend uses `--resume` continuation which is reliable; docs state the fidelity ladder pi > claude > codex.
- [Codex CLI state signal unknown-quality] → time-boxed spike task before committing the adapter's mechanism; worst case ships `status.json` with coarse states (working/exited) which core already tolerates (`stateFallback` †).
- [Queue races: agent goes busy between idle-check and dispatch] → atomic claim file + post-dispatch verification (presence goes `working` within timeout, else unclaim and retry), mirroring `doRun`'s existing nudge-and-verify pattern.
- [Worktree merges conflict] → approve fails loudly, leaves worktree intact, offers `reject` path with conflict note; never auto-resolves.
- [WSL desktop notifications are flaky across setups] → three-tier fallback chain, `orch doctor` tests the chain end-to-end and reports which tier is live.
- [SSH fan-out latency on status] → parallel exec, 3s default per-host timeout, `--local` flag, and doctor warns about slow hosts.
- [Refactor (D2) regresses existing commands] → refactor lands first as a pure move with a smoke-test script (`orch status/panes/help --json` golden output) before any feature work.

## Migration Plan

Nothing breaks: default adapter `pi`, default backend `herdr`-when-present, config file optional, no host prefix = local. Each task in tasks.md leaves orch shippable. Rollback of any feature = don't use the new flag/config key.

## Open Questions

- **Codex CLI decision (spike 3.6, 2026-07-13): use Codex's `notify` completion hook as the primary event/result channel, with process/session fallbacks.** `codex-cli 0.143.0` is installed at `/home/bryan/.local/bin/codex`; its embedded config schema has a `notify` field and the binary contains `hooks/src/legacy_notify.rs`. The embedded notify payload names `agent-turn-complete`, `thread-id`, `turn-id`, `cwd`, `client`, `input-messages`, and `last-assistant-message`, giving a direct final-result value. This is stronger than parsing private transcript layout, while a wrapper alone cannot provide the assistant text reliably. Local hook support is also proven by `~/.codex/hooks.json` (a `SessionStart` command) and `~/.codex/config.toml`'s `[hooks.state]`; the stable hook feature is reported by `codex features list`.
  - **State contract:** notify marks a completed turn and supplies `last-assistant-message`. For headless runs, the wrapper/process supplies `working` while alive, `done` on exit 0 after a completion/result, and `error` on non-zero exit or signal. For interactive runs, a live process plus the latest notify/session tail is only an honest coarse `working`/`idle` distinction. `blocked` is reported only when a `PermissionRequest` hook event is observed; otherwise use `unknown`, never infer blocked from silence. Missing notify, stale hook output, and all process/session/pane-derived states carry `stateFallback` (`†`), meaning the state is heuristic rather than presence-authoritative.
  - **Steering:** Codex has no usable inbox; `codex features list` reports `steer` as removed. Use degraded resume: `codex exec resume <SESSION_ID> <PROMPT>` for headless and `codex resume <SESSION_ID> <PROMPT>` for continuation; in a live herdr pane, use send-keys only as a warned fallback. Declare `steer: "resume"`, `ask: false` until an answer protocol is proven, and `sessionTail: true`.
  - **Result extraction:** read `last-assistant-message` from notify first; then `codex exec`'s documented `--output-last-message <FILE>`; then tail the native JSONL transcript. `codex exec --json` emits JSONL for a wrapper to capture. Persisted transcripts were found under `/home/bryan/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`; `--ephemeral` explicitly disables them.
  - **3.7 first experiment:** in a disposable Codex config/home, register a logger as `notify`, `SessionStart`, `UserPromptSubmit`, and `PermissionRequest`; run one permitted `codex exec --json --output-last-message <tmp>/last.txt "Reply exactly OK"`, capturing notify stdin, JSONL stdout, exit code, and the newest `/sessions/.../rollout-*.jsonl`. Verify event ordering, `agent-turn-complete`, `last-assistant-message`, and behavior on an approval/error run. If this build accepts the embedded `Stop` hook schema, log it too; otherwise do not depend on it.
- Claude Code steering in herdr panes: send-keys composer timing may need the same Enter-nudge dance as pi — verify during adapter task.
- Review default merge mode (ff-preferred vs always-merge-commit) — start ff-preferred, revisit after real use.
