$ bun run lint && bunx tsc --noEmit && bun run check:bridge
$ oxlint bin src test extensions scripts
Found 0 warnings and 0 errors.
Finished in 2.8s on 196 files with 65 rules using 8 threads.
src/daemon/orchd.ts(186,36): error TS2339: Property 'key' does not exist on type 'WriteParams'.
src/daemon/orchd.ts(187,42): error TS2339: Property 'adapter' does not exist on type 'WriteParams'.
src/daemon/orchd.ts(193,31): error TS2339: Property 'cwd' does not exist on type 'WriteParams'.
src/daemon/orchd.ts(195,33): error TS2339: Property 'tools' does not exist on type 'WriteParams'.
src/daemon/orchd.ts(196,20): error TS2339: Property 'workers' does not exist on type 'WriteParams'.
src/setup/io.ts(33,5): error TS2322: Type '{ value: Id; label: Id; }[]' is not assignable to type 'Option<Id>[]'.
  Type '{ value: Id; label: Id; }' is not assignable to type 'Option<Id>'.
src/store/sqlite.ts(64,60): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'SQLInputValue'.
src/store/sqlite.ts(65,41): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'SQLInputValue'.
src/store/sqlite.ts(66,41): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'SQLInputValue'.
error: script "check" exited with code 1
