## Context

`pluggable-plexer-backends` is 39/44 checked but never verified: task 8.2 (run the spec scenarios) is open, task 4.7 (command-level workspace-field tests) is open, and it was never synced or archived. Main specs therefore describe the pre-pluggable world — `openspec/specs/fleet-backends/spec.md` names only `herdr` + `headless` ("two backends"), and there is no `plexer-identity` or `tmux-backend` capability in main at all. Meanwhile six 2026-07-16 changes (`adapter-control-authority`, `adapter-presence-writers`, `monolith-file-breakdown`, `provider-driven-setup-doctor`, `settings-json-config`, `tmux-backend-completion`) were authored against the *post-sync* base; `tmux-backend-completion` in particular ADDs requirements to a `tmux-backend` capability that only exists once pluggable syncs.

One scenario in pluggable is provably wrong against shipped code. Its `plexer-identity` delta ("Presence directory uses the serialized key") asserts a nested path `~/.orch/agents/tmux/main/%5/`. Design D3 of that same change forbids nesting ("Nested paths such as `~/.orch/agents/tmux/main/%5/` are forbidden") and `src/backends/identity.ts` produces a single flat segment: `serializeIdentity({backend:"tmux",workspace:"main",handle:"%5"})` escapes `%` → `%25` first, yielding the key `tmux~main~%255` and directory `~/.orch/agents/tmux~main~%255/`.

Constraints: repo Rule 8 (exactly one current schema, no migration/legacy), node-safe runtime, and the architecture learning law #9 — a change is not done until its scenarios have actually run.

## Goals / Non-Goals

**Goals:**
- Reconcile main specs to the implemented base by syncing pluggable's five delta specs, with the one contradictory scenario corrected to the flat key the code actually produces.
- Execute pluggable's task 8.2: run every scenario in its five delta specs against the current build and record the outcome per scenario, turning any failure into a fix task here.
- Complete or explicitly re-home pluggable's task 4.7.
- Establish and enforce the ordering: this change archives before any of the six.
- Remove the leftover empty `unify-workspace-policy/specs/` tree.

**Non-Goals:**
- Any behavior change not forced by a scenario failure.
- Rewriting pluggable's design or adding capability surface — this change reconciles, it does not extend.
- Doing the six changes' work (dispatcher, monolith teardown, settings.json, setup/doctor, tmux completion, presence writers).

## Decisions

### D1 — Fix the scenario at the source, then sync via archive
Rewrite the offending scenario in `pluggable-plexer-backends/specs/plexer-identity/spec.md` to the flat form so pluggable's own delta is internally consistent with its design D3 before it is folded into main. The sync itself is `openspec archive pluggable-plexer-backends`, which "update[s] main specs" as it archives — one operation performs both the sync (item 3) and the archive (item 4). We do not use sync-without-archive, because the base is complete and belongs in `changes/archive/`, not left open.

*Corrected scenario text* — identity `{backend: tmux, workspace: main, handle: %5}` serializes to `tmux~main~%255` (the `%` in `%5` escapes to `%25`), so the presence directory is `~/.orch/agents/tmux~main~%255/`, one flat segment, no nesting.

*Alternative rejected — archive pluggable with the nested scenario, then correct main with a MODIFIED delta here.* That transiently syncs a known-wrong spec into main and would make the scenario run (D2) target a spec that disagrees with the code for no reason. Fixing at source keeps main correct at every step.

### D2 — This change's own delta authoritatively restates the flat key
`plexer-base-sync` carries one delta: `plexer-identity` MODIFIED "Filesystem-safe presence key" stating the flat scenario. Because this change archives after pluggable, the requirement already exists in main (from the pluggable sync), so MODIFIED is the correct verb; its body matches the corrected pluggable delta, making the correction idempotent and giving this hygiene change a real, single spec contribution rather than an empty delta. `openspec archive plexer-base-sync` re-applies the same flat requirement — a no-op restatement that documents this change as the owner of the presence-key correction.

### D3 — Scenario run is specified as an explicit per-scenario checklist, not a single "run tests" task
Task 8.2 was skipped last time precisely because it was one coarse box. Here each of pluggable's five delta specs gets its own task that enumerates its scenarios and states, per scenario, HOW it is exercised: an existing test in `test/` that asserts it, or a concrete CLI invocation whose observable output confirms it, or a note that it cannot be exercised on this machine (with the reason). The outcome (pass/fail/blocked) is recorded inline in the task. A failing scenario spawns a numbered fix task in this change; a blocked scenario is justified. This makes the gate mechanically auditable.

### D4 — Sequencing gate is a task-0 precondition and a proposal statement, enforced by archive order
There is no openspec lock that forbids archiving the six; the gate is procedural. It is stated in the proposal and encoded as task 0 ("do not archive any of the six until this change is in `changes/archive/`"), and as the final task ordering (archive pluggable, then this change, then release the six). The rationale is recorded so a later operator cannot re-skip it: the six's deltas assume main capabilities this sync creates.

### D5 — Task 4.7 is completed here, not deferred
4.7 (command-level tests that `status` and wall decisions read the identity `workspace` field, not serialized-key text) is verification of the base and belongs with the base's verification pass. It is re-homed into this change's task list rather than left orphaned in an archived change, where it could never be checked off.

### D6 — Scenario-failure triage: fix hygiene here, delegate owned gaps to their change
The base contract is the *target* state the six 2026-07-16 changes drive toward, so a scenario can be correctly synced into main while the current build still fails it — the gap is tracked by the change that owns it, not hidden. Running task (D3) classifies each failure:
- **Hygiene/spec-mismatch** (the scenario disagrees with code that is otherwise correct, e.g. the nested-path scenario) → fix here, minimally and node-safe.
- **Owned by a gated change** (e.g. claude steer is silently dropped at the daemon choke point — architecture review §2.2, owned by `adapter-control-authority`; codex presence — `adapter-presence-writers`; tmux fleet visibility — `tmux-backend-completion`; setup/doctor keying — `provider-driven-setup-doctor`) → record the failure, cross-reference the owning change, and do NOT fix here (that would duplicate or pre-empt a gated change and violate this change's non-goals). Syncing the base is what establishes the contract those changes fulfill; gating them behind this sync is why the temporary red is acceptable and bounded.
- **Genuinely blocked on this machine** (needs a live tmux/herdr session unavailable in the run environment) → record blocked with the reason; the existing `test/*` unit/integration coverage for that path stands in as the evidence.

## Risks / Trade-offs

- **A scenario fails on the current build** → that is the expected, wanted outcome of D3; the failure is recorded and becomes a scoped, node-safe fix task here rather than being hidden. Corrections stay minimal (no re-architecture).
- **WSL full-suite flake** (known: spawn/git-heavy tests need 15-30s timeouts) → scenario verification runs targeted tests per scenario, not one big suite run, so a load-induced flake does not mask a real scenario failure; the final `bun test` is the green gate.
- **`openspec archive` reformats or reorders main spec text** → review the archive diff; the only intended semantic change is the "two backends" wording and the two new capabilities. Anything else is reverted.
- **MODIFIED against a freshly-synced requirement** → validated empirically with `openspec validate plexer-base-sync --strict`; if strict rejects a MODIFIED whose base is not yet in main at validate time, the delta is restructured (the fix's end state — flat key in main — is invariant to the delta verb).

## Migration Plan

1. Correct pluggable's `plexer-identity` scenario (D1).
2. Run all five delta specs' scenarios; record outcomes; open fix tasks for failures (D3).
3. Complete task 4.7 (D5).
4. `bun run check` clean + `bun test` green.
5. `openspec archive pluggable-plexer-backends` (syncs + archives the base).
6. Delete `unify-workspace-policy/specs/`.
7. `openspec archive plexer-base-sync`.
8. Only then release the six 2026-07-16 changes for archiving.

Rollback: this change adds no runtime code by default; reverting is restoring the pluggable change dir from `changes/archive/` and the main spec text from git.

## Open Questions

- None blocking. The one empirical unknown (strict MODIFIED semantics, D2) is resolved by the validate gate before this change is reported done.
