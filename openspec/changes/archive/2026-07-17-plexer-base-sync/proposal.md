## Why

The change `pluggable-plexer-backends` is the implemented-but-never-verified BASE that the six 2026-07-16 changes stand on, yet it was self-certified: its verification task 8.2 (run the spec scenarios) was never executed, its five delta specs were never synced to main (main `fleet-backends` still says "two backends" and main has no `plexer-identity` or `tmux-backend` capability at all), and one of its scenarios contradicts its own design and the shipped code. Archiving any of the six before this base syncs would fold delta specs onto a main that lacks their base — an incoherent spec tree. This change closes that gap: verify, correct, sync, archive the base, and gate the six behind it.

## What Changes

- **Fix the contradictory scenario.** `pluggable-plexer-backends`'s `plexer-identity` delta asserts a nested presence path `~/.orch/agents/tmux/main/%5/`, which design D3 explicitly forbids and `src/backends/identity.ts` (escape `%` → `%25`, flat `<backend>~<workspace>~<handle>`) does not produce. Rewrite it to the flat form `~/.orch/agents/tmux~main~%255/`, in pluggable's delta and as this change's authoritative `plexer-identity` correction.
- **Run the base's scenarios (its open task 8.2).** Execute every scenario in pluggable's five delta specs (`agent-adapters`, `fleet-backends`, `plexer-identity`, `tmux-backend`, `workspace-policy`) against the current build; record pass/fail per scenario; every failure becomes a fix task here.
- **Sync + archive the base.** Fold pluggable's five (corrected) delta specs into main via `openspec archive pluggable-plexer-backends`, resolving the "two backends" wording in main `fleet-backends` and creating main `plexer-identity` and `tmux-backend` capabilities.
- **Re-home or complete pluggable's open task 4.7** (command-level tests proving `status`/wall decisions read workspace fields, not serialized-key text).
- **Delete** the leftover empty `openspec/changes/unify-workspace-policy/specs/` tree (the real change is already archived).
- **Sequencing gate**: this change lands and archives BEFORE any of the six 2026-07-16 changes archive. They were authored against the post-sync base — `tmux-backend-completion`'s ADDED requirements in particular fold onto the `tmux-backend` capability this sync creates.

### Non-goals (explicitly deferred)
- **No behavior changes** beyond what a scenario failure forces. This is spec hygiene plus verification; the six changes own the remaining code remediation.
- **No re-architecture.** The base's design (Bridge/adapter/backend port) is accepted as-is; this change only reconciles specs to shipped reality.
- **Not the missing agent-axis dispatcher** (that is `adapter-control-authority`) and **not the monolith teardown** (`monolith-file-breakdown`) — this change only unblocks them by syncing the base they assume.

## Capabilities

### New Capabilities
<!-- none: this change syncs and corrects existing base capabilities; it introduces no new capability of its own. -->

### Modified Capabilities
- `plexer-identity`: correct the "Filesystem-safe presence key" requirement's scenario from the forbidden nested path to the flat serialized key the code produces. This capability enters main specs via the pluggable sync (a task in this change, sequenced before the correction), which is why it is modified rather than new here.

## Impact

- **Specs**: `openspec/changes/pluggable-plexer-backends/specs/plexer-identity/spec.md` (scenario rewrite); main specs `fleet-backends`, `agent-adapters`, `workspace-policy` updated and `plexer-identity`, `tmux-backend` created by the archive.
- **Changes tree**: `pluggable-plexer-backends` archived; empty `unify-workspace-policy/specs/` removed; the six 2026-07-16 changes remain unarchived until this lands.
- **Code**: none required unless a scenario run fails; any such fix is scoped minimally and node-safe, and recorded as a task here.
- **Tests**: pluggable's task 4.7 command-level workspace-field tests added or re-homed with justification.
