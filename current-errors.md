$ bun run lint && bunx tsc --noEmit && bun run check:bridge
$ oxlint bin src test extensions scripts

  x eslint(no-empty-function): Unexpected empty function
    ,-[test/commands-events.test.ts:11:87]
 10 |     // no daemon is the same path a restart takes ΓÇö it must resolve, not throw.
 11 |     const subscription = subscribeEvents("/nonexistent-orch-dir", { since: 0 }, () => {});
    :                                                                                       ^^
 12 |     expect(subscription.lastSeq()).toBe(0);
    `----
  help: Consider removing this function or adding logic to it.

  x eslint(no-unused-vars): Parameter 'handle' is declared but never used. Unused parameters should start with a '_'.
    ,-[test/answer-dispatch.test.ts:23:33]
 22 | 
 23 | function key(workspace: string, handle: string): string {
    :                                 ^^^|^^
    :                                    `-- 'handle' is declared here
 24 |   return serializeIdentity({ backend: "headless", workspace, id });
    `----
  help: Consider removing this parameter.

  x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
     ,-[src/commands/spawn.ts:373:5]
 372 |     tools: spec.tools,
 373 |     workers: spec.workers,
     :     ^^^^^^^^^^^^^^^^^^^^^
 374 |     cmd: spec.cmd,
     `----

  x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
    ,-[test/answer-dispatch.test.ts:24:62]
 23 | function key(workspace: string, handle: string): string {
 24 |   return serializeIdentity({ backend: "headless", workspace, id });
    :                                                              ^^
 25 | }
    `----

  x typescript(require-await): Function has no 'await' expression.
   ,-[test/commands-events.test.ts:7:84]
 6 |   test("parses filters and scope flags", () => expect(parseEventsOptions(["--status", "working,done", "--all", "agent"])).toEqual({ statusFilter: new Set(["working", "done"]), all: true, json: false, targets: ["agent"] }));
 7 |   test("a subscription with no daemon keeps redialing instead of exiting", async () => {
   :                                                                                    ^^^
 8 |     // One subscription must cover a whole session: a daemon restart drops the
   `----

Found 0 warnings and 5 errors.
Finished in 11.5s on 198 files with 65 rules using 8 threads.
error: script "lint" exited with code 1
error: script "check" exited with code 1
