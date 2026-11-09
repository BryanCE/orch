# Multi-host orch: plan

Branch `ssh`. Mark items `[x]` as they land. Each step ends with `bun check` clean and the touched
tests green; steps marked **Bryan** are yours (build, migrate, live checks).

## The model

- **Every machine runs its own orchd.** orchd talks to orchd over one SSH link per host.
- **Work stays where it runs.** The process, PTY, logs, transcripts, status history and results
  live on the host the agent runs on, in that host's orchd and store.
- **The spawner keeps a reference.** Every spawn leaves a durable row on the spawning machine:
  the agent id (the same id on every machine), the host id it runs on, who spawned it, and when.
  The row outlives the agent.
- **Any orch finds anything from its id.** Given an agent id, orch reads the row and asks the
  local store or that host's orchd over the link. Output always names the host. An offline host
  is reported as offline with when it was last seen.
- **The spawner subscribes.** Your orchd subscribes to every linked orchd's events for agents it
  spawned, so status, results and alerts reach you in one place without copying logs.
- **orchd holds the PTYs.** One orchd per host owns every agent PTY on that host. Any pane
  attaches with `orch attach <agent>`, locally or across the link.
- **Hosts are types.** `HostId`, `HostedProcess`, `LocalProcess`, `ProcessPlace`: a process on
  another host can never reach a local probe or signal.

Matches herdr (one server per machine owning its panes, the client attaches over SSH) and
t3code peer links (work runs on the other machine, the parent keeps a durable reference and
follows it).

## 0. Hosts as types (done)

- [x] `HostId` brand on every host column, wire field and store query
- [x] `HostedProcess`, `LocalProcess` (minted only in `src/local-process.ts`), `ProcessPlace`
- [x] `placeProcess`: `local`, `linked`, `unreachable`; exhaustive at every caller
- [x] Session registration, close, command locks, link `alive`/`signal` carry the host
- [x] **Bryan:** `bun db:gen`, `bun db:mig`, `bun run build:orch:dev` on both machines

## 1. orchd-to-orchd link

- [x] `orch host serve` becomes a pipe: start the far orchd if it is down, connect its socket,
      send `peer-hello`, then copy stdin and stdout both ways. No logic of its own.
- [x] The authorized key line pins the caller: `orch host serve --origin <origin host id>`, so
      the far orchd knows which host a link speaks for and the near side cannot claim another.
- [x] orchd RPC `peer-hello {origin}`: marks the connection as that host's peer and answers the
      greeting `{host, commit, version}`. Connection state, like bridge `attach`.
- [x] Near `HostLink` speaks the daemon wire: greeting check and name binding as today, then
      `{id, method, params}` requests, replies, and pushed events on the one connection.
- [x] A far orchd with a connected peer never idles out.
- [x] Ping is `daemon-status`; link state rows stay as they are.
- [x] **Bryan:** re-run `orch host add bryan-swe` so the key line carries `--origin`.

## 2. Spawn on a host is the far orchd's spawn

- [x] `orch spawn --host <name>` asks the far orchd to spawn, through the link.
- [x] The spawn carries the provenance stamp `{origin host, spawner agent}`.
- [x] The far orchd records the agent as its own: process, environment, logs, status. Its row
      carries the provenance stamp, and so does everything that agent spawns.
- [x] The spawning orchd stores the reference row: agent id, host id, spawner, created at.
      Schema change: **Bryan** runs `bun db:gen`.
- [x] Far agents report to their own host's orchd with their own ORCH_DIR.
- [x] No far process is recorded here: a far agent's liveness is its host's link and its
      ending, its state the far orchd's events. A far `closed` or `exited` ends it here.

## 3. Subscriptions

- [x] Your orchd subscribes over each link to the far orchd's events for agents it spawned,
      resuming by sequence number after a drop.
- [x] Those events drive status, results, notifications and alerts here.
- [x] A linked host whose link is down: its agents read unknown, never dead; status shows when
      the host was last seen.
- [x] `orch status` lists far agents from the reference rows plus the latest events.

## 4. One reader for everything (Rule 20)

- [x] One resolver: agent id → local store, or that host's orchd over the link.
- [ ] `orch tail`, `orch peek`, `orch result`, `orch log` go through it and name the host.
- [x] Offline host: "offline, last seen <time>", never empty output or a missing file.

## 5. Drive verbs across hosts

- [x] `dispatch`, `steer`, `model`, `reset`, `close`, `abort`, `reap` on a far agent go to its
      orchd over the link.
- [x] Leases across hosts: the far orchd takes the spawning orchd's word on whether the lease
      holder is alive. Kill verbs are never gated; the human can always kill.

## 6. orchd holds PTYs

- [x] PTY port (spawn, write, resize, kill, data, exit) with one provider on
      `@lydell/node-pty` (prebuilt for linux, darwin, win32 on x64 and arm64).
- [x] Screen and scrollback per agent with `@xterm/headless` + `@xterm/addon-serialize`,
      capped by a setting.
- [x] A held environment: orchd launches the harness's interactive command in a PTY it owns;
      the held process is the agent's recorded process on this host.
- [x] orchd never idles out while it holds an agent.
- [x] `orch update` and `orch daemon stop` say how many agents a restart would end, and refuse
      unless confirmed.

## 7. Attach and panes

- [x] RPC attach stream: a screen snapshot first, then output chunks (encoded so raw bytes
      survive JSON), through a bounded queue per viewer: a slow viewer loses its backlog for a
      fresh snapshot and never backs up the agent; input and resize go back.
- [x] Across the link: the same stream, carried by the spawning orchd to the far orchd.
- [x] `orch attach <agent>`: connects through this machine's orchd wherever the agent runs;
      the title names the host. Closing the pane only detaches.
- [x] Spawn opens a pane in the caller's plexer running `orch attach <agent>`, through a
      plexer capability role (open a place running a command). No plexer, no pane.

## 8. Delete the stand-ins (Rule 8)

- [x] Relay directory, `RelayListener`, `RelayDialer`, stream frames
- [x] `ORCH_LINKED_DAEMON` and its guard in `ensureDaemon`
- [x] `LinkServer`, `HOST_PARAMS`/`HOST_RESULTS`, `hosts/launch.ts`, `launchForOrigin`
- [x] Far processes recorded in the near store, remote liveness cache, link `alive` tick
- [x] Tests, help docs and settings that name any of these

## Later

- [ ] herdr machines as an opt-in plexer route, only when the user configures it
- [ ] Post-quantum key exchange on every link. A WSL host today is reached through Windows'
      sshd, which negotiates the encryption. `orch host add` sets up WSL's own sshd and links
      through Windows with ProxyJump, Windows' key line forwarding-only to that one port.
      A `links.kex_algorithms` setting, post-quantum only by default, refuses a quiet fallback.
- [ ] `orch update`: install new npm releases and run store migrations
- [ ] Hosts on more than one tailnet or account
