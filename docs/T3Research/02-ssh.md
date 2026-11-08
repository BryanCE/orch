# T3 Code over SSH

Source: `pingdotgg/t3code` at `7fe1310` (2026-11-08). Paths are relative to that repo.
Code lives in `packages/ssh/src/` (`command.ts`, `config.ts`, `auth.ts`, `tunnel.ts`).

SSH is the only route where the client both reaches a server on another machine and
starts it there. Every other route (LAN, Tailscale, T3 Connect) assumes the server is
already running.

## The ssh binary

- Spawns the system OpenSSH (`ssh`, `ssh.exe` on Windows) directly, never through a
  shell, so paths with spaces survive (`command.ts:25-26`).
- Base args on every call: `-o BatchMode=… -o ConnectTimeout=10 [-p port]`
  (`command.ts:107-118`). Commands add `-o ServerAliveInterval=15 -o ServerAliveCountMax=3`
  (`command.ts:202-215`). Default timeout 60 s (`command.ts:17`).

## Host resolution and discovery

- Resolves a target with `ssh -G <alias>` and reads `hostname`, `user`, `port` from it
  (`command.ts:338-374`). The destination it passes to ssh stays the alias, so
  `ProxyJump`, `IdentityFile` and everything else in `~/.ssh/config` keeps applying
  (`command.ts:88-94`).
- Host picker: parses `~/.ssh/config` in process (OpenSSH tokenizing, `Include` globs,
  `Host`/`Match`, `%h`) and collects non-wildcard `Host` aliases (`config.ts:18-236`).
  Adds unhashed hosts from `~/.ssh/known_hosts` (`config.ts:238-288`). Each entry is
  tagged `ssh-config` or `known-hosts`.
- Host-key checking is left to the user's OpenSSH defaults. No `StrictHostKeyChecking`
  override.

## Auth

- First attempt is `BatchMode=yes`: keys and agent only.
- On `permission denied (publickey|password|…)` it prompts in the app for a password or
  OTP, at most twice (`auth.ts:238-246`, `tunnel.ts:1434-1491`).
- The answer reaches ssh through a generated `SSH_ASKPASS` helper with
  `SSH_ASKPASS_REQUIRE=force`; the helper echoes an env var (`auth.ts:77-103`, `204-236`).
  The secret is cached in memory per target (`tunnel.ts:1350`).

## What runs on the remote

One shell script per operation, sent on stdin:

```
ssh … -- host sh -l -s -- <stateKey>
```

A login shell, so `PATH` comes from the user's profile (`tunnel.ts:878-887`).
`stateKey` is the first 16 hex chars of `sha256(alias\0hostname\0user\0port)`
(`command.ts:73-86`). Per-target remote state lives in
`~/.t3/ssh-launch/<stateKey>/{port,pid,managed,server.log,run-t3.sh}` (`tunnel.ts:528-537`).

## Bootstrap: the remote needs nothing installed

`REMOTE_RUNNER_SCRIPT` (`tunnel.ts:420-524`) becomes `run-t3.sh` on the remote.

- Downloads a self-contained archive `t3-$VER-{darwin|linux}-{arm64|x64}.tar.gz` plus
  `SHA256SUMS` with curl or wget, verifies with sha256sum or shasum, extracts to
  `~/.t3/runtime/versions/$VER` (`tunnel.ts:491-517`).
- Test-runs `t3 --version` before writing `.install-complete`.
- A noclobber PID lockfile serializes concurrent installs, reclaims a stale owner, waits
  up to 360 s (`tunnel.ts:448-475`).
- Linux and macOS only. Windows remotes are not supported; the remote side is POSIX `sh`.
- Requirements on the remote: `curl` or `wget`, `tar`, `sha256sum` or `shasum`, and the
  provider CLIs on the `PATH` of a non-interactive login shell.
- Timeouts: archive launch 900 s, server readiness 60 s (`tunnel.ts:47-62`).

## Version pinning and upgrade

- The desktop passes its own app version as `archiveVersion`
  (`apps/desktop/src/main.ts:109-120`). A managed remote always runs exactly the client's
  version.
- The launcher regenerates `run-t3.sh` and compares it with the stored copy (`cmp`). If
  it changed, it kills the managed server and relaunches on the new version. That is the
  whole upgrade path (`tunnel.ts:546-551`, `676-684`).
- A server it adopted rather than launched is never upgraded. A mismatch surfaces as a
  failed pairing, and the UI tells the user to restart that server
  (`apps/web/src/connection/platform.ts:240-252`).

## Start or reuse

In order (`tunnel.ts:588-704`):

1. Read `~/.t3/userdata/server-runtime.json`, which every T3 server writes. Accept it only
   if the origin is loopback HTTP and the PID is alive. If `GET /` answers in 2 s, adopt
   it as `external`.
2. Else reuse its own `managed` PID and port if the process is alive.
3. Else start one:
   `nohup env T3CODE_NO_BROWSER=1 run-t3.sh serve --host 127.0.0.1 --port $P --base-dir ~/.t3 >>server.log &`

The script prints `{"remotePort":N,"serverKind":"managed|external"}`, parsed leniently out
of any MOTD noise (`tunnel.ts:158-176`, `722`).

Remote port: start at the last used port or 3773, scan 200, skip any port that cannot bind
loopback or already answers there (`tunnel.ts:227-276`). Helpers run as
`t3 __ssh-helper pick-port|wait-ready|runtime-port` (`apps/server/src/cli/sshHelper.ts:127`).

Ownership rule: cleanup stops a remote server only if the launcher started it. A server
it found already running survives every client disconnect (`tunnel.ts:738-759`).

## The tunnel

A separate long-lived `ssh -L`, not stdio and not ControlMaster (`tunnel.ts:1139-1161`):

```
ssh -o BatchMode=no -o ConnectTimeout=10 -o ExitOnForwardFailure=yes
    -o ControlMaster=no -o ControlPath=none -o ControlPersist=no
    -o ServerAliveInterval=15 -o ServerAliveCountMax=3
    -n -N -L <local>:127.0.0.1:<remote> -- host
```

- Local port from a reserved loopback port. The client then talks plain
  `http://127.0.0.1:<local>` and `ws://…`.
- Readiness races an HTTP probe (20 s) against the tunnel process exiting; on failure it
  shows the tail of the remote `server.log` (`tunnel.ts:1273-1340`).
- One tunnel per connection key, behind a per-key lock (`tunnel.ts:1348-1358`).
- No watchdog after readiness. A stale tunnel is found on the next `ensureEnvironment`
  (2 s probe), closed without stopping the remote server, and rebuilt
  (`tunnel.ts:1619-1670`).

## Credential handoff

- First add: runs `run-t3.sh auth pairing create --json` over ssh and gets a one-time
  credential (`tunnel.ts:923-976`).
- The client checks `GET /.well-known/t3/environment` through the tunnel, then exchanges
  the credential at `POST /oauth/token` for a bearer token
  (`apps/web/src/connection/platform.ts:211-261`).
- Later connects skip pairing, verify the `environmentId`, and check the saved bearer at
  `/api/auth/session`. They pair again only if the token is invalid or lacks newer scopes
  (`platform.ts:264-310`).
- Secrets are redacted from error output (`command.ts:139-148`).

## Takeaways for orch

- Starting the remote server, and installing it first if it is missing, is part of
  connecting. The user never logs in to the box to set it up.
- `ssh -G` plus passing the alias through gives full `~/.ssh/config` support for free.
- Pin the remote to the client's exact version and replace a server you launched when
  it differs. Leave one you only found running alone.
- They chose `ssh -L` to a loopback HTTP port because their protocol is HTTP and
  WebSocket. orch's protocol is line-framed RPC on a unix socket, so a stdio pipe
  (`ssh host orch daemon dial-stdio`) carries it with no port at all.
