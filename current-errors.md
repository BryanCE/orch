$ bun run lint && bunx tsc --noEmit && bun run check:bridge
$ oxlint bin src test extensions scripts

  x typescript(consistent-type-definitions): Use `interface` instead of `type`.
    ,-[src/commands/control.ts:23:1]
 22 | 
 23 | type DispatchSettings = {
    : ^^^^
 24 |   adapter: AdapterId;
    `----
  help: Replace `type DispatchSettings = {
          adapter: AdapterId;
          /** Set only when this dispatch named a model; null leaves the agent on the one it spawned with. */
          model: string | null;
          raw: boolean;
          json: boolean;
          doWait: boolean;
          thenNote: string;
          ent: Ent...` with `interface DispatchSettings {
          adapter: AdapterId;
          /** Set only when this dispatch named a model; null leaves the agent on the one it spawned with. */
          model: string | null;
          raw: boolean;
          json: boolean;
          doWait: boolean;
          thenNote: string;
          ent: ...`.

Found 0 warnings and 1 error.
Finished in 9.3s on 196 files with 65 rules using 8 threads.
error: script "lint" exited with code 1
error: script "check" exited with code 1
