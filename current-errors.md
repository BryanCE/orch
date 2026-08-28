$ bun run --parallel --no-exit-on-error lint tc check:bridge
check:bridge | check:bridge OK (808 files scanned)
check:bridge | Done in 596ms
tc           | src/backends/herdr/index.ts(173,18): error TS2367: This comparison appears to be unintentional because the types '"claude" | "codex" | "omp" | "pi"' and '""' have no overlap.
tc           | src/backends/herdr/notify.ts(24,26): error TS2322: Type 'void' is not assignable to type 'boolean | Promise<boolean>'.
tc           | test/seat-index.test.ts(64,33): error TS2769: No overload matches this call.
tc           |   The last overload gave the following error.
tc           |     Type 'undefined' is not assignable to type 'string'.
tc           | Exited with code 1
lint         | 
lint         |   x typescript(array-type): Array type using 'Array<T>' is forbidden. Use 'T[]' instead.
lint         |     ,-[test/agent-monitor.test.ts:12:25]
lint         |  11 | const subscriptions: Subscription[] = [];
lint         |  12 | const subscribeOptions: Array<{ since?: number }> = [];
lint         |     :                         ^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  13 | const tempDirs: string[] = [];
lint         |     `----
lint         |   help: Replace `Array<{ since?: number }>` with `{ since?: number }[]`.
lint         | 
lint         |   x typescript(array-type): Array type using 'Array<T>' is forbidden. Use 'T[]' instead.
lint         |     ,-[test/agent-monitor.test.ts:36:26]
lint         |  35 | 
lint         |  36 | function context(status: Array<string | undefined> = [], widgets: unknown[] = []): HarnessContext {
lint         |     :                          ^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  37 |   return {
lint         |     `----
lint         |   help: Replace `Array<string | undefined>` with `(string | undefined)[]`.
lint         | 
lint         |   x eslint(no-empty-function): Unexpected empty function
lint         |     ,-[test/agent-monitor.test.ts:42:21]
lint         |  41 |     ui: {
lint         |  42 |       notify: () => {},
lint         |     :                     ^^
lint         |  43 |       setStatus: (_key, text) => { status.push(text); },
lint         |     `----
lint         |   help: Consider removing this function or adding logic to it.
lint         | 
lint         |   x typescript(array-type): Array type using 'Array<T>' is forbidden. Use 'T[]' instead.
lint         |     ,-[test/agent-monitor.test.ts:76:19]
lint         |  75 |   test("empty model renders no status line or widget", () => {
lint         |  76 |     const status: Array<string | undefined> = [];
lint         |     :                   ^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  77 |     const widgets: unknown[] = [];
lint         |     `----
lint         |   help: Replace `Array<string | undefined>` with `(string | undefined)[]`.
lint         | 
lint         |   x eslint(no-empty-function): Unexpected empty function
lint         |     ,-[test/agent-monitor.test.ts:87:33]
lint         |  86 |     process.env.ORCH_AGENT_KEY = "worker-key";
lint         |  87 |     const harness = { on: () => {}, registerTool: () => {}, registerCommand: () => {}, sendUserMessage: () => {}, setModel: () => {}, getThinkingLevel: () => undefined, setThinkingLevel: () => {}, events: { on: () => {} } } as unknown as HarnessApi;
lint         |     :                                 ^^
lint         |  88 |     expect(registerFleetMonitor(harness, dir(), { ownKey: () => "worker-key" })).toBeUndefined();
lint         |     `----
lint         |   help: Consider removing this function or adding logic to it.
lint         | 
lint         |   x eslint(no-empty-function): Unexpected empty function
lint         |     ,-[test/agent-monitor.test.ts:87:57]
lint         |  86 |     process.env.ORCH_AGENT_KEY = "worker-key";
lint         |  87 |     const harness = { on: () => {}, registerTool: () => {}, registerCommand: () => {}, sendUserMessage: () => {}, setModel: () => {}, getThinkingLevel: () => undefined, setThinkingLevel: () => {}, events: { on: () => {} } } as unknown as HarnessApi;
lint         |     :                                                         ^^
lint         |  88 |     expect(registerFleetMonitor(harness, dir(), { ownKey: () => "worker-key" })).toBeUndefined();
lint         |     `----
lint         |   help: Consider removing this function or adding logic to it.
lint         | 
lint         |   x eslint(no-empty-function): Unexpected empty function
lint         |     ,-[test/agent-monitor.test.ts:87:84]
lint         |  86 |     process.env.ORCH_AGENT_KEY = "worker-key";
lint         |  87 |     const harness = { on: () => {}, registerTool: () => {}, registerCommand: () => {}, sendUserMessage: () => {}, setModel: () => {}, getThinkingLevel: () => undefined, setThinkingLevel: () => {}, events: { on: () => {} } } as unknown as HarnessApi;
lint         |     :                                                                                    ^^
lint         |  88 |     expect(registerFleetMonitor(harness, dir(), { ownKey: () => "worker-key" })).toBeUndefined();
lint         |     `----
lint         |   help: Consider removing this function or adding logic to it.
lint         | 
lint         |   x eslint(no-empty-function): Unexpected empty function
lint         |     ,-[test/agent-monitor.test.ts:87:111]
lint         |  86 |     process.env.ORCH_AGENT_KEY = "worker-key";
lint         |  87 |     const harness = { on: () => {}, registerTool: () => {}, registerCommand: () => {}, sendUserMessage: () => {}, setModel: () => {}, getThinkingLevel: () => undefined, setThinkingLevel: () => {}, events: { on: () => {} } } as unknown as HarnessApi;
lint         |     :                                                                                                               ^^
lint         |  88 |     expect(registerFleetMonitor(harness, dir(), { ownKey: () => "worker-key" })).toBeUndefined();
lint         |     `----
lint         |   help: Consider removing this function or adding logic to it.
lint         | 
lint         |   x eslint(no-empty-function): Unexpected empty function
lint         |     ,-[test/agent-monitor.test.ts:87:131]
lint         |  86 |     process.env.ORCH_AGENT_KEY = "worker-key";
lint         |  87 |     const harness = { on: () => {}, registerTool: () => {}, registerCommand: () => {}, sendUserMessage: () => {}, setModel: () => {}, getThinkingLevel: () => undefined, setThinkingLevel: () => {}, events: { on: () => {} } } as unknown as HarnessApi;
lint         |     :                                                                                                                                   ^^
lint         |  88 |     expect(registerFleetMonitor(harness, dir(), { ownKey: () => "worker-key" })).toBeUndefined();
lint         |     `----
lint         |   help: Consider removing this function or adding logic to it.
lint         | 
lint         |   x eslint(no-empty-function): Unexpected empty function
lint         |     ,-[test/agent-monitor.test.ts:87:194]
lint         |  86 |     process.env.ORCH_AGENT_KEY = "worker-key";
lint         |  87 |     const harness = { on: () => {}, registerTool: () => {}, registerCommand: () => {}, sendUserMessage: () => {}, setModel: () => {}, getThinkingLevel: () => undefined, setThinkingLevel: () => {}, events: { on: () => {} } } as unknown as HarnessApi;
lint         |     :                                                                                                                                                                                                  ^^
lint         |  88 |     expect(registerFleetMonitor(harness, dir(), { ownKey: () => "worker-key" })).toBeUndefined();
lint         |     `----
lint         |   help: Consider removing this function or adding logic to it.
lint         | 
lint         |   x eslint(no-empty-function): Unexpected empty function
lint         |     ,-[test/agent-monitor.test.ts:87:218]
lint         |  86 |     process.env.ORCH_AGENT_KEY = "worker-key";
lint         |  87 |     const harness = { on: () => {}, registerTool: () => {}, registerCommand: () => {}, sendUserMessage: () => {}, setModel: () => {}, getThinkingLevel: () => undefined, setThinkingLevel: () => {}, events: { on: () => {} } } as unknown as HarnessApi;
lint         |     :                                                                                                                                                                                                                          ^^
lint         |  88 |     expect(registerFleetMonitor(harness, dir(), { ownKey: () => "worker-key" })).toBeUndefined();
lint         |     `----
lint         |   help: Consider removing this function or adding logic to it.
lint         | 
lint         |   x eslint(no-unused-vars): Variable 'dir' is declared but never used. Unused variables should start with a '_'.
lint         |      ,-[test/close-always.test.ts:206:11]
lint         |  205 |   test("duplicate close targets count once", () => {
lint         |  206 |     const dir = makeDir();
lint         |      :           ^|^
lint         |      :            `-- 'dir' is declared here
lint         |  207 |     const key = "headless~foreign~duplicate";
lint         |      `----
lint         |   help: Consider removing this declaration.
lint         | 
lint         |   x typescript(no-base-to-string): 'error.stderr' may use Object's default stringification format ('[object Object]') when stringified.
lint         |     ,-[src/backends/herdr/cli.ts:50:56]
lint         |  49 |     const status = typeof error.status === "number" ? `exit status ${error.status}` : undefined;
lint         |  50 |     const stderr = error.stderr !== undefined ? String(error.stderr).trim() : "";
lint         |     :                                                        ^^^^^^^^^^^^
lint         |  51 |     const stdout = error.stdout !== undefined ? String(error.stdout).trim() : "";
lint         |     `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'error.stdout' may use Object's default stringification format ('[object Object]') when stringified.
lint         |     ,-[src/backends/herdr/cli.ts:51:56]
lint         |  50 |     const stderr = error.stderr !== undefined ? String(error.stderr).trim() : "";
lint         |  51 |     const stdout = error.stdout !== undefined ? String(error.stdout).trim() : "";
lint         |     :                                                        ^^^^^^^^^^^^
lint         |  52 |     const message = error.message !== undefined ? String(error.message) : String(error);
lint         |     `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'error.message' may use Object's default stringification format ('[object Object]') when stringified.
lint         |     ,-[src/backends/herdr/cli.ts:52:58]
lint         |  51 |     const stdout = error.stdout !== undefined ? String(error.stdout).trim() : "";
lint         |  52 |     const message = error.message !== undefined ? String(error.message) : String(error);
lint         |     :                                                          ^^^^^^^^^^^^^
lint         |  53 |     return [status, stderr && `stderr: ${stderr}`, stdout && `stdout: ${stdout}`, message].filter(Boolean).join("; ");
lint         |     `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'error' will use Object's default stringification format ('[object Object]') when stringified.
lint         |     ,-[src/backends/herdr/cli.ts:52:82]
lint         |  51 |     const stdout = error.stdout !== undefined ? String(error.stdout).trim() : "";
lint         |  52 |     const message = error.message !== undefined ? String(error.message) : String(error);
lint         |     :                                                                                  ^^^^^
lint         |  53 |     return [status, stderr && `stderr: ${stderr}`, stdout && `stdout: ${stdout}`, message].filter(Boolean).join("; ");
lint         |     `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since it does not change the type of the expression.
lint         |      ,-[test/backend-herdr.test.ts:247:22]
lint         |  245 |       test("pane input submits through pane run", () => {
lint         |  246 | ,->     herdrArgv.length = 0;
lint         |  247 | |->     backend.paneInput!.submit("w0:p1", "ls");
lint         |      : `---                     ^
lint         |      : `---- This expression already has the type '{ submit: (handle: string, text: string) => void; }'
lint         |  248 |     
lint         |      `----
lint         | 
lint         |   x typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
lint         |      ,-[test/cmd-lock-bridge.test.ts:138:7]
lint         |  137 |           const { emit } = driveBridge();
lint         |  138 | ,->       await expect(emit("tool_execution_start", {
lint         |      : |         ^^^^^
lint         |  139 | |           toolName: "bash",
lint         |  140 | |           toolCallId: "tc-broken-settings-1",
lint         |  141 | |           args: { command: LOCKED_COMMAND },
lint         |  142 | |->       })).rejects.toThrow(join(orchDir, "settings.json"));
lint         |      : `---- This expression is not Promise-like
lint         |  143 |         } finally {
lint         |      `----
lint         |   help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.
lint         | 
lint         |   x typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
lint         |      ,-[test/close-always.test.ts:126:26]
lint         |  125 |     const originalKill = process.kill.bind(process);
lint         |  126 |     const originalExit = process.exit;
lint         |      :                          ^^^^^^^^^^^^|
lint         |      :                                |     `-- This reference may be unbound and lose `this` context
lint         |  127 |     const oldExitCode = process.exitCode;
lint         |      `----
lint         |   help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.
lint         | 
lint         |   x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since it does not change the type of the expression.
lint         |      ,-[test/close-always.test.ts:131:8]
lint         |  127 |         const oldExitCode = process.exitCode;
lint         |  128 | ,->     process.kill = ((target: number, signal?: NodeJS.Signals | 0) => {
lint         |  129 | |         if (target === pid && signal === "SIGTERM") throw new Error("signal denied");
lint         |  130 | |         return originalKill(target, signal as 0 | NodeJS.Signals | undefined);
lint         |  131 | |->     }) as typeof process.kill;
lint         |      : `---       ^^^^^^^^^^^|^^^^^^^^^^^
lint         |      : `---                  `-- Casting it to '(pid: number, signal?: string | number | undefined) => true' is unnecessary
lint         |      : `---- This expression already has the type '(target: number, signal?: 0 | Signals | undefined) => true'
lint         |  132 |         process.exit = ((code?: number) => { process.exitCode = code ?? 0; }) as typeof process.exit;
lint         |      `----
lint         | 
lint         |   x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since it does not change the type of the expression.
lint         |      ,-[test/close-always.test.ts:130:42]
lint         |  129 |       if (target === pid && signal === "SIGTERM") throw new Error("signal denied");
lint         |  130 |       return originalKill(target, signal as 0 | NodeJS.Signals | undefined);
lint         |      :                                   ^^^|^^ ^^^^^^^^^^^^^^^^|^^^^^^^^^^^^^^^^^
lint         |      :                                      |                   `-- Casting it to '0 | Signals | undefined' is unnecessary
lint         |      :                                      `-- This expression already has the type '0 | Signals | undefined'
lint         |  131 |     }) as typeof process.kill;
lint         |      `----
lint         | 
lint         |   x typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
lint         |      ,-[test/close-always.test.ts:210:26]
lint         |  209 |     const oldExitCode = process.exitCode;
lint         |  210 |     const originalExit = process.exit;
lint         |      :                          ^^^^^^^^^^^^|
lint         |      :                                |     `-- This reference may be unbound and lose `this` context
lint         |  211 |     process.exit = ((code?: number) => { process.exitCode = code ?? 0; }) as typeof process.exit;
lint         |      `----
lint         |   help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.
lint         | 
lint         |   x typescript(no-floating-promises): Promises must be awaited, add void operator to ignore.
lint         |      ,-[test/commands-lease.test.ts:155:5]
lint         |  154 | 
lint         |  155 |     cmdReap([key, "--json"]);
lint         |      :     ^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  156 | 
lint         |      `----
lint         |   help: The promise must end with a call to .catch, or end with a call to .then with a rejection handler, or be explicitly marked as ignored with the `void` operator.
lint         | 
lint         |   x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since the receiver accepts the original type of the expression.
lint         |     ,-[test/commands-spawn.test.ts:43:27]
lint         |  42 |     let stderr = "";
lint         |  43 |     process.stderr.write = ((chunk: string | Uint8Array) => { stderr += String(chunk); return true; }) as typeof process.stderr.write;
lint         |     :                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  44 |     process.exit = ((code?: number): never => { throw new Error(`exit ${code ?? 0}`); }) as typeof process.exit;
lint         |     `----
lint         | 
lint         |   x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since it does not change the type of the expression.
lint         |     ,-[test/commands-spawn.test.ts:44:90]
lint         |  43 |     process.stderr.write = ((chunk: string | Uint8Array) => { stderr += String(chunk); return true; }) as typeof process.stderr.write;
lint         |  44 |     process.exit = ((code?: number): never => { throw new Error(`exit ${code ?? 0}`); }) as typeof process.exit;
lint         |     :                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^|^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^|^^^^^^^^^^^
lint         |     :                                                      |                                              `-- Casting it to '(code?: string | number | null | undefined) => never' is unnecessary
lint         |     :                                                      `-- This expression already has the type '(code?: number | undefined) => never'
lint         |  45 |     let refusal: unknown;
lint         |     `----
lint         | 
lint         |   x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since the receiver accepts the original type of the expression.
lint         |     ,-[test/commands-spawn.test.ts:74:27]
lint         |  73 |     let stderr = "";
lint         |  74 |     process.stderr.write = ((chunk: string | Uint8Array) => { stderr += String(chunk); return true; }) as typeof process.stderr.write;
lint         |     :                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  75 |     process.exit = ((code?: number): never => { throw new Error(`exit ${code ?? 0}`); }) as typeof process.exit;
lint         |     `----
lint         | 
lint         |   x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since it does not change the type of the expression.
lint         |     ,-[test/commands-spawn.test.ts:75:90]
lint         |  74 |     process.stderr.write = ((chunk: string | Uint8Array) => { stderr += String(chunk); return true; }) as typeof process.stderr.write;
lint         |  75 |     process.exit = ((code?: number): never => { throw new Error(`exit ${code ?? 0}`); }) as typeof process.exit;
lint         |     :                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^|^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^|^^^^^^^^^^^
lint         |     :                                                      |                                              `-- Casting it to '(code?: string | number | null | undefined) => never' is unnecessary
lint         |     :                                                      `-- This expression already has the type '(code?: number | undefined) => never'
lint         |  76 |     let refusal: unknown;
lint         |     `----
lint         | 
lint         |   x typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
lint         |      ,-[test/control-dispatch.test.ts:100:5]
lint         |   99 |     recordSpawned(key, { adapter: "claude", backend: "headless", handle: key });
lint         |  100 |     await expect(deliverControl(key, { kind: "steer", text: "hello claude" })).rejects.toThrow(/no pane input role/);
lint         |      :     ^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^|^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |      :       |                                                        `-- This expression is not Promise-like
lint         |  101 |   }, 15_000);
lint         |      `----
lint         |   help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.
lint         | 
lint         |   x typescript(prefer-optional-chain): Prefer using an optional chain expression instead, as it's more concise and easier to read.
lint         |     ,-[test/store-task-rows.test.ts:72:11]
lint         |  71 |       const rejected = outcomes.find((outcome) => outcome.status === "rejected");
lint         |  72 |       if (!rejected || rejected.status !== "rejected") throw new Error("expected one rejected claim");
lint         |     :           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  73 |       expect(String(rejected.reason)).toMatch(/UNIQUE constraint failed: task_attempts\.task_id/i);
lint         |     `----
lint         | 
lint         | Found 0 warnings and 29 errors.
lint         | Finished in 1.6s on 290 files with 65 rules using 8 threads.
lint         | Exited with code 1
error: script "check" exited with code 1
