# The launch credential — what `ORCH_AGENT_KEY` is, and what it is not

Companion to `TASKS/08-identity-registration.md` (how a *driving session* gets an id via
`hello`) and `TASKS/01-agent-model.md` (four facts, never welded). This document covers the
other entry: how a *spawned* agent learns the id orch minted for it, and the four unrelated
jobs that one env var has quietly been made to do.

---

## 1. The verdict on the mechanism

**An env var is the right carrier. Keep it.**

The id is minted before launch (Rule 11, invariant 2 of `08`), and the process it must reach
is exec'd by the plexer, not by orch. Env is the only channel that survives that hop on every
OS, needs no daemon at startup, has no race, and lands in every harness's in-process extension
without touching any harness's argv. `TMUX_PANE`, `SLURM_JOB_ID`, `GITHUB_RUN_ID`,
`INVOCATION_ID`, the Kubernetes downward API — same pattern, same reason.

Every alternative was weighed and loses on a Rule, not on taste:

| carrier | why not |
| --- | --- |
| CLI flag on the harness | the extension is in-process; three harnesses filter argv three ways |
| a file in cwd / the worktree | environment wearing identity's hat — the exact 2026-08-26 bug |
| ask the plexer "which pane am I" → DB | branches on an environment id; a capless environment has no handle |
| pid / ppid chain, `SO_PEERCRED` | pids recycle, shells wrap, the plexer is the real parent, node exposes none of it portably (Rule 6, `08` §transports) |
| inherited fd / first line of stdin | does not survive the plexer hop; stdin belongs to the TUI |

Every "discover yourself" scheme still needs *some* correlator, and that correlator has to
ride in env. So the design question is not *whether* env, but **what rides in it, who reads
it, and what it is allowed to mean.**

## 2. What is wrong today

Twenty-one runtime files read `process.env.ORCH_AGENT_KEY` directly, and use it as **four
different facts**:

| meaning | readers |
| --- | --- |
| **identity** — "my minted id" | `identity/self.ts:25`, `presence/writer.ts:114` (`launchKey`), `agent/presence.ts:85`, `backends/herdr/hud.ts:46`, `backends/herdr/index.ts:266`, `backends/tmux/index.ts:222` |
| **caller kind** — "am I a human or an agent?" | `agent/peers.ts:41`, `agent/monitor.ts:170`, `store/connection.ts:79`, `policy/close-authority.ts:20`, `commands/lifecycle.ts:860`, `commands/target.ts:163`, `daemon/rpc.ts:831`, `extensions/claude/index.ts:65`, `extensions/codex/index.ts:32` |
| **lock owner** | `commands/lock.ts:11` — `ORCH_AGENT_KEY ?? user:<pid>` |
| **authority** — "what may I end?" | `callerAuthority(process.env.ORCH_AGENT_KEY)` |

Plus two carriers that copy the *name* of the variable: the shim env allow-list
(`adapters/session-env.ts:29`) and a shell string baked into Claude hooks
(`adapters/claude-hooks.ts:34` — `[ -n "$ORCH_AGENT_KEY" ] || exit 0`).

Three consequences, all live:

1. **"No key = human" is a guess.** Env is inherited by everything the agent spawns: a `bash`
   the agent opens, a tool that shells out to `orch`, a human who drops into the pane. All of
   them carry the key and are treated as *that agent* — with its lease, its lock name, its
   close authority, its fleet wall. `peers.ts` already had to widen from "did it parse" to
   "is it present" once, because a malformed key read as *no launch at all* and handed a
   worker the whole machine.
2. **A copied or stale key is indistinguishable from the real one.** A recycled pane, a
   respawn that reuses a key, or two processes launched with the same env all write into
   the same presence dir and the same row. Nothing records that a second claimant appeared.
3. **The carrier cannot be changed.** Swapping the mechanism means editing twenty-one files
   and a shell string. That is the definition of a leak: a decision made in one place that
   every other place has memorised.

And one naming debt: the variable is called **KEY** because it once carried
`<backend>~<workspace>~<handle>`. It now carries the bare minted id (`self.ts:25`: "the key is
the whole id, so there is nothing to parse"). The word is the retired shape.

## 3. The tasks

Each task is independently landable. Order is the order that keeps the gate green.

### T1 — One reader

`process.env.ORCH_AGENT_KEY` is read in **exactly one** module, and that module is a leaf.

- New leaf `src/identity/launch.ts`: `launchCredential(): string | null` — reads the var,
  validates with `isAgentId`, returns the id or `null`. Present-but-malformed is a wiring
  error and exits the way `launchKey` does today (that logic moves here; `launchKey` in
  `presence/writer.ts` is deleted).
- It must be a **leaf** (imports only `backends/identity.ts` and the logger) because
  `store/connection.ts` documents an import cycle that forced it to re-read env rather than
  call the identity layer. A leaf breaks the cycle instead of working around it.
- `identity/self.ts` calls `launchCredential()`. Every other reader in §2 goes through
  `selfIdentity()` / `selfId()` — or through the caller-kind function in T2.
- The two *name carriers* (`session-env.ts` allow-list, `claude-hooks.ts` shell string)
  import the variable name from one exported constant `LAUNCH_ENV` in `launch.ts`. No
  string literal of the name exists anywhere else.
- **Enforcement:** `scripts/check-bridge.ts` gains `checkLaunchEnvReadLine` — any
  `process.env.ORCH_AGENT_KEY` (or its successor name, T4) outside `src/identity/launch.ts`
  fails the gate. The `extensions/` scan is already recursive (Rule 10); this check rides it.

### T2 — Four meanings, four functions

The four uses in §2 become four named questions, each answered in exactly one place.

| question | function | lives in | replaces |
| --- | --- | --- | --- |
| who am I | `selfIdentity()` (exists) | `identity/self.ts` | six identity readers |
| was I launched by orch | `callerKind(): "human" \| "agent"` | `policy/caller.ts` (new) | nine presence-checks |
| who holds this lock | `selfId() ?? \`user:${pid}\`` inline in `lock.ts` via `selfId()` | `commands/lock.ts` | the raw read |
| what may I end | `callerAuthority(self: SelfIdentity \| null)` | `policy/close-authority.ts` | the `string \| undefined` parameter |

`callerKind()` is the single home for the human/agent distinction. Its rule today is
"launch credential present ⇒ agent" — the same guess as before, but now stated once, so
when T3 gives it a better answer (a *claimed* identity rather than a present variable) nine
sites change to zero.

Specific deletions:
- `peers.ts` `callerMayCrossFleets`, `monitor.ts` `registerFleetMonitor` guard,
  `connection.ts` `callerIsSpawnedAgent`, `target.ts:163`, `lifecycle.ts:860` → `callerKind()`.
- `extensions/claude/index.ts` / `extensions/codex/index.ts` → `launchCredential()` from
  the presence writer's re-export (extensions import orch's presence layer, never env —
  Rule 10).
- `backends/herdr/index.ts:266`, `backends/tmux/index.ts:222`,
  `backends/herdr/hud.ts:46` → `selfIdentity()`. A backend asking "who is the caller" is
  not a backend concern at all; the call sites that need it should receive the id as a
  parameter from the command layer. Audit each and prefer passing it down.

### T3 — A claim, recorded

**Decided** — the claim binds to the harness session token; §5 has the full shape. Settled:

- The agent row gains a **nullable instant** `claimed_at` (Rule 11: an instant says *when*,
  a boolean only *whether*). `NULL` means launched-but-never-heard-from — which is itself a
  reportable state (`doctor`: "spawned N minutes ago, never claimed").
- The first contact from the launched process stamps it. A **second** claim that is not the
  same process lineage is a **collision**, recorded, never silent.
- `callerKind()` (T2) then answers from the claim, not from the variable's presence.
- No version bump (Rule 14). `insertAgent` and every fixture gain the column in one change.

The second claimant is told apart by the harness session token recorded at first contact;
`claimAgent(id, sessionToken, now)` is the one writer (§5).

### T4 — Rename to `ORCH_AGENT_ID`

Mechanical, after T1 (so it is one constant, one shell string, and the test helpers):

- `LAUNCH_ENV = "ORCH_AGENT_ID"` in `launch.ts`.
- `policy/spawner.ts:72`, `commands/spawn.ts:600,871`, `backends/headless/index.ts:144-148`
  and the `types/backend.ts` doc comments: `key` → `id` in the env record. `SpawnRegistration.key`
  stays for now — that is the store's word and is a separate rename.
- `launchKey` (deleted in T1), `computeKey` in `agent/presence.ts`, `holderName` in
  `lock.ts`: rename to what they return.
- `test/helpers/presence.ts` and every test that sets the env by literal name → the constant.
- Not a schema change; nothing published (Rule 14). Every writer, reader and fixture in one
  commit.

### T5 — The doc comments that memorised the guess

`close-authority.ts:20`, `rpc.ts:831`, `spawn.ts:577`, `monitor.ts:164`, `peers.ts:36`,
`connection.ts:70` each *explain* the "no key = human" rule in prose. After T2/T3 they point
at `callerKind()` and say nothing else — prose that restates a rule enforced elsewhere goes
stale the moment the rule moves (`08` §"why prose does not hold").

## 4. Invariants

| # | invariant | enforced by |
| --- | --- | --- |
| 1 | The launch env var is read in one file. | `checkLaunchEnvReadLine` in `scripts/check-bridge.ts` (T1) |
| 2 | The variable's *name* exists as one exported constant. | same check, extended to the string literal |
| 3 | Human-vs-agent is decided by `callerKind()` and nowhere else. | invariant 1 makes any other decision impossible to write — there is nothing else to read |
| 4 | The credential is identity, never authorization. | `callerAuthority` takes `SelfIdentity`, not a string; the lease gates driving verbs (`01` §ownership); `abort`/`close`/`reap` are never gated |
| 5 | A second claimant is recorded, never merged. | `claimed_at` + collision row (T3) — **NONE until T3 lands** |

## 5. Decided: a claim binds to the harness session token

**Decision 2026-08-29 (Bryan).** The "bootstrap token → lease" idea was weighed and reduced to
what it actually buys in this trust model. After a one-shot token is spent, every later `orch`
the agent runs is a fresh child that has only what env gave it — and anything a child can
find, a nested shell in the same pane can also find, because it is the same uid (`08`: same
uid *is* the trust boundary; node sees no smaller one portably, Rule 6). So a single-use
token detects a **second claimant** and nothing more. It cannot isolate children from the
parent. No env scheme can.

The correlator that gives exactly that detection already exists: every adapter declares
`sessionIdEnv`, the harness's own session id, which `hello` already uses for driving
sessions. **The claim records it. Nothing new is minted.**

### Two moments, two actors

| moment | who acts | what happens |
| --- | --- | --- |
| **spawn** | the spawner | mints the id, inserts the agent row (`claimed_at = NULL`), stamps `ORCH_AGENT_ID=<id>` into the pane env, hands off to the plexer. The spawner never sees a session token — the harness process does not exist yet. |
| **first contact** | the spawned agent | the harness boots, its extension (`extensions/<harness>/`) fires carrying **both** `ORCH_AGENT_ID` (from orch) and the harness's session id (from the harness). Its first write says "I am `<id>`, my session is `<token>`". orch stamps `claimed_at` and `session_token` on the row. |

The spawner's own identity is untouched: it registered via `hello`, or was itself claimed
the same way when *it* was spawned.

### What `callerKind()` becomes

| caller carries | verdict |
| --- | --- |
| id + the recorded session token | **the agent** — including `orch` run from its own Bash tool, which inherits both |
| id + a different token, or none | **not the agent** — a human who dropped into the pane, or a stale/copied env |
| no id | human at a terminal |

A harness that exports no session token falls back to its open process instance, as `08`
already specifies for `hello`. A second claim whose token differs from the recorded one is a
**collision**, recorded as an event, never merged into the row.

### The three calls

- **Binding:** the harness session token (above). Rejected: a spawn nonce + presence-dir
  file (same reach, more machinery); `claimed_at` alone (cannot tell a second claimant apart).
- **Collision policy:** **accept and flag.** Refusing the second claimant's writes could
  strand a legitimately recycled pane, and `abort`/`close`/`reap` must stay reachable from
  anywhere (Rule 11). A collision is an event row `doctor` and `status` surface; the driving
  verbs stay gated on the lease, which was never the credential.
- **Claim point:** the daemon's `hello` is the entry point (`08` invariant 1). The presence
  writer runs without a daemon, so it may write `status.json` for an unclaimed id **only
  while no daemon is reachable**; once one is, an unclaimed id is refused with the
  instruction to `hello`. One function, `claimAgent(id, sessionToken, now)`, stamps the
  column from either path.

T3 in §3 is unblocked by this section; invariant 5 in §4 gets its enforcement when T3 lands.
