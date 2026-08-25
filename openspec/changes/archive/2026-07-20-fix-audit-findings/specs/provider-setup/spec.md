# provider-setup — delta

## ADDED Requirements

### Requirement: Setup refuses to record a runtime the installed entrypoint contradicts

When the operator selects a runtime, `orch setup` SHALL compare the selection against the installed orch entrypoint's shebang runtime before recording it. When they disagree, setup SHALL say so at selection time — naming the installed runtime, the selected runtime, and the exact rebuild command that would make the selection true — and SHALL NOT silently record a declaration its own closing doctor pass will immediately fail. Recording the mismatching selection is allowed only with an explicit operator confirmation that acknowledges the required rebuild.

#### Scenario: Selecting bun on a node-built install is confronted inline

- **WHEN** the installed `orch` entrypoint has a node shebang and the operator selects `bun` in the setup wizard
- **THEN** setup states the installed entrypoint is a node build, names `bun run build:dev` as the command that would produce a bun install, and either records `node` or — on explicit confirmation — records `bun` while printing the pending-rebuild consequence

#### Scenario: A consistent selection records silently

- **WHEN** the installed entrypoint's shebang matches the selected runtime
- **THEN** setup records it with no warning and the closing doctor pass reports the runtime check ok

### Requirement: Setup ends green on a healthy install

The doctor pass that `orch setup` runs at completion SHALL NOT fail for conditions setup itself just created or could have resolved: a runtime declaration setup recorded, a reappable malformed presence record setup could offer to reap, or missing state setup just wrote. On a machine where every integration setup installed is intact, setup's closing doctor pass SHALL end with zero failing checks attributable to setup's own output.

#### Scenario: Setup offers to reap a malformed presence record

- **WHEN** `orch setup` runs on an install with a malformed presence record that doctor classifies as reappable
- **THEN** setup surfaces the record and offers the reap during the run (defaulting to not deleting), rather than completing and immediately reporting it as a post-setup failure

#### Scenario: A clean setup run reports no self-inflicted failures

- **WHEN** the operator completes `orch setup` with consistent selections on a machine with all selected providers installed
- **THEN** the closing doctor pass shows no FAIL rows caused by the selections setup just recorded
