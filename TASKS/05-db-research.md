# Database design — research findings

Checked the claims in `04-db-thinking.md` against published practice. Each finding says what
was claimed, what the sources say, and what changed.

---

## 1. Half-open `[since, until)` — **CONFIRMED**

**Claimed:** half-open is right because adjacent intervals meet exactly, with no gap and no
instant two rows both claim.

**Found:** this is the standard convention and the stated reason is identical. Temporal tables
conventionally use closed/open intervals — the start is included, the end excluded — so *the end
of a preceding period is identical to the start of the next*, which also makes the **granularity
of the period irrelevant** (year, day, millisecond — the convention holds unchanged).

That last part is a benefit the reasoning had not reached: with closed-closed you must know the
granularity to compute "the instant before", and that assumption breaks the day precision
changes. Epoch-millisecond instants make this concrete — closed-closed would force `until` to be
`since_of_next − 1ms`, hard-coding millisecond granularity into every comparison.

**Change:** none to the schema. Reasoning strengthened.

## 2. Overlapping closed intervals — **REVISED, and the schema changes**

**Claimed:** SQLite has no exclusion constraint, so the no-overlap invariant can only rest on
single-writer discipline. Documented as an accepted gap.

**Found:** correct that SQLite has no `EXCLUDE USING gist` — but wrong that nothing can enforce
it. The accepted workaround is a **trigger** running the standard overlap predicate
(`new.since < existing.until AND new.until > existing.since`) and raising on a hit. Application-
level checking is explicitly called out as the *weak* option because of the race between the
check and the insert; a trigger runs inside the same transaction and has no such window.

**This was the design failing its own rule.** `01-agent-model.md` §13 says an invariant whose
enforcement is `NONE` is a wish, and I had written one down as an accepted gap while an
enforcement mechanism existed.

**Change:** a `BEFORE INSERT` trigger per satellite enforcing non-overlap. Single-writer
discipline stops being the guarantee and becomes merely a performance assumption.

## 3. Hub-and-satellite — **CONFIRMED as Data Vault, with one caution**

**Claimed:** hub of immutable identity, satellites for independently-varying facts.

**Found:** this is exactly **Data Vault**'s hub/satellite shape. The contrast with **anchor
modelling** is the useful part: anchor pushes to 6NF with one attribute per table, while Data
Vault deliberately *groups* attributes into a satellite and uses **one timeline for the whole
group, regardless of which attribute changed**. Anchor buys finer time granularity and pays with
many more tables and many more joins.

Grouping into a satellite is only correct while the grouped attributes genuinely change
together. That is the same test already written down — *is there an operation that changes one
and leaves its neighbours alone?* — and it is what separates a legitimate satellite from a wide
row. The directory failed the prior test rather than this one: it does not change at all, so it
is not a satellite in either style — `cwd` sits on the hub and a worktree gets its own table
because only some agents have one.

**The caution, and it is real:** both Data Vault and anchor modelling are **analytical**
techniques, built for warehouses. The stated norm for an OLTP store is a 3NF entity-relationship
model, and both are called advanced techniques needing experienced architects. Applying warehouse
shapes wholesale to an operational store would be a mistake.

**Position:** orch's store is **5NF** ER at its core — no table has a join dependency left to
remove — and the satellite shape is applied only to the handful of facts that genuinely need
history (where it sits, what it belongs to, how it is tuned, which orch leases it). It goes past 5NF in
exactly three places, and only because the split deletes a constraint rather than adds a table:
`agent_worktrees`, `agent_endings`, `task_cancellations`. Anchor modelling's full 6NF is
declined — its selling point is adding an attribute without touching a table, and Rule 8 makes a
column as cheap as a table here. Telemetry stays out of the database entirely (§7). A deliberate
hybrid, not Data Vault adopted wholesale.

**Change:** none to the schema. Justification recorded so the next reader sees a choice, not an
accident.

## 4. Bitemporal — **CONFIRMED not warranted**

**Claimed:** a single timeline is enough.

**Found:** transaction time exists to answer *when did the database learn this*, giving an audit
trail and as-of-then reads. It is recommended where audit or consistent cross-node reads matter.

**Position:** orchd is the single writer and records facts as it observes them, so valid time and
transaction time coincide within a transaction. A second axis would double the columns and every
predicate to distinguish two timestamps that are equal by construction. If orch ever gains a
second writer — the exact condition that also breaks the overlap invariant — bitemporality gets
revisited alongside it.

**Change:** none. Recorded as a decision with its trigger condition.

## 5. `root_agent_id` — **CONFIRMED, and correctly named**

**Claimed:** materializing the provenance root is safe because its inputs are immutable.

**Found:** the three standard hierarchy encodings are **adjacency list** (parent pointer; simple,
best for small structures and frequent updates), **closure table** (every ancestor-descendant
pair; optimal ancestor/descendant queries, extra storage), and **materialized path** (the path
stored on the row).

orch keeps the adjacency list (`spawned_by`) as the source of truth and materializes exactly one
derived value — the root. That is a degenerate materialized path: the useful endpoint without the
string parsing or `LIKE` scans. The known objection to materialized paths is update cost when the
tree is re-parented, and **re-parenting cannot happen here** — `spawned_by` is immutable by
invariant, which is precisely why the objection does not apply.

**Upgrade path recorded:** if depth ever grows past the current depth-2 policy *and* full
ancestor/descendant queries are needed, a **closure table** is the correct next step, not a
longer path string. SQLite also ships a transitive-closure extension.

**Change:** none. Argument holds.

## 6. SQLite specifics — **REVISED, and the schema changes twice**

**Found:**

- **`STRICT` should be the default** for anything enforcing a data contract, and every column
  should declare `NULL` or `NOT NULL` explicitly rather than relying on the implicit default.
  Already doing the first; **not** doing the second.
- **`WITHOUT ROWID`** clusters rows in a B-tree keyed by the primary key, removing the separate
  rowid B-tree. It pays off when access is *by primary key* and rows are small; it is not a
  blanket win.

**What that means here, table by table:**

`agents`, `spaces`, `harnesses`, `plexers`, `hosts` all have small rows and a `TEXT` primary key
that is exactly how they are looked up. They are textbook `WITHOUT ROWID` candidates: today each
carries a redundant rowid B-tree plus a separate index on the key it is always fetched by.

The satellites are the more interesting case. They currently carry a surrogate `INTEGER PRIMARY
KEY` that **nothing ever queries by** — every access is by `agent_id`, and `(agent_id, since)` is
already a natural key under the one-writer-per-transaction discipline. Replacing the surrogate
with that composite key and declaring `WITHOUT ROWID` clusters an agent's entire history
contiguously, which is precisely the read pattern ("everything current for these agents", "this
agent's history").

**The exception is `agent_leases`.** Its `INTEGER PRIMARY KEY` is not decoration — it is the
**fencing token**, and it must stay monotonic across all agents so a woken zombie orch
presenting a stale lease id is rejected. A composite key cannot do that. Leases keep the
surrogate and the rowid.

**Change:** `WITHOUT ROWID` on the five lookup/identity tables; satellites re-keyed to
`(agent_id, since)` `WITHOUT ROWID` and their surrogate ids dropped; `agent_leases` unchanged;
explicit `NULL` on every nullable column.

---

## Net effect

| # | claim | verdict |
|---|---|---|
| 1 | half-open intervals | confirmed, reasoning deepened |
| 2 | overlap unenforceable in SQLite | **wrong** — triggers do it; added |
| 3 | hub-and-satellite | confirmed as Data Vault; hybrid position recorded |
| 4 | uni-temporal is enough | confirmed, with a trigger condition for revisiting |
| 5 | materialized immutable root | confirmed; closure table recorded as the upgrade |
| 6 | SQLite feature use | **incomplete** — `WITHOUT ROWID` and natural keys adopted |

## Sources

- [Snodgrass, *Developing Time-Oriented Database Applications in SQL*](https://www2.cs.arizona.edu/~rts/pubs/EDC.pdf)
- [PostgreSQL wiki — SQL:2011 temporal support](https://wiki.postgresql.org/wiki/SQL2011Temporal)
- [Valid time — Wikipedia](https://en.wikipedia.org/wiki/Valid_time)
- [Preventing overlapping ranges with exclusion constraints](https://spin.atomicobject.com/2021/04/02/versioned-records-prevent-overlaps/)
- [Non-overlapping time ranges](https://sqlfordevs.com/non-overlapping-time-ranges)
- [Anchor Modeling — Time in Databases](https://www.anchormodeling.com/time-in-databases/)
- [Anchor modeling — Wikipedia](https://en.wikipedia.org/wiki/Anchor_modeling)
- [A comparison of data modeling methods](https://alibaba-cloud.medium.com/a-comparison-of-data-modeling-methods-for-big-data-784233f74aff)
- [XTDB — Bitemporality](https://v1-docs.xtdb.com/concepts/bitemporality/)
- [SQLite — STRICT Tables](https://www.sqlite.org/stricttables.html)
- [SQLite — Clustered Indexes and the WITHOUT ROWID Optimization](https://www.sqlite.org/withoutrowid.html)
- [Storing hierarchical data in a database](https://www.sitepoint.com/hierarchical-data-database/)
- [Querying tree structures in SQLite with the transitive closure extension](https://charlesleifer.com/blog/querying-tree-structures-in-sqlite-using-python-and-the-transitive-closure-extension/)
