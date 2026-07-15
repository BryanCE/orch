$ oxlint . && bunx tsc --noEmit && fallow check

  x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since it does not change the type of the expression.
    ,-[test/daemon-events.test.ts:90:7]
 84 |         const states = new Map([[key, "working"]]);
 85 | ,->     const event = derivePresenceTransition(
 86 | |         key,
 87 | |         { pid: process.pid, state: "done", agent: "Ada" },
 88 | |         { name: null, tab: null },
 89 | |         states,
 90 | |->     ) as NotifyEvent | null;
    : `---      ^^^^^^^^^^|^^^^^^^^^^^
    : `---                `-- Casting it to 'NotifyEvent | null' is unnecessary
    : `---- This expression already has the type 'NotifyEvent | null'
 91 |         expect(event?.agent).toBe("Ada");
    `----

Found 0 warnings and 1 error.
Finished in 516ms on 85 files with 65 rules using 8 threads.
error: script "check" exited with code 1
