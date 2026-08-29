$ bun run --parallel --no-exit-on-error lint tc check:bridge
check:bridge | check:bridge FAIL src/types/backend.ts:196 quoted herdr/tmux literals are forbidden outside backends
check:bridge | Exited with code 1
tc           | Done in 1.83s
lint         | Found 0 warnings and 0 errors.
lint         | Finished in 2.5s on 432 files with 65 rules using 8 threads.
lint         | Done in 2.53s
error: script "check" exited with code 1
