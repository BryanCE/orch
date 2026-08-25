$ bun run lint && bunx tsc --noEmit && bun run check:bridge
$ oxlint bin src test extensions scripts

  x eslint(no-unused-vars): Identifier 'callerOwnerToken' is imported but never used.
    ,-[src/commands/events.ts:13:10]
 12 | import { ensureDaemon } from "./daemon.ts";
 13 | import { callerOwnerToken, die } from "./target.ts";
    :          ^^^^^^^^|^^^^^^^
    :                  `-- 'callerOwnerToken' is imported here
 14 | 
    `----
  help: Consider removing this import.

  x typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
     ,-[src/notify/format.ts:156:73]
 155 |   let summary = event.task ?? "state changed";
 156 |   if (event.newState === "done") summary = event.lastText || event.task || "state changed";
     :                                                                         ^^
 157 |   else if (event.newState === "error") summary = event.lastError ?? event.task ?? "agent error";
     `----

  x typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
     ,-[src/notify/format.ts:156:59]
 155 |   let summary = event.task ?? "state changed";
 156 |   if (event.newState === "done") summary = event.lastText || event.task || "state changed";
     :                                                           ^^
 157 |   else if (event.newState === "error") summary = event.lastError ?? event.task ?? "agent error";
     `----

  x typescript(no-unsafe-assignment): Unsafe assignment of an any value.
    ,-[test/daemon-rpc.test.ts:95:35]
 94 |     const second = await rpcCall(dir, "hello");
 95 |     expect(first).toMatchObject({ label: expect.any(String), kind: "session" });
    :                                   ^^^^^^^^^^^^^^^^^^^^^^^^^
 96 |     expect(second).toEqual(first);
    `----

  x typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ,-[test/daemon-rpc.test.ts:107:61]
 106 |       id: 1,
 107 |       result: { kind: "session", label: "local TCP client", id: expect.any(String) },
     :                                                             ^^^^^^^^^^^^^^^^^^^^^^
 108 |     });
     `----

  x typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
     ,-[extensions/claude/index.ts:99:27]
  98 | const preparedTask = typeof rawTask === "string" ? prepareWorkerTask(rawTask, MAX_TASK) : undefined;
  99 | const task = preparedTask || previous.task;
     :                           ^^
 100 | const sessionId = textValue(input.session_id ?? input.sessionId) ?? previous.sessionId;
     `----

Found 0 warnings and 6 errors.
Finished in 451ms on 231 files with 65 rules using 24 threads.
error: script "lint" exited with code 1
error: script "check" exited with code 1
