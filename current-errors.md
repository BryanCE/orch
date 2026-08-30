$ bun run --parallel --no-exit-on-error lint tc check:bridge
check:bridge | check:bridge OK (1026 files scanned)
check:bridge | Done in 463ms
tc           | src/commands/lifecycle.ts(763,72): error TS2345: Argument of type 'BackendHandle | null' is not assignable to parameter of type 'BackendHandle'.
tc           |   Type 'null' is not assignable to type 'BackendHandle'.
tc           | src/commands/panes.ts(337,9): error TS2322: Type 'undefined' is not assignable to type 'BackendHandle'.
tc           | src/commands/panes.ts(341,7): error TS2322: Type 'BackendHandle | undefined' is not assignable to type 'BackendHandle'.
tc           |   Type 'undefined' is not assignable to type 'BackendHandle'.
tc           | src/commands/spawn.ts(606,5): error TS2322: Type 'BackendHandle | undefined' is not assignable to type 'BackendHandle'.
tc           |   Type 'undefined' is not assignable to type 'BackendHandle'.
tc           | src/commands/spawn.ts(863,3): error TS2322: Type '{ name: string; cwd: string; key: string; env: { ORCH_AGENT_KEY: string; ORCH_DIR: string; }; branch: string | undefined; pane: undefined; }[]' is not assignable to type 'PreparedAgent[]'.
tc           |   Type '{ name: string; cwd: string; key: string; env: { ORCH_AGENT_KEY: string; ORCH_DIR: string; }; branch: string | undefined; pane: undefined; }' is not assignable to type 'PreparedAgent'.
tc           |     Types of property 'pane' are incompatible.
tc           |       Type 'undefined' is not assignable to type 'BackendHandle'.
tc           | src/commands/spawn.ts(915,7): error TS2322: Type 'undefined' is not assignable to type 'BackendHandle'.
tc           | Exited with code 1
lint         | 
lint         |   x typescript(no-base-to-string): 'target.handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/entities.ts:147:25]
lint         |  146 | ): Entity {
lint         |  147 |   const paneId = String(target.handle);
lint         |      :                         ^^^^^^^^^^^^^
lint         |  148 |   const key = keyByHandle.get(paneId) ?? paneId;
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'target.handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/entities.ts:245:51]
lint         |  244 |   if (!inventory || backend?.isInsideSession() !== true) return handle;
lint         |  245 |   return inventory.list().some((target) => String(target.handle) === handle) ? handle : null;
lint         |      :                                                   ^^^^^^^^^^^^^
lint         |  246 | }
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'a.handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |     ,-[src/backends/tiling.ts:35:15]
lint         |  34 |     || a.rect.x - b.rect.x
lint         |  35 |     || String(a.handle).localeCompare(String(b.handle));
lint         |     :               ^^^^^^^^
lint         |  36 | }
lint         |     `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'b.handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |     ,-[src/backends/tiling.ts:35:46]
lint         |  34 |     || a.rect.x - b.rect.x
lint         |  35 |     || String(a.handle).localeCompare(String(b.handle));
lint         |     :                                              ^^^^^^^^
lint         |  36 | }
lint         |     `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'item.handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/panes.ts:136:68]
lint         |  135 |   // paneId is the only backend handle for it.
lint         |  136 |   const pane = backend.paneInventory?.list().find((item) => String(item.handle) === ent.paneId);
lint         |      :                                                                    ^^^^^^^^^^^
lint         |  137 |   const found = groups.find((group) => group.id === (pane?.group ?? null));
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'pane.handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/panes.ts:181:125]
lint         |  180 |   if (force) return;
lint         |  181 |   const handles = new Set((backend.paneInventory?.list() ?? []).filter((pane) => pane.group === group).map((pane) => String(pane.handle)));
lint         |      :                                                                                                                             ^^^^^^^^^^^
lint         |  182 |   const presence = presenceById();
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'created.rootHandle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/panes.ts:214:112]
lint         |  213 |   if (json) process.stdout.write(JSON.stringify(created) + "\n");
lint         |  214 |   else process.stdout.write(`Created group ${created.group.id} "${created.group.label}" - root handle ${String(created.rootHandle)}\n`);
lint         |      :                                                                                                                ^^^^^^^^^^^^^^^^^^
lint         |  215 |   if (backend.paneHost) backend.paneHost.close(created.rootHandle);
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'target.handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/spawn.ts:99:87]
lint         |   98 |   const layout = readGroupLayout(role, group);
lint         |   99 |   const names = new Map((backend.paneInventory?.list() ?? []).map((target) => [String(target.handle), target.name ?? "-"]));
lint         |      :                                                                                       ^^^^^^^^^^^^^
lint         |  100 |   process.stdout.write(header + "\n");
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'p.handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/spawn.ts:102:12]
lint         |  101 |   const rows = layout.panes.map((p) => [
lint         |  102 |     String(p.handle),
lint         |      :            ^^^^^^^^
lint         |  103 |     names.get(String(p.handle)) ?? "-", 
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'p.handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/spawn.ts:103:22]
lint         |  102 |     String(p.handle),
lint         |  103 |     names.get(String(p.handle)) ?? "-", 
lint         |      :                      ^^^^^^^^
lint         |  104 |     `${p.rect.width}x${p.rect.height} @${p.rect.x},${p.rect.y}`,
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'pane.handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/panes.ts:303:85]
lint         |  302 |   const layout = readGroupLayout(role, group);
lint         |  303 |   return planTilePlacement({ ...layout, panes: layout.panes.filter((pane) => String(pane.handle) !== mover) }, firstSplit);
lint         |      :                                                                                     ^^^^^^^^^^^
lint         |  304 | }
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/lifecycle.ts:169:25]
lint         |  168 |     const { entity: ent, handle } = resolveLifecycleTarget(target);
lint         |  169 |     const pane = String(handle);
lint         |      :                         ^^^^^^
lint         |  170 |     assertAgentOwned(target, ent, force);
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/lifecycle.ts:368:52]
lint         |  367 |       results.push(backend.paneInput
lint         |  368 |         ? reloadPaneAndAwaitBridge(backend, String(handle), ent.key, reloadText)
lint         |      :                                                    ^^^^^^
lint         |  369 |         : await lifecycleThroughDaemon("reload", ent.key, String(handle)));
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/lifecycle.ts:369:66]
lint         |  368 |         ? reloadPaneAndAwaitBridge(backend, String(handle), ent.key, reloadText)
lint         |  369 |         : await lifecycleThroughDaemon("reload", ent.key, String(handle)));
lint         |      :                                                                  ^^^^^^
lint         |  370 |     } catch (error: unknown) {
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/lifecycle.ts:435:79]
lint         |  434 |   if (!backend.paneInput) {
lint         |  435 |     const restarted = await lifecycleThroughDaemon("restart", ent.key, String(handle));
lint         |      :                                                                               ^^^^^^
lint         |  436 |     if (restarted.ok) {
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/lifecycle.ts:446:62]
lint         |  445 |   const launch = restartLaunchCommand(cmd, harness, adapter, config);
lint         |  446 |   if (!flags.json) process.stdout.write(`Restarting ${String(handle)} (${launch})...\n`);
lint         |      :                                                              ^^^^^^
lint         |  447 |   if (!restartPaneAndAwaitBridge(backend, String(handle), launch, ent.key, quitCmd.text)) return false;
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/lifecycle.ts:447:50]
lint         |  446 |   if (!flags.json) process.stdout.write(`Restarting ${String(handle)} (${launch})...\n`);
lint         |  447 |   if (!restartPaneAndAwaitBridge(backend, String(handle), launch, ent.key, quitCmd.text)) return false;
lint         |      :                                                  ^^^^^^
lint         |  448 |   if (!flags.json) process.stdout.write(`${String(handle)}: bridge live.\n`);
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/lifecycle.ts:448:51]
lint         |  447 |   if (!restartPaneAndAwaitBridge(backend, String(handle), launch, ent.key, quitCmd.text)) return false;
lint         |  448 |   if (!flags.json) process.stdout.write(`${String(handle)}: bridge live.\n`);
lint         |      :                                                   ^^^^^^
lint         |  449 |   return true;
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/lifecycle.ts:517:72]
lint         |  516 |     const message = errorMessage(error);
lint         |  517 |     lifecycleLogger(key).warn("rename.chrome-failed", { handle: String(handle), error: message });
lint         |      :                                                                        ^^^^^^
lint         |  518 |     process.stdout.write(`orch rename: named "${name}", but the pane border was not updated: ${message}\n`);
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/spawn.ts:627:20]
lint         |  626 |     key, harnessId: spec.adapterId, backendId: spec.backend.id, pane: spec.backend.paneInventory !== null,
lint         |  627 |     handle: String(handle), cwd: spec.cwd, name: spec.name, model: spec.model, space: spec.space ?? undefined,
lint         |      :                    ^^^^^^
lint         |  628 |     spawner: spec.spawnerAgentId ?? null,
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/spawn.ts:632:30]
lint         |  631 |   });
lint         |  632 |   return { key, pane: String(handle), name: spec.name };
lint         |      :                              ^^^^^^
lint         |  633 | }
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/commands/lifecycle.ts:917:47]
lint         |  916 |   if (json) process.stdout.write(JSON.stringify({ target: handle, aborted: true }) + "\n");
lint         |  917 |   else process.stdout.write(`Aborted ${String(handle)}.\n`);
lint         |      :                                               ^^^^^^
lint         |  918 | }
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'route.handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/daemon/orchd.ts:166:43]
lint         |  165 |     // write itself is the whole delivery.
lint         |  166 |     route.backend.paneInput.submit(String(route.handle), text);
lint         |      :                                           ^^^^^^^^^^^^
lint         |  167 |     return "acked";
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-base-to-string): 'handle' may use Object's default stringification format ('[object Object]') when stringified.
lint         |     ,-[test/helpers/backend.ts:91:31]
lint         |  90 |       close: (handle: BackendHandle): void => {
lint         |  91 |         const target = String(handle);
lint         |     :                               ^^^^^^
lint         |  92 |         this.closed.push(target);
lint         |     `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
lint         |     ,-[test/one-retry-policy.test.ts:41:5]
lint         |  40 |         let calls = 0;
lint         |  41 | ,->     await expect(retryingAsync("always flaky", () => {
lint         |     : |       ^^^^^
lint         |  42 | |         calls += 1;
lint         |  43 | |         throw new Error(`failure ${calls}`);
lint         |  44 | |->     }, POLICY, { sleepAsync: () => Promise.resolve() })).rejects.toThrow("failure 3");
lint         |     : `---- This expression is not Promise-like
lint         |  45 |         expect(calls).toBe(3);
lint         |     `----
lint         |   help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.
lint         | 
lint         | Found 0 warnings and 25 errors.
lint         | Finished in 2.6s on 442 files with 65 rules using 8 threads.
lint         | Exited with code 1
error: script "check" exited with code 1
