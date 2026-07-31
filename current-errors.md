$ bun run lint && bunx tsc --noEmit && bun run check:bridge
$ oxlint bin src test extensions scripts

  x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since the receiver accepts the original type of the expression.
    ,-[src/setup/io.ts:34:43]
 33 |     message,
 34 |     options: options.map((id) => ({ value: id as string, label: id })),
    :                                           ^^^^^^^^^^^^^
 35 |     ...(initial !== undefined ? { initialValue: initial as string } : {}),
    `----

  x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since the receiver accepts the original type of the expression.
    ,-[src/setup/io.ts:35:48]
 34 |     options: options.map((id) => ({ value: id as string, label: id })),
 35 |     ...(initial !== undefined ? { initialValue: initial as string } : {}),
    :                                                ^^^^^^^^^^^^^^^^^^
 36 |   })) as Id | null;
    `----

  x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since the receiver accepts the original type of the expression.
    ,-[src/setup/io.ts:48:63]
 47 |     message,
 48 |     options: options.map(({ value, label, hint }) => ({ value: value as string, label, hint })),
    :                                                               ^^^^^^^^^^^^^^^^
 49 |     required: false,
    `----

Found 0 warnings and 3 errors.
Finished in 4.8s on 196 files with 65 rules using 8 threads.
error: script "lint" exited with code 1
error: script "check" exited with code 1
