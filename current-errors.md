$ bun run --parallel --no-exit-on-error lint tc check:bridge
check:bridge | check:bridge OK (865 files scanned)
check:bridge | Done in 348ms
tc           | Done in 1.72s
lint         | 
lint         |   x typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
lint         |     ,-[test/notifier-adapters.test.ts:44:5]
lint         |  43 |     const registry = createNotifierRegistry([{ ...webhook, available: () => true, deliver: () => Promise.reject(failure) }]);
lint         |  44 |     await expect(registry.deliver({ id: "webhook", on: ["blocked"], url: "https://example.test" }, event)).rejects.toBe(failure);
lint         |     :     ^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^|^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |     :       |                                                              `-- This expression is not Promise-like
lint         |  45 |   });
lint         |     `----
lint         |   help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.
lint         | 
lint         |   x typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
lint         |     ,-[test/notify-router.test.ts:44:5]
lint         |  43 |     const registry = createNotifierRegistry([{ ...notifier("webhook", () => { /* config unused here */ }), deliver: () => Promise.reject(failure) }]);
lint         |  44 |     await expect(registry.deliver({ id: "webhook", on: ["done"], url: "https://example.test" }, event)).rejects.toBe(failure);
lint         |     :     ^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^|^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |     :       |                                                            `-- This expression is not Promise-like
lint         |  45 |   });
lint         |     `----
lint         |   help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.
lint         | 
lint         | Found 0 warnings and 2 errors.
lint         | Finished in 2.0s on 327 files with 65 rules using 8 threads.
lint         | Exited with code 1
error: script "check" exited with code 1
