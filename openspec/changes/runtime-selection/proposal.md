## Why

orch ships to npm so anyone can run it under plain node (Rule 6: bun is a build tool, never a runtime dependency), but the runtime is never *declared* anywhere — it is inferred. `CLAUDE_HOOK_RUNTIMES = ["node","deno","bun"]` is a private constant of the Claude hooks adapter (`src/adapters/claude-hooks.ts:18`), consumed only by `src/adapters/claude.ts:167` via `CLAUDE_HOOK_RUNTIMES.find(binaryOnPath) ?? "node"` — first-on-PATH wins. `src/config.ts` and the setup wizard have no runtime concept at all, so the pi extension and codex notify shims each pick a runtime by their own logic, and nothing checks that the runtime orch *runs under* matches the one it *writes into shims*.

This is not hypothetical. On the primary dev machine the `orch` entrypoint was a stale symlink to `bin/orch.ts` with a `#!/usr/bin/env bun` shebang — every `orch` invocation ran under bun, in direct violation of Rule 6, for weeks. `orch doctor` reported no problem, because no check compares the declared runtime to the installed reality. Two adjacent checks were found lying in the same session: the Claude hooks shim check reports `ok` without ever stat-ing the shim file (it printed "all orch Claude hooks are current (dist/scripts/claude-hooks.js)" for a file that did not exist), and the backend-capabilities check fails a condition that cannot be satisfied.

Rule 9 makes composition user-editable in `settings.json` and requires doctor to verify declared-vs-reality. The runtime is composition. It should be selected, recorded, and verified like every other axis.

## What Changes

- **New `runtime` axis in `$ORCH_DIR/settings.json`** — one of `node` | `deno` | `bun`, defaulting to `node`. It is a first-class setting alongside adapters and backends, not a constant inside one adapter.
- **Setup gains a runtime selection step.** The user *selects* the runtime; orch stops inferring it. All three are first-class supported choices — Rule 6 constrains what orch's *code* may depend on (`Bun.*`, `bun:*` are banned in source precisely so the tree runs anywhere), not what a user may execute it with. `node` is pre-selected only because it is the most universally present and is what `npm install -g` lands under. The one substantive differentiator surfaced at the prompt is deno's sandbox.
- **All three harness shims resolve the runtime from the setting** — pi extension, Claude hooks, and codex notify — instead of each deciding independently. `CLAUDE_HOOK_RUNTIMES` moves out of `src/adapters/claude-hooks.ts` and becomes the shared runtime vocabulary; the claude adapter's `find(binaryOnPath)` auto-detection is deleted.
- **New doctor check `runtime`** verifying declared-vs-reality: the selected runtime is on PATH, the runtime actually executing orch matches the declaration, and the shebang of the resolved `orch` entrypoint matches it. No runtime is privileged — the defect is the MISMATCH, not which runtime won. A `#!/usr/bin/env bun` entrypoint while `runtime` is `node` is a FAIL; so is a node entrypoint while `runtime` is `bun`. Remediation names both directions (rebuild, or re-record the declaration).
- **Doctor stops reporting `ok` for artifacts it never verified.** `diagnoseShim` (`src/adapters/claude.ts:327`) must confirm the shim file exists on disk before reporting current, matching what the codex shim check already does.
- **Backend-capabilities gating is corrected.** `src/doctor.ts:143` fails when *any* installed backend has `insideSession=false`, which is unsatisfiable with two pane backends installed — you cannot be inside herdr and tmux simultaneously. It gates on the active/default backend instead. Its detail string also joins with a literal `"\\n"`, rendering as one run-on line; that is fixed to a real newline.
- **BREAKING** (pre-publish, so no migration per Rule 8): `settings.json` written by a prior setup has no `runtime` key. Per Rule 8 there is exactly one current shape — the schema constant is bumped and a settings file lacking `runtime` is malformed, reported by doctor with `orch setup` as the fix. No back-compat read path is added.

## Capabilities

### New Capabilities
- `runtime-selection`: the declared JS runtime as a user-selected `settings.json` axis — its allowed values, its default, how the three harness shims consume it, and the doctor check that verifies the declared runtime against the installed entrypoint.

### Modified Capabilities
- `provider-setup`: setup acquires a fourth selection axis (runtime) alongside adapters and backends, with `node` as the pre-selected default and all three runtimes offered as supported choices. The existing "Setup records the active default per axis" requirement extends to cover it.
- `doctor-config`: adds the `runtime` diagnostic, and tightens the existing doctor-diagnostics requirement so a check may not report `ok` for an artifact whose existence it did not verify.
- `agent-adapters`: the Claude adapter no longer auto-detects its hook runtime from PATH; all three shims read the declared runtime. The Claude shim diagnostic must verify the shim file exists.
- `fleet-backends`: the capability-probe requirement is corrected to gate on the active backend rather than requiring `insideSession` for every installed backend.

## Impact

**Code**
- `src/config.ts` — `runtime` added to the settings shape + schema constant bump
- `src/adapters/claude-hooks.ts` — `CLAUDE_HOOK_RUNTIMES` relocates to shared runtime vocabulary
- `src/adapters/claude.ts` — auto-detect at `:167` deleted; `diagnoseShim` at `:327` gains an existence check
- `src/adapters/pi.ts`, `src/adapters/codex.ts` — resolve runtime from settings
- `src/setup/wizard.ts`, `src/commands/setup.ts` — new selection step
- `src/doctor.ts` — new `runtime` check; `:143` backend gating + `:144` newline fix
- `test/claude-hooks-shim.test.ts` — currently derives runtimes from the adapter constant

**Interaction with `monolith-file-breakdown`**
That change is in flight and is a *pure move* whose task 7.3 requires phases A–E show relocations only. This change is behavioral and touches `src/doctor.ts` and `src/adapters/*`, which that change also relocates. Sequencing is a real dependency, addressed in design.md — this change must not be interleaved into its phases A–E.

**Not affected**
The presence-dir file protocol is unchanged. No wire format, no adapter identity, no herdr boundary change.

## Non-goals

- **Not proving deno compatibility end-to-end.** The shims now get real, least-privilege deno permissions derived from their actual surface (scoped fs read/write, an enumerated env allowlist, no network) instead of `--allow-all`, which would have discarded the only reason to pick deno. `test/claude-hooks-shim.test.ts` exercises the built shim under every runtime present on the machine, so the grant is verified wherever deno is installed — but this change does not audit every code path under deno.
- **Not changing how the bundles are built.** `bun run build:dev` remains the build path; bun stays the build tool. Only the *runtime* is being made explicit.
- **Not auto-repairing a mismatched entrypoint.** The doctor check reports and names the fix; it does not reinstall. Auto-fix may be revisited once the check has proven accurate.
- **Not adding a runtime axis to remote hosts.** Remote host runtime declaration is deferred; this change covers the local install only.
