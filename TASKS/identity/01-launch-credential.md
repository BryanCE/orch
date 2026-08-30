# The launch credential

How a spawned agent knows which agent it is, who may read that fact, and what it means.
Companion to `TASKS/01-agent-model.md` (four facts, never welded) and
`TASKS/08-identity-registration.md` (how a driving session registers).

## 1. The carrier

The spawner stamps `ORCH_AGENT_ID=<minted id>` into the pane env before the plexer launches
the harness. Env is the only channel that survives the plexer hop on every OS, needs no daemon
at boot, and reaches every harness's in-process extension without touching argv.

The variable is the minted id and nothing else. It is identity. It is never authorization.

## 2. One reader

`process.env.ORCH_AGENT_ID` is read in exactly one file, `src/identity/launch.ts`, a leaf that
imports only `backends/identity.ts` and the logger. (Note, pass 1: the logger's file path needs
`orchDir()`, which `presence/writer.ts:26` defines; `launch.ts` imports it from there. Both sides
are function declarations used at call time, so the import cycle is harmless.)

- `launchCredential(): string | null` reads the var and validates it with `isAgentId`. Unset
  is `null`. Present but malformed is a wiring error: log `launch.invalid-key`, exit 1.
- `LAUNCH_ENV` is the exported constant holding the name. Nothing else spells it. The shim
  allow-list (`adapters/session-env.ts`) and the Claude hooks shell string
  (`adapters/claude-hooks.ts`) import it.
- `identity/self.ts` calls `launchCredential()`. Everything else calls `selfIdentity()` or
  `selfId()`.
- `scripts/check-bridge.ts` fails the gate on any read of the var, or any string literal of
  its name, outside `launch.ts`.

## 3. Four questions, four functions

| question | function | lives in |
| --- | --- | --- |
| who am I | `selfIdentity()` | `identity/self.ts` |
| was I launched by orch | `callerKind(): "human" \| "agent"` | `policy/caller.ts` |
| who holds this lock | `selfId()` with `user:<pid>` when unregistered | `commands/lock.ts` |
| what may I end | `callerAuthority(self: SelfIdentity \| null)` | `policy/close-authority.ts` |

`callerKind()` is the only place the human/agent distinction is made. Backends never ask who
the caller is; the command layer passes the id down as a parameter.

## 4. The claim

The agent row carries two nullable columns, `claimed_at` (instant) and `session_token`.

| moment | who acts | what happens |
| --- | --- | --- |
| spawn | the spawner | mints the id, inserts the row with `claimed_at = NULL`, stamps `ORCH_AGENT_ID` into the pane env, hands off to the plexer |
| first contact | the spawned agent | the harness boots, its extension calls `claim-identity` carrying `ORCH_AGENT_ID` and the harness's own session id (`AgentAdapter.sessionIdEnv`); the daemon stamps `claimed_at` and `session_token` |

First claim wins. orch's own `restart`/`reset` re-claims as part of the relaunch. Any other
claim with a different token is refused: that caller is not the agent. There is no collision
event and no collision policy.

The claim happens through the daemon only. A spawned agent cannot exist without one
(`spawn.ts` fails the launch when the control plane is unreachable), so the presence writer
never stamps a claim.

`callerKind()` answers from the claim:

| caller carries | verdict |
| --- | --- |
| id + the recorded session token | agent, including `orch` run from its own Bash tool |
| id + a different token, or no token | human in the pane, or a stale env |
| no id | human at a terminal |

A harness that exports no session token falls back to its open process instance, as `08`
specifies.

## 5. Two RPCs

| RPC | caller | says | daemon does |
| --- | --- | --- | --- |
| `claim-identity` | a spawned agent | "orch minted me `<id>`; my session is `<token>`" | unclaimed → stamp; same token → no-op; different token → refuse; unknown id → refuse |
| `register-session` | a driving session | "I have no id; mint one for session `<token>`" | mint, insert with `spawned_by = NULL`, return the id; same token again returns the same id |

Both call one shared base (daemon token check, session-token lookup, row write). Neither
contains the other. `hello` is deleted, not aliased. `08` is updated in the same commit.

## 6. The name

`ORCH_AGENT_ID`. `ORCH_AGENT_KEY` does not exist after task 5. `SpawnRegistration.key` is the
store's word and is not part of this rename.

## 7. Invariants

| # | invariant | enforced by |
| --- | --- | --- |
| 1 | The launch env var is read in one file. | `check-bridge` (task 1) |
| 2 | The variable's name exists as one exported constant. | `check-bridge` (task 1) |
| 3 | Human-vs-agent is decided by `callerKind()` and nowhere else. | invariant 1 leaves nothing else to read |
| 4 | The credential is identity, never authorization. | `callerAuthority` takes `SelfIdentity`; the lease gates driving verbs; `abort`/`close`/`reap` are never gated |
| 5 | First claim wins; a different token is not the agent. | `claimAgent()` is the one writer and refuses (task 11) |

## 8. Tasks

Numbered in completion order. A task never depends on one below it. "After" names the
prerequisites.

TDD, every task. Write the test in the "test first" column, run it, see it fail for the right
reason, write the code, run it green. "Gate" means the static check is the test and must be
seen failing before and passing after. "Covered by" means a named test already fails until
the task lands.

| # | task | files | test first | after | done |
| --- | --- | --- | --- | --- | --- |
| 0 | New leaf `src/identity/launch.ts`: `launchCredential()`, `LAUNCH_ENV`; `self.ts` calls it; `launchKey` deleted from `presence/writer.ts`. **Note (pass 1):** `extensions/claude/index.ts:22` and `extensions/codex/index.ts:20` import `launchKey`; deleting it here breaks typecheck until task 3. So `launchKey` is kept as `launchKey(): string \| undefined { return launchCredential() ?? undefined }` with the env read gone, and the two extension call sites drop their argument; task 3 deletes it | `identity/launch.ts` (new), `identity/self.ts`, `presence/writer.ts`, `extensions/claude/index.ts`, `extensions/codex/index.ts` | new `test/identity-launch.test.ts`: env unset → `null`; a minted id → that id; a malformed value → exit 1 and log `launch.invalid-key`. `test/identity-self.test.ts`: `selfIdentity()` returns the env id without touching the store. | — | 179e437 |
| 1 | `check-bridge` rule: any read of the var, or string literal of its name, outside `identity/launch.ts` fails the gate | `scripts/check-bridge.ts` + its test | `test/check-bridge.test.ts`: a fixture with the read outside `launch.ts` fails with file:line; the same read inside `launch.ts` passes; a bare literal of the name outside `launch.ts` fails. | 0 | cd4090a |
| 2 | Name carriers import `LAUNCH_ENV`: shim allow-list and Claude hooks shell string | `adapters/session-env.ts`, `adapters/claude-hooks.ts` | `test/claude-hooks.test.ts`: the shell string contains `LAUNCH_ENV`'s value, asserted through the constant. `test/session-env.test.ts`: the allow-list contains `LAUNCH_ENV`. Gate (1) catches a literal. | 0 | 179e437 |
| 3 | Extensions read `launchCredential()` via the presence layer, never env. **Note (pass 1):** task 0 keeps `launchKey` as the wrapper (see its note); this task deletes `launchKey` and has the extensions import `launchCredential` from `identity/launch.ts` | `extensions/claude/index.ts`, `extensions/codex/index.ts`, `presence/writer.ts` | covered by gate (1) plus `test/cli-backends-*-headless.test.ts` staying green | 0, 1 | 179e437 |
| 4 | Backends stop reading env: `herdr/index.ts`, `tmux/index.ts`, `herdr/hud.ts` take the id as a parameter from the command layer | those three + callers | each backend's existing test calls the function with an explicit id, env unset; passes only when the parameter is used. Gate (1) catches a leftover read. | 0, 1 | b6a99ff |
| 5 | Rename to `ORCH_AGENT_ID`: `LAUNCH_ENV`, spawner env, headless, `computeKey`/`holderName`, test helpers | `policy/spawner.ts`, `commands/spawn.ts`, `backends/headless/index.ts`, `agent/presence.ts`, `test/helpers/presence.ts`, tests | `test/spawn-policy.test.ts` reads the key through `LAUNCH_ENV` and asserts `"ORCH_AGENT_ID"`. `test/one-spelling-per-fact.test.ts`: zero `ORCH_AGENT_KEY` in `src/`, `extensions/`, `test/`. | 0–4 | |
| 6 | New `policy/caller.ts` with `callerKind()`; replace the presence-checks in `peers.ts`, `monitor.ts`, `connection.ts`, `target.ts`, `lifecycle.ts`, `rpc.ts` | those files + `policy/caller.ts` (new) | new `test/caller-kind.test.ts`: no credential → `"human"`; a credential → `"agent"`. Each replaced site's existing test (`owner-scoping`, `agent-monitor`, `store-outbox`, `close-authority`) stubs `callerKind`, not the env. | 0 | cd4090a |
| 7 | `callerAuthority(self: SelfIdentity \| null)`; `lock.ts` holder via `selfId()` | `policy/close-authority.ts`, `commands/lock.ts` | `test/close-authority.test.ts`: `callerAuthority(null)` / `callerAuthority({ id: "orchA" })` and every assertion holds. New `test/lock-holder.test.ts`: self id when registered, `user:<pid>` otherwise. | 0 | 1e832ee |
| 8 | Delete the comments that restate "no key = human" in `close-authority.ts`, `rpc.ts`, `spawn.ts`, `monitor.ts`, `peers.ts`, `connection.ts` | those files | no test. Reviewer greps `src/` for `no ORCH_AGENT` and expects zero. | 6 | |
| 9 | `peers.ts` fleet wall = `depthOf(caller) === 0` | `agent/peers.ts` | `test/owner-scoping.test.ts`: a root sees every fleet; a depth-1 agent only its own; depth-2 likewise. Caller injected, env never set. | 6 | |
| 10 | Schema: `claimed_at` (nullable instant), `session_token` on `agents`; `insertAgent` + fixtures. **Handoff: `bun db:gen`.** **Note (pass 1):** `session_token` already exists (`src/db/schema.ts:121`); only `claimed_at` is new. `AgentRow` carries both | `src/db/schema.ts`, `store/agent-rows.ts`, `test/helpers/agent.ts` | `test/store-agent-rows.test.ts`: `insertAgent` writes both `NULL`; `agentById` reads both back. Fails until the migration exists; that is the signal to hand Bryan `bun db:gen`. | — | 179e437 |
| 11 | One writer `claimAgent(id, sessionToken, now)` | `store/agent-rows.ts` + test | `test/claim-agent.test.ts`: unclaimed + A → stamped; claimed A, claim A → no-op; claimed A, `reclaim(id)` then B → B; claimed A, plain claim B → refused, row unchanged; unknown id → refused. | 10 | 82a9990 |
| 12 | `doctor`: "spawned N min ago, never claimed" | `doctor/` | `test/doctor-checks.test.ts`: `claimed_at = NULL` older than threshold → finding with name and age; a claimed row → nothing. | 10 | |
| 13 | RPCs `claim-identity` and `register-session` over one shared base; `hello` deleted; `rpcHello` callers in `spawn.ts` and the `restart`/`reset` relaunch sites re-claim | `daemon/rpc.ts`, `daemon/reach.ts`, `commands/spawn.ts`, `commands/lifecycle.ts` | `test/daemon-rpc-identity.test.ts`: `claim-identity` with minted id + token stamps; unknown id → error naming it; `register-session` mints and returns an id, same token again returns the same id; method `hello` → unknown method. `test/one-spelling-per-fact.test.ts`: zero `hello` in `src/`. Lifecycle restart test: `session_token` changed, `claimed_at` moved. | 11 | |
| 14 | `08-identity-registration.md` describes the two RPCs | `TASKS/08-identity-registration.md` | no test. Reviewer greps `08` for `hello` and expects zero. | 13 | |
| 15 | `callerKind()` answers from the claim | `policy/caller.ts` | extend `test/caller-kind.test.ts`: id + recorded token → `"agent"`; id + other token → `"human"`; id + no token → `"human"`; no id → `"human"`. | 6, 11 | 6d69885 |
| 16 | Rename `pack_cap` → `max_agents_per_pack`, `max_agents` → `max_agents_total`, `space_caps` → `max_agents_per_space`; help lines say what each counts; refusals quote the new key | `config.ts`, `types/config.ts`, `settings/registry.ts`, `commands/spawn.ts`, `doctor/config.ts`, `README.md`, every fleet fixture | `test/config.test.ts`: the old key fails zod naming it; the new key loads. `spawn-policy` / `spawn-limits`: refusal strings contain the new keys. `test/settings-registry.test.ts`: each help line contains "agents" or "levels". | — | c776b1b |
| 17 | Delete `spawn_cap`, `ORCH_SPAWN_CAP`, `--spawn-cap`, its `resolveSetting` in `spawn.ts`, README line, fixtures | `config.ts`, `types/config.ts`, `settings/registry.ts`, `commands/spawn.ts`, `README.md`, fixtures | `test/config.test.ts`: `spawn_cap` fails zod. `test/commands-spawn.test.ts`: `--spawn-cap` is unknown. `test/one-spelling-per-fact.test.ts`: zero `spawn_cap` / `ORCH_SPAWN_CAP` in `src/`, `README.md`. | 16 | c776b1b |
| 18 | Type `max_agents_per_pack: number`, delete `?? 10`; sweep `src/` for every `?? <literal>` on a settings read | `commands/spawn.ts`, `types/config.ts`, whatever the sweep finds | `test/one-spelling-per-fact.test.ts`: regex `settings\.\w+(\.\w+)* \?\? [0-9"']` over `src/` matches zero. Gate typecheck fails if the type stays optional. | 16 | |
| 19 | `orch settings` shows `fleet.max_depth` and the renamed limits | `test/settings-registry.test.ts` | `SETTINGS_REGISTRY` has `fleet.max_depth` as `integer, min 1`; full-tree fixture round-trips it; write of `0` refused; `2` lands in `settings.json`. | 16, 17 | |
| 20 | Spawn depth refusal appends `orch settings` | `commands/spawn.ts` | `test/spawn-policy.test.ts`: the depth refusal contains `orch settings`. | 16 | |
| 21 | Worker prompt follows `fleet.max_depth` via `WorkerHeaderContext.maySpawn`; strip survives both variants | `worker-prompt.ts`, `types/core.ts`, `spawn.ts`, `control.ts`, `lifecycle.ts` compose sites, `test/worker-prompt.test.ts` | `test/worker-prompt.test.ts`: `maySpawn: false` → "never spawn"; `maySpawn: true` → "you may `orch spawn`" and not "never spawn"; `stripWorkerHeader` returns the bare task for both. `test/spawn-policy.test.ts`: `max_depth: 1` composes never; `max_depth: 2` composes may. | 16 | |
| 22 | `doctor`: agent deeper than `fleet.max_depth` | `doctor/` | `test/doctor-checks.test.ts`: a depth-2 row under `max_depth: 1` → finding with agent, depth, setting; a depth-1 row → nothing. | 16 | 1e832ee |

`done` holds the short hash of the commit that landed the task. Empty means not done.
Handoff to Bryan: `bun db:gen` after 10.
