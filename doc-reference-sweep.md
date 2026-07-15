# Documentation reference sweep

Scope: all `*.md`, excluding `node_modules/`, `dist/`, `.git/`, `openspec/changes/archive/`, and `openspec/changes/pluggable-plexer-backends/`.

## Results

- Broken Markdown links: **0**. All relative Markdown links resolve.
- Missing project-file references: **0** actionable references. Example paths in agent recipes/templates are illustrative, not repository claims.
- Stale event file-watch fallback claim: **1**, flagged below.
- Ungoverned-write claims: **0** after fix.
- `HERDR_PANE_ID` asserted as universal identity source: **0** after fix.

## Flagged stale reference

- `openspec-specs-audit-2.md:23` says the socket-death scenario requires CLI fallback to direct file watching. The audit correctly labels that requirement stale, but the wording still records the old fallback contract. The current contract is daemon-required `orch events`, with file watching only under explicit `--offline`.

## Valid but potentially noisy matches

These are not stale claims:

- `doc-consistency-checklist.md:7` and `orch-architecture-current.md:99` describe explicit `--offline` diagnostics, not an automatic fallback.
- `orch-architecture-target.md:80` describes the same explicit `--offline` mode.
- `doc-consistency-checklist.md:27-30`, `orch-architecture-current.md:45,107,109`, and `ideas.md:41` describe current herdr caller context or a known pane-move bug; none claim a universal identity source.

## Files touched

- `doc-reference-sweep.md` — created this scan report.
- `orch-architecture-current.md` — removed universal `HERDR_PANE_ID` identity wording.
- `orch-architecture-target.md` — marked ungoverned writes as historical, not current behavior.
- `doc-consistency-checklist.md` — clarified herdr caller context versus universal identity.
- `skills/claude/pi-agent/reference/orchestration.md` — removed `HERDR_PANE_ID` as the documented key authority.
- `openspec/specs/orchd-daemon/spec.md` — corrected the daemon/events offline contract.
