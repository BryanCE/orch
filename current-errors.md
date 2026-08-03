$ bun run lint && bunx tsc --noEmit && bun run check:bridge
$ oxlint bin src test extensions scripts

  x typescript(no-unsafe-return): Unsafe return of a value of type `any[]`.
     ,-[src/adapters/claude.ts:187:44]
 186 |   if (!Array.isArray(entries)) return [];
 187 |   const hooks = entries.flatMap((entry) => (isRecord(entry) && Array.isArray(entry.hooks) ? entry.hooks : []));
     :                                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 188 |   return hooks.flatMap((hook) =>
     `----

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

  x typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
     ,-[src/commands/setup.ts:229:51]
 228 |   for (const id of adapters) {
 229 |     const resolved = (bins[id] && binaryPath(id)) || "";
     :                                                   ^^
 230 |     process.stdout.write(`  ${resolved ? "ok      " : "MISSING "}${id}${resolved ? `  (${resolved})` : ""}\n`);
     `----

  x typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
     ,-[src/commands/setup.ts:235:64]
 234 |     const available = getBackend(id)!.isAvailable();
 235 |     const resolved = (available && bins[id] && binaryPath(id)) || "";
     :                                                                ^^
 236 |     process.stdout.write(`  ${available ? "ok      " : "MISSING "}${id}${resolved ? `  (${resolved})` : ""}\n`);
     `----

  x typescript(no-unsafe-member-access): Unsafe member access .canSendKeys on an `error` typed value.
     ,-[src/control/dispatch.ts:127:27]
 126 |   const route = resolveTargetRoute(canonicalTarget);
 127 |   if (route?.backend.caps.canSendKeys) return route.backend.deliver(route.handle, { kind: "run", text });
     :                           ^^^^^^^^^^^
 128 |   if (!resolveTargetAdapter(canonicalTarget)) return false;
     `----

Found 0 warnings and 7 errors.
Finished in 8.2s on 196 files with 65 rules using 8 threads.
error: script "lint" exited with code 1
error: script "check" exited with code 1
