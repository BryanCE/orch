---
slug: herdr-machines-integration
created: 2026-09-15
cwd: /mnt/c/dev/personal/orch
branch: main
next-session-focus: Build piece 1 (`--host` on spawn and tile), then 2 through 6 in order. Each piece is its own commit. Nothing is started.
---

# Handoff: orch across machines, with herdr 0.9 saved machines

## Goal

An orchestrator on one machine spawns, drives, and reads fleets on another machine through orch. When the plexer is herdr, the human watches every machine in one herdr window. When the plexer is tmux or headless, everything works the same and the human watches through `orch status`, `orch events`, or a tmux attach.

Done when, from a laptop shell:

```
orch host sync
orch spawn api-types api-routes --host workbox --dir /srv/app
orch status
orch dispatch workbox/api-types "..."
orch results workbox/api-types
orch doctor
```

works with a herdr, tmux, or headless plexer on `workbox`, and `bun check` is green.

## Facts that shape the design

- herdr 0.9 saved machines (`herdr machine add <ssh-target> --label L [--remote-session S]`) join the **windows**, not the servers. Each machine runs its own herdr server and its own orchd. The herdr CLI connects only to a local socket (`herdr-src/src/api/client.rs:14-18`, `ConnectionTarget` has `LocalSession` and `SocketPath` only). The SSH bridge carries the UI protocol, never the JSON API (`herdr-src/src/remote/host.rs:9`).
- A pane opened on the remote machine through the herdr window runs orch on that machine. That works today with no orch change.
- orch's cross-machine path is `ssh <dest> orch <cmd> --json`, driven by `hosts` in `settings.json` (`packages/orch/src/settings/schema.ts:20`, `HostSchema`), `<host>/<target>` addressing (`packages/orch/src/entities/target.ts:9`), `remoteWrite` (`packages/orch/src/commands/target.ts:109`), and `runRemoteAsync` (`packages/orch/src/remote.ts`). It carries `dispatch`, `steer`, `answer`, `results`, `status`, `queue add --host` today.
- `herdr machine list --json` prints `[{ id, label, target, session, enabled, selected }]` (`herdr-src/src/cli/machine.rs:21-28`). The remote session is selected on that host by `HERDR_SESSION=<name>` or `--session <name>`.
- herdr multi-machine is not supported on a Windows client. `herdr --remote` is.
- herdr does not copy config, plugins, or binaries to a remote host. Every host has its own orch install and its own `settings.json`.

## Rulings

- `hosts` in `settings.json` is the only declaration of remote hosts. Every cross-machine command reads `hosts` and nothing else.
- herdr's machine catalog is read through one optional `Backend` role, `machines`, implemented in `src/backends/herdr/` only. tmux and headless return `null`. Core branches on the role being non-null, never on a backend id (Rule 9, Rule 11).
- The role feeds exactly two readers: `orch host sync` and one doctor check. Both are inert when the role is `null`. The daemon never calls it. It lists and never writes herdr's catalog.
- herdr's field names, the `machine` verb, and its JSON shape live in `src/backends/herdr/wire.ts`. `scripts/check-bridge.ts` is the fence.
- `session` on a host is orch's word for "the plexer session on that host". Each backend reads it in its own directory. Core never interprets it.
- Deleting `host sync`, the doctor catalog check, and the `machines` role must leave every other command unchanged. If that stops being true, the coupling is the bug.

## The six pieces, in order

### 1. `--host <name>` on `orch spawn` and `orch tile`

- `packages/orch/src/commands/spawn/flags.ts`: `SpawnFlags` gains `host: string | null` and `cwdFlag: boolean`. `readSpawnFlag` reads `--host` and sets `cwdFlag` on `--dir`.
- `packages/orch/src/commands/spawn/index.ts` `cmdSpawn`: when `flags.host` is set, refuse without `cwdFlag` (the local cwd names nothing on the remote host), then `remoteWrite(hosts, host, "spawn", argsWithoutHostFlag(args, host))` and return. `cmdTile` the same.
- `packages/orch/src/commands/target.ts`: `argsWithoutHostFlag(args, hostName)` strips the `--host <name>` pair. `packages/orch/src/commands/queue.ts:138` uses it instead of its inline filter.
- `packages/orch/src/commands/help.ts` spawn and tile blocks: `--host` line.
- Tests: `test/commands-spawn.test.ts` parses `--host`; a forward test with a fake `ORCH_SSH_BIN` (fixture pattern in `test/remote-fanout.test.ts:11-35`) asserts the recorded remote command has no `--host` and keeps `--dir`; a refusal test for `--host` without `--dir`.
- `--file`, `--with`, `--tasks` pass through unchanged and name paths on the remote host, the same as `dispatch --file` does today.

### 2. `machines` role on the `Backend` port

- `packages/orch/src/types/backend.ts`, next to `handleLookup` (`:393`): `readonly machines: MachineInventoryRole | null;` with `list(): readonly PlexerMachine[]` and `PlexerMachine = { label: string; dest: string; session: string | null; enabled: boolean }`.
- `packages/orch/src/backends/herdr/wire.ts`: zod schema for the `machine list --json` row. `packages/orch/src/backends/herdr/cli.ts`: `machines()` runs `["machine", "list", "--json"]`. `packages/orch/src/backends/herdr/index.ts`: the role maps rows to `PlexerMachine`. An empty `session` string maps to `null`.
- `packages/orch/src/backends/tmux/index.ts`, `packages/orch/src/backends/headless/index.ts`: `machines: null`.
- `test/helpers/backend.ts:85-86` fake backend gains `readonly machines = null;` next to `handleLookup` and `logPruning`. Every `Backend` literal in `test/` compiles again.

### 3. `orch host sync` and `orch host add`

- New `packages/orch/src/commands/host.ts`. Register `host` in the mutating-command list at `packages/orch/src/commands/index.ts:249` and the dispatch table at `:318-334`. Document it in `help.ts`.
- `orch host add <name> <dest> [--session S] [--orch-dir P] [--timeout-ms N]` writes one entry with `writeSettingsValue(settings, "hosts.<name>", entry)` (`packages/orch/src/settings/write.ts:92`). Removal is `clearSettingsValue(settings, "hosts.<name>")` (`:167`). Both validate the whole file and take the settings lock. No new writer.
- `orch host sync`: `const inventory = backend.machines; if (inventory === null) die(...)`. For each enabled machine, write `hosts[slug(label)] = { dest, session }` when absent or different. Remove entries whose `dest` matches no listed machine and that `sync` wrote before (tracked by a `synced: true` field on the entry, so a hand-written entry is never removed). Print each add, change, and removal. `--dry-run` prints and writes nothing.
- Tests: fake backend with a `machines` role, temp settings file, assert the written `hosts`; a null role refuses with the `host add` hint.

### 4. `session` on a host, read by each backend on the remote side

- `HostSchema` gains `session: z.string().min(1).optional()`. `packages/orch/src/settings/registry.ts` help line.
- `packages/orch/src/remote.ts` `sshArgs` and `packages/orch/src/commands/target.ts` `remoteCommandArgs` prepend `ORCH_PLEXER_SESSION=<session>` to the remote `env` when the host has one. That is the only place core touches it. `scripts/check-bridge.ts:314` allows any `ORCH_*` env name in core and fences `HERDR_*` and `TMUX_*` to their backend directory.
- herdr backend: `createHerdrCli()` (`src/backends/herdr/cli.ts:153`, built once for the singleton at `index.ts:493`) reads `ORCH_PLEXER_SESSION`. When it is set and `HERDR_ENV` is not, every herdr call gets `--session <name>` and `serverStatus()` asks that session. Inside a pane (`HERDR_ENV=1`) the pane's own socket wins.
- tmux backend ignores it today. A tmux "session" is orch's space home (`spaceHome` at `src/backends/tmux/index.ts:193`), not a server. A second tmux server is `tmux -L <socket>`, and the backend has no server-socket argument. Giving it one is a separate piece, not this one.
- headless ignores it.
- orchd on the remote host reads the same env var at start, so the daemon and the CLI on that host agree. orchd is started by the CLI on that host, which inherits the ssh env.
- Tests: herdr cli test asserts `--session` is on the argv; a remote test asserts the `env` prefix.

### 5. Doctor

- `orch doctor` gains `--local` (skip configured hosts), the flag `orch status` already has. Today doctor parses only `--json` (`packages/orch/src/commands/doctor.ts:36`). Without it the remote doctor would fan out to its own hosts.
- `packages/orch/src/doctor/remote.ts` gains `checkRemoteDaemon`: `ssh <dest> orch doctor --local --json`, read the remote's own `daemon` and plexer checks, report each host's failures. This is how the remote plexer server is checked with zero plexer knowledge on the laptop. The remote report includes the plexer session its backend uses, or null; the laptop compares it with `hosts[name].session` and names the fix (`orch daemon restart` on that host, or drop `session` from the entry).
- New `checkHostCatalog` in a new `packages/orch/src/doctor/hosts.ts`: with `backend.machines === null` report `ok` "plexer keeps no machine list"; else every enabled machine has a host with the same `dest` and `session`, and every host with `synced: true` has a machine. Each miss prints the `orch host sync` or `orch host add` fix.
- Wire both into `packages/orch/src/doctor/runner.ts:154-156` with `settingsDependent(...)` and the existing `sshRunner`, beside the three remote checks. Tests in `test/doctor.test.ts` with a stub `SshRunner`.

### 6. `orch status` MACHINE column

- `packages/orch/src/commands/status/fetch.ts:82` sets `host: name` on remote rows. Add `machineLabel` from the `machines` role when the role lists a machine whose `dest` matches the host's `dest`, else the host name. The renderer shows it under a `MACHINE` header when any row is remote.
- Test in the status render tests: a remote row with a matching machine shows the label; without the role shows the host name.

## Checks

- Whoever edits runs bare `bun check` over the tree and pastes it. Never `bun check <file>` (the root script runs positional args as scripts).
- Tests: the checkout is under `/mnt/c`, so run through the Windows side: `WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\orch'; bun test <files>"`. Only the files the piece touched, once.
- `bun run build:orch:dev`, `orch daemon reload`, and the full suite are Bryan's.

## Gotchas

- A second session shares this checkout and works on the daemon wake and work loop (`src/daemon/server/wake.ts`, `work-loop.ts`, `state.ts`, `queue.ts`). Run `git status` before touching anything under `src/daemon/` or `src/queue.ts`.
- `remoteWrite` is synchronous and does not append `--json`; `runRemoteAsync` appends it. Pieces 1 and 3 use `remoteWrite`; piece 5 uses `runRemoteAsync`.
- The CLI starts orchd with `env: process.env` (`packages/orch/src/daemon/client/process.ts:359,379`). An orchd already running on the remote host, started from a pane before `session` was set, has no `ORCH_PLEXER_SESSION` and talks to the default plexer session. The doctor check in piece 5 catches it; the fix is `orch daemon restart` on that host.
- An ssh-run `orch` on the remote host has no registration, so `selfIdentity()` reads it as the human. A fleet spawned through `--host` is owned by nobody on that host until something adopts it. That is the current behaviour of `queue add --host` too.
- `test/smoke.sh` and anything that opens a real pane are Bryan-only.

## Suggested skills

`orch`, `cmt`, `typescript-best-practices`, `fallow-check`
