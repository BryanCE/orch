# docs/ — what every file is

Organization rule (binding, applies to code too): **folders say the kind and status, names say the content. Nobody should have to open a file to know what it is.**

## charts/ — mermaid diagrams
- `charts/current/what-pattern-is-each-part.md` — which part of orch is which design pattern, why each pattern was chosen, one mini-chart per pattern. Start here for the design.
- `charts/current/target-system-wiring.md` — the full target system wiring (the "pattern machine"), a steer-message sequence diagram, and the comparison against the old charts.
- `charts/old/system-asbuilt-2026-07-15.md` — HISTORICAL as-built snapshot; faithfully draws the pi-hardcoded defect as normal flow. Do not build against it.
- `charts/old/broker-target-2026-07-15.md` — HISTORICAL daemon-as-broker target; broker half stands, its "Bridge implemented" claim was premature (see banner).

## reference/ — binding/standing references
- `reference/design-patterns.md` — THE pattern-stack reference (L0 Hexagonal → L6 enforcement, N-axis rule, composition/settings). Binding per CLAUDE.md Rule 9 and `learnings/2026-07-16-harness-plexer-architecture.md`.
- `reference/files-and-data-layout.md` — on-disk layout of $ORCH_DIR, presence records, key format.
- `reference/notifier-adapters.md` — notifier sink providers reference.

## reviews/ — point-in-time audits
- `reviews/architecture-review-2026-07-16.md` — the full 2026-07-16 architecture audit: gap findings (§2), monolith breakdown plan (§3), pattern framework (§4), ordered fix list (§5). Drove the six open openspec changes.

## Related, outside docs/
- `learnings/` — binding learnings entries (the architecture laws + the recorded pattern research).
- `openspec/` — specs and changes; the six 2026-07-16 changes implement the fix list.
