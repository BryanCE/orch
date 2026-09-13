# Module state: build plan

Delegator's document. Workers never read this; they read `WORKER.md` plus one task file.

Background: `design/pi-code-patterns.md` section 6. Seven `let`s at module scope in `packages/orch/src` hold runtime state that belongs to an instance. Each becomes a field of the object that owns it, built at one composition point, so two instances in one test process never share a counter, a cache, or an injected fake, and no setter that swaps module state remains.

## Target shape

```ts
// src/daemon/rpc/client.ts: a request id is unique per socket, not per process
function requestIds(): () => number;                       // one per connection

// src/agent/presence.ts: the interactive session key is minted by one presence instance
createAgentPresence(orchDir, options)                      // ownSessionKey lives in this closure

// src/backends/tool-exec.ts: the process boundary is a parameter, never a module variable
runTool(binary, args, policy?, options?, executor?: ToolExecutor): string;
runToolBestEffort(binary, args, policy?, options?, executor?: ToolExecutor): string | null;

// src/backends/herdr/cli.ts: one cli object owns its executor and its listing cache
export interface HerdrCli { json; ack; answer; startAgent; version; serverStatus; reachable; panes; names; tabs; exec }
export function createHerdrCli(executor?: HerdrExecutor): HerdrCli;
// src/backends/herdr/index.ts
export class HerdrBackend { constructor(readonly cli: HerdrCli = createHerdrCli()); readonly notifier: Notifier }
// src/backends/herdr/hud.ts: reportedSocket and metadataSeq live in the hud instance
export function createHerdrHud(cli: HerdrCli): HerdrHud;
export const herdrHud = createHerdrHud(herdrBackend.cli);

// src/types/adapter.ts: the model catalogue is a Services member the adapter roles receive
export interface ModelCatalogue { read(bin, argv): string; warm(bin, argv): Promise<void>; forget(): void }
export interface ModelCatalogueRole { listModels(catalogue: ModelCatalogue): readonly HarnessModel[] }
export interface ModelWarmRole { warmModels(catalogue: ModelCatalogue): Promise<void> }
// src/adapters/model-catalogue.ts
export function createModelCatalogue(orchDir: OrchDir, logger: Logger): ModelCatalogue;
// src/types/services.ts
export interface Services { /* ... */ readonly models: ModelCatalogue }
```

Why the catalogue is also a bug fix. The adapters' `models` role called `this.listModels()` with no orch dir, and that method answered `[]` when the dir was undefined, so `orch models`, doctor's models check, setup's picker and the launch model gate all saw an empty list (`orch models --agent=pi` printed "no models listed" on a signed-in pi). Passing the catalogue through the role is what makes the listing reachable again.

Value rule, as in `design/composition-root/PLAN.md`: a command takes `services`; a helper one level down takes the narrowest `Pick<Services, ...>`; a leaf takes plain values. No parameter defaults to a global. The catalogue is a required parameter wherever it is threaded; never optional, never defaulted.

## Waves

| Wave | Tasks | Mode | Tree red until | Commit after |
|---|---|---|---|---|
| 1 independent | `01-rpc-client`, `02-presence`, `03-tool-exec` (`luna:low`), `04-herdr` | parallel (4) | never | with wave 2 |
| 2 catalogue | `05-catalogue`, `06-catalogue-callers` | parallel (2); `06` waits once for `05` to land | `06-catalogue-callers` | yes |
| 3 herdr wire shapes | `07-herdr-json-shapes` | chained onto the `04-herdr` agent with `--keep-context` (same file, context warm) | never | yes |

## Dispatch commands

```
cat design/module-state/WORKER.md design/module-state/tasks/<id>.md | orch dispatch <agent> --file -
```

`--model openai-codex/gpt-5.6-luna:low` for `03-tool-exec`; every other task on the agent's pinned `luna:high`.

## Commit point

Green whole-tree `bun check` and green touched tests after `06-catalogue-callers`. Suggested message: `Move every module-level let onto the instance that owns it; model catalogue on Services, listing reachable again`.
