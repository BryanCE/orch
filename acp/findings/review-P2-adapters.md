# T1 adapter review

## Findings

1. `packages/orch/src/adapters/pi.ts:354`, `packages/orch/test/adapter-roles.test.ts:13`

   Breaks T1 part 1: each adapter must use its harness's own resume flag, and its test must assert that flag. `OmpAdapter` inherits `--session`, but `omp --help` declares `-r, --resume=<value>` for resuming by ID prefix or path and declares no `--session`. The test currently requires the unsupported flag.

   Exact fix: add `protected abstract readonly resumeFlag: string` to `PiBridgeAdapter`; replace `"--session"` in its resume argv builder with `this.resumeFlag`; declare `protected readonly resumeFlag = "--session"` on `PiAdapter` and `protected readonly resumeFlag = "--resume"` on `OmpAdapter` in `packages/orch/src/adapters/omp.ts`. Change the omp test row to `{ adapter: ompAdapter, flag: "--resume" }`. Keep the shared argv builder and its call to `interactiveArgv(opts)`.

## Checked

- Every resume role reuses `interactiveArgv(opts)`. No second interactive argv composition was added.
- CLI help confirms pi `--session <path|id>`, Claude `--resume [value]`, and Codex `resume [OPTIONS] [SESSION_ID] [PROMPT]`.
- Codex ACP argv is the README's `codex-acp`. Its empty env introduces no undocumented keys. The interactive adapter declares no binary override or initial mode source to translate.
- `sharesSessions: false` makes no unsupported sharing claim. The README says, "It starts the Codex App Server, translates ACP requests into Codex operations, and maps Codex events back into the client." It does not state that sessions are the CLI's own sessions.
- Resume tests assert the full interactive argv followed by the flag and session ID. The fake adapter defaults to null. The Codex test asserts default ACP argv, env, and session sharing.

## Verification

`bun check` is pending on unrelated files: `src/daemon/server/spawn/plan.ts:75` fails check:bridge; `scripts/bench-daemon.ts:133` and `test/commands-spawn.test.ts:71` fail typechecking. Code and tests were not edited or executed.

T1: 1 findings
