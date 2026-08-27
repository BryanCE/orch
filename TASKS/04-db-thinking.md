# Database design — the reasoning

Why the schema in `01-agent-model.md` is shaped the way it is. Claims here are marked
**[held]** (reasoned from first principles, not yet checked against outside practice),
**[confirmed]** (checked against primary sources — see `05-db-research.md`), or **[revised]**.

---

## 1. The shape: a hub with satellites

`agents` is the hub — identity plus facts that cannot vary. Every time-varying fact is its own
table with a validity interval. Reads compose them into one object.

**Why not one wide `agents` row.** The facts that vary vary independently. An agent changes
model without moving pane; joins another space without either. A wide row restates unchanged
facts on every write and destroys the previous value.

**Why not one `agent_environments` row.** Same argument one level down, and worse: a single
`since`/`until` pair would claim separate histories share one timeline, which is simply false.

**Why the directory is not one of them.** A running process cannot change its directory — only
a process can `chdir` itself and no agent harness does — so that satellite would hold exactly
one row for every agent that ever existed. It sits on the hub with the harness.

**[held]** The correct grain for a satellite is *one independently-varying fact*, and the test
for "independently" is whether there exists an operation that changes it while leaving its
neighbours alone.

## 2. What went on the hub, and why

| fact | where | reason |
|---|---|---|
| `id` | hub | identity, immutable |
| `spawned_by` | hub | provenance, immutable |
| `root_agent_id` | hub | immutable function of immutable inputs |
| `harness_id` | hub | constitutive — no operation changes it |
| `cwd` | hub | a live process cannot be moved, and every agent has one |
| `name`, `label` | hub | 1:1, and no history is needed because no code reads a name |

**[held]** An immutable fact must not be a satellite. Putting it in one invites the question
"which is current?", implying an answer that could differ from "which was it created with" —
a distinction that does not exist.

## 3. The materialized `root_agent_id`

A pack is the set of agents sharing a provenance root. That is derivable with `WITH RECURSIVE`
over `spawned_by`, and the received rule is *do not store what you can derive*.

**The rule does not apply here, and the reason is precise:** a cached value can only drift if
one of its inputs can change. `spawned_by` is immutable, therefore the root is immutable,
therefore there is no update path that could ever make the cache wrong. It is computed once at
insert — the parent's root, or the agent's own id when there is no parent — and never touched.

**[held]** Materializing a function of exclusively immutable inputs is not denormalization in
the sense the rule warns about. The rule targets values that can silently disagree with their
source; this one cannot.

The payoff is that every pack query — the most common scoping query in the system — becomes an
indexed equality test instead of a recursive walk.

## 4. The temporal contract

Three satellites plus processes plus leases all carry `since` / `until`. Hand-rolling that five
times is how the implementations drift apart, so one contract governs all of them:

- validity is the **half-open interval** `[since, until)`; `until IS NULL` means open
- `CHECK (until IS NULL OR until > since)` — no inverted or zero-length intervals
- a **partial unique index** on `(agent_id) WHERE until IS NULL` — at most one open interval

**[held]** Half-open is the right convention because adjacent intervals then meet exactly:
the closing row's `until` equals the opening row's `since`, with no gap and no shared instant
that two rows both claim.

### The gap this leaves, stated rather than hidden

The partial index prevents two *open* intervals. It does **not** prevent two closed intervals
overlapping in history. SQLite has no exclusion constraint (Postgres would do this with
`EXCLUDE USING gist`), so the invariant rests on two architectural facts:

1. **orchd is the single writer** (M1).
2. every close-then-open pair happens in **one transaction**.

**[held]** That is acceptable, but it is a standing requirement on the architecture, not an
implementation detail — if a second writer ever appears, this invariant is the first casualty.

## 5. Types, chosen from purpose

- **Agent ids are `TEXT`**, minted and opaque, because a human types them (`orch dispatch
  trmcsf8ifc`) and they name presence directories. Not a UUID — 36 untypeable characters. Not an
  INTEGER surrogate alongside a TEXT natural key: two identifiers for one thing is how one leaks
  into the other's place.
- **Satellite PKs are `INTEGER`**, because nobody types them and monotonicity is useful —
  `agent_leases.id` doubles as a **fencing token**, so a woken zombie orch presenting an older
  lease id is rejected.
- **Instants are `INTEGER` epoch milliseconds.** The dominant operation is arithmetic (age,
  expiry, retention), not display. TEXT forces a parse per row; 8 bytes versus 24; no timezone
  can be wrong.
- **Extensible sets are lookup tables** (`harnesses`, `plexers`, `hosts`) because adding one must
  be data, never a migration. **Closed sets are `TEXT` + `CHECK`** (`release_reason`) because
  they change only when the lifecycle model itself does, and the constraint belongs where a
  reader sees it.
- **Absence is `NULL` and nothing else.** `"local"` as a value is the entire reason this is
  written down.
- **Prefer a nullable instant to a boolean.** `until` carries strictly more than `is_closed`
  for the same cost: not just whether, but when.

## 6. Constraints the database enforces, not the application

- `PRAGMA foreign_keys = ON` — without it every `REFERENCES` clause is a comment.
- `STRICT` tables — declared types enforced rather than advisory.
- partial unique indexes for "at most one current X".
- `CHECK ((until IS NULL) = (release_reason IS NULL))` — a lease is closed **iff** it says why.
- `CHECK (orch_id <> agent_id)` — nothing leases itself.

**[held]** Every invariant left to application code is a wish. The repo's own history is the
evidence: rules written in prose were broken by code whose authors had read the prose.

## 7. Deliberately not built

**A `subjects` supertype.** Satellites key on `agent_id` because an agent is the only owner
today. When a second owner needs an environment — a space, or a pack given a real row — the
correct move is `subjects(id, kind)` referenced by `agents.id` and `spaces.id`, with satellites
keying on `subject_id`. Building it first is speculative generality; recording the migration
path makes it a decision instead of a discovery.

**A `packs` table.** A pack is the provenance root: a query, not a row. Giving it a table
creates a second truth about membership that can disagree with `spawned_by`.

**An EAV / generic attribute table.** `facts(subject, kind, value, since, until)` accepts any
future axis for free and costs every type and every foreign key. That trades the database's
ability to say *no* for flexibility we can get instead by adding a narrow table.

---

## Open questions for research

1. Is hub-and-satellite the right frame, or should this be explicit **Data Vault** /
   **anchor modelling** / **6NF**? What do those buy that this doesn't?
2. Is half-open `[since, until)` genuinely the consensus, or is closed-closed defensible?
3. Is there a SQLite-side way to prevent overlapping closed intervals that I have missed?
4. Is a **bitemporal** model (valid time *and* transaction time) warranted here, or is
   single-timeline the right call for an operational store?
5. Does the materialized-immutable-root argument hold up against published practice on
   transitive closure / hierarchy storage (adjacency list, closure table, nested sets)?
6. Is `STRICT` + partial indexes + `CHECK` the current best practice for SQLite operational
   stores, and what am I leaving on the table (`WITHOUT ROWID`, generated columns, triggers)?
