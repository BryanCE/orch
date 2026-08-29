$ bun run --parallel --no-exit-on-error lint tc check:bridge
check:bridge | check:bridge FAIL src/commands/control.ts:247 string-form provider/backend identity branch is forbidden in core; branch on declared capabilities and resolve via the registry
check:bridge | Exited with code 1
tc           | Done in 2.21s
lint         | Found 0 warnings and 0 errors.
lint         | Finished in 2.5s on 432 files with 65 rules using 8 threads.
lint         | Done in 2.52s
error: script "check" exited with code 1
