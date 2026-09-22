$ bun --filter @bryance/orch check
@bryance/orch check: check:bridge | check:bridge OK (1626 files scanned)
@bryance/orch check: check:bridge | Done in 727ms
@bryance/orch check: lint         | Found 0 warnings and 0 errors.
@bryance/orch check: lint         | Finished in 2.2s on 614 files with 65 rules using 24 threads.
@bryance/orch check: lint         | Done in 2.42s
@bryance/orch check: tc           | src/commands/spawn/admission.ts(145,63): error TS2322: Type 'GrantAction' is not assignable to type '{ kind: "spawn.new-space"; params: Record<string, string>; }'.
@bryance/orch check: tc           |   Types of property 'kind' are incompatible.
@bryance/orch check: tc           |     Type '"command.run" | "spawn.new-space"' is not assignable to type '"spawn.new-space"'.
@bryance/orch check: tc           |       Type '"command.run"' is not assignable to type '"spawn.new-space"'.
@bryance/orch check: tc           | Exited with code 1
@bryance/orch check: Exited with code 1
error: script "check:orch" exited with code 1
