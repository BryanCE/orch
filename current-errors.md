$ bun run lint && bunx tsc --noEmit && bun run check:bridge
$ oxlint bin src test extensions scripts
Found 0 warnings and 0 errors.
Finished in 3.5s on 196 files with 65 rules using 8 threads.
$ bun scripts/check-bridge.ts
check:bridge FAIL src\daemon\orchd.ts:24 backend subpath imports are forbidden outside backends (boundary modules live directly under backends/)
error: script "check:bridge" exited with code 1
error: script "check" exited with code 1
