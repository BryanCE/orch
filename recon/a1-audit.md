# A1 audit — the four facts, still welded

Scope: TASKS/02-scope.md row **A1** — *"Entity model: an orch is an agent; four facts never
welded — identity, provenance, lease, environment. Lifetime is not one of them."*
Law: TASKS/01-agent-model.md §2, §10, §11, §12 and CLAUDE.md Rule 11.

Read-only audit. Nothing was fixed.

> **Line numbers are as of this sweep.** Three workers are concurrently repointing consumers
> off `spawned`/`ownership` onto `src/store/agent-view.ts`, and `src/commands/target.ts` moved
> under me mid-audit. **The quoted text is the authoritative locator** — grep the quote if the
> number has drifted.

---

## Verdict

`src/store/agent-view.ts` is correct and is the model A1 asks for. Everything below is the part
of the tree that has not reached it yet. There is **one root cause** — `Identity` is a
three-segment composite carrying a plexer id and a plexer grouping — and roughly thirty
downstream welds that exist only because that key exists. Fix the root and most of §1, §2 and
§5 collapse.

Good news up front, so nobody re-litigates it:

- **There is no lifetime column, anywhere.** `agents` has none, no satellite has one, and
  `agent_endings.ended_at` is an instant, exactly as §5 requires (§4 below is thin on purpose).
- **`abort`, `close` and `reap` are ungated.** `src/commands/lifecycle.ts:609` (`never apply
  owner gates`), `:515` (`Close is an unconditional ending operation`), `:487`, and
  `src/commands/clean.ts` — all correct.
- `src/commands/lease.ts` and `src/store/lease-rows.ts` implement §10 faithfully, liveness
  included.
- `src/doctor/declared-vs-reality.ts` reads the normalized tables only and is clean.
- The backend port (`src/backends/backend.ts`) is already capability-shaped (nullable roles);
  §5 offences are consumers that ignore the roles, not the port.

---

## 1. Identity carrying environment

### 1.1 — `Identity` IS `<plexer>~<plexer-grouping>~<id>` — the root cause  ⚠ SEVERITY 1

- `src/backends/identity.ts:22` — `readonly backend: string;`
- `src/backends/identity.ts:24` — `readonly workspace: string;`
- `src/backends/identity.ts:106` — `return [id.backend, id.workspace, id.id].map(escapeSegment).join(SEP);`
- `src/backends/identity.ts:100-102` (doc) — ``Serialize an identity to a single filesystem-safe key segment `<backend>~<workspace>~<handle>`.``

Welds: **environment (plexer + plexer grouping) into identity**. This is verbatim the bug
TASKS/01 §2 puts on the page (`headless~local~7x5hd4h610`, `herdr~wF~0uh7scyzxh`). The doc
comment on `Identity.id` correctly forbids deriving an id from anything mutable, and then the
two fields above it do exactly that to the key the id lives inside. Because the key is the
presence directory name and the `spawned` primary key, an agent that **moves** plexer or space
cannot keep its identity — which is why moving is not implemented.

Smallest correct fix: make the presence directory and every registry key the bare minted
`agents.id`, delete `Identity.backend`/`Identity.workspace`, and let `agent_plexers` /
`agent_spaces` (which already exist) carry those two facts.

### 1.2 — Every mint site stamps the plexer and the grouping into the key

- `src/commands/spawn.ts:494` — `const key = serializeIdentity({ backend: backend.id, workspace: space, id: mintAgentId() });`
- `src/commands/spawn.ts:635` — `const key = spec.key ?? serializeIdentity({ backend: spec.backend.id, workspace: spec.space, id: mintAgentId() });`
- `src/commands/spawn.ts:919` — `const key = serializeIdentity({ backend: backend.id, workspace: space, id: mintAgentId() });`

Welds: **environment into identity, at birth.** Fix: mint `mintAgentId()` alone and record
`backend`/`space` through `registerSpawnedAgent`, which already writes `agent_plexers` and can
write `agent_spaces`.

### 1.3 — An orchestrator session, which has no plexer and no space, gets `headless~local~…`  ⚠ SEVERITY 2

- `src/agent/presence.ts:112` — `ownSessionKey ??= serializeIdentity({ backend: "headless", workspace: "local", id: mintAgentId() });`

Welds: **environment into identity, using the two literal sentinels TASKS/01 §3 outlaws.** A
driving session is inside no plexer and in no space; `"headless"` and `"local"` are
`NULL` wearing names, and this is the exact line that made the web bucket every detached agent
into a fake space called `local`. Fix: `ownSessionKey ??= mintAgentId()`.

### 1.4 — `parseIdentity` callers use the key to answer environment questions

- `src/commands/target.ts:222-223` — `const id = parseIdentity(ent.key);` / `const backend = getBackend(id.backend);`
- `src/commands/panes.ts:129-130` — `const id = parseIdentity(ent.key);` / `if (id.backend !== backend.id) die(\`Target "${target}" belongs to backend ${id.backend}.\`);`
- `src/commands/target.ts:172` — `return callerSpace() ?? tryParseIdentity(token)?.workspace ?? null;`
- `src/commands/events.ts:77` — `: parsed !== null && (options.all || parsed.workspace === currentSpace());`

Welds: **identity read as environment.** `backendTarget` and `cmdTab` select the *plexer* by
parsing the identity string; `actorSpace` and `orch events --mine` scope by a *space* read out
of the identity string. Each is unfixable-by-move: an adopted or relocated agent answers with
where it was born. Fix: read `agentView(dir, id).environment.plexer` / `.space` instead of
parsing the key.

### 1.5 — Full caller list for `parseIdentity` / `tryParseIdentity` (production only)

`src/store/spawn-registration.ts:29`, `src/commands/panes.ts:129`, `src/commands/target.ts:222`
(+ `tryParseIdentity` at `:104`, `:172`, `:236`, `:290`, `:294`),
`extensions/codex/index.ts:33`, `extensions/claude/index.ts:66`, `src/entities.ts:5/68`,
`src/policy/name.ts:6`, `src/identity/self.ts:55`, `src/daemon/events.ts:12`,
`src/daemon/retention.ts:26`, `src/daemon/orchd.ts:254/256/257`, `src/commands/events.ts:74/79`,
`src/commands/status.ts:445`, `src/commands/lifecycle.ts:404`, `src/agent/presence.ts:121`.

The ones that only want `.id` (`spawn-registration.ts:29`, `orchd.ts:254`, `retention.ts:26`,
`status.ts:445`, `name.ts:6`, `self.ts:55`, `entities.ts:68`, `lifecycle.ts:404`) all become a
no-op once the key IS the id; the ones that want `.backend`/`.workspace` are §1.4.

### 1.6 — A pane handle used AS an identity  ⚠ SEVERITY 2

- `src/entities.ts:134` — `const key = keyByHandle.get(paneId) ?? paneId;`
- `src/commands/target.ts` (`resolveLifecycleTarget`) — `handle: record!.handle ?? ent.paneId ?? … (parsed?.id ?? ent.key)` and `ent ??= { key: record!.pane, paneId: record!.handle ?? null, … }`
- `src/entities.ts:88` — `transportId: record?.handle ?? key,`
- `src/backends/identity.ts:158-159` — `record.pane === target || record.handle === target || tryParseIdentity(record.pane)?.id === target`
- `src/commands/target.ts` (`registryTargetMatches`) — `if (record.pane === target || record.handle === target || record.name === target) return true;`

Welds: **environment (a renumberable plexer coordinate) into identity.** `entities.ts:134` is
the worst: when no registry row maps the handle, the *pane id becomes the entity key*, and every
downstream consumer then treats a coordinate herdr is free to renumber as an agent identity.
Fix: an unmapped pane is an unmanaged pane — give it `key: null` and let it render without one,
never promote its handle.

### 1.7 — `normalizeControlTarget` lives in the identity module and resolves through environment

- `src/backends/identity.ts:137-176` — `export function normalizeControlTarget(target: string): string`
- `src/backends/identity.ts:171` — `const stamped = [...presence].filter(([, entry]) => entry.status?.paneId === target)…`

Welds: **environment into the identity authority.** The module that is meant to be the sole
identity boundary imports the presence store and resolves a user's typed target through pane
ids and names. Fix: move name/handle resolution to a lookup module over `agentViews()`; leave
`identity.ts` holding nothing but mint.

### 1.8 — The gate blesses the composite

- `scripts/check-bridge.ts:398-401` — `const match = /\bserializeIdentity\s*\(\s*\{([^}]*)\}\s*\)/.exec(line);` … `return !/\bmintAgentId\s*\(\s*\)/.test(idExpression);`

Enforces invariant #2 (an id is minted) but **explicitly permits** `serializeIdentity({backend,
workspace, id: mintAgentId()})`, so A1's actual rule has no enforcement at all. Fix: once §1.1
lands, make `serializeIdentity`/`parseIdentity` themselves the banned symbols.

---

## 2. Environment welded onto a row that is not environment

### 2.1 — The `spawned` table is the wide row A1 exists to delete  ⚠ SEVERITY 1

- `src/db/schema.ts:40-54` — `export const spawned = sqliteTable("spawned", { pane: text("pane").primaryKey(), ts, adapter, model, backend, space, handle, name, cwd, worktree, branch, spawnedBy, spawnedByLabel })`
- `src/store/spawned-rows.ts:8` — `export interface SpawnedRecord { pane:string;ts?:number;adapter?:AdapterId;model?:string;backend?:BackendId;space?:string;handle?:string;name?:string;cwd?:string;worktree?:string;branch?:string;owner?:string;spawnedBy?:string;spawnedByLabel?:string }`

Welds: **all four facts in one row.** Identity is the PK (and it is the composite of §1.1);
provenance is `spawned_by`/`spawned_by_label`; environment is `backend`/`space`/`handle`/
`worktree`/`branch`; tuning is `adapter`/`model`; and `owner` is joined in (§3.1). Moving an
agent between plexers means minting a new primary key — precisely the failure `agent-view.ts:17-21`
names. Fix: delete the table and the interface; every field already has a home in
`agents` + `agent_plexers` + `agent_handles` + `agent_spaces` + `agent_worktrees` +
`agent_tunings` + `agent_leases`.

### 2.2 — `runs` keys on the composite and carries a space

- `src/db/schema.ts:70` — `agentKey: text("agent_key").notNull(),`
- `src/db/schema.ts:73` — `space: text("space"),`
- `src/store/run-rows.ts:5` — `export interface RunRecord { dispatchId:string; agentKey:string; adapter?:string; model?:string; space?:string; … }`

Welds: **environment onto a work record.** A run belongs to an agent; the agent's space at the
time is a satellite lookup, not a column on the run, and `agent_key` inherits §1.1's
immovability. Fix: `agent_id TEXT NOT NULL REFERENCES agents(id)`, drop `space`.

### 2.3 — `agents` hub reachable only through `spawned` for space

`registerSpawnedAgent` (`src/store/spawn-registration.ts:36-52`) writes `agent_plexers`,
`agent_handles`, `agent_tunings`, `agent_worktrees` and `agent_leases` — but **never
`agent_spaces`**. Space therefore exists only on `spawned.space`, which is why every space
consumer in §1.4/§5 still parses the identity key. Fix: write the `agent_spaces` row here.

### 2.4 — Presence records carry environment the agent is not allowed to report

- `src/presence/store.ts:49` — `paneId?: string | null;`
- `src/presence/store.ts:52-55` — `worktree?: string;` / `branch?: string;`
- `src/presence/store.ts:130-134` — `&& !("backend" in value) && !("space" in value) && !("handle" in value)`

Welds: **environment onto a self-report.** The schema gate already rejects `backend`, `space`
and `handle` as "a writer claiming to know where it runs" — but `paneId`, `worktree` and
`branch` are the same claim under different names, and `paneId` is then consumed as a routing
address (`entities.ts:174-178`, `identity.ts:171`, `target.ts:236`). Fix: add `paneId`,
`worktree` and `branch` to the rejected set and read all three from `agentView().environment`.

### 2.5 — `Entity` is a second wide row

- `src/entities.ts:18-38` — `export interface Entity { key; paneId; managed; name; tabLabel; agent; focused; backendStatus; backend; presence; sessionPath; presenceOnly; space; host? }`

Welds: **identity (`key`) beside four environment fields.** It is the in-memory `spawned`.
Acceptable only as a *derived* view — but it is built from `spawnedRecords()` and is the input
to every command's resolution, so it is load-bearing. Fix: build it from `agentViews()` and
nest the environment fields under one `environment` object so consumers stop reaching past it.

### 2.6 — Projection rows (lower severity: read models, but the key is still composite)

- `src/commands/status.ts:469-528` — `export interface StatusRow { key; agentId?; paneId; … owner; spawnedBy; worktree; branch; cwd; … backend; … spaceId?; spaceName?; rootAgentId?; … }`
- `packages/web/src/lib/fleet.ts:25-49` — `export interface FleetProjectionRow { key: string; agentId?…; paneId: string | null; … lease: FleetLease | null; spaceId?; spaceName?; spawnedBy?; }`

A read model may compose the four facts — `AgentView` does. What is wrong is only that both
still lead with `key`, the composite. Fix: once §1.1 lands, `key` becomes `id` and both rows
are compliant as written. `FleetProjectionRow` already documents the rule correctly at `:42-45`.

### 2.7 — `NotifyEvent` carries a space

- `src/notify/format.ts:8-9` — `/** Origin space, for display only; absent when the agent has no placement. */` / `space?: string;`
- `src/notify/format.ts:72-73` — `export function spaceLabelForKey(_key: string): string { return "space"; }`

Low severity, already de-fanged (the key-to-space function is stubbed to a constant), but the
field is still populated from `spawned.space` upstream. Fix: resolve at render time from
`agentView().environment.space`.

---

## 3. A second ownership mechanism

### 3.1 — The `ownership` table, and it decides writes *after* the lease already ruled  ⚠ SEVERITY 1

- `src/db/schema.ts:24-28` — `export const ownership = sqliteTable("ownership", { agentKey: text("agent_key").primaryKey(), owner: text("owner").notNull(), updatedAt })`
- `src/store/ownership-rows.ts:7` — `export function setOwner(orchDir: string, agentKey: string, owner: string): void {`
- `src/store/ownership-rows.ts:59-74` — `export function checkOwnerWrite(orchDir, agentKey, actor, opts: { steal?: boolean })`
- `src/daemon/orchd.ts:291-292` — `const owned = checkOwnerWrite(directory, target, actor, { steal });` / `if (!owned.ok) throw new Error(owned.reason ?? "ownership denied the write");`
- `src/daemon/orchd.ts:279-280` — `const owner = getOwner(directory, target);` / `if (owner !== undefined) throw new Error(\`agent is owned by ${owner}; anonymous writes are refused…\`)`

Welds: **a second ownership fact beside the lease.** `governWrite` consults `agent_leases`
(`:255-277`, correct, liveness-checked) and then, having granted, asks a *different* table the
same question and can still refuse. That is two mechanisms deciding who holds an agent, which
is exactly what Rule 11 forbids; it is also the "bare string with no pid and no token" defect
TASKS/01 §10 names by hand. Fix: delete `ownership`, `ownership-rows.ts` and both calls;
`governWrite`'s lease block is already the whole answer.

### 3.2 — Owner strings written at every spawn and adoption

- `src/presence/store.ts:185` — `if (metadata.owner) setOwner(orchDir(), pane, metadata.owner);`
- `src/commands/spawn.ts:667` — `owner: callerOwnerToken(),`
- `src/commands/control.ts:249` — `recordSpawned(key, { … owner: callerOwnerToken(), spawnedBy: spawner.key ?? undefined, … });`
- `src/store/spawned-rows.ts:15` — `… ,owner:ownership.owner}).from(spawned).leftJoin(ownership,eq(ownership.agentKey,spawned.pane));`

Welds: **lease onto the identity row.** `joined()` LEFT JOINs ownership into every
`SpawnedRecord` read, so ownership arrives welded to identity+environment on every single
lookup. `spawn.ts:672` already calls `registerSpawnedAgent`, which calls `acquireLease` — the
lease is written twice, in two shapes. Fix: drop `owner` from `SpawnedRecord`, delete the join,
keep only `acquireLease`.

### 3.3 — `assertAgentOwned` now reads the lease, but does not check the holder is alive  ⚠ SEVERITY 2

- `src/commands/target.ts:205` — `const holder = views ? viewForKey(views, entity.key)?.heldBy?.orchId ?? null : leaseHolderOf(entity.key);`
- `src/commands/target.ts:206-207` — `if (holder !== null && !ownsAgent({ owner: holder, pane: entity.key })) { die(\`Target "${target}" is owned by ${holder}. Use --force to override.\`); }`
- `src/commands/target.ts:175-181` — `export function ownsAgent(record: { owner?: string; pane?: string }): boolean { … if (record.owner === token) return true; … }`

Welds: **lease treated as authorization rather than mutual exclusion.** This landed mid-audit
and is a real improvement, but it has no liveness step — a **dead** holder still refuses the
write, and Rule 11 is explicit that a dead holder is not a collision. `src/daemon/orchd.ts:258`
(`leaseHolderIsAlive`) and `src/commands/lease.ts:126-144`
(`assertNotHeldByLiveForeignOrch`) both already do this correctly. Fix: route this through
`assertNotHeldByLiveForeignOrch`, so there is one gate, not three.

### 3.4 — Owner-string gating still live in two commands

- `src/commands/panes.ts:176-177` — `if (record.owner && record.handle !== undefined && handles.has(String(record.handle)) && !ownsAgent(record)) {` / `die(\`Group ${group} holds agent ${record.pane} owned by ${record.owner}. Use --force to override.\`);`
- `src/commands/lifecycle.ts:99-102` (`ownedAgentKeys`) — `.filter((ent) => ent.presence && ownsAgent(records.get(ent.key) ?? {}))`

Welds: **lease read from `spawned.owner`.** `ownedAgentKeys` is what `--all` expands to for
`reset`/`reload`/`restart`, so the whole bulk path is scoped by the legacy string. Fix: filter
on `agentViews(dir).filter(v => v.heldBy?.orchId === selfId())`.

### 3.5 — A read is ownership-gated

- `src/commands/results.ts:120` — `assertAgentOwned(target, ent, options.force);`

`orch result` is a read. TASKS/01 §10 gates exactly four verbs — `dispatch`, `steer`, `model`,
`reset` — and reading is not one of them; a lease is mutual exclusion between *drivers*, and
two readers cannot interleave. Fix: drop the gate (the space wall already scopes visibility).
Same question, lower stakes, for `orch zoom` / `orch focus`
(`src/commands/panes.ts:251`, `:273`), which change nothing about the agent.

### 3.6 — `operatorControls` grants on a space derived from the identity key

- `src/policy/space.ts:39-41` — `return actor !== null … && sameSpace(actorSpace, spaceOf(orchDir, agentKey));`
- `src/commands/target.ts:172` — `return callerSpace() ?? tryParseIdentity(token)?.workspace ?? null;`

Welds: **environment into an ownership decision.** Whether you may drive an agent is decided by
comparing a plexer grouping parsed out of your own key against one parsed out of the target's.
Fix: `spaceOf` should read `agent_spaces`; `actorSpace` should read the caller's own
`agentView().environment.space`.

---

## 4. Lifetime

**No lifetime column exists.** `agents`, every satellite, and `agent_endings` are clean; there
is no `lifetime`, no `orphaned_at`, no `detached` flag on any row; nothing closes a live agent
on a timer (`src/daemon/retention.ts:16-19` only reaps rows whose `agent_endings` row already
exists and that have no descendants); and `src/seat/manager.ts:8-9` states the rule correctly.
What remains is vocabulary, and vocabulary is how the concept comes back.

### 4.1 — "detached" names a lifetime for what is actually a missing capability

- `src/backends/registry.ts:6-8` — `/** The pane-less backend a daemon-owned detached launch runs on. … */` / `export const detachedBackend: Backend<HeadlessHandle> = headlessBackend;`
- `src/backends/backend.ts:145-146` (doc) — `A detached agent is in no space, so headless composes nothing here`
- `src/adapters/adapter.ts:311` — `/** Build argv for a detached backend, including the initial prompt. */`
- `src/commands/spawn.ts:472-474` (doc) — `A detached agent has no TTY to idle on: it runs its prompt and exits`

Welds: **lifetime vocabulary onto environment.** TASKS/01 §11: "There is no `--detached`,
because there is nothing to detach *from*", and `orch detach` means release the lease and
nothing else — which `src/commands/lease.ts:111-124` implements correctly. Every use above
means "has no pane", not "has a shorter life". Fix: rename to `panelessBackend` /
"pane-less agent" throughout; there is no behaviour to change, only the word that will
otherwise re-grow a flag.

### 4.2 — `StartRequest.detached` is an OS spawn flag wearing the forbidden word

- `src/backends/backend.ts:179` — `readonly detached?: boolean;`
- `src/backends/process.ts:18` — `detached: request.detached ?? true,`

This is genuinely `child_process`'s `detached` (process-group), not an agent lifetime, and the
default is `true` — correct behaviour, work does survive. Fix: none required; rename to
`newProcessGroup` if §4.1 is done, so no reader mistakes it for a lifetime option.

### 4.3 — Nothing else

No `--detached` CLI flag, no grace timer on an agent, no fate-sharing. The only `graceMs` is
`src/daemon/lifecycle.ts:333-334`, which is the daemon waiting for the OS to reap *itself*.
Confirmed clean.

---

## 5. Branching on an environment id

### 5.1 — Plexer selected by parsing the identity key (also §1.4)

- `src/commands/target.ts:222-223` — `const id = parseIdentity(ent.key);` / `const backend = getBackend(id.backend);`
- `src/commands/panes.ts:130` — `if (id.backend !== backend.id) die(\`Target "${target}" belongs to backend ${id.backend}.\`);`

Fix: `getBackend(agentView(dir, id).environment.plexer)`.

### 5.2 — `backend === "<literal>"`

- `src/backends/headless/index.ts:75` — `.filter((record) => record.backend === HEADLESS_BACKEND)`
- `src/commands/setup.ts:609` — `const key = [...after.keys()].find((candidate) => !before.has(candidate) && after.get(candidate)?.backend === "headless");`
- `src/entities.ts:120` — `if (record.backend === backend.id && record.handle) keyByHandle.set(record.handle, key);`

`headless/index.ts:75` is a backend selecting its own rows — tolerable inside `src/backends/<plexer>/`.
`setup.ts:609` is core code identifying its own smoke-test agent by plexer literal, and
`scripts/check-bridge.ts:216-232` **whitelists that exact string**, so the guard now protects
the violation. Fix for `setup.ts`: have `cmdSpawn` return the key it minted rather than
diffing the registry by plexer id.

### 5.3 — `handle === null` deciding behaviour

- `src/commands/lifecycle.ts:612` — `if (!entity.paneId || !input) {`
- `src/entities.ts:223` — `paneId: backend?.paneInventory ? record.handle ?? null : null,`
- `src/commands/status.ts:582` — `if (v.entity.backend === null) return null;`
- `src/commands/target.ts:236` — `const handle = ent.paneId ?? (records ?? spawnedRecords()).get(ent.key)?.handle ?? ent.key;`

`lifecycle.ts:612` is the clearest: `abort` checks the declared capability (`!input`) **and**
`!entity.paneId`. The second clause is the `handle === null` mistake — a missing coordinate is
not a missing capability, and TASKS/01 §12 says delivery is orch's mechanism and a pane is an
optimisation. Fix: branch on `backend.paneInput` alone; if the role exists and the handle is
absent, that is a broken environment row for doctor, not a silent "does not apply".

### 5.4 — A plexer's grouping read as orch's space

- `src/entities.ts:108` — `return resolveBackend({}).identity?.current()?.workspace ?? null;`
- `src/entities.ts:157` — `space: target.workspace ?? spaceOf(orchDir(), key),`
- `src/commands/target.ts:213` — `return backend.identity?.current()?.workspace ?? null;`
- `src/commands/panes.ts:146-147` — `const workspace = backend.identity?.current()?.workspace ?? null;` / `const tabs = groups.filter((tab) => all || workspace === null || tab.workspace === workspace);`
- `src/doctor/backends.ts:143` — `space: backend.identity?.current()?.workspace ?? null,`
- `src/commands/spawn.ts:993` — `const space = tab.workspace ?? callerSpace();`
- `src/commands/events.ts:77` — `parsed.workspace === currentSpace()`

Welds: **the plexer's grouping used as orch's own.** Rule 11: "orch's own grouping is a
**space**; 'workspace' is a plexer's word and never appears in orch's model." `panes.ts:146`
is legitimate — it filters the plexer's own tab list by the plexer's own grouping, and
`:158-166` labels the column `WS` deliberately. The rest are not: they hand a herdr id to
orch's space policy. Fix: `currentSpace()`/`callerSpace()` read `agentView(selfId()).environment.space`.

### 5.5 — `"local"` as a space, twice more

- `src/commands/spawn.ts:479` — `const space = settings.space ?? "local";`
- `src/commands/status.ts:655` — `return { ...snapshot, rows: scoped.map((row) => ({ ...row, host: "local" })) };`

Welds: **a missing value given a name** (TASKS/01 §3: "`\"local\"` is the entire reason this
rule is written down"). `spawn.ts:479` then feeds that literal into name-uniqueness and
capacity policy. Fix: `const space = settings.space ?? null;` and let the space axis be absent;
for `status.ts:655`, `host: null` for the local host.

### 5.6 — Name uniqueness scoped by an environment fact

- `src/policy/name.ts:21` — `agentName(record.pane) === name && record.space === space && presence.get(record.pane)?.alive);`

Welds: **environment into naming.** A name's uniqueness scope is a plexer grouping, so moving
an agent could collide two names that were legal at spawn. TASKS/01 §6a: names carry no
uniqueness at all and ambiguity is a lookup. Fix: scope the live-name check to the *pack* (the
provenance root) or drop it to the ambiguity path §6a describes.

### 5.7 — Closed plexer set where TASKS/01 §3 asks for a lookup table

- `src/backends/backend.ts:221` — `export const BACKEND_IDS = ["herdr", "tmux", "headless"] as const;`
- `src/config.ts:98/102` — `backends: z.array(z.enum(BACKEND_IDS)),`

TASKS/01 §3: "**Harnesses and plexers are rows**… adding one is data plus a provider
registration, never a schema change." The `plexers` table already exists
(`src/db/schema.ts:96-100`) and `ensurePlexer` already writes it, but the union is what config
validation and `SpawnedRecord.backend` are typed against, so adding a plexer still edits core
files. Low severity today, but it is the seam A15 promises. Fix: validate against the
`plexers` table at load, keep the union for the *bundled* providers only.

---

## Suggested order of attack

1. §1.1 + §1.2 + §1.3 — make identity the bare minted id. This deletes §1.4, §1.5, §5.1, §5.5
   and half of §5.4 as a side effect.
2. §3.1 + §3.2 + §3.3 — one lease, liveness-checked, and delete `ownership`.
3. §2.3 then §2.1 + §2.2 — write `agent_spaces`, then delete `spawned` and repoint `runs`.
4. §2.4 + §1.6 — stop treating a pane coordinate as an address.
5. §4.1 — rename "detached" before the word grows a flag back.
