$ bun run lint && bunx tsc --noEmit && bun run check:bridge
$ oxlint bin src test extensions scripts
Found 0 warnings and 0 errors.
Finished in 3.1s on 169 files with 65 rules using 8 threads.
extensions/pi/index.ts(71,39): error TS2345: Argument of type '(active: boolean, label: string | undefined) => void' is not assignable to parameter of type '(blocked: boolean) => void'.
  Target signature provides too few arguments. Expected 2 or more, but got 1.
error: script "check" exited with code 1
