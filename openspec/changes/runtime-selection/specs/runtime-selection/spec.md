## ADDED Requirements

### Requirement: The JS runtime is a declared setting, never inferred

orch SHALL record the JavaScript runtime it runs under as an explicit value in `$ORCH_DIR/settings.json`. The value SHALL be exactly one of `node`, `deno`, or `bun`. orch MUST NOT infer the runtime by probing PATH, by preference order, or by any other implicit means.

The value SHALL be a top-level scalar key named `runtime`. It SHALL NOT live under `defaults`, because `defaults` denotes what a newly spawned agent receives and no spawn may select its own runtime. It SHALL NOT be modelled as a member of an `installed` set, because exactly one runtime executes a given install.

`node` SHALL be the value written when the operator expresses no preference.

#### Scenario: Runtime is recorded as a top-level scalar

- **WHEN** the operator completes `orch setup` and accepts the default runtime
- **THEN** `$ORCH_DIR/settings.json` contains a top-level key `runtime` with the string value `node`
- **AND** no `runtime` key appears inside the `defaults` object
- **AND** no `runtimes` array appears inside the `installed` object

#### Scenario: An unrecognized runtime value is rejected

- **WHEN** `settings.json` contains `"runtime": "quickjs"`
- **THEN** any orch command that loads settings exits non-zero
- **AND** the error names the three accepted values `node`, `deno`, `bun`

#### Scenario: A settings file without a runtime key is malformed

- **WHEN** `settings.json` omits the `runtime` key entirely
- **THEN** any orch command that loads settings exits non-zero
- **AND** the error names `orch setup` as the remedy
- **AND** orch does NOT silently proceed as though `node` had been declared

### Requirement: Every harness shim runs under the declared runtime

The pi extension, the Claude hooks, and the codex notify shim SHALL each be installed to execute under the runtime declared in `settings.json`. No shim may select a runtime independently of the others.

The invocation form for a given runtime SHALL be identical across all three shims. `deno` SHALL be invoked with permissions granted for file access; `node` and `bun` SHALL be invoked by bare executable name.

#### Scenario: All three shims agree on the declared runtime

- **WHEN** `settings.json` declares `"runtime": "node"` and the operator runs `orch setup`
- **THEN** the command string written into the Claude host config invokes the hook shim with `node`
- **AND** the codex notify entry invokes its shim with `node`
- **AND** the pi extension is installed to run under `node`

#### Scenario: Changing the declared runtime repoints every shim

- **WHEN** the operator changes the declared runtime from `node` to `deno` and re-runs `orch setup`
- **THEN** all three shim invocations are rewritten to the deno form
- **AND** no shim is left invoking `node`

#### Scenario: deno invocation grants file permissions

- **WHEN** the declared runtime is `deno`
- **THEN** each shim command invokes deno with permissions sufficient to read and write the presence directory
- **AND** the same permission form is used for all three shims

### Requirement: The declared runtime must match the executing runtime

The runtime declared in `settings.json` SHALL be verifiable against the runtime actually executing orch. A mismatch SHALL be surfaced to the operator as a failure rather than tolerated silently.

This requirement exists because an installed entrypoint carrying a `#!/usr/bin/env bun` shebang executed orch under bun indefinitely while every diagnostic reported healthy. Declaring the runtime is only useful if the declaration is checked against reality.

The specific diagnostic row, its id, and its status semantics are governed by the `doctor-config` capability; this requirement establishes only that the mismatch MUST be detectable and MUST NOT pass silently.

#### Scenario: Executing under an undeclared runtime is surfaced

- **WHEN** `settings.json` declares `"runtime": "node"` and orch is executed by a bun entrypoint
- **THEN** `orch doctor` reports a failure identifying the mismatch
- **AND** the reported detail names both the declared runtime and the observed one

#### Scenario: A matching runtime passes

- **WHEN** `settings.json` declares `"runtime": "node"` and orch is executed under node
- **THEN** `orch doctor` reports no runtime mismatch

### Requirement: No runtime is privileged — the defect is the mismatch

All three runtimes SHALL be first-class recorded choices. The constraint that orch's source must never call `Bun.*` or import `bun:*` governs what orch's CODE may depend on, so that the tree runs anywhere; it does not restrict which runtime an operator may execute orch with. orch SHALL NOT emit a warning about a declared runtime that matches the runtime actually executing.

`node` SHALL be pre-selected because it is the most universally present and is what a global npm install lands under — a starting position, not a judgement about the others. orch SHALL NOT select any runtime on the operator's behalf beyond that pre-selection.

A mismatch between the declared runtime and the executing runtime SHALL fail in EITHER direction, with no runtime treated as the correct one by default.

#### Scenario: A matching bun declaration is clean

- **WHEN** `settings.json` declares `"runtime": "bun"` and orch is executing under bun
- **THEN** `orch doctor` reports the runtime check as passing
- **AND** no warning is emitted about the choice of bun

#### Scenario: Mismatch fails in both directions

- **WHEN** `settings.json` declares `"runtime": "node"` and orch executes under bun
- **THEN** `orch doctor` reports a failure
- **AND** WHEN `settings.json` declares `"runtime": "bun"` and orch executes under node
- **THEN** `orch doctor` reports a failure just as loudly

#### Scenario: Remediation names both directions

- **WHEN** the runtime check reports a mismatch
- **THEN** the detail names both available remedies — rebuild the entrypoint so it matches the declaration, or re-record the declaration to match reality
- **AND** it does not assume which of the two the operator intended
