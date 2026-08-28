$ bun run --parallel --no-exit-on-error lint tc check:bridge
check:bridge | check:bridge OK (769 files scanned)
check:bridge | Done in 444ms
tc           | test/commands-lease.test.ts(111,5): error TS2322: Type 'true' is not assignable to type 'false'.
tc           | test/spawn-policy.test.ts(96,5): error TS2322: Type '(str: string | Uint8Array<ArrayBufferLike>, encoding?: BufferEncoding | undefined, cb?: ((err?: Error | null) => void) | undefined) => true' is not assignable to type '{ (buffer: string | Uint8Array<ArrayBufferLike>, cb?: ((err?: Error | null | undefined) => void) | undefined): boolean; (str: string | Uint8Array<ArrayBufferLike>, encoding?: BufferEncoding | undefined, cb?: ((err?: Error | ... 1 more ... | undefined) => void) | undefined): boolean; }'.
tc           |   Types of parameters 'encoding' and 'cb' are incompatible.
tc           |     Type '((err?: Error | null | undefined) => void) | undefined' is not assignable to type 'BufferEncoding | undefined'.
tc           |       Type '(err?: Error | null | undefined) => void' is not assignable to type 'BufferEncoding | undefined'.
tc           | Exited with code 1
lint         | 
lint         |   x typescript(array-type): Array type using 'Array<T>' is forbidden. Use 'T[]' instead.
lint         |      ,-[src/store/task-rows.ts:180:40]
lint         |  179 | 
lint         |  180 | export function allTasks(dir: string): Array<TaskRow & { state: TaskState }> {
lint         |      :                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  181 |   const rows = openStore(dir).query(`
lint         |      `----
lint         |   help: Replace `Array<TaskRow & { state: TaskState }>` with `(TaskRow & { state: TaskState })[]`.
lint         | 
lint         |   x typescript(array-type): Array type using 'Array<T>' is forbidden. Use 'T[]' instead.
lint         |      ,-[src/store/task-rows.ts:201:21]
lint         |  200 |       )) < ?
lint         |  201 |   `).all(cutoff) as Array<{ id: string }>;
lint         |      :                     ^^^^^^^^^^^^^^^^^^^^^
lint         |  202 |   const remove = db.query("DELETE FROM tasks WHERE id=?");
lint         |      `----
lint         |   help: Replace `Array<{ id: string }>` with `{ id: string }[]`.
lint         | 
lint         |   x typescript(array-type): Array type using 'Array<T>' is forbidden. Use 'T[]' instead.
lint         |      ,-[src/store/task-rows.ts:257:57]
lint         |  256 | 
lint         |  257 | export function intakesOf(dir: string, packId: string): Array<{ packId: string; spaceId: string; since: number; until: number | null }> {
lint         |      :                                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  258 |   const rows = openStore(dir).query("SELECT pack_id,space_id,since,until FROM pack_intakes WHERE pack_id=? ORDER BY since").all(packId) as RawIntakeRow[];
lint         |      `----
lint         |   help: Replace `Array<{ packId: string; spaceId: string; since: number; until: number | null }>` with `{ packId: string; spaceId: string; since: number; until: number | null }[]`.
lint         | 
lint         |   x typescript(array-type): Array type using 'Array<T>' is forbidden. Use 'T[]' instead.
lint         |     ,-[src/commands/queue.ts:42:108]
lint         |  41 |   if (agentById(directory, target)) return target;
lint         |  42 |   const rows = openStore(directory).query("SELECT id FROM agents WHERE name=? ORDER BY id").all(target) as Array<{ id: string }>;
lint         |     :                                                                                                            ^^^^^^^^^^^^^^^^^^^^^
lint         |  43 |   if (rows.length === 0) die(`Unknown agent: ${target}`);
lint         |     `----
lint         |   help: Replace `Array<{ id: string }>` with `{ id: string }[]`.
lint         | 
lint         |   x typescript(prefer-regexp-exec): Use the `RegExp#exec()` method instead.
lint         |      ,-[src/queue.ts:169:23]
lint         |  168 |   } catch (error) {
lint         |  169 |     if (String(error).match(/one_open_attempt|UNIQUE constraint failed: task_attempts\.task_id/i)) return false;
lint         |      :                       ^^^^^
lint         |  170 |     throw error;
lint         |      `----
lint         | 
lint         |   x typescript(prefer-optional-chain): Prefer using an optional chain expression instead, as it's more concise and easier to read.
lint         |      ,-[src/queue.ts:199:7]
lint         |  198 |   const attempt = task.attempts.at(-1);
lint         |  199 |   if (!attempt || attempt.until !== null) throw new Error(`Task ${task.id} has no open attempt`);
lint         |      :       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  200 |   return attempt;
lint         |      `----
lint         | 
lint         |   x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since the receiver accepts the original type of the expression.
lint         |     ,-[test/queue.test.ts:44:48]
lint         |  43 |     expect(() => addTask(dir, "none", {}, "missing")).toThrow(/enqueuer/i);
lint         |  44 |     expect(() => addTask(dir, "many", {}, "a1", { agentId: "a2", spaceId: "space-1" } as never)).toThrow(/exactly one/i);
lint         |     :                                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  45 |   });
lint         |     `----
lint         | 
lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an any value.
lint         |     ,-[test/queue.test.ts:93:80]
lint         |  92 |     const own = addTask(dir, "own", {}, "a1");
lint         |  93 |     expect(cancelTask(dir, own.id, "orch-b")).toMatchObject({ state: "queued", error: expect.stringContaining("permitted") });
lint         |     :                                                                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  94 |     expect(cancelTask(dir, own.id, "a1")).toMatchObject({ state: "cancelled" });
lint         |     `----
lint         | 
lint         | Found 0 warnings and 8 errors.
lint         | Finished in 930ms on 276 files with 65 rules using 8 threads.
lint         | Exited with code 1
error: script "check" exited with code 1
