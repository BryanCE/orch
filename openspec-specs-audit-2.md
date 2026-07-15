# OpenSpec specs audit — slice 2

Compared against source on disk. `STALE` means the spec asserts behavior the current implementation does not provide; `UNCLEAR` means the source/spec contract is incomplete or differs in a way that needs a product decision.

## live-reload
- MATCHES: `src/daemon/configwatch.ts` watches `config.toml` and `reload.signal`, debounces, keeps the process alive on invalid config, and reports warnings. `orch reload` refreshes panes and touches `reload.signal`. Bridge status records `extensionHash`; doctor detects stale extensions.
- STALE: The requirement frames `orch events` and `orch work` as independent long-running config watchers. Current write commands require orchd; events normally consumes the daemon stream, and work is delegated to orchd. This is an architecture mismatch, not a small doc fix.
- UNCLEAR: The invalid-edit scenario says “retries on the next change event,” while the implementation also retries after each debounced watcher event and polling/signaling behavior is not specified.

## notifications
- MATCHES: `src/notify.ts`, `src/daemon/events.ts`, and command event handling implement filtered sinks, canonical event fields, desktop/herdr/WSL fallback, webhook/command delivery, and isolated best-effort delivery. Doctor probes notification tiers and configured adapters.
- MATCHES: Sink errors are warned and isolated from event/work processing.
- UNCLEAR: The spec says `type` is required, while source accepts canonical `id` and legacy `type`; the compatibility rule should be stated explicitly.

## notifier-adapters
- MATCHES: `src/notify.ts` provides the registry, built-in `herdr`, `desktop`, `webhook`, and `command` adapters, metadata, availability probes, timeout isolation, canonical formatting, workspace provenance, and fan-out. `src/setup-notifiers.ts` and `src/doctor.ts` cover setup/validation.
- STALE: “The bridge, daemon event stream, and work loop SHALL emit canonical events to one event path” is not fully true: the bridge emits its own host notification path, while daemon/work use `emitAndNotify`; the CLI daemon stream consumes events separately. This needs architectural clarification.
- UNCLEAR: Setup persistence is represented as `id` in source, while the requirement says `id/type`; legacy `type` support exists in loading but setup does not appear to write both.

## orchd-daemon
- MATCHES: `src/daemon/orchd.ts`, lifecycle, RPC, config watch, presence watch, notification fan-out, and work loop implement daemon lifecycle, lock ownership, reload/re-exec, resident subsystems, localhost RPC, and daemon-optional read/write policy.
- STALE: The required RPC surface lists `fleet-status` and `enqueue`, but `src/daemon/orchd.ts` registers neither; only `daemon-status`, `subscribe-events`, writes, `ack`, and reload are registered. The CLI also has no matching calls for those methods.
- STALE: The socket-death scenario requires CLI fallback to direct file watching without losing subsequent transitions. Current `startPreferredEvents` calls `onFallback`, but `cmdEvents` uses `die(...)` for fallback, so it exits instead of switching to file watching.
- UNCLEAR: The spec says status reports subsystem health and JSON-capable output; daemon status is JSON internally, while human `orch daemon status` rendering/flags should be made explicit.

## remote-hosts
- MATCHES: `src/config.ts`, `src/remote.ts`, and command routing support `[hosts.<name>]`, `dest`/legacy `ssh`, optional `orch_dir`, BatchMode SSH, host-prefixed writes, parallel async multi-host reads, timeout handling, warning rows, and doctor SSH/version/ORCH_DIR checks.
- MATCHES: Remote command construction adds `--json` and works without a TTY; `--local` behavior is present in multi-host reads.
- UNCLEAR: Doctor checks remote/local version text but the source evidence does not show an explicit presence-protocol `schema` comparison. The requirement should name the actual schema field/check or this remains unverified.
- UNCLEAR: The spec names `queue add --host` as a target-taking command, but the implementation treats `--host` as a queue-specific option rather than the general `<host>/<target>` syntax; semantics are equivalent only for queue add.

## task-queue
- MATCHES: `src/queue.ts` and `src/store/sqlite.ts` persist queue state, support list/history/cancel, atomic queued-to-claimed updates, FIFO/adapter/workspace filtering, retries, and result/error recording.
- STALE: The CLI parser currently accepts only task text, `--worktree`, and `--json`; the requirement's `--agent`, `--model`, and `--cwd` enqueue options are not exposed by `orch queue add`.
- STALE: `runWorkLoop` awaits each assignment before considering the next idle agent, so multiple idle agents are not dispatched immediately in parallel as the scenario requires.
- STALE: Retry handling covers reported `error` and acknowledgement timeout, but does not clearly detect a claimed agent/process dying mid-run and requeue it. Queue history is a filtered view of mutable rows, not append-only outcome history as required.
- UNCLEAR: Legacy unscoped tasks are eligible in every workspace, which is a deliberate compatibility behavior in source but not stated by this spec.

## workspace-policy
- MATCHES: `src/policy/workspace.ts`, `src/entities.ts`, bridge tools, daemon write governance, config defaults, and `src/work.ts` implement shared identity/scoping, default `worker_peer_tools = false`, explicit cross-workspace write override, and origin-workspace queue selection.
- STALE: The requirement says cross-workspace writes require an override “permitted by configuration”; source permits `crossWorkspace` directly and has no separate configuration permission gate. This is a contract gap, not a minor wording issue.
- UNCLEAR: Unscoped/headless actors and legacy unscoped targets bypass the wall by policy. The spec scenarios only describe scoped workspaces and should document this exception.

## worktree-review
- MATCHES: `src/worktree.ts` and command handlers create `.orch-worktrees` branches, record worktree/branch metadata, list reviewable completed agents, approve with FF/merge fallback, abort conflicts safely, reject with feedback, and clean orphan worktrees conservatively.
- STALE: The review requirement says each finished agent is presented one at a time with task, result summary, diff, and approve/reject/skip. The source has interactive listing/review plumbing, but the exact one-at-a-time interactive flow and skip behavior are not evident in the inspected command implementation.
- UNCLEAR: The scenario's exact branch names (`orch/fixes-1..3`) are not guaranteed: source uses generated names such as `orch/<agent-name>` or `orch/queue-<uuid>`.
- UNCLEAR: The requirement says worktrees are created from the repository's current branch; source invokes `git worktree add -b` without an explicit start-point, relying on Git's current HEAD, which is likely correct but implicit.

## Files touched
- `openspec/specs/live-reload/spec.md` — FIXED stale TBD purpose; current code supports live reload.
- `openspec/specs/notifications/spec.md` — FIXED stale TBD purpose; current code supports configurable notifications.
- `openspec/specs/notifier-adapters/spec.md` — FIXED stale TBD purpose; current code has the adapter registry.
- `openspec/specs/orchd-daemon/spec.md` — AUDITED only; no safe minor edit because it contains major RPC/fallback drift.
- `openspec/specs/remote-hosts/spec.md` — FIXED stale TBD purpose; current code supports SSH federation.
- `openspec/specs/task-queue/spec.md` — FIXED stale TBD purpose; current code has the persistent queue, with noted feature drift.
- `openspec/specs/workspace-policy/spec.md` — FIXED stale TBD purpose; current code has shared workspace policy.
- `openspec/specs/worktree-review/spec.md` — FIXED stale TBD purpose; current code has worktree review plumbing.
- `openspec-specs-audit-2.md` — CREATED this audit report.
