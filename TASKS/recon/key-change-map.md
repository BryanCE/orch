# J1/J2/J3 key-change recon

Inventory date: current working tree. Read first: `TASKS/02-scope.md` rows J1–J6, Ef2, Ef3 and `TASKS/recon/consumer-map.md` §2. This is facts and slicing only; no tests/build/checks were run.

## 1. Identity serialization/parsing call sites

J1 is a representation change, not a re-mint: `mintAgentId()` already supplies the identity payload. The current key is `<backend>~<workspace>~<minted-id>`; the target key is the minted id alone. `handle` remains a separate backend coordinate.

| file:line | call | what breaks when the key is bare | required replacement direction |
|---|---|---|---|
| `src/backends/identity.ts:104` | `serializeIdentity` implementation | Emits three segments; callers cannot emit the new key shape. | Return/validate the opaque minted id only (or remove structured serializer at the boundary). |
| `src/backends/identity.ts:113,131` | `parseIdentity`, via `tryParseIdentity` | `split("~")`/three-segment validation rejects every bare id. | Bare-id validation must not recover backend/workspace; those come from registry/environment rows. |
| `src/backends/identity.ts:159` | `tryParseIdentity(record.pane)?.id` | Suffix/id lookup never matches a bare registry id. | Compare the registry `agentId`/id directly. |
| `src/entities.ts:95-98` | `tryParseIdentity(process.env.ORCH_AGENT_KEY)`; `serializeIdentity(...)` | Spawned callers lose `selfActor`; operator fallback still manufactures a backend/workspace key. | Use the env id verbatim; operator identity must be daemon-issued id, not serialized backend/workspace. |
| `src/policy/spawner.ts:21,23` | parse then serialize caller key | `spawnedCallerIdentity()` returns null, so provenance/reply address is lost. | Treat `ORCH_AGENT_KEY` as opaque id and pass it unchanged. |
| `src/agent/presence.ts:109-110` | parse then serialize raw key | Bridge skips presence (`computeKey` returns undefined) for a bare env key. | Validate non-empty opaque id and return raw key. |
| `src/agent/peers.ts:73` | `tryParseIdentity(ORCH_AGENT_KEY) === null` | A spawned agent looks like an unspawned operator and can widen `--all` fleet scope. | Determine spawned status from the presence/registration contract, not key parsing. |
| `src/backends/herdr/hud.ts:31` | `tryParseIdentity(ORCH_AGENT_KEY)` | `AGENT_IDENTITY` is null; herdr HUD gate/handle lookup and metadata stop working. | Use registered environment/handle and bare id; do not infer plexer from identity. |
| `src/commands/events.ts:25` | `tryParseIdentity(key)` (`looksLikePaneKey`) | All bare ids are excluded from event stream scope. | Resolve against agent/presence registry; key shape is not a pane test. |
| `src/doctor/presence.ts:47` | `tryParseIdentity(entry.key)` | Every new presence directory is reported malformed. | Check current id/presence schema; do not require backend/workspace segments. |
| `src/commands/target.ts:52,101,114` | `tryParseIdentity` in key test, spawned-agent test, workspace fallback | Key test rejects bare ids; spawned callers become operators; workspace cannot be read from key. | Registry/environment lookup for workspace and spawned state. |
| `src/commands/target.ts:162,201,210` | `parseIdentity(ent.key)`, `parseIdentity(record.pane)` | Backend routing/lifecycle resolution throws on every target. | Read backend from `Entity`/`SpawnedRecord`; read handle separately. |
| `src/commands/target.ts:184` | `tryParseIdentity(record.pane)?.id` | Bare id cannot be reduced to its id, so id-target lookup fails. | Direct id equality. |
| `src/commands/panes.ts:115` | `parseIdentity(ent.key)` then backend comparison | Pane group resolution throws before it can use `ent.paneId`. | Compare resolved entity/record backend to selected backend. |
| `src/commands/spawn.ts:420,510,564` | three `serializeIdentity({ backend, workspace, id: mintAgentId() })` calls | New agents continue to get legacy keys. | `const key = mintAgentId()`; retain backend/workspace as metadata columns. |
| `extensions/claude/index.ts:79` | `parseIdentity(key)` | Claude bridge exits 1 on every bare `ORCH_AGENT_KEY`. | Bare-id validation only. |
| `extensions/codex/index.ts:45` | `parseIdentity(key)` | Codex bridge exits 1 on every bare key. | Bare-id validation only. |
| tests (see §2) | parse/serialize assertions and legacy fixtures | Existing expectations encode 3 segments and backend/workspace-derived behavior. | Rewrite fixtures/assertions in the same slice; no dual-format acceptance. |

### Test-only identity calls (all must change with the identity slice)

- `test/answer-dispatch.test.ts:26` (serialize)
- `test/check-bridge.test.ts:142,154,158,170` (static serializer examples)
- `test/claude-adapter.test.ts:15` (serialize)
- `test/cli-backends-herdr-headless.test.ts:124,129,165,171,173` (serialize/parse/tryParse)
- `test/cli-backends-tmux.test.ts:56,59` (serialize/parse)
- `test/commands-panes.test.ts:6` (parse)
- `test/control-dispatch.test.ts:30` (serialize)
- `test/identity.test.ts:18,19,24,26,31,32,39,40,48,49,53,59` (all identity API behavior)
- `test/presence-schema.test.ts:78,91,110` (parse)
- `test/spawn-identity.test.ts:64` (parse)

## 2. J2 fixture inventory

Counts below are literal occurrences in test files of `(herdr|headless|tmux)~` plus the explicit pane-handle form `w[A-Z][A-Za-z0-9]*-p[A-Za-z0-9]+` (so imports such as `worker-prompt` are excluded). `K` is legacy prefixed-key occurrence count; `H` is pane-handle occurrence count. Every listed line needs review; some lines contain multiple strings.

| test file:lines | total | K/H |
|---|---:|---:|
| `test/backend-tmux.test.ts:210,222,236,241-242,249,255-256,261,291,295-296,304,329,338-339,350` | 17 | 17/0 |
| `test/broker-governance.test.ts:30,32,37,42-43,48-49,54-57,62-63,68-70,75-77,84,90-92,98,104,112-116,122,127-131` | 57 | 57/0 |
| `test/broker-ownership.test.ts:41-44,46,51` | 9 | 9/0 |
| `test/claude-hooks-shim.test.ts:71,74,76` | 3 | 3/0 |
| `test/cli-backends-herdr-headless.test.ts:171` | 1 | 1/0 |
| `test/cli-backends-tmux.test.ts:57,118-120,123` | 6 | 6/0 |
| `test/close-always.test.ts:59-61,78,94,107,121,139-141` | 11 | 11/0 |
| `test/codex-adapter.test.ts:100` | 1 | 1/0 |
| `test/command-workspace-fields.test.ts:23,64,70` | 3 | 3/0 |
| `test/commands-events.test.ts:30` | 2 | 2/0 |
| `test/commands-lifecycle.test.ts:8` | 1 | 1/0 |
| `test/commands-panes.test.ts:6` | 1 | 1/0 |
| `test/commands-results.test.ts:44,62,84,133` | 4 | 4/0 |
| `test/commands-runs.test.ts:42-44,57-62,76` | 10 | 10/0 |
| `test/commands-status.test.ts:12,15,46,51,61,76,89,99,106` | 11 | 11/0 |
| `test/commands-target.test.ts:24,27` | 3 | 3/0 |
| `test/daemon-events.test.ts:85,134,163,175` | 4 | 4/0 |
| `test/doctor-backends.test.ts:107-110,116` | 5 | 2/3 |
| `test/doctor-stale-presence.test.ts:38,49,54,62` | 4 | 0/4 |
| `test/event-identity.test.ts:31-33,42` | 4 | 4/0 |
| `test/identity.test.ts:26,39-40,53,59` | 5 | 5/0 |
| `test/notify-events-format.test.ts:29,56,58-60,105,125,128,131-132,137` | 11 | 11/0 |
| `test/owner-scoping.test.ts:113,116,122-123,146,169,187,205,225,244,257,269-270,274-275,280,283,292,298` | 20 | 20/0 |
| `test/peer-identity.test.ts:70,104,108,113,154,162-163,175-176,185,201,204` | 12 | 12/0 |
| `test/peer-project-scope.test.ts:35,39-40,43,48,51,56,67,74` | 9 | 9/0 |
| `test/presence-schema.test.ts:65,71,82,95-96,144,151-152` | 8 | 8/0 |
| `test/recipient-label.test.ts:10,23,25-26` | 4 | 4/0 |
| `test/setup-smoke.test.ts:35,53,60,83` | 4 | 4/0 |
| `test/spawn-names.test.ts:44-45,55-56,64,71` | 7 | 7/0 |
| `test/spawn-policy.test.ts:57` | 1 | 1/0 |
| `test/spawn-preferred-models.test.ts:127` | 1 | 1/0 |
| `test/spawn-registry.test.ts:24,55,66` | 3 | 3/0 |
| `test/store-spawned.test.ts:57,78,82,90,92,94,99,111,123` | 9 | 9/0 |
| `test/work-notify.test.ts:40` | 1 | 1/0 |
| `test/workspace-policy.test.ts:24-25,42-47,64,66-67,74,76-80,84,87-89,93` | 38 | 38/0 |
| `test/workspace-walls.test.ts:13-14,25-26,33-34,38,45,49,57-59,69,73` | 28 | 28/0 |
| **Total** | **317** | **310/7** |

`wD-p1A/B` and `wD-p1` are old pane-coordinate directory fixtures, not minted identity ids; they are specifically J2/J4 migration cases. The prefixed-key fixtures also encode workspace walls and must move workspace data into registry metadata rather than derive it from the key.

## 3. J4 presence-directory naming path

The current path is deliberately identity-key-as-directory-name:

1. `src/presence/writer.ts:31-38` — `presenceRoot(root) = <root>/agents`; `presenceAgentDir(key, root) = join(presenceRoot(root), key)`.
2. `src/presence/writer.ts:41-51` — `ensurePresenceAgentDir` creates that exact directory.
3. `src/agent/presence.ts:430` — bridge computes `ORCH_AGENT_KEY`, then calls `ensurePresenceAgentDir(key)`.
4. `extensions/claude/index.ts:90` and `extensions/codex/index.ts:54` — standalone shims use the same writer.
5. `src/presence/store.ts:37` — `presenceKeyFromDirectoryName(name)` currently identity-maps the directory name.
6. `src/presence/store.ts:245-267` — `loadPresence` enumerates `<root>/agents`, maps each directory name to key, and reads status/result.
7. `src/daemon/events.ts:222,232,236,262,271-272` — daemon watches the same root and calls `presenceAgentDir` per enumerated key.
8. `src/daemon/outbox.ts:26,36-42` and `src/agent/peers.ts:91,94` — directory enumeration/delivery joins use the directory name as key.
9. Cleanup uses the same mapping: `src/presence/store.ts:195-197` (`reapSpawnedRecord`), `src/commands/lease.ts:114,124-125`, `src/commands/lifecycle.ts:116,160,175,205`, and `src/commands/clean.ts:removeDeadAgentDirs`.

For J4 the function shape can stay (`presenceAgentDir(id)`), but the value passed becomes the bare minted id. Existing `<backend>~<workspace>~<id>` and pane-handle directories are old shape: do not migrate/rename them. They must remain enumerable as malformed/stale and be removed by the explicit reap path. `src/doctor/presence.ts:47` must stop calling the old 3-segment parser and instead identify old directories by the current presence/id/schema rules.

## 4. J5 schema bump sites

- `src/store/schema.ts:8`: `STORE_SCHEMA = 6` (single constant site). `src/store/connection.ts:114-121` compares `PRAGMA user_version`, recreates a populated mismatched store, then stamps `PRAGMA user_version = STORE_SCHEMA` at line 121. `src/doctor/store.ts:90-101` reports the same stamp.
- `src/presence/schema.ts:9`: `PRESENCE_SCHEMA = 2` (single constant site). Readers gate on it in `src/presence/writer.ts:95-104`, `src/presence/store.ts:121-136`, `src/backends/headless/index.ts:85`, and `src/doctor/presence.ts:48`; writers stamp it in `src/agent/presence.ts:147,218`, `src/presence/writer.ts` callers, and extensions through the shared writer.

Both constants must bump together with their writer/reader tests. Old stores are recreated/reaped, and old presence dirs are reaped; no compatibility branch accepts both key shapes. Tests that assert `STORE_SCHEMA`/`PRESENCE_SCHEMA` dynamically mostly follow the constants, but malformed/legacy fixtures listed above must be intentional old-shape reap cases.

## 5. J3: `spawned.pane` → `agents.id` consumer map

The old `SpawnedRecord.pane` is already carrying the canonical identity key (despite its name). J3 changes the database/row API to an agent id (`agents.id`), while `handle` remains the backend-native coordinate. Consumers below either use the field directly or rely on maps keyed by it.

### Production

- `src/store/schema.ts:8,20-31,68-73,98-103` — legacy `spawned` DDL and ownership join; new rebuild DDL already defines `agents`.
- `src/store/spawned-rows.ts:8,32,49,68-120` — `SpawnedRecord.pane`, row conversion, insert/upsert key, select/join predicates, rename/delete. This is the primary rename/API seam.
- `src/presence/store.ts:162,182,186-197` — `recordSpawned(pane)`, `Map` key construction, owner keying, reap/delete and presence-dir cleanup.
- `src/backends/headless/index.ts:69,196-197` — reads spawned rows and inserts `{ pane: key }` for detached processes.
- `src/entities.ts:61,95-98,109,120-122,142-163` — spawned map lookup, self actor, handle→id map, managed/presence joins; `record.pane` is mostly implicit as the map key.
- `src/backends/identity.ts:157-163` — target matching and canonical key set; direct `record.pane` comparisons.
- `src/commands/target.ts:122,145-146,167,183-184,193-231` — owner/workspace/target matching, fallback entity construction, backend/handle resolution; all `record.pane` values become agent ids.
- `src/commands/lifecycle.ts:79,108,341,354,406,410-429` — all-record iteration, rename/delete, backend/presence/process lookup, lifecycle target output and kill target construction.
- `src/commands/clean.ts:20` — worktree liveness checks `presence.get(owner.pane)`.
- `src/commands/review.ts:70-71,115-160` — presence/result lookup, review item key and fallback display.
- `src/commands/panes.ts:160-162` — group ownership diagnostics (`record.pane` fallback display).
- `src/commands/events.ts:76` and `src/daemon/orchd.ts:373-379` — spawned record lookup and metadata/provenance response.
- `src/daemon/events.ts:9,197` and `src/agent/registry.ts:1,12` — select-one-by-key/placement lookup APIs.
- `src/daemon/work-loop.ts:71,75` and `src/policy/name.ts:11-21` — registry-to-presence joins by current pane key.
- `src/control/dispatch.ts:44,53,168,190-204` and `src/commands/setup.ts:499-502` — spawned map lookups; these become id-keyed without changing behavior.
- `src/backends/herdr/index.ts`/`src/backends/tmux/index.ts` inventory paths — backend pane `handle` is not the new primary id; preserve the separate handle→agent-id association.

### Tests/helpers with direct registry-key assumptions

`test/store-spawned.test.ts`, `test/spawn-identity.test.ts`, `test/backend-headless.test.ts`, `test/cli-backends-herdr-headless.test.ts`, `test/cli-backends-tmux.test.ts`, `test/workspace-policy.test.ts`, `test/owner-scoping.test.ts`, `test/spawn-policy.test.ts`, `test/spawn-names.test.ts`, `test/broker-ownership.test.ts`, `test/commands-results.test.ts`, `test/commands-runs.test.ts`, `test/review.test.ts`, and `test/smoke.sh` insert/lookup/assert `pane` as the registry identity. Update helper names and expected JSON in the same J3 slice; pane handles in backend inventory fixtures remain handles, not ids.

## 6. Ordered slices (each updates production + its tests; no dual shape)

1. **Prerequisite seam/columns (J6 first).** Land the port/environment columns and agent registry projection so backend, workspace, handle, process, and id are independently available. Add focused registry/placement tests. Keep the legacy key only until the seam is complete; do not add compatibility parsing.
2. **Registry primary-key slice (J3).** Rename the row/API concept from `SpawnedRecord.pane` to agent id, update `spawned` consumers and all helper fixtures, and make `handle` the only pane coordinate. Bump `STORE_SCHEMA`; rely on recreate-empty behavior for old stores. Run only the affected store/registry tests when the implementer is authorized.
3. **Bare identity core (J1).** Change mint/validate/parse boundary to opaque minted ids, update `spawn.ts`, `entities`, target/lifecycle/panes, spawner, peers, event/doctor checks, and herdr HUD to obtain backend/workspace from registry/environment. Update `identity.test.ts` first (red test for bare id, no legacy acceptance), then its callers. No old parser fallback.
4. **Presence protocol/name slice (J4 + J5).** Keep `presenceAgentDir(id)` as the sole path constructor, switch bridge/shim callers to bare ids, bump `PRESENCE_SCHEMA`, and make doctor/reaper classify old prefixed/handle dirs as old malformed data to reap rather than migrate. Update presence, doctor, bridge, outbox/event-watch tests together.
5. **Fixture and behavior sweep (J2).** Replace all 310 prefixed-key occurrences and seven pane-handle fixtures according to their role: minted id, registry handle, or deliberate old-dir reap fixture. Update workspace-wall tests to source workspace from placement metadata. Add/adjust tests before changing each consumer cluster.
6. **Static/enforcement and final integration.** Update `scripts/check-bridge.ts` rules and golden/static tests to forbid backend/workspace key construction and old-shape assumptions; run the focused affected test files and lint only after each slice. The full gate remains user-owned per repo instructions.

The slices preserve a green tree by never landing a producer without its readers/tests: J3 completes the registry rename before J1 removes parsing, J1 completes all key consumers before J4 changes on-disk directories, and J5 stamps/recreates each changed shape rather than accepting two versions.
