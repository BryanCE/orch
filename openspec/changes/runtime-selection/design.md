## Context

orch is published to npm and must run under plain node (Rule 6). Nothing in the codebase declares that. The runtime vocabulary exists — `CLAUDE_HOOK_RUNTIMES = ["node","deno","bun"]` — but it is a private constant of one adapter (`src/adapters/claude-hooks.ts:18`), and its own doc comment states the opposite of Rule 6:

> orch never requires one specific runtime; node, deno, and bun all work.

The claude adapter picks a runtime by PATH order (`src/adapters/claude.ts:167`), the pi and codex shims decide separately, and `src/config.ts` — which owns `SETTINGS_SCHEMA = 1` and validates a zod `strictObject` of `installed` / `defaults` — has no runtime key at all.

The cost of that gap was paid in full this session: the `orch` entrypoint on the primary dev machine was a stale symlink to `bin/orch.ts` carrying `#!/usr/bin/env bun`. Every invocation ran under bun for weeks. `orch doctor` — 22 checks — reported nothing, because no check asks "what am I actually running under?" Two neighbouring checks were simultaneously found asserting things they never verified (`claude.ts:327` reporting a nonexistent shim as current; `doctor.ts:143` gating on a condition no multi-backend install can satisfy).

Constraints: Rule 6 (node-safe runtime code, bun is build-only), Rule 8 (exactly one live schema, no back-compat reads), Rule 9 (composition in user-editable `settings.json`; doctor verifies declared vs reality). The `monolith-file-breakdown` change is in flight and relocates `src/doctor.ts` and `src/adapters/*`.

## Goals / Non-Goals

**Goals:**
- Make the runtime a declared, user-selected value rather than an inferred one.
- Give all three harness shims (pi, claude, codex) one runtime resolver instead of three independent decisions.
- Make doctor able to detect the exact failure that went unnoticed: running under a runtime other than the declared one.
- Stop doctor from reporting `ok` for artifacts it never verified.

**Non-Goals:**
- Proving deno actually works. `deno` stays selectable; auditing shim compatibility under deno is deferred (see proposal Non-goals).
- Changing the build. bun remains the build tool; `bun run build:dev` is untouched.
- Auto-repairing a mismatched entrypoint. Doctor reports and names the fix.
- A runtime axis for remote hosts.

## Decisions

### D1 — `runtime` is a top-level scalar in `settings.json`, not a member of `defaults`

```jsonc
{ "schemaVersion": 2, "runtime": "node", "installed": {...}, "defaults": {...} }
```

`defaults` means *default for new spawns* — `defaults.adapter` is the adapter a new agent gets. The runtime is not a per-spawn choice; it is a machine-level fact about how this install executes. Filing it under `defaults` would imply a spawn could override it, which is false.

It is likewise **not** an `installed` set. `installed.adapters` / `installed.backends` are sets-with-a-default because you genuinely use several at once. You run under exactly one runtime. Modelling it as a set would invite the same unsatisfiable-conjunction bug being fixed in D6.

*Alternatives rejected:* `defaults.runtime` (implies per-spawn override); an `installed.runtimes` array plus `defaults.runtime` (models a set where a scalar is the truth); an env var only (not user-editable composition, fails Rule 9).

### D2 — One shared runtime module; `CLAUDE_HOOK_RUNTIMES` is deleted, not re-exported

A new leaf module owns the vocabulary and the runtime→invocation mapping:

```ts
export const ORCH_RUNTIMES = ["node", "deno", "bun"] as const;
export type OrchRuntime = (typeof ORCH_RUNTIMES)[number];
export function runtimeCommand(runtime: OrchRuntime): string;  // "deno" → "deno run --allow-all"
```

`claudeHookCommand` already special-cases deno (`runtime === "deno" ? "deno run --allow-all" : runtime`). That mapping is not claude-specific — it is how you invoke a JS file under deno, and the codex and pi shims need the identical rule. Leaving it inside the claude adapter would force the other two to duplicate it, which is precisely the triplication Rule 10 exists to prevent.

The old constant is **deleted**, not aliased. Per Rule 8 there is one current name; a re-export would let new code keep importing the adapter-scoped name and quietly rebuild the coupling.

*Alternatives rejected:* keep the constant in the claude adapter and import it from pi/codex (a harness importing another harness's adapter — pair code, Rule 9); duplicate the list per adapter (three drifting copies).

### D3 — Doctor compares `process.execPath`, not just the shebang

The primary signal is what is executing right now:

```ts
path.basename(process.execPath)   // "bun" | "node" | "deno"
```

This is exact, needs no file parsing, and would have caught the actual bug on the first `orch doctor` run — orch was executing under bun while nothing declared bun. A shebang scan alone would not have: the shebang lived on a *symlink target outside the package*, which a `packageRoot()`-relative check never looks at.

The shebang of the resolved-on-PATH `orch` is a **secondary** signal, covering the inverse case: doctor runs correctly but the installed entrypoint is wrong. Both are reported by the one `runtime` check:

| declared | `process.execPath` | verdict |
|---|---|---|
| declared == executing | ok, for every runtime, with no warning |
| node declared, bun executing | **fail** — names both, and both remedies |
| bun declared, node executing | **fail**, just as loudly — neither direction is the "right" one |
| entrypoint shebang ≠ declared | **fail**, even when doctor itself happens to run under the declared runtime |
| declared runtime not on PATH | fail |
| executing runtime unrecognized | warn naming the observed executable, never a silent ok |

No runtime is privileged. Rule 6 governs what orch's SOURCE may call — `Bun.*` and `bun:*` are banned from runtime code so the tree runs anywhere, and `check:bridge` enforces that independently of this check. It says nothing about which binary an operator may launch orch with. The defect this check exists for is the MISMATCH, so remediation names both directions (rebuild the entrypoint, or re-record the declaration) rather than assuming which the operator intended.

*Alternatives rejected:* shebang-only (misses the symlink case that actually occurred); `process.versions.bun` sniffing (works, but `execPath` covers all three uniformly and reads as intent).

### D4 — Sequencing against `monolith-file-breakdown` is a hard dependency, not a preference

That change relocates `src/doctor.ts` → `src/doctor/` (Phase C) and touches `src/adapters/pi.ts` (Phase E), and its task 7.3 requires phases A–E show **relocations only, no behavioral test assertion modified**. This change adds a doctor check and edits `doctor.ts:143`/`:144` — behavioral edits to files mid-relocation.

Decision: **implement this change only after `monolith-file-breakdown` completes Phase C and Phase E**, and target the post-split module paths (`src/doctor/runner.ts`, `src/doctor/config.ts`) directly. Writing against `src/doctor.ts` now would either be clobbered by the move or contaminate the pure-move audit.

Specs and design (this artifact) are written *now* because they cost nothing to hold and the design pressure is understood while it is fresh. Only `tasks.md` execution blocks.

*Alternatives rejected:* implement first and let the monolith change absorb the edits (breaks 7.3's audit); fold this into the monolith change (explicitly forbidden by its own scope).

### D5 — A settings file without `runtime` is malformed; bump `SETTINGS_SCHEMA` to 2

Per Rule 8 there is exactly one live schema pre-publish. `src/config.ts` already throws loudly on a `schemaVersion` mismatch with "re-run orch setup", so the mechanism exists — this change bumps the constant and adds `runtime` as a **required** key in the zod `strictObject`.

No default-on-read fallback (`root.runtime ?? "node"`). A silent default is exactly how the current bug hid: something plausible was assumed rather than declared. Absent key → loud error → `orch setup`.

Note the blast radius: every existing `settings.json` on every dev machine becomes invalid on upgrade, including the one written minutes ago on this box. That is the intended Rule 8 behavior, and setup is a single re-run.

*Alternatives rejected:* optional key defaulting to node (reintroduces silent inference); accept both schema 1 and 2 (Rule 8 forbids two live shapes).

### D6 — Backend capabilities gates on the active backend

Current (`src/doctor.ts:143`):
```ts
status: backends.some((b) => !b.available || !b.insideSession) ? "fail" : "ok"
```

With herdr + headless + tmux installed this demands being inside all three sessions at once — impossible for two pane backends. The check is not merely noisy, it is **unsatisfiable by construction**, which trains the operator to ignore a FAIL row.

Corrected semantics: `available` must hold for **every** installed backend (a genuine conjunction — an installed backend that isn't available is a real defect), while `insideSession` is required only of the **active/default** backend. The `\\n` literal in the adjacent detail string (`:144`) becomes a real newline.

### D7 — "A check may not report `ok` for an artifact it did not verify" is a spec-level rule, not a one-line fix

`claude.ts:327` is one instance; the codex equivalent already does it right. Rather than patch the single site, `doctor-config` gains a requirement binding all shim/artifact checks: if a check's detail names a path, that path's existence was confirmed. This is the generalization of the observed failure — the check printed a filename as evidence of health while the file did not exist.

## Risks / Trade-offs

- **Every existing `settings.json` breaks on upgrade (D5)** → Intended per Rule 8. Mitigated by the existing loud `schemaVersion` error already naming `orch setup` as the fix, and by orch being pre-publish, so the affected population is the dev machines.
- **Blocking on `monolith-file-breakdown` (D4) could stall this indefinitely** → The two doctor truthfulness bugs (D6, D7) are live and misleading today. Mitigation: they are small and self-contained; if the monolith change stalls, D6/D7 can be split into a follow-up targeting whatever paths exist then. They are ordered late in `tasks.md` so the runtime work is not held hostage to them.
- **Declaring `bun` remains selectable while Rule 6 forbids it as a runtime** → Resolved by making it selectable but warned: setup marks it explicit-opt-in and doctor emits a warn even when declared and matching. Removing bun from the list entirely would break any contributor deliberately running from source under bun.
- **`process.execPath` under an unexpected runtime** (a wrapper, a repackaged binary) → basename may not match any known id. Treated as `unknown` and reported as a warn naming the observed path, never a silent `ok` — consistent with D7.
- **deno stays selectable but unproven (Non-goal)** → A user selecting deno may hit shim failures this change does not catch. Mitigation: setup labels deno as unverified at the point of selection, so the choice is informed.

## Migration Plan

1. Land `monolith-file-breakdown` Phases C and E (hard prerequisite, D4).
2. Add the shared runtime module (D2); delete `CLAUDE_HOOK_RUNTIMES` and repoint the claude adapter and `test/claude-hooks-shim.test.ts`.
3. Bump `SETTINGS_SCHEMA` to 2 and add required `runtime` (D5) — every writer, reader, and test in the same change per Rule 8.
4. Add the setup selection step; delete the `find(binaryOnPath)` auto-detect at `claude.ts:167`.
5. Repoint pi and codex shim installers at the declared runtime.
6. Add the `runtime` doctor check (D3); fix D6 and D7.
7. Re-run `orch setup` on the dev box to write a schema-2 file, then `orch doctor` to confirm the new check reads `ok`.

**Rollback:** the change is additive to settings plus localized doctor edits; reverting the commit and re-running `orch setup` restores a schema-1 file. No data migration, no persisted state beyond `settings.json`.

## Open Questions

- Should the `runtime` check be FAIL or WARN when declared `bun` matches actual `bun`? Design assumes **ok + warn** (D3 table). If Rule 6 is read strictly as "bun must never be the runtime, including from source", it becomes FAIL and the contributor-from-source workflow needs another escape hatch.
- Does `orch doctor --fix` eventually own re-running the build when the entrypoint mismatches? Deferred per Non-goals; revisit once the check has field-proven accurate.
- Should remote hosts declare their own runtime? Deferred; the `remote-hosts` spec is untouched here.
