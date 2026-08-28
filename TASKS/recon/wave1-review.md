# Wave 1 review

Read-only review of the requested diffs against `TASKS/06-schema.md`, `TASKS/02-scope.md`, and `TASKS/01-agent-model.md`.

## Slice 1 — schema DDL: ISSUES

The `REBUILD_DDL` transcription itself matches the authoritative document table-by-table and column-by-column: all 20 tables are `STRICT`, the 19 natural-key tables are `WITHOUT ROWID`, the documented CHECKs are present, and the 10 partial unique indexes, 8 plain indexes, `task_states` view, and 10 correctly keyed INSERT overlap triggers are present. `STORE_SCHEMA` is 6, and `PRAGMA foreign_keys = ON` is applied to both a first-open connection and the replacement connection before either is returned/cached.

1. `src/store/schema.ts:107-120` — the old `queue`, `ownership`, `spawned`, `session_identities`, and other legacy schema is still created alongside the rebuild schema. That leaves two current shapes and retains the exact queue/state/session compatibility surface the rebuild deletes, contrary to Rule 8 and `TASKS/06-schema.md`. Smallest fix: make the schema-6 `CORE_TABLE_DDL` contain only the authoritative rebuild objects (and only any explicitly still-current non-rebuild operational tables), removing superseded DDL and indexes rather than creating old and new schemas together.
2. `test/store-rebuild-schema.test.ts:17-55` — these are real database-seam tests with spec-derived values, but they do not establish the requested transcription: only one of ten overlap triggers, one of ten partial unique indexes, one STRICT rejection, and a small subset of CHECKs/FKs are exercised; table/column/index/trigger inventories and `user_version = 6` are not asserted. A wrong/missing column, nine wrong trigger keys, or most missing indexes would still pass. Smallest fix: add spec-literal expected inventories from `sqlite_master`/`PRAGMA table_info`, parameterize all ten overlap keys and all ten open-row indexes, and assert all documented CHECK families plus `PRAGMA foreign_keys` and `user_version` through `openStore`.

## Slice 2 — herdr 0.8.2: PASS

Delivery uses `agent prompt`, waiting uses `agent wait <target> --until <state> --timeout <ms>`, and spawn creates a pane before `agent start <name> --kind <kind> --pane <id>`. The adapter-to-kind mapping is centralized. The removed flags do not remain on `agent start`; their other occurrences belong to pane/tab/workspace commands. Tests exercise the backend public seam with spec-literal argv and would fail against the former commands.

## Slice 3 — status truth: ISSUES

1. `src/commands/status.ts:170-189` — `backendAnswered` actually records whether the **daemon RPC** returned a rows array. A daemon can answer while a plexer/backend did not, and the offline fallback can successfully inventory a backend while this is forced false. Thus the zero-row message still does not report whether the backend actually answered. Smallest fix: carry source/inventory response metadata from fleet construction/RPC and derive this field from backend inventory attempts, not RPC availability.
2. `src/commands/status.ts:223-225,445-447` — JSON output returns the raw rows without `displayStatusState`; a row with `alive: false`, `exited: false`, and stale `state: "working"` is still rendered as live work in JSON. Only table cells are normalized. Smallest fix: normalize row state once at the shared row boundary (or normalize both JSON arrays) so every renderer receives `state: "exited"` for dead rows.
3. `test/commands-status.test.ts:19-27` — the new tests only call two extracted formatting helpers. They never exercise `cmdStatus`, gathered counts, daemon-vs-backend response truth, scoping to zero visible rows, or JSON output, so they pass while both bugs above remain. Smallest fix: test the command/output seam with controlled fleet/RPC/backend inputs, including a dead stale row in both table and JSON modes.

## Slice 4 — retention clock: ISSUES

1. `src/presence/store.ts:206-214` — `newestRecordedInstant` returns immediately when `status` is absent/malformed, so it ignores a valid `result.json` `finishedAt`/`updatedAt`. Such a directory has a recorded instant but is treated as having none and reaped immediately. Smallest fix: collect result instants independently of whether a valid status object exists; return null only when neither file supplies a valid recorded instant.
2. `test/retention.test.ts:99-129` — the mtime-opposition tests are genuine sweep-seam regressions with fixed, spec-derived dates, but there is no result-only recorded-instant case, which is why the early-return bug survives. Smallest fix: add a dead directory with no valid status, a recent result `finishedAt`, and an old mtime; assert it is retained.

## Slice 5 — close ungated: ISSUES

1. `src/commands/lifecycle.ts:385` — `close --all` still refuses when no caller owner token exists. The section-10 gate table marks close ungated, and the human must always be able to end agents; this is an ownership prerequisite under another name. `test/owner-scoping.test.ts:106-115` explicitly preserves the wrong refusal. Smallest fix: remove `requireCallerOwnerToken()` from `close --all` and invert/update that test to require success.
2. `src/commands/lifecycle.ts:408-416` — close still calls `backend.close`, i.e. routes the kill through the plexer, contrary to D7 (“kill path … never touches the plexer”). It also reaps the record even when neither backend close nor SIGTERM succeeded, potentially leaving a live unmanaged process. Smallest fix: close the recorded process directly using the recorded pid/start token, report a failed close without reaping when the live process could not be ended, and leave plexer cleanup to a separate operation.
3. `test/owner-scoping.test.ts:253-264` — this test expects `close <foreign> --force` from a spawned agent to be refused, but close is now unconditional and the implementation no longer invokes the override guard. The test contradicts the gate table and the changed code. Smallest fix: remove `--force` from close’s governance semantics/help/tests, or assert it is an ignored compatibility-free invalid flag; do not expect an ownership refusal.
4. `test/close-always.test.ts:105-116` and `test/owner-scoping.test.ts:117-155` — the new direct/public-command tests genuinely cover foreign owner/provenance and managed-only bulk selection, but there is no regression asserting all four driving verbs (`dispatch`, `steer`, `model`, `reset`) remain owner-gated. Smallest fix: parameterize those four commands against a live foreign holder while keeping close/abort success cases separate.

## OVERALL

Must fix before the user runs gates:

- Remove the dual legacy/rebuild schema and add complete schema-6 inventory/invariant tests.
- Report actual backend response truth and normalize dead state in JSON as well as tables.
- Honor a result-only retention timestamp.
- Remove the remaining `close --all` caller-ownership prerequisite, stop routing close through the plexer/reaping failed live closes, and reconcile the contradictory `--force` test.
