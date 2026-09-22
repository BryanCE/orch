$ bun --filter @bryance/orch check
@bryance/orch check: check:bridge | check:bridge OK (1636 files scanned)
@bryance/orch check: check:bridge | Done in 688ms
@bryance/orch check: lint         | Found 0 warnings and 0 errors.
@bryance/orch check: lint         | Finished in 4.3s on 618 files with 65 rules using 24 threads.
@bryance/orch check: lint         | Done in 4.47s
@bryance/orch check: tc           | src/settings/write.ts(246,32): error TS2345: Argument of type '(root: Partial<{ schemaVersion: 1; runtime: "bun" | "deno" | "node"; enabled?: { adapters: ("claude" | "codex" | "omp" | "pi")[]; backends: ("headless" | "herdr" | "orca" | "tmux")[]; } | undefined; ... 23 more ...; skills?: { ...; } | undefined; }>) => { ...; }' is not assignable to parameter of type '(root: Partial<{ schemaVersion: 1; runtime: "bun" | "deno" | "node"; enabled?: { adapters: ("claude" | "codex" | "omp" | "pi")[]; backends: ("headless" | "herdr" | "orca" | "tmux")[]; } | undefined; ... 23 more ...; skills?: { ...; } | undefined; }>) => Partial<...>'.
@bryance/orch check: tc           |   Type '{ schemaVersion?: 1 | undefined; runtime?: "bun" | "deno" | "node" | undefined; questions?: { renag_ms?: number | undefined; renag_limit?: number | undefined; } | undefined; defaults: { adapter?: AdapterId; backend?: BackendId; models: Partial<Record<AdapterId, string>>; thinking: ThinkingLevel; thinking_by_harness:...' is not assignable to type 'Partial<{ schemaVersion: 1; runtime: "bun" | "deno" | "node"; enabled?: { adapters: ("claude" | "codex" | "omp" | "pi")[]; backends: ("headless" | "herdr" | "orca" | "tmux")[]; } | undefined; defaults?: { ...; } | undefined; ... 22 more ...; skills?: { ...; } | undefined; }>'.
@bryance/orch check: tc           |     The types of 'denied_commands.applies_to' are incompatible between these types.
@bryance/orch check: tc           |       The type 'readonly ("orchestrators" | "workers")[]' is 'readonly' and cannot be assigned to the mutable type '("orchestrators" | "workers")[]'.
@bryance/orch check: tc           | Exited with code 1
@bryance/orch check: Exited with code 1
error: script "check:orch" exited with code 1
