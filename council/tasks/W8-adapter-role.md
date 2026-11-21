# W8: the adapter role, and a lookup of the spawn wiring

Context for every section. An agent launched with a write root may change files only inside
that one directory. Each harness names the tools such an agent keeps in a `ToolVocabulary`
(`packages/orch/src/policy/write-root.ts`): `PI_TOOLS` in
`packages/orch/extensions/pi/vocabulary.ts`, `OMP_TOOLS` in
`packages/orch/extensions/omp/vocabulary.ts`, `CLAUDE_TOOLS` in
`packages/orch/extensions/claude/vocabulary.ts`. The two sections touch different files and
run at the same time. Paths are from the repo root `/home/bryan/orch`. Code style: TypeScript,
`node:` builtins only, no `as` casts, no `any`, double quotes, a `/** ... */` doc comment on
every export.

Verify for T8: run exactly this from the repo root, once, after the edits. Ignore any other
verify command your header names; it belongs to another project. Run no test and no typecheck.
```
bunx oxlint -c packages/orch/.oxlintrc.json <the files you edited>
```

## T8 Each adapter declares its tool vocabulary
Edit `packages/orch/src/types/adapter.ts`:
- Add `import type { ToolVocabulary } from "../policy/write-root.ts";` with the other type imports.
- In `SpawnOpts`, after the `workers` member, add:
  ```ts
    /** The one directory this agent may write in. Set, the adapter leaves it only its read and write tools. */
    readonly writeRoot?: string;
  ```
- In the adapter interface, directly after the `commandGate` member (L332-333), add:
  ```ts
    /** The harness's names for the tools a write-root agent keeps, or null when its integration has no site that can refuse a tool call. */
    readonly toolVocabulary: ToolVocabulary | null;
  ```
Edit `packages/orch/src/adapters/pi.ts`:
- Add `import { PI_TOOLS } from "../../extensions/pi/vocabulary.ts";` and add `ToolVocabulary`
  as a type import from `"../policy/write-root.ts"`.
- In `PiBridgeAdapter`, directly after `readonly commandGate = true;` (L372), add
  `abstract readonly toolVocabulary: ToolVocabulary;`.
- In the `PiAdapter` class (the one with `readonly id = "pi" as const;`), add
  `readonly toolVocabulary = PI_TOOLS;` directly after its `id` line.
Edit `packages/orch/src/adapters/omp.ts`: add
`import { OMP_TOOLS } from "../../extensions/omp/vocabulary.ts";` and, in `OmpAdapter` directly
after `readonly id = "omp" as const;`, add `readonly toolVocabulary = OMP_TOOLS;`.
Edit `packages/orch/src/adapters/claude.ts`:
- Add `import { CLAUDE_TOOLS } from "../../extensions/claude/vocabulary.ts";` and
  `import { writeRootTools } from "../policy/write-root.ts";`.
- Directly after `readonly commandGate = true;` add `readonly toolVocabulary = CLAUDE_TOOLS;`.
- Directly after the `mcpArgv` function (L143-145) add:
  ```ts
  /** Claude's `--tools` for a write-root agent: the tools that read and the two that write, and no other. */
  function writeRootArgv(opts: SpawnOpts): string[] {
    return opts.writeRoot === undefined ? [] : ["--tools", writeRootTools(CLAUDE_TOOLS).join(",")];
  }
  ```
- In `interactiveArgv` (L271) and in `headlessCmd` (L278), add `...writeRootArgv(opts)` directly
  after `...mcpArgv(opts)`.
Edit `packages/orch/src/adapters/codex.ts` (L129) and `packages/orch/src/adapters/opencode.ts`
(L76): directly after `readonly commandGate = false;` add `readonly toolVocabulary = null;`.
Edit `packages/orch/test/helpers/adapter.ts` (L25): directly after `commandGate: false,` add
`toolVocabulary: null,`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T14 Lookup: every place a launch's options are built
This lookup finds every place that has to carry a new launch fact, `writeRoot`, from the
request to the process. Edit no source file. Run no `orch` command, no build, no test, no git
command that writes.
Read `packages/orch/src/daemon/server/spawn/` (every file),
`packages/orch/src/daemon/server/handlers/lifecycle.ts`,
`packages/orch/src/daemon/server/handlers/restart-form.ts`,
`packages/orch/src/daemon/server/handlers/relaunch.ts`,
`packages/orch/src/daemon/client/protocol.ts`, `packages/orch/src/types/backend.ts`,
`packages/orch/src/types/store.ts`, `packages/orch/src/commands/spawn/`,
`packages/orch/src/backends/headless/`, `packages/orch/src/backends/held/`.
Write `council/findings/L14-launch-options.md`: markdown, one `##` heading per numbered
question, each fact as a bullet ending in `path:line`, code quoted in a code block when the
question asks for a shape. Write "not found" with the grep you ran where the code has no answer.
1. Every expression that builds a `BackendSpawnOpts` or a `SpawnOpts` object. One bullet per
   site: the function, the file and line, and the lines that set `env`, `tools` and `workers`.
2. `SpawnSettings` and the plan type `planFor` returns in `spawn/plan.ts`, both quoted in
   full, and the function that builds each from the `spawn` RPC's params.
3. `SPAWN_AGENT`, the `spawn` params and the `spawn-headless` params in `protocol.ts`, quoted
   in full with line numbers. Then the function in `packages/orch/src/commands/spawn/` that
   builds one `SPAWN_AGENT` value from the flags, quoted.
4. `SpawnRegistration` and `HostedSpawnRegistration` in `types/store.ts`, quoted in full.
   Then every call of `registerSpawnedAgent` and `registerHostedAgent`: the function, file and
   line, and where each caller gets `model` and `thinking` from.
5. `spawnEnv` in `spawn/index.ts` (or where it is defined), quoted in full, with every caller.
6. The headless backend's `spawn` and the held launch (`startHeldAgent`, `startSessionAgent`):
   the lines where `opts.env` becomes the child process's environment, and the lines that turn
   `SpawnOpts` into the adapter's argv (`headlessCmd`, `interactiveArgv`, `restrictedHeadlessCmd`).
7. In `restart-form.ts`: every caller of `restartOpts`, and what each does with the result.
8. `relaunch.ts`: what it relaunches and where its launch options come from. Quote the lines.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
