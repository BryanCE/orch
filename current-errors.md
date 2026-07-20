$ bun run lint && bunx tsc --noEmit && bun run check:bridge
$ oxlint bin src test extensions scripts

  x typescript(array-type): Array type using 'Array<T>' is forbidden. Use 'T[]' instead.
    ,-[test/close-always.test.ts:68:24]
 67 |     const backend = headlessBackend as typeof headlessBackend & {
 68 |       inventory: () => Array<{ handle: string; workspace: string; name: string | null }>;
    :                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 69 |     };
    `----
  help: Replace `Array<{ handle: string; workspace: string; name: string | null }>` with `{ handle: string; workspace: string; name: string | null }[]`.

  x typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
    ,-[test/close-always.test.ts:71:22]
 70 |     const oldInventory = backend.inventory;
 71 |     const oldClose = backend.close;
    :                      ^^^^^^^^^^^^^|
    :                            |      `-- This reference may be unbound and lose `this` context
 72 |     const closed: string[] = [];
    `----
  help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.

  x typescript(no-base-to-string): 'handle' will use Object's default stringification format ('[object Object]') when stringified.
    ,-[test/close-always.test.ts:74:54]
 73 |     backend.inventory = () => records.map(([, handle, name]) => ({ handle, workspace: "foreign-workspace", name }));
 74 |     backend.close = (handle) => { closed.push(String(handle)); return true; };
    :                                                      ^^^^^^
 75 |     try {
    `----
  help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.

Found 0 warnings and 3 errors.
Finished in 2.8s on 190 files with 65 rules using 8 threads.
error: script "lint" exited with code 1
error: script "check" exited with code 1
