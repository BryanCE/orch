$ bun run lint && bunx tsc --noEmit && bun run check:bridge
$ oxlint bin src test extensions scripts

  x typescript(require-await): Function has no 'await' expression.
    ,-[src/backends/hud.ts:65:23]
 64 |   notify: () => { /* no plexer notifier */ },
 65 |   readLabels: async () => false,
    :                       ^^^
 66 |   registerBlockedRelay: () => { /* no plexer signal */ },
    `----

Found 0 warnings and 1 error.
Finished in 502ms on 169 files with 65 rules using 8 threads.
error: script "lint" exited with code 1
error: script "check" exited with code 1
