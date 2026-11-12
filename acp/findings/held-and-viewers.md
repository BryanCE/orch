# Held agents and viewers

## Life of a held agent
1. `planSpawn` chooses `headless` for a remote host; the remote host's `spawnHeadless` sees a peer request and routes it through `spawnHeldForPeer`: `packages/orch/src/daemon/server/spawn/plan.ts:66-68`, `packages/orch/src/daemon/server/handlers/lifecycle.ts:58-59, 90-96, 109-116`.
2. The peer path calls `startHeldAgent`, which builds the adapter's interactive command, starts a PTY under the minted agent id through `PtyHolder.start`, using cwd and launch environment: `packages/orch/src/backends/held/index.ts:150-164`.
3. `PtyHold.start` rejects duplicate ids, uses configured PTY dimensions/term, spawns the process and stores its PTY, terminal, serializer and subscribers in `entries`: `packages/orch/src/daemon/server/held.ts:49-81`.
4. The returned PTY pid becomes the held handle; `startHeldAgent` creates the hosted process reference and calls `registerSpawnedAgent` with backend `held`: `packages/orch/src/backends/held/index.ts:162-167`.
5. The held backend's `agentInput.submit` and `sendKeys` map text/key names to bytes and write by pid into the held PTY: `packages/orch/src/backends/held/index.ts:69-84`; `PtyHold.writeToPid` resolves that pid and writes: `packages/orch/src/daemon/server/held.ts:122-129`.
6. `attachHeld` resizes the PTY, pushes a serialized snapshot, then subscribes from the snapshot boundary; PTY output is fed to the xterm terminal before subscriber chunks are sent: `packages/orch/src/daemon/server/handlers/screen.ts:31-55`, `packages/orch/src/daemon/server/held.ts:67-75`.
7. The backend's `relaunching.relaunch` calls `relaunchPid`; it kills the old process, waits for exit, starts the replacement with the same request and id, restores size, resets viewer screens and moves subscribers: `packages/orch/src/backends/held/index.ts:92-100`, `packages/orch/src/daemon/server/held.ts:132-163`.
8. On ordinary exit, `PtyHold` removes the entry, disposes the terminal and sends exit to subscribers; the attached stream emits an `end` chunk explaining exit code or signal: `packages/orch/src/daemon/server/held.ts:76-85`, `packages/orch/src/daemon/server/handlers/screen.ts:18-21, 49-54`.
9. Before orchd stops/reloads, `stopDaemon` calls `endHeldAgents` to mark held agents exited and end their store rows, then `killAll` terminates all held PTYs: `packages/orch/src/daemon/server/orchd.ts:59-63`; the holder's `killAll` kills every entry: `packages/orch/src/daemon/server/held.ts:176-181`.

## PTY module
| Export | Signature | Importers |
|---|---|---|
| `nodePtyProvider` `packages/orch/src/pty/node-pty.ts:10` | `(): PtyProvider` | `packages/orch/src/daemon/server/orchd.ts:10,83` |

`PtyProvider` is the injected port with `spawn(request: PtySpawnRequest): Promise<PtyProcess>` (`packages/orch/src/types/pty.ts:1-37`).

## Held registry
| Structure | Key type | Readers and writers |
|---|---|---|
| `entries: Map<string, HeldEntry>` | Held terminal id: agent id or login id; entries retain start request, PTY, xterm terminal, serializer and subscribers (`packages/orch/src/daemon/server/held.ts:39-47`; `packages/orch/src/types/pty.ts:48-68`) | Written on successful start and deleted on exit (`held.ts:57-81`); queried by `has`, snapshot, text, subscribe, write, resize, pid lookup, kill, count, ids and killAll (`held.ts:88-184`). |
| `starting: Set<string>` | Same terminal id | Prevents concurrent duplicate start; added before spawn and removed in `finally` (`held.ts:55-65`). |
| `heldPtys` backend binding | `HeldPtysByPid`, addressable by recorded pid | Bound by orchd at construction (`backends/held/index.ts:39-50`; `daemon/server/orchd.ts:83-85`); backend input and relaunch read it (`backends/held/index.ts:69-75, 92-100`). |

## Screen stream
- RPCs are `attach-screen(caller,key,cols,rows)`, `peer-attach-screen(key,cols,rows)`, `screen-input(key,data)`, `screen-resize(key,cols,rows)`, and `screen-detach(key)`, defined at `packages/orch/src/daemon/client/protocol.ts:760-768`; responses are host/linked for attach and `{ok:true}` for the rest (`protocol.ts:949-953`).
- Stream lines contain `{kind:"screen",key,chunk}`; chunks are snapshot/data with `data`, or end with `reason`: `packages/orch/src/daemon/client/wire.ts:65,80-88,125-126`; `packages/orch/src/types/screen.ts:7-20`.
- The snapshot is serialized screen plus scrollback; data follows it, and end explains why the stream stopped: `packages/orch/src/types/screen.ts:7-15`.
- Each connection has one queue shared across screens; `attach.queue_bytes` sets its byte limit, default 1,048,576: `packages/orch/src/daemon/server/screens.ts:25-30,66-69`; `packages/orch/src/settings/schema.ts:115,327-330`.
- On overflow, queued non-end chunks are dropped and affected screens marked stale; when the socket drains, the source refreshes and sends a replacement snapshot. The agent is not blocked by a slow viewer: `screens.ts:41-56,58-64,75-97`; `types/screen.ts:23-35`.
- The local orchd either attaches to its own holder or uses `HostLink.attachScreen`; the link forwards `peer-attach-screen`, input, resize and detach RPCs, and forwards chunks back to the viewer: `packages/orch/src/daemon/server/handlers/screen.ts:82-105`; `packages/orch/src/hosts/link.ts:309-350,369-405`.

## Viewer panes
- `planViewers` finds the caller's backend and requires `commandPlacement`, `groupHome`, and `groupLayout`; these roles are retained in the viewer plan: `packages/orch/src/daemon/server/spawn/viewers.ts:51-60,63-66`.
- A pane command is `[orchEntrypoint(), "attach", key]`; `openViewers` opens the first place in a new group or tiles subsequent panes, setting `ORCH_DIR` and recording each pane handle by agent key: `viewers.ts:105-111,117-148`.
- It labels panes `<agent>@<host>` when labeling exists; failed pane creation logs a warning and notes that `orch attach <agent>` remains available: `viewers.ts:143-154,161-170`.
- `orch attach` opens `attach-screen`; it forwards keystrokes and resizes, while detach key, terminal close or end of stream finishes viewing and closes the socket. Detach reports that the agent keeps running: `packages/orch/src/commands/attach.ts:67-90,109-159`.
- The RPC connection closes attached screens through `closeAll`; a viewer pane closing therefore releases its stream, not the agent: `packages/orch/src/daemon/server/rpc.ts:221` and `packages/orch/src/daemon/server/screens.ts:104-106`.

## When is an agent held today
- For ordinary `spawn`, `planSpawn` chooses `selectBackend` unless `params.host` is supplied, in which case it chooses `headless`: `packages/orch/src/daemon/server/spawn/plan.ts:66-68`.
- `selectBackend` honors explicit/configured backend; otherwise takes the first available backend with `groupHome`, falling back to `headless`: `packages/orch/src/daemon/server/spawn/plan.ts:54-60`, `packages/orch/src/backends/registry.ts:48-62`.
- A linked host receives `spawn-headless`; because the request has peer context, that host runs it held and interactive via `spawnHeldForPeer`: `packages/orch/src/daemon/server/handlers/lifecycle.ts:58-59,90-96,109-116`.
- A local `spawn-headless` without peer context uses `headlessBackend.spawn`; it requires a prompt: `packages/orch/src/daemon/server/handlers/lifecycle.ts:75-98`.
- `HeldBackend.isAvailable()` is always false and its `spawn` always throws; it is not selected as a normal spawn backend: `packages/orch/src/backends/held/index.ts:131-142`.
- A screen may also be held for the interactive login started by `orch host add`; its exit/release behavior is separately supplied to `attachHeld`: `packages/orch/src/daemon/server/handlers/host-add.ts:43-63`.

## Does not fit
The held backend is not a normal spawn choice: orchd starts held PTYs only when another host requests an agent, while the local headless RPC path starts the headless backend (`packages/orch/src/backends/held/index.ts:131-142`; `packages/orch/src/daemon/server/handlers/lifecycle.ts:90-116`).
