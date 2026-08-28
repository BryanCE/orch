$ bun run --parallel --no-exit-on-error lint tc check:bridge
check:bridge | check:bridge OK (825 files scanned)
check:bridge | Done in 461ms
tc           | test/close-always.test.ts(143,5): error TS2322: Type '(code?: number) => void' is not assignable to type '(code?: string | number | null | undefined) => never'.
tc           |   Type 'void' is not assignable to type 'never'.
tc           | test/close-always.test.ts(181,5): error TS2322: Type '(code?: number) => void' is not assignable to type '(code?: string | number | null | undefined) => never'.
tc           |   Type 'void' is not assignable to type 'never'.
tc           | test/close-always.test.ts(260,5): error TS2322: Type '(code?: number) => void' is not assignable to type '(code?: string | number | null | undefined) => never'.
tc           |   Type 'void' is not assignable to type 'never'.
tc           | test/port-seam-errors.test.ts(12,38): error TS2307: Cannot find module '../src/backends/herdr/cli.ts?port-seam' or its corresponding type declarations.
tc           | Exited with code 1
lint         | Found 0 warnings and 0 errors.
lint         | Finished in 1.2s on 299 files with 65 rules using 8 threads.
lint         | Done in 1.25s
error: script "check" exited with code 1
