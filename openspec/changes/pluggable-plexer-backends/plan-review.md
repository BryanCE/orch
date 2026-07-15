# Critical plan review

Reviewed all artifacts in this change, including `.openspec.yaml`, proposal, design, tasks, migration inventory, and all five specs.

## 1. Requirements not sufficiently observable

These requirements either assert an internal property without a testable file/CLI contract, or lack a defined observable surface:

- **Agent/fleet Bridge separation**: “neither references concrete types,” “backend port is agent-agnostic,” and “no hard-coded branch” are static-code constraints, not CLI-observable scenarios. Add a required static check (forbidden imports/env vars/command names) and define its command and exit behavior.
- **Backend ownership**: “backend is the identity authority” and “backend mints handles” cannot be proven from `status` alone. Add a registry/port contract test or a debug/doctor JSON field showing the minting path, plus a test that rejects caller-supplied identity.
- **Adapter capability declarations**: declaration shape and supported values are not exposed. Add `orch doctor --json` (or equivalent) output with adapter capabilities, and specify its schema.
- **Presence protocol “where supported”** is vague. Define which files each adapter must write and which are optional; define behavior when an optional file is absent.
- **Opaque-key validation**: the required env var name is still open in design, while specs require a documented key. Fix the name and specify exact malformed/missing-key exit/error-state behavior.
- **Probe observability**: tmux says probes appear in “relevant orch command output,” but no command/schema is named. Specify `orch doctor --json` (or another command), fields, and exit codes.
- **Stable identity**: “stable” lacks a lifetime and mutation rule. Specify whether it remains stable across list/status, restart, reattach, and process recovery.
- **Workspace override permission**: `--cross-workspace` is required, but the configuration key and default permission are not specified. Add a CLI/config contract and refusal exit code.
- **Close safety**: the pid/key verification is described, but the observable skip message/exit behavior is not specified for stale or malformed records.
- **Tmux ownership/session mapping**: “corresponding pane/window” and “workspace corresponding to session” need exact rules, especially for an existing session, new window, nested tmux, and pane cleanup.

## 2. Migration-inventory gaps verified by grep

The inventory misses these current identity/plexer assumptions:

- `scripts/claude-hooks.ts:124,166,168`: duplicate presence-directory serialization and direct `HERDR_PANE_ID` use. This is a shipped Claude adapter path and must be an explicit migration site.
- `src/commands.ts:1731`: direct `HERDR_PANE_ID` read. The inventory mentions other command sites but not this one.
- `test/claude-adapter.test.ts:24`: test fixture injects `HERDR_PANE_ID`; it must migrate to `ORCH_AGENT_KEY` and test missing-key behavior.
- `test/workspace-walls.test.ts` and `test/workspace-policy.test.ts`: dozens of assertions encode the old `ws:pane` grammar and must be replaced, not merely supplemented.
- `src/commands.ts` has broader direct herdr operation assumptions (`herdrBestEffort` and concrete backend use around 2010, 2246–2794). The inventory lists selected spawn/close sites, but not the full set of target/control operations that prevents a true backend-independent route.
- `src/daemon/orchd.ts:81-90` directly dispatches through herdr. The inventory notes the file, but the design’s promised generic backend delivery port is absent from the proposed `Backend` API; this needs both an inventory site and an API decision.
- `docs/files-and-data-layout.md:15` is listed, but its exact old-key contract must be treated as a migration assertion, including examples and tests.

The inventory is therefore not complete enough to serve as a source of truth.

## 3. Contradictions and unresolved design/spec conflicts

1. **Flat key vs nested directory (hard contradiction).** Design D3 requires one flat segment such as `tmux~main~%255`. `plexer-identity/spec.md` requires `~/.orch/agents/tmux/main/%5/`, which is nested and not the serialized key described elsewhere. Pick one; the design and migration inventory clearly favor flat.
2. **Headless walls vs uniform walls.** Design D4 says headless `workspace: null` is wall-eligible. `workspace-policy` says walls apply uniformly to headless and every cross-workspace write is refused/allowed based on reported workspace. Null has no distinct workspace, so the required headless behavior is undefined and cannot satisfy the tmux/herdr wall scenarios as written.
3. **Identity API shape is inconsistent.** D2 says `mintIdentity(handle)`, while spawn-time identity is minted for a newly created handle and headless currently generates a key internally. The port needs an explicit lifecycle: mint-before-spawn, mint-after-spawn, or both.
4. **Backend port is too small for promised migration.** The design/tasks require generic target delivery, close, layout, focus, and daemon dispatch, but the listed port additions only cover identity and probes. Without delivery/handle operations, removing herdr branches breaks control paths or forces hidden concrete casts.
5. **Tmux session requirement conflicts with fallback language.** Fleet specs require automatic headless fallback when herdr is absent, while tmux specs make being inside a tmux session mandatory. The selection rules for configured tmux outside a session versus implicit probing need one explicit precedence table.
6. **“No compatibility” vs retained old records.** The design says old directories are abandoned and clean can reap them, but the specs require malformed identities to be safe and status/list behavior is not defined for old directories. State whether old dirs are ignored, reported, or reaped, and by which command.
7. **“All five backends” wording is inaccurate.** Workspace policy says herdr, tmux, and headless uniformly, while fleet wording calls them registered backends. Headless is not a plexer in the same sense and has null workspace semantics; define the model rather than relying on terminology.

## 4. Tasks that create broken intermediate states

The migration order is not shippable if tasks land independently:

- **2.5–2.6 before 3.x**: spawners write/pass the new identity, but the existing bridge and Claude hook still derive old paths from `HERDR_PANE_ID`; newly spawned agents lose presence.
- **3.1–3.3 before all spawn paths are changed**: bridge requires `ORCH_AGENT_KEY`, but legacy spawn/tile/restart paths do not yet inject it; every such agent fails safely but the fleet is unusable.
- **4.2–4.4 before all presence writers and readers are migrated**: policy reads workspace fields while old records/events/tasks still lack them, causing null scoping, wrong walls, or silent exclusion.
- **5.1–5.3 while the port lacks generic control/delivery operations**: replacing hard-coded selection cannot implement daemon dispatch, focus, send-keys, close, and layout without reintroducing concrete branches.
- **6.5 before 6.1–6.4 are complete**: registering `tmux` or exposing `--backend tmux` before full ownership and cleanup behavior exists can spawn unmanaged panes.
- **7.x before the contract is settled**: docs would encode the flat-vs-nested contradiction and an unresolved env/config API.
- **8.1/8.2 only at the end**: there is no stated migration gate after each phase, so a broken bridge/presence state can persist across intermediate commits.

Make the change shippable by using a compatibility-safe feature branch/flag or land one atomic vertical slice: identity module + all writers/readers + registry/port contract + herdr/headless, then enable the new format; add tmux only after the common path is green. Add phase gates with `bun run check` and focused CLI integration tests.

## 5. Riskiest three items and de-risking actions

1. **Identity serialization and propagation.** It touches every presence writer, path reader, and close safety check; the current spec disagrees on path shape. First freeze the key grammar, env name, null encoding, validation, and malformed-record behavior. Add property-style round-trip/collision tests plus a spawned subprocess test for every adapter.
2. **Workspace-wall migration.** Moving from parsed keys to persisted fields can silently turn records into unscoped agents. Define headless/null semantics and an explicit record schema/version. Test mixed old/new/malformed records and every write surface (`dispatch`, queue/work, questions, close, events).
3. **Backend abstraction completeness.** The proposed port cannot yet express daemon delivery or several herdr controls. Enumerate every operation needed by commands/daemon, put it behind capability-typed port methods, and add contract tests run against fake, headless, herdr, and tmux adapters before deleting concrete branches.

## Verdicts

- `.openspec.yaml`: **PASS**
- `proposal.md`: **NEEDS-WORK** — unresolved env/workspace decisions and overclaims about observable scenarios.
- `design.md`: **NEEDS-WORK** — flat/nested conflict and incomplete backend port.
- `tasks.md`: **NEEDS-WORK** — unsafe sequencing and no phase gates.
- `migration-inventory.md`: **NEEDS-WORK** — missing Claude hook/tests/command and incomplete herdr control sites.
- `specs/agent-adapters/spec.md`: **NEEDS-WORK** — several static/internal requirements lack observable checks and env name is unsettled.
- `specs/fleet-backends/spec.md`: **NEEDS-WORK** — probe output, fallback precedence, and backend operation contract are underspecified.
- `specs/plexer-identity/spec.md`: **NEEDS-WORK** — directory path directly contradicts the flat-key design.
- `specs/tmux-backend/spec.md`: **NEEDS-WORK** — session/workspace/ownership rules and probe command are underspecified.
- `specs/workspace-policy/spec.md`: **NEEDS-WORK** — null headless workspace conflicts with uniform wall requirements.
