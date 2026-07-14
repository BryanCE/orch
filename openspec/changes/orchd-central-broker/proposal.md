## Why

orch grew up daemonless: the CLI writes agent state to files and dispatches straight to herdr, and the daemon (orchd) was bolted on later to *watch* and *auto-assign* — it sits beside the write path, not on it. The result is an ungoverned control plane: any orch caller can dispatch, steer, or model any agent it can name, the queue work-loop pulls agents across workspaces, and every `orch events` arms its own file-watcher (which degrades to CPU-burning polling on WSL `/mnt`). We need the daemon to become the single broker every write flows through, so ownership and workspace walls are enforceable in one place and live steering is push-based instead of poll-based.

## What Changes

- **Route all writes through the daemon.** `dispatch`, `run`, `steer`, `model`, and `work` become RPC calls to orchd over its socket; the broker enforces agent **ownership** and **workspace walls** before executing via a Backend. The direct CLI→herdr write path is removed. **BREAKING**: writes require a running daemon.
- **Socket-first live transport.** Clients connect once to `orchd.sock` and the daemon **pushes** events; per-CLI file-watchers/pollers are retired. Reads (`status`, `events`) prefer the socket and fall back to file-watch when the daemon is absent.
- **Split the daemon-optional guarantee.** Amend the orchd-daemon spec: **reads** stay daemon-optional (file fallback, correctness preserved); **writes** require the broker and **refuse** when it is down (no silent direct-path bypass).
- **Durable, at-least-once messaging.** Steers/dispatches and queued tasks are persisted before send, acked by the agent, and retried on failure so nothing is lost across a daemon restart. Clients track a sequence number and the daemon **replays** missed transitions on reconnect.
- **Durable store via `bun:sqlite`** (built-in, no new runtime dep) for queue, ownership registry, inbox/outbox, and spawn registry — concurrent (WAL), queryable, crash-safe. **jsonl stays** as the durable, human-visible log + replay source per the existing presence-file contract.
- **Workspace-scoped work-loop.** Queued tasks carry an origin workspace; the loop only assigns within it — no more cross-workspace pulls.
- **Transport-agnostic protocol.** RPC semantics assume no unix-socket specifics, so the same call sites can later carry over TCP/TLS or an SSH tunnel for cross-machine steering (laptop → VPS). See `orch-architecture-current.md` and `orch-architecture-target.md`.

## Capabilities

### New Capabilities
- `dispatch-broker`: the daemon mediates every write (dispatch/steer/model/work), owns the RPC surface on the socket, and executes against Backends only after governance checks pass.
- `dispatch-governance`: agent-ownership registry + workspace-wall enforcement applied to all writes; foreign or cross-workspace writes refused unless explicitly overridden (`--steal`); work-loop scoped to origin workspace.
- `durable-messaging`: at-least-once delivery (persist→send→ack→retry, survives restart) and reconnect replay via per-client sequence numbers, backed by the durable store.

### Modified Capabilities
- `orchd-daemon`: split "Daemon-optional operation" into reads-optional / writes-require-broker; add the socket control endpoint as the write transport (not just event subscribe); resident subsystems and the work-loop become broker-mediated and workspace-scoped.
- `fleet-steering`: `dispatch`/`run`/`steer`/`model` become brokered RPC calls that refuse when the daemon is down; event stream is socket-push with file-watch fallback.

## Impact

- **Code**: `src/daemon/{orchd,rpc,events,lifecycle}.ts` (broker, connection manager, socket write RPC, ownership); `src/commands.ts` (write commands become RPC clients that refuse on daemon-absent; reads keep fallback); `src/store.ts` (+ `bun:sqlite` durable queue/ownership/outbox); `extensions/orchestrator-bridge.ts` (notify daemon + ack consumed steers, alongside jsonl writes).
- **Contracts preserved**: presence-dir jsonl protocol remains the language-neutral truth channel; herdr stays at the process boundary (MIT/AGPL wall); atomic writes; `orch close --all` still only reaps `spawned.jsonl` panes.
- **Platforms**: unix socket on Linux/WSL; **127.0.0.1 TCP + port file** fallback where unix sockets are unavailable (Windows) — already anticipated by the orchd-daemon spec.
- **Relationship**: supersedes the ad-hoc direct-write paths and **folds in** the workspace-wall enforcement that `unify-workspace-policy` only partially covers; that change narrows to the pure policy primitives the broker calls.

## Non-goals

- **Cross-machine transport is deferred.** This change makes the protocol transport-agnostic and socket-based, but does **not** implement TCP/TLS, auth, or SSH-tunnel remoting — only the seams that let it land later without rewriting call sites.
- **Workspace-provider abstraction is deferred.** The broker resolves workspace identity via the current herdr-derived path; abstracting identity/topology behind a pluggable provider (tmux/headless/directory-as-workspace) is a separate follow-up change.
- **No external event bus** (Redis/NATS): single-host push over the daemon socket only.
- **Reads are not forced through the daemon**: `status`/`events` retain their file-protocol fallback by design.
