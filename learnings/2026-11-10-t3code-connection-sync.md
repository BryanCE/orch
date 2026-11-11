# t3code: how a client and a server stay in step, and how it reaches a server on another machine

Read from the checkout at /home/bryan/src/t3code on 2026-11-10 by lookup agents. Four reports, kept as written: the server stream, the client connection, remote hosts, and an earlier pass on the resume rule. Paths and line numbers are t3code's at that date.

## Server: the stream it sends a client

### 1. WebSocket protocol gate
What: Before upgrading `/ws`, the server checks the orchestration protocol in the URL. Missing or incompatible protocol is rejected with HTTP 426 and an error response containing the required protocol version.
Where: /home/bryan/src/t3code/apps/server/src/ws.ts:3537
Numbers: `ORCHESTRATION_PROTOCOL_VERSION` (value defined in contracts; no timeout).
Wire: `{ code: "orchestration_protocol_incompatible", message: string, orchestrationProtocolVersion: ORCHESTRATION_PROTOCOL_VERSION }`

### 2. WebSocket authentication and revocation
What: The `/ws` upgrade authenticates a ticket for audience `"rpc"`; the server tracks the session as connected for the socket lifetime and races the RPC connection against session invalidation, closing the connection when invalidated. Invalid credentials fail the upgrade.
Where: /home/bryan/src/t3code/apps/server/src/ws.ts:3550, /home/bryan/src/t3code/apps/server/src/ws.ts:3653; /home/bryan/src/t3code/apps/server/src/auth/EnvironmentAuth.ts:1244; /home/bryan/src/t3code/apps/server/src/auth/SessionStore.ts:447
Numbers: No heartbeat/idle timeout in this path. Ticket expiration is checked during authentication (duration is set by session/ticket policy).
Wire: WebSocket URL carries the ticket query parameter; verified ticket claims include `{ sid, aud? }` (plus the session credential claims).

### 3. WebSocket RPC registration
What: A protocol-compatible, authenticated socket runs the declared `ServerWsRpcGroup` using JSON RPC serialization, authorization scoped to the authenticated session, and RPC instrumentation. There is no separate server hello, server identity, or capability exchange in the upgrade path found.
Where: /home/bryan/src/t3code/apps/server/src/ws.ts:3564, /home/bryan/src/t3code/apps/server/src/ws.ts:3578
Numbers: None found.
Wire: RPC method and payload shapes are declared in /home/bryan/src/t3code/packages/contracts/src/rpc.ts; transport is `effect/rpc` JSON serialization.

### 4. Event log sequence and cursor
What: Stored application events carry a monotonically assigned sequence plus event identity, aggregate identity, command/correlation metadata, type, and payload. The event store exposes bounded reads by sequence and a committed-event stream; the stream can begin after a supplied sequence.
Where: /home/bryan/src/t3code/packages/contracts/src/applicationEvent.ts:72; /home/bryan/src/t3code/apps/server/src/persistence/OrchestrationEventStore.ts:104, /home/bryan/src/t3code/apps/server/src/persistence/OrchestrationEventStore.ts:115, /home/bryan/src/t3code/apps/server/src/persistence/OrchestrationEventStore.ts:369
Numbers: Sequence is a non-negative integer. No sequence rollover policy found.
Wire: `{ sequence, eventId, aggregateKind, aggregateId, occurredAt, commandId, causationEventId, correlationId, metadata, type, payload }`

### 5. Commit-before-publish event delivery
What: Event publication is explicitly after the transaction containing the event/projection commit. The store offers a live stream with an optional `afterSequence` cursor, allowing server subscriptions to join the committed event feed.
Where: /home/bryan/src/t3code/apps/server/src/persistence/OrchestrationEventStore.ts:96, /home/bryan/src/t3code/apps/server/src/persistence/OrchestrationEventStore.ts:115, /home/bryan/src/t3code/apps/server/src/persistence/OrchestrationEventStore.ts:729
Numbers: None found.
Wire: Event-store stream values are `ApplicationStoredEvent` records (see entry 4); RPC subscriber messages are method-specific.

### 6. Replay window and pruning signal
What: The event store reads replay over an inclusive `afterSequence`/`throughSequence` range, provides replay counts and raw-payload byte totals, and exposes the high-water sequence through which events have been pruned. A cursor below that pruning boundary cannot be replayed and must be resynchronized from a snapshot. Unknown event types normally fail decoding; the replay reader can explicitly skip and log unknown types.
Where: /home/bryan/src/t3code/apps/server/src/persistence/OrchestrationEventStore.ts:56, /home/bryan/src/t3code/apps/server/src/persistence/OrchestrationEventStore.ts:78, /home/bryan/src/t3code/apps/server/src/persistence/OrchestrationEventStore.ts:101, /home/bryan/src/t3code/apps/server/src/persistence/OrchestrationEventStore.ts:696
Numbers: Thread replay also has `THREAD_RESUME_MAX_REPLAY_EVENTS`, defined in /home/bryan/src/t3code/apps/server/src/orchestration-v2/ThreadStream.ts and used by /home/bryan/src/t3code/apps/server/src/ws.ts:883. Exact replay budgets are enforced per thread by count and encoded/raw size; no global event-log retention duration is a client replay setting.
Wire: Replay records are stored application events; the pruning boundary is a numeric sequence.

### 7. Thread subscription resume and snapshot
What: Thread subscriptions are handled by the orchestration-v2 thread subscriber. It decides whether a requested cursor can resume by replaying or needs a bounded snapshot, then composes the snapshot/replay with the live stream; the replay policy is bounded by the thread resume event cap and replay-size checks.
Where: /home/bryan/src/t3code/apps/server/src/ws.ts:883, /home/bryan/src/t3code/apps/server/src/ws.ts:967; /home/bryan/src/t3code/apps/server/src/orchestration-v2/ThreadStream.ts: (definitions `decideThreadResume`, `buildBoundedThreadStreamSnapshot`, `THREAD_RESUME_MAX_REPLAY_EVENTS`)
Numbers: `THREAD_RESUME_MAX_REPLAY_EVENTS` (constant value in `ThreadStream.ts`); replay bytes are calculated by `threadReplayEncodedBytes` and checked by `isThreadReplayRawPayloadSafe`.
Wire: Thread stream items are method-specific snapshot/domain-event items declared in `/home/bryan/src/t3code/packages/contracts/src/orchestrationV2.ts` and `/home/bryan/src/t3code/packages/contracts/src/rpc.ts`; no universal replay-finished marker was found.

### 8. Shell subscription snapshot and live stream
What: Shell subscriptions load an initial shell snapshot, convert it to stream items, and compose it with live application events and enrichment updates. Shell events are coalesced, deduplicated, and unchanged shell rows are skipped; the stream buffer helper bounds live buffering.
Where: /home/bryan/src/t3code/apps/server/src/ws.ts:1116, /home/bryan/src/t3code/apps/server/src/ws.ts:1150, /home/bryan/src/t3code/apps/server/src/orchestration-v2/ShellStream.ts (snapshot, resume, coalescing and buffer helpers)
Numbers: Snapshot and stream buffer limits are defined in `ShellStream.ts` (including shell live-stream buffering policy).
Wire: Shell subscription request/response shapes are `subscribeShell` in `/home/bryan/src/t3code/packages/contracts/src/orchestrationV2.ts` and `/home/bryan/src/t3code/packages/contracts/src/rpc.ts`.

### 9. RPC stream output windows
What: For selected RPC streams, the server caps unacknowledged output chunks. On a received ACK it removes one chunk from the window and resumes a blocked stream when it is no longer full. It also removes stale per-client window state when opening another window, because disconnected streams may not deliver their exit notification.
Where: /home/bryan/src/t3code/apps/server/src/terminal/OutputProtocol.ts:12, /home/bryan/src/t3code/apps/server/src/terminal/OutputProtocol.ts:37, /home/bryan/src/t3code/apps/server/src/terminal/OutputProtocol.ts:59
Numbers: `MAX_PENDING_CHUNKS = 8`; `MAX_PENDING_BYTES = 64 * 1024`; byte windows apply only to terminal attach/observe. Count windows apply to server-config, shell, and thread subscriptions. One ACK round trip is permitted per chunk while the window is not full.
Wire: RPC frames handled are `{ _tag: "Request", tag, id }`, `{ _tag: "Ack", requestId }`, and outgoing `{ _tag: "Chunk", requestId, ... }`.

### 10. Terminal stream queue overflow resynchronization
What: Terminal output streams queue events under a byte budget. On overflow they discard queued output, unsubscribe and resubscribe through the optional resync callback; the snapshot/resync event restores the terminal view instead of allowing an unbounded queue.
Where: /home/bryan/src/t3code/apps/server/src/terminal/OutputProtocol.ts:105
Numbers: `MAX_QUEUED_OUTPUT = 8 * 1024 * 1024` bytes; `EVENT_OVERHEAD = 128` bytes charged per event; configurable `maxQueued` defaults to that limit.
Wire: Terminal events are typed `TerminalEvent` or `TerminalAttachStreamEvent`; output contributes `data` bytes and snapshots contribute `snapshot.history` bytes.

### 11. Command id receipts and replay
What: Orchestration command dispatch uses command IDs and a durable receipt repository. Dispatch checks/replays an existing receipt for a repeated command ID, while receipt insertion is conditional on absence; this makes retries return the recorded outcome instead of executing the same command again.
Where: /home/bryan/src/t3code/apps/server/src/orchestration-v2/Orchestrator.ts:13826, /home/bryan/src/t3code/apps/server/src/orchestration-v2/Orchestrator.ts:13875; /home/bryan/src/t3code/apps/server/src/persistence/OrchestrationCommandReceipts.ts:16, /home/bryan/src/t3code/apps/server/src/persistence/OrchestrationCommandReceipts.ts:116
Numbers: No receipt expiry/retry limit found in the receipt repository.
Wire: Receipt schema is defined by `OrchestrationCommandReceipt` in `/home/bryan/src/t3code/apps/server/src/persistence/OrchestrationCommandReceipts.ts`; command identity is `commandId`.

### 12. Server heartbeat, socket idle timeout, and ping
What: Absent in the `/ws` RPC server path and contracts searched: no application-level heartbeat, ping/pong timer, or idle-socket timeout/close policy was found. Socket lifetime is bounded by peer disconnect, session invalidation, or the underlying WebSocket implementation.
Where: Searched /home/bryan/src/t3code/apps/server/src/ws.ts, /home/bryan/src/t3code/apps/server/src/terminal/OutputProtocol.ts, /home/bryan/src/t3code/packages/contracts/src/server.ts, /home/bryan/src/t3code/packages/contracts/src/rpc.ts.
Numbers: Absent.
Wire: Absent.

### 13. Dead-client detection and drops
What: The RPC output-window wrapper consults protocol `clientIds` and removes bookkeeping for client IDs no longer connected when the next applicable stream request opens a window. No separate periodic dead-client detector was found; the underlying WebSocket/RPC protocol owns disconnect detection.
Where: /home/bryan/src/t3code/apps/server/src/terminal/OutputProtocol.ts:41
Numbers: Cleanup is triggered on opening an output window; no periodic interval.
Wire: `protocol.clientIds` is the connected-client set.

### 14. Other command dedupe / receipts
What: The event log records nullable `commandId` on application events, enabling association of resulting events with commands. No separate receipt/dedupe layer for non-orchestration RPC methods was found in the inspected command/event path.
Where: /home/bryan/src/t3code/packages/contracts/src/applicationEvent.ts:76; /home/bryan/src/t3code/apps/server/src/orchestration-v2/Orchestrator.ts:13875
Numbers: None found.
Wire: `commandId: CommandId | null`.

## Client: how it holds a connection

### 1. Supervisor connection state machine
What: `EnvironmentSupervisor` publishes `available`, `offline`, `connecting`, `backoff`, `connected`, or `blocked`; `connecting` carries stage `preparing`, `opening`, or `synchronizing`. Presentation maps these to `available`, `offline`, `connecting`/`reconnecting`, `connected`, and `error`/`unsupported`. Labels: `Available`, `Offline`, `Connecting...`, `Reconnecting...`, `Connected`, `Client not supported`, `Connection failed`, or `Failed to connect. Reconnecting... Reason: <error>`; reconnect title is `Failed to connect. Reconnecting...` when an error exists.
Where: /home/bryan/src/t3code/packages/client-runtime/src/connection/model.ts:125; /home/bryan/src/t3code/packages/client-runtime/src/connection/supervisor.ts:177,194,213,1000,1158,1195; /home/bryan/src/t3code/packages/client-runtime/src/connection/presentation.ts:9,36,67,87.
Numbers: none.
Wire: `SupervisorConnectionState = { desired: boolean; network: NetworkStatus; phase: SupervisorConnectionPhase; stage: ConnectionAttemptStage | null; attempt: number; generation: number; lastFailure: ConnectionAttemptError | null; retryAt: number | null }`; phases: `"available" | "offline" | "connecting" | "backoff" | "connected" | "blocked"`; status labels as above.

### 2. Retry and backoff
What: failed establishment or a lost session retries indefinitely. Ordinary retry uses exponential full-ish jitter from half the ceiling to the ceiling; a first loss of an established session uses a short randomized delay. A connection stable for 30 seconds resets the ladder; retry/wakeup/network signals can reset it as implemented in the supervisor.
Where: /home/bryan/src/t3code/packages/client-runtime/src/connection/supervisor.ts:43-46,151-154,1087-1092,1181-1206.
Numbers: `RETRY_BASE_DELAY_MS=1_000`, `RETRY_MAX_DELAY_MS=300_000`; `retryDelayMs` ceiling is `min(max, base * 2 ** (failureCount + 1))`; delay is randomized from half ceiling to full ceiling. `SESSION_LOSS_RETRY_DELAY_MS=250`, randomized 0.5–1.0; `BACKOFF_RESET_AFTER_MS=30_000`. No retry limit.
Wire: backoff state includes `retryAt: epoch milliseconds`, `lastFailure`, `attempt`, and `generation`.

### 3. Socket open, heartbeat, and liveness
What: RPC protocol sends pings and drops a socket with no inbound frame before its ping timeout. The session records socket messages; a timeout closes the session and the supervisor reconnects. Socket opening itself has a timeout. Large WebSocket frames are split/joined; intermediate parts are translated to Pong frames so they count as liveness.
Where: /home/bryan/src/t3code/packages/client-runtime/src/rpc/protocol.ts:8-13; /home/bryan/src/t3code/packages/client-runtime/src/rpc/session.ts:50,195-216,226-253; /home/bryan/src/t3code/packages/shared/src/socketFrameParts.ts:7-13,54-81.
Numbers: `PING_TIMEOUT="15 seconds"`; `SOCKET_OPEN_TIMEOUT="15 seconds"`; frame part size `SOCKET_FRAME_PART_BYTES=48 * 1024`; comment estimates 12 seconds per part at 4,000 bytes/s.
Wire: intermediate received frame is exactly `'{"_tag":"Pong"}'`; frame parts use prefix `"\u001e"`.

### 4. Active-session health probes and silent sockets
What: returning to foreground, retry requests, and selected network changes probe the existing session rather than immediately replacing it. If a fresh host descriptor answers while the websocket delivers no frames, the socket is deemed dead and replaced. Long-suspension probes replace a suspect socket even on timeout; route kind affects tolerated silence.
Where: /home/bryan/src/t3code/packages/client-runtime/src/connection/supervisor.ts:50-62,575-613,645-684,710-817; /home/bryan/src/t3code/packages/client-runtime/src/connection/driver.ts:97-111.
Numbers: setup timeout 15 seconds per usable route; synchronization adds 75 seconds per route that reaches sync. Probe deadlines: `CONNECTION_PROBE_TIMEOUT="15 seconds"`, `QUICK_CONNECTION_PROBE_TIMEOUT="3 seconds"`, `LONG_RESUME_PROBE_TIMEOUT="1500 millis"`; silent check starts after `500 millis`, repeats host checks every `1 second`, frame checks every `100 millis`; non-LAN/loopback remote silence threshold `2_500 millis`. Driver route check timeout `2_500 ms`; direct-route head start `500 ms`. Better route checks every `60_000 ms`, route silent-backoff maximum `1_800_000 ms`, failed preferred-route cooldown `300_000 ms`.
Wire: route check is `"answered" | "silent" | "unchecked"`; preflight is `"ready" | "unprepared" | "silent" | "unchecked"`.

### 5. Reconnect triggers and network observations
What: browser `online`/`offline` events update connectivity; Network Information API `change` triggers only when connection type changes. Visible `visibilitychange` emits application-active; wakeup reasons include `application-active`, `application-active-probe`, `application-active-long`, `credentials-changed`, and `network-changed`. Supervisor probes or reconnects according to reason; relay credential changes restart that relay session.
Where: /home/bryan/src/t3code/apps/web/src/connection/platform.ts:68-96,100-123,126-149; /home/bryan/src/t3code/packages/client-runtime/src/connection/wakeups.ts:5-25; /home/bryan/src/t3code/packages/client-runtime/src/connection/supervisor.ts:422-448,1036-1075.
Numbers: none.
Wire: `ConnectionWakeup = "application-active" | "application-active-probe" | "application-active-long" | "credentials-changed" | "network-changed"`; network status is `"unknown" | "offline" | "online"`.

### 6. Config synchronization and gap recovery
What: each RPC session consumes `subscribeServerConfig`, applies events into an in-memory projection, and increments a local revision for accepted events. New subscribers receive a synthesized current snapshot and retained theme/source updates; buffered events newer than their captured revision are streamed. A revision gap substitutes a fresh replay snapshot rather than forwarding an incomplete sequence. This is per-connection config state, not a durable server event cursor.
Where: /home/bryan/src/t3code/packages/client-runtime/src/rpc/session.ts:69-115,288-331,368-398.
Numbers: update pubsub is sliding buffer size `64`.
Wire: retained event sequence starts with `{ version: 1, type: "snapshot", config: withoutEnvironmentThemes(...) }`, optionally followed by the latest `environmentThemesUpdated` and `usageLimitSourcesUpdated`; buffered item contains `{ event, replay, revision }`.

### 7. Offline cache and state retention
What: config projection, session data and query persistence are state-layer responsibilities; connection setup keeps only a live in-memory config projection and its latest synthesized snapshot for subscribers. Cache persistence coalesces changes before saving and writes periodically. The connection subsystem does not present an offline cache label or implement a saved event cursor; cached app query/shell/thread data is separate from connection state.
Where: /home/bryan/src/t3code/packages/client-runtime/src/rpc/session.ts:288-331,368-398; /home/bryan/src/t3code/packages/client-runtime/src/state/cachePersistence.ts:5-16; /home/bryan/src/t3code/packages/client-runtime/src/state/server.ts:1-31.
Numbers: cache persistence waits `500 millis` before coalescing and then `10 seconds` between persistence calls; config pubsub capacity `64`.
Wire: persisted value shape is generic `A`; no server cursor appears in the client session API.

### 8. Commands while disconnected and request deadlines
What: environment RPC requests obtain the current supervisor session before invoking the RPC method; no offline command queue is implemented there. Subscription streams switch to the active session, go empty while there is none, and transport failures wait for a replacement session. The websocket protocol does not automatically retry transient transport failures (`Schedule.recurs(0)`); request failures return through the RPC client. No general request timeout was found in the inspected RPC session/client path.
Where: /home/bryan/src/t3code/packages/client-runtime/src/rpc/client.ts:230-239,255-384; /home/bryan/src/t3code/packages/client-runtime/src/rpc/session.ts:246-257; /home/bryan/src/t3code/packages/client-runtime/src/connection/supervisor.ts:990-1008.
Numbers: protocol retry count `0`; no general request timeout in this path.
Wire: subscription failures are classified as transport RPC errors and wait for the next session; no offline command queue message/type.

### 9. Multiple environments and routes
What: each catalog entry has its own `EnvironmentSupervisor`, connection/session/state; the web connection layer builds the shared client connection runtime and snapshot loaders. A supervisor can try multiple saved routes, preferring usable routes and probing alternatives while connected; route upgrades reconnect through the better route.
Where: /home/bryan/src/t3code/packages/client-runtime/src/connection/supervisor.ts:245-291,1010-1033; /home/bryan/src/t3code/packages/client-runtime/src/connection/driver.ts:41-95,156-198; /home/bryan/src/t3code/apps/web/src/connection/runtime.ts:1-67.
Numbers: better-route checks every `60_000 ms`; direct route head start `500 ms`; route check timeout `2_500 ms`; failed better-route cooldown `300_000 ms`.
Wire: target variants are `PrimaryConnectionTarget | BearerConnectionTarget | RelayConnectionTarget | SshConnectionTarget`; each supervisor exposes `target`, `state`, `session`, `prepared`, `connect`, `disconnect`, and `retryNow`.

### 10. Cursor semantics
What: absent: no saved server-event cursor, resume-from-cursor rule, or client handler for events at/below a server cursor was found in the inspected client runtime, shared socket framing, or web connection code. Config-stream continuity instead uses the local per-session revision and snapshot fallback described above. Searched `client-runtime/src/rpc`, connection supervisor/session, `shared/src`, and `apps/web/src/connection` for cursor/sequence/replay handling.
Where: /home/bryan/src/t3code/packages/client-runtime/src/rpc/session.ts:69-115,288-398.
Numbers: none.
Wire: absent.

## Remote hosts: reaching a server on another machine

### 1. SSH host discovery and target resolution
What: Desktop discovers concrete aliases from `~/.ssh/config` (including literal Include expansion and Hostname rules) and names in `known_hosts`; it resolves target details using OpenSSH `ssh -G`, falling back to the alias if resolution fails. Connection identity is alias, hostname, username and port.
Where: /home/bryan/src/t3code/packages/ssh/src/config.ts:47-350; /home/bryan/src/t3code/packages/ssh/src/command.ts:49-123,293-321; /home/bryan/src/t3code/apps/desktop/src/ssh/DesktopSshEnvironment.ts:54-75.
Numbers: none.
Wire: `DesktopSshEnvironmentTarget { alias, hostname, username, port }`; discovered host adds `source: "ssh-config" | "known-hosts"`.

### 2. SSH command policy and authentication
What: SSH runs directly as `ssh` or `ssh.exe`, no shell tokenization. Commands default to batch authentication unless interactive prompting is enabled; optional in-app askpass injects `SSH_ASKPASS`, `SSH_ASKPASS_REQUIRE=force`, and `T3_SSH_AUTH_SECRET`. Authentication failures prompt at most twice (no password retries for agent signing failure); prompt cancellation/unavailability is returned as a user-visible error.
Where: /home/bryan/src/t3code/packages/ssh/src/command.ts:22-27,115-130,180-260; /home/bryan/src/t3code/packages/ssh/src/auth.ts:41-52,109-192; /home/bryan/src/t3code/packages/ssh/src/tunnel.ts:1534-1585; /home/bryan/src/t3code/apps/desktop/src/ssh/DesktopSshPasswordPrompts.ts:20-102,169-368; /home/bryan/src/t3code/apps/desktop/src/ssh/DesktopSshEnvironment.ts:83-115.
Numbers: SSH base `ConnectTimeout=10` seconds; default SSH command timeout `DEFAULT_SSH_COMMAND_TIMEOUT_MS=60_000`; `ServerAliveInterval=15`, `ServerAliveCountMax=3`; askpass prompt default `DEFAULT_SSH_PASSWORD_PROMPT_TIMEOUT_MS=180_000`; at most 2 password prompts.
Wire: `SshPasswordRequest { destination: string; username: string | null; prompt: string; attempt: number }`; IPC prompt `{ requestId, destination, username, prompt, expiresAt }`.

### 3. Remote server start, reuse, and runtime installation
What: `ensureEnvironment` resolves the SSH target, hashes its connection tuple into a stable state directory, then sends a launch script. It adopts a responding default-home server when possible, reuses its own running server, otherwise selects a free loopback port and starts `t3 serve --host 127.0.0.1`; servers are marked managed/external. Runtime archive mode selects Darwin/Linux and arm64/x64 archives, downloads and verifies SHA-256, installs atomically under `~/.t3/runtime/versions/<version>`, and reuses a completed install; dev mode locates Node and enforces the configured engine range.
Where: /home/bryan/src/t3code/packages/ssh/src/tunnel.ts:21-40,249-356,439-555,570-770; launch entry point /home/bryan/src/t3code/packages/ssh/src/tunnel.ts:826-880; /home/bryan/src/t3code/packages/ssh/src/tunnel.ts:1030-1085.
Numbers: default remote port 3773; scan window 200 ports; node probe 1,000 ms; reuse readiness 2,000 ms; launch readiness 60,000 ms; dev launch SSH timeout 90,000 ms; archive launch SSH timeout 900,000 ms; checksum download 30 seconds; archive download 240 seconds; install-lock wait 360 seconds; lock empty-owner grace 5 probes; default SSH command timeout 60,000 ms.
Wire: launch stdout JSON `{ "remotePort": number, "serverKind"?: "external" | "managed" }`.

### 4. SSH forwarding and tunnel health
What: Reserves a local loopback port and starts a dedicated SSH `-N` forward to remote `127.0.0.1:<remotePort>`. It requires the forwarded HTTP `/` probe to become ready; tunnel process exit is raced against readiness and reported with stderr tail. A later ensure probes an existing local tunnel for 2 seconds; an unhealthy tunnel is closed and recreated. There is no autonomous backoff/restart loop: the next ensure call performs recovery.
Where: /home/bryan/src/t3code/packages/ssh/src/tunnel.ts:28-35,1200-1385,1514-1639; /home/bryan/src/t3code/packages/ssh/src/command.ts:180-260.
Numbers: tunnel keepalive 15 seconds / count 3; readiness timeout 20,000 ms; readiness probe timeout 1,000 ms; shutdown escalation 2,000 ms; stderr tail 16,384 chars; stale tunnel reuse probe 2,000 ms.
Wire: local endpoints returned as `http://127.0.0.1:<localPort>/` and `ws://127.0.0.1:<localPort>/`; SSH options include `BatchMode=no` by default, `ConnectTimeout=10`, `ExitOnForwardFailure=yes`, `ControlMaster=no`, `ControlPath=none`, `ControlPersist=no`, `ServerAliveInterval=15`, `ServerAliveCountMax=3`, `-n -N -L <localPort>:127.0.0.1:<remotePort>`.

### 5. SSH server ownership and cleanup
What: Closing a desktop environment terminates the SSH forward and stops a managed remote server; an adopted/external server is left running. Explicit disconnect reports stop failures; manager shutdown finalizers best-effort close tunnels and stop their managed remote server. The stop script retains ownership files if the process does not exit within its grace period.
Where: /home/bryan/src/t3code/packages/ssh/src/tunnel.ts:904-1004,1423-1472,1688-1770.
Numbers: remote stop waits at most 20 × 100 ms (2 seconds); tunnel termination force-kill grace 2,000 ms.
Wire: stop stdout `{ "stopped": true }`; state files are `port`, `pid`, `managed`, `server.log`, `run-t3.sh` under `~/.t3/ssh-launch/<stateKey>`.

### 6. SSH pairing and remote API requests
What: Optional pairing-token issuance runs remote `t3 auth pairing create --base-dir ~/.t3 --json`. Desktop only permits SSH API calls through loopback forwarded URLs, and bootstraps a bearer session / fetches remote session state via that forward. HTTP status is retained in errors for version-skew diagnosis.
Where: /home/bryan/src/t3code/packages/ssh/src/tunnel.ts:882-951,1639-1672; /home/bryan/src/t3code/apps/desktop/src/ipc/methods/sshEnvironment.ts:47-104,134-210.
Numbers: pairing command uses archive launch timeout 900,000 ms in archive mode; API request timeout is defined by the shared client-runtime authorization/environment functions (not set in these IPC handlers).
Wire: pairing result `{ credential: string }`; bootstrap result includes `target`, `httpBaseUrl`, `wsBaseUrl`, `pairingToken`, `remotePort`, optional `remoteServerKind`; SSH API error prefix is `[ssh_http:<status>]`.

### 7. Saved SSH environment and connection identity
What: Desktop saves remote connection targets and connection profiles in the encrypted connection catalog; legacy saved-environment records are read from the saved-environment registry and converted into runtime targets/profiles. SSH credentials are not persisted in that catalog; saved bearer secrets are decrypted only when requested. SSH connection IDs are `ssh:<environmentId>` and labels are persisted with the target.
Where: /home/bryan/src/t3code/apps/desktop/src/settings/DesktopSavedEnvironments.ts:20-70,138-181,205-258; /home/bryan/src/t3code/apps/desktop/src/app/DesktopConnectionCatalogStore.ts:190-295,301-412,419-489.
Numbers: catalog document schema version 1; saved registry defaults version 1; encrypted catalog path `<stateDir>/connection-catalog.json`.
Wire: SSH target/profile carry `{ environmentId, label, connectionId, target: { alias, hostname, username, port } }`; encrypted document `{ version: 1, encryptedCatalog: string }`.

### 8. Tailscale status, discovery and HTTPS endpoint
What: The Tailscale package reads `tailscale status --json`, validates MagicDNS and CGNAT IPv4 addresses, and derives whether HTTPS Serve capability exists. Desktop advertises detected tailnet IPs and a MagicDNS HTTPS endpoint; HTTPS is probed at `/.well-known/t3/environment`, and marked available only when Serve is enabled and responds. Tailscale status is cached by tailnet IPv4-address set.
Where: /home/bryan/src/t3code/packages/tailscale/src/tailscale.ts:13-27,131-239,359-444; /home/bryan/src/t3code/apps/desktop/src/backend/tailscaleEndpointProvider.ts:17-105,112-167; /home/bryan/src/t3code/apps/desktop/src/backend/DesktopServerExposure.ts:36-40,480-510,620-694.
Numbers: command status timeout 3,500 ms; process kill grace 500 ms; serve command timeout 10 seconds; HTTPS probe timeout 2,500 ms; status cache TTL 60 seconds; default Serve port 443.
Wire: status-derived `{ magicDnsName: string | null, tailnetIpv4Addresses: readonly string[], httpsServeEnabled: boolean | null }`; advertised endpoints label tailnet IP `Tailscale IP` and MagicDNS `Tailscale HTTPS`.

### 9. Tailscale Serve configuration and verification
What: Desktop may configure background `tailscale serve --bg --https=<port> http://127.0.0.1:<localPort>` and advertise HTTPS only after endpoint verification. It reads Serve status and can identify TCP/web handlers forwarding to the local server; disabling removes the matching web handler or TCP forward. Failure diagnostics are classified without logging raw CLI stderr.
Where: /home/bryan/src/t3code/packages/tailscale/src/tailscale.ts:32-76,362-451,485-600; /home/bryan/src/t3code/apps/desktop/src/backend/DesktopServerExposure.ts:481-510,620-694; /home/bryan/src/t3code/apps/desktop/src/backend/tailscaleEndpointProvider.ts:79-105.
Numbers: status/serve/debug command timeout 3,500 ms; serve config timeout 10 seconds; status cache TTL 60 seconds.
Wire: Serve route `{ servePort, mount?, host?, ambiguous?, owner? }`; disabling uses `tailscale serve [--service=<owner>] --https=<port> --set-path=<mount> off` or `--tcp=<port> off`.

### 10. WSL remote runtime and Node preflight
What: On Windows, the desktop locates `wsl.exe`, lists distros, warms a distro, converts paths, obtains its IP/home, installs a SHA-256-verified Linux runtime into `~/.t3/wsl-runtime/<runtimeId>`, then probes the staged executable and Node/node-pty dependencies. Runtime caches are locked, marked ready/selected, and old unused caches are pruned; packaged builds do not attempt native compilation, while allowed dev builds may build node-pty.
Where: /home/bryan/src/t3code/apps/desktop/src/wsl/DesktopWslEnvironment.ts:18-35,120-241,257-390,460-699,850-1152.
Numbers: process termination grace 1 second; distro list 8 seconds; prewarm 30 seconds; path conversion 10 seconds; runtime/node probes 10 seconds; build 5 minutes; install 2 minutes; prune 30 seconds; invalidate 15 seconds; home/IP lookup 5 seconds; toolchain transport retry limit 12; build transport retry limit 2; cache selection grace 5 minutes; orphan scratch retention 120 minutes.
Wire: runtime archive `{ windowsPath, runtimeId, sha256 }`; install success output `runtimeRoot:<absolute-linux-path>`; errors include explicit transport/failure reason, such as `WSL runtime installation timed out. Check that the distro has free disk space, then retry.`

### 11. WSL runtime placement and direct distro access
What: WSL operations run through `wsl.exe -d <distro> -- bash -l -s` when resolving login-shell Node, or `--exec sh -s` for Node-independent work. Desktop obtains the first IPv4 from `hostname -I` to avoid unreliable wslhost localhost forwarding. No persistent SSH-style connection or tunnel is established by this module.
Where: /home/bryan/src/t3code/apps/desktop/src/wsl/DesktopWslEnvironment.ts:96-166,738-845,1039-1152.
Numbers: commands have operation-specific timeouts in mechanism 10; process termination grace 1 second.
Wire: WSL distro arguments are `[]` for default distro or `['-d', distro]`.

### 12. SSH device-host tunnel and automatic reconnect
What: Server-side SSH device hosts probe/start remote device services, forward their hub and optional daemon ports to loopback, and verify `/readyz` and `/health`. Three consecutive failed 10-second health probes or SSH process exit drops the connection; it reconnects with exponential backoff capped at 30 seconds and retries forwarding-bind failures twice. Stop closes the tunnel and sends remote stop. This is a separate device-host facility, not the desktop remote-server tunnel.
Where: /home/bryan/src/t3code/apps/server/src/device/SshDeviceHost.ts:25-91,224-271,300-432,440-560.
Numbers: unhealthy probe interval 10 seconds, probe timeout 5 seconds, failure limit 3; startup readiness 15,000 ms; SSH command timeout 1,300,000 ms for start/agent-start and 45,000 ms otherwise; SSH forwarded connection keepalive 10 seconds / count 3; reconnect delay starts 1,000 ms and doubles to max 30,000 ms; forwarding retry count 2.
Wire: SSH options include `BatchMode=yes`, configured `-i <identityFile>`, `ExitOnForwardFailure=yes`, `ControlMaster=no`, `ControlPath=none`, `ControlPersist=no`, `ServerAliveInterval=10`, `ServerAliveCountMax=3`, `-T -L 127.0.0.1:<local>:127.0.0.1:<remote>`; remote bootstrap result includes `nodePath`, `hubPort`, optional `daemonPort`, optional `token`/`entryPath`, `platforms`, and `helpers`.

### 13. Server remote-open target discovery
What: The server advertises remote-open choices based on an SSH listener on either loopback family. If sshd is absent, it advertises Tailscale only when Tailscale SSH is explicitly enabled; when sshd exists it may also advertise MagicDNS and `<short-hostname>.local`. Results are served stale while refreshed.
Where: /home/bryan/src/t3code/apps/server/src/environment/RemoteOpenTargets.ts:12-22,30-83.
Numbers: SSH port 22; targets cache TTL 60 seconds.
Wire: `{ kind: "tailscale" | "mdns", host: string, username?: string }`.

## Earlier pass: the saved position and the resume rule

### t3-client-resume

1. KEPT POSITION
   - Shell position is `state.snapshot.snapshotSequence` in a `SubscriptionRef`; thread position is a separate `lastSequence` `SubscriptionRef`. `/home/bryan/src/t3code/packages/client-runtime/src/state/shell.ts:144-148,270-291`; `/home/bryan/src/t3code/packages/client-runtime/src/state/threads.ts:252-272`.
   - Saved snapshot cursors survive app restart through IndexedDB and seed restored state. This is the last persisted position, not necessarily the latest received one. `/home/bryan/src/t3code/apps/web/src/connection/storage.ts:131-140,837-875,918-963`; `/home/bryan/src/t3code/packages/client-runtime/src/state/threads.ts:252-256`.
   - Shell cursor-only changes can skip a disk rewrite when rows and origin are unchanged. `/home/bryan/src/t3code/packages/client-runtime/src/state/shell.ts:171-184`.

2. RECONNECT
   - A replacement RPC session rebuilds the subscription input. `/home/bryan/src/t3code/packages/client-runtime/src/rpc/client.ts:276-306`.
   - Shell resumes with `afterSequence` and `requestCompletionMarker` when origin matches server version, database migration and omission settings, and its snapshot is under 12 hours old. Otherwise it loads an HTTP snapshot, then subscribes after that snapshot’s cursor; HTTP failure falls back to a socket snapshot request without `afterSequence`. `/home/bryan/src/t3code/packages/client-runtime/src/state/shell.ts:90-114,450-539`.
   - Threads with existing data send `afterSequence: lastSequence`; threads without data first try an HTTP snapshot. Existing data remains while status becomes synchronizing, then live on `synchronized`. `/home/bryan/src/t3code/packages/client-runtime/src/state/threads.ts:949-1044,627-634`.

3. OUT OF ORDER
   - Shell and thread events at or below the applied cursor are ignored. Higher sequences are accepted directly: no contiguous-sequence check, gap buffer or gap-triggered reload was found in these reducers. `/home/bryan/src/t3code/packages/client-runtime/src/state/shellReducer.ts:232-267`; `/home/bryan/src/t3code/packages/client-runtime/src/state/threads.ts:506-526`.
   - Unknown thread events still advance the cursor but do not update the projection. `/home/bryan/src/t3code/packages/client-runtime/src/state/threads.ts:510-527`.
   - Buffered shell items belonging to an obsolete RPC session are discarded. `/home/bryan/src/t3code/packages/client-runtime/src/state/shell.ts:256-261`.

4. SERVER CHANGED
   - Shell notices incompatible version/migration/omission metadata through initial config and refuses local resume; a server `snapshot-required` also clears its resume origin and requests reload, while keeping rows visible. `/home/bryan/src/t3code/packages/client-runtime/src/state/shell.ts:100-114,341-348,434-459`.
   - An authoritative shell snapshot replaces snapshot state, can lower the cursor, clears removal tracking and advances generation. A thread snapshot replaces its cursor/projection and resets or replaces history metadata. `/home/bryan/src/t3code/packages/client-runtime/src/state/shell.ts:307-337`; `/home/bryan/src/t3code/packages/client-runtime/src/state/threads.ts:637-657`.
   - Unique server/database-incarnation detection for the shell/thread stream: **none found** searching `state/shell.ts`, `state/threads.ts`, `state/threadDetail.ts`, `connection/`, `rpc/` and `platform/orchestrationCache.ts` for `epoch`, `serverId`, `instanceId` and `databaseId`. Thread reconnect itself ignores initial-config contents and resumes whenever data exists. `/home/bryan/src/t3code/packages/client-runtime/src/state/threads.ts:973,1036-1044`.

### t3-server-stream

Paths below are relative to `/home/bryan/src/t3code/`.

1. POSITION
   - The resume cursor is `sequence`, minted by SQLite’s `orchestration_events.sequence INTEGER PRIMARY KEY AUTOINCREMENT`. Agent-event inserts return that sequence. It is not the per-thread `stream_version`. `apps/server/src/persistence/Migrations/001_OrchestrationEvents.ts:9`; `apps/server/src/persistence/OrchestrationEventStore.ts:474-512`.
   - Snapshots supply `snapshotSequence`; clients subsequently send it as `afterSequence`. `packages/client-runtime/src/state/shell.ts:533-537`; `packages/client-runtime/src/state/threads.ts:1005-1006,1036-1043`.

2. SUBSCRIBE
   - RPC methods are `orchestration.subscribeShell` and `orchestration.subscribeThread`; resume inputs carry optional `afterSequence`, plus `threadId` for threads. `packages/contracts/src/orchestrationV2.ts:3626-3627`; `apps/server/src/ws.ts:883-887,1116-1120`.
   - Without a position, the server sends a snapshot, optional `synchronized` marker, then events after the snapshot cursor. `apps/server/src/ws.ts:963-1007,1321-1327`.
   - A valid thread resume sends replay through the captured high-water mark, optional `synchronized`, then live events after high-water. Shell resume first sends project metadata/enrichment snapshot items, then replay, marker, and live events. `apps/server/src/ws.ts:1077-1110,1351-1375`.
   - To close the replay/live race, the underlying stream subscribes before capturing high-water, buffers concurrent events, replays persisted rows, and discards buffered events at or below high-water. `apps/server/src/orchestration-v2/LiveStreamBudget.ts:345-380`.
   - Clients discard event sequences already applied. This is state synchronization, not delivery of every historical event: replay can coalesce updates and skip unknown event types. `packages/client-runtime/src/state/shell.ts:270-286`; `packages/client-runtime/src/state/threads.ts:507-526`; `apps/server/src/ws.ts:940-942,1095,1358-1361`.

3. BAD POSITION
   - Shell cursors ahead of high-water, below the pruning boundary, or exceeding replay count/byte budgets fall back to a fresh snapshot. With `httpSnapshotFallback: true`, the sole response is `snapshot-required` instead. `apps/server/src/ws.ts:826-853,1330-1346`.
   - The shell client handles that signal by invalidating its snapshot origin and requesting reload; it downloads an HTTP snapshot and subscribes from its cursor. `packages/client-runtime/src/state/shell.ts:342-347,475-505,533-537`.
   - Threads fall back to snapshot then live when the cursor is ahead, required history was pruned, or replay exceeds budgets. An idle thread exactly at its own high-water can resume without replay even below the global pruning boundary. `apps/server/src/ws.ts:1032-1037,1057-1062,1078-1093,1096-1104`.

4. STORE IDENTITY
   - Store-reset identity: **none found**. Searched `ws.ts`, `persistence/OrchestrationEventStore.ts`, `orchestration-v2/`, contracts, and client shell/thread state for store/database IDs, epochs, generations, and resume handling. Subscription inputs contain sequence cursors, not a store token. `packages/contracts/src/orchestrationV2.ts:3720-3738,3836-3839`.
   - The shell does compare `serverVersion`, `databaseMigration`, omission options, and snapshot age. A mismatch forces HTTP snapshot reload, but these are not a unique database incarnation ID. `packages/client-runtime/src/state/shell.ts:101-115,455-505`.
   - No store-ID mismatch action was found for threads; retained data resumes by sequence. Consequently, a replacement store whose sequences overlap is not identified as a different store by this protocol. `packages/client-runtime/src/state/threads.ts:1036-1043`; `apps/server/src/ws.ts:1032-1037,1344-1346`.

### t3-remote-link

1. **TRANSPORT**
   - The client dials the selected server: its configured WebSocket URL defaults to `/ws`; client code constructs the socket and uses JSON RPC. (`packages/client-runtime/src/connection/resolver.ts:78–88`; `packages/client-runtime/src/rpc/session.ts:232–272`)
   - Tailscale endpoints can be direct HTTP addresses or HTTPS MagicDNS addresses; HTTPS Serve forwards to the server’s local HTTP port. (`apps/desktop/src/backend/tailscaleEndpointProvider.ts:60–62,86–103`; `packages/tailscale/src/tailscale.ts:442–447`)
   - The socket implementation also distinguishes direct connections from T3 Connect relay connections. (`packages/client-runtime/src/rpc/session.ts:187–189`)

2. **WHAT FLOWS**
   - Clients subscribe to server configuration, shell state, and thread updates; thread handling applies snapshots and projection events. (`packages/client-runtime/src/rpc/session.ts:297–300`; `packages/client-runtime/src/state/shell.ts:451–452`; `packages/client-runtime/src/state/threads.ts:568,637–638,962–963`)
   - Terminal streams deliver initial/history snapshots and subsequent output chunks, accumulated in a client buffer. (`packages/client-runtime/src/state/terminal.ts:64–78`; `packages/client-runtime/src/state/terminalSession.ts:111–120,165–191`)
   - **It is not streaming-only:** client code saves shell and thread snapshots locally; the web implementation uses IndexedDB. (`packages/client-runtime/src/state/shell.ts:185`; `packages/client-runtime/src/state/threads.ts:329`; `apps/web/src/connection/storage.ts:140,863–872,949`)
   - Full server database/project replication: **none found** in the permitted environment, desktop, web, Tailscale, and client-runtime searches; the concrete copying found is client-side snapshot caching at the paths above.

3. **LIVENESS**
   - Pings run every five seconds; fifteen seconds without an incoming frame drops the socket. Disconnect handling distinguishes failure to connect, heartbeat timeout, and an established connection disconnecting. (`packages/client-runtime/src/rpc/protocol.ts:10–12`; `packages/client-runtime/src/rpc/session.ts:200–215`)
   - The supervisor watches session closure, schedules retries with backoff, and marks successful connections `connected`. (`packages/client-runtime/src/connection/supervisor.ts:1006–1021,1187–1207`)
   - Settings show “Connecting,” “Reconnecting” with any error, “Offline,” or “Connected.” Previously loaded shell/thread data can remain marked cached. (`apps/web/src/components/settings/SavedEnvironmentRows.tsx:87–104`; `packages/client-runtime/src/state/shell.ts:73–75`; `packages/client-runtime/src/state/threads.ts:258–261`)

4. **SERVER TO SERVER**
   - The demonstrated connection is **client → selected server**, not local server → remote server. (`packages/client-runtime/src/connection/resolver.ts:96–119`; `packages/client-runtime/src/rpc/session.ts:232–272`)
   - Direct t3code-server-to-t3code-server communication: **none found** in searches for `remote`, `environment`, `WebSocket`, `tailscale`, `tunnel`, `forward`, `reconnect`, and `heartbeat` across the five permitted roots. Server code outside `apps/server/src/environment` was excluded, so a repository-wide “never” is not established.


