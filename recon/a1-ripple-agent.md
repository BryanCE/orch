# A1 ripple — the agent-side key readers

Scope: `src/agent/presence.ts`, `src/agent/peers.ts`, `src/agent/drive-state.ts`,
`src/identity/self.ts`, `src/doctor/presence.ts` and their tests.
Law: TASKS/01-agent-model.md §2/§3, CLAUDE.md Rule 11, audit `recon/a1-audit.md` §1.3, §1.5, §5.

Every one of these files now treats a key as ONE minted id. None of them builds a key, splits a
key, or reads a plexer/space out of one. No `serializeIdentity`, `parseIdentity` or
`tryParseIdentity` import remains in any of the five.

---

## src/agent/presence.ts — §1.3, the severity-2 line

- **Was** `:112` — `ownSessionKey ??= serializeIdentity({ backend: "headless", workspace: "local", id: mintAgentId() });`
  A driving session is inside no plexer and in no space; `"headless"` and `"local"` are the two
  sentinels TASKS/01 §3 outlaws, and this is the line that made the web bucket every session into
  a fake space called `local`. It was also a type error after the `Identity` rewrite.
- **Now** `src/agent/presence.ts:117` — `ownSessionKey ??= mintAgentId();`
- **Also** `:124-125` — `computeKey` no longer round-trips a launch key through
  parse→serialize; it accepts the key only when it IS a minted id:
  `if (rawKey) return isAgentId(rawKey) ? rawKey : undefined;`
- Import at `:12` is now `{ isAgentId, mintAgentId }` — no serializer reaches this file.

## src/agent/peers.ts — the fleet wall stopped parsing keys

- **Was** `:78` — `callerMayCrossFleets()` returned `tryParseIdentity(process.env.ORCH_AGENT_KEY) === null`,
  so a key it could not parse read as "no launch happened" and handed a worker every fleet on the
  machine. Whether orch launched this process is provenance; it is never decided by picking a key apart.
- **Now** `src/agent/peers.ts:83` — `return (process.env.ORCH_AGENT_KEY ?? "").length === 0;`
- **Was** `:189` — `callerAgentId` pulled an id segment out of the key with a raw-string fallback.
  **Now** `src/agent/peers.ts:196` — `return isAgentId(ownKey) ? ownKey : null;`
- **Was** `:91` — a comment claiming identity.ts is "the single escaping authority: every serialized
  identity key segment is already percent-escaped". There is no escaping and no segment any more;
  the comment now says the directory name is the id, with no encoding step either way.

## src/agent/drive-state.ts — the id IS the address

- **Was** `:60` — `function addressedAgentId(key) { return tryParseIdentity(key)?.id ?? key; }`,
  which let a caller name an agent by where it used to sit.
- **Now** deleted. `src/agent/drive-state.ts:65-68` —
  `export function deriveDriveState(agentId: string, …)` / `const agent = agentById(directory, agentId);`
  The parameter is named for what it is; a string carrying a place resolves to no agent.

## src/identity/self.ts — no parse, and no plexer word

- **Was** `:55` — `const spawned = tryParseIdentity(process.env.ORCH_AGENT_KEY); if (spawned) return { id: spawned.id };`
- **Now** `src/identity/self.ts:57-58` — `const spawned = process.env.ORCH_AGENT_KEY;` /
  `if (isAgentId(spawned)) return { id: spawned };`
- `:12` — the module doc listed environment as "plexer, workspace, pane handle, cwd". `workspace`
  is a plexer's word (Rule 11) and is now `space`. The one surviving `<backend>~<workspace>~operator`
  at `:14` is the historical defect being named, not a shape in use.

## src/doctor/presence.ts — a directory name is an id

- **Was** `:49` — `if (!tryParseIdentity(entry.key)) …`
- **Now** `src/doctor/presence.ts:52` — `if (!isAgentId(entry.key)) reasons.push("malformed identity key");`
  with the rule spelled out above it: the directory name IS the agent id, so a
  `<plexer>~<grouping>~<id>` key, a pane handle or a name is a record no agent answers to.
  `describePresenceDir` already read space from `placementOf`, never from the key — unchanged.

---

## Tests

New: **`test/agent-key-is-minted-id.test.ts`** — 12 tests, green. It pins, per file:
a driving session's key is a bare minted id with no `~`/`local`/`headless` in it and its presence
directory is named by that id alone; a composite `ORCH_AGENT_KEY` yields no presence directory and
no `selfIdentity`; a malformed launch key walls the caller in rather than freeing it; a lease is
found by the id itself and a `<plexer>~<grouping>~<id>` string addresses no agent; and doctor calls
a composite directory name malformed.

Red-before-green, recorded:
- `bunx tsc --noEmit` → `src/agent/presence.ts(112,41): error TS2353: 'backend' does not exist in type 'Identity'` (now gone).
- `test/agent-key-is-minted-id.test.ts` → *"a malformed launch key walls the caller in"* failed, listing the
  foreign-project peer, before the `callerMayCrossFleets` fix.
- Baseline across the owned suites: 11 failures (bridge-terminal ×3, peer-lease-visibility ×5,
  peer-identity ×2, peer-project-scope ×1, doctor-backends ×1).

Fixtures repointed off composite keys (the keys are now minted-shaped, `^[0-9a-z]{10}$`):
- `test/bridge-terminal.test.ts` — `"headless~terminal~worker"` → `"worker0001"`.
- `test/peer-lease-visibility.test.ts` — `CALLER/HELD/LOOSE/ORPHAN` + a named `DEAD_ORCH`, all bare ids;
  the lease rows are now keyed by the same constants the presence dirs use.
- `test/peer-project-scope.test.ts` — bare ids; the foreign peer is matched by its `label`, since a
  name is a label and no longer a suffix of a three-segment key.
- `test/peer-identity.test.ts` — bare ids throughout; the provenance-vs-lease test now reads the
  `AgentView` shape (`spawnedBy`, `heldBy.orchId`) instead of the deleted flat `owner`/`spawnedByLabel`
  columns, and registers its spawner session as an agent.
- `test/doctor-backends.test.ts` — the well-formed presence dir is `goodrec001`; `wD-p1` stays the
  malformed one.

## Verification

- `bun test test/agent-key-is-minted-id.test.ts test/peer-identity.test.ts test/peer-lease-visibility.test.ts
  test/peer-project-scope.test.ts test/bridge-terminal.test.ts test/doctor-backends.test.ts
  test/doctor-unscoped-tasks.test.ts test/adapter-session-env.test.ts` → **55 pass, 0 fail**.
- `bunx tsc --noEmit` → no errors in any of the five source files or the eight test files.

## Left alone (not this slice)

- `spaceOf`/`checkWall`/`scopeToSpace` in `src/policy/space.ts` (§3.6) — peers.ts calls them and they
  already read `placementOf`, not a key.
- `recordSpawned`'s `owner` → `adoptLease` path and the `spawned`/`ownership` tables (§2.1, §3.1).
- The `all_workspaces` tool parameter name lives in `src/agent/tools.ts`, outside this slice.
