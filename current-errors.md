$ bun run --parallel --no-exit-on-error lint tc check:bridge
check:bridge | check:bridge OK (1031 files scanned)
check:bridge | Done in 531ms
tc           | Done in 2.34s
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
lint         | Found 0 warnings and 1 error.
lint         | Finished in 2.7s on 444 files with 65 rules using 8 threads.
lint         | Exited with code 1
error: script "check" exited with code 1
