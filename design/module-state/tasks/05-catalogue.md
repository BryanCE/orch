# 05-catalogue

Owns: `src/adapters/model-catalogue.ts`, `src/types/adapter.ts`, `src/types/services.ts`, `src/services.ts`, `src/adapters/pi.ts`, `src/adapters/omp.ts`, `src/adapters/registry.ts`, `test/helpers/adapter.ts`, `test/adapter-roles.test.ts`

`src/adapters/model-catalogue.ts` keeps `let stored`, `let storedFrom` and a module `querying` map: a per-process cache keyed by orch dir, which is what `Services` already is. The adapters' `models` role also calls `this.listModels()` with no orch dir (pi.ts ~388, omp.ts ~94), and that method answers `[]` when the dir is undefined, so every model listing is empty today. The catalogue becomes an object on `Services`, and the role receives it.

The API (`06-catalogue-callers` codes against it exactly as written):

```ts
// src/types/adapter.ts, next to the roles
/** A harness's model listing: stored on disk per orch dir, cached in memory for one process.
 *  Built once at the composition root and carried on Services. */
export interface ModelCatalogue {
  /** The stored answer for `bin argv`, re-queried in the background once stale; only a command
   *  never asked before makes the caller wait. Empty string when the harness cannot answer. */
  read(bin: string, argv: readonly string[]): string;
  /** Start a background query unless a fresh answer is already stored. Silent on failure. */
  warm(bin: string, argv: readonly string[]): Promise<void>;
  /** Forget every answer, in memory and on disk, so the next read asks the harnesses again. */
  forget(): void;
}
export interface ModelCatalogueRole { listModels(catalogue: ModelCatalogue): readonly HarnessModel[]; }
export interface ModelWarmRole { warmModels(catalogue: ModelCatalogue): Promise<void>; }

// src/adapters/model-catalogue.ts
export function createModelCatalogue(orchDir: OrchDir, logger: Logger): ModelCatalogue;
// src/adapters/registry.ts
export function warmAdapterCatalogues(catalogue: ModelCatalogue): void;
export function refreshAdapterCatalogues(catalogue: ModelCatalogue): Promise<void>;  // catalogue.forget(), then warm every adapter
// src/types/services.ts: Services gains `readonly models: ModelCatalogue`
// src/services.ts: `models?: ModelCatalogue` on ServicesOptions; built as `options.models ?? createModelCatalogue(orchDir, logger)` after `logger`
```

Do:
1. model-catalogue.ts: replace `stored`, `storedFrom`, `querying`, `catalogues()`, `readModelCatalogue`, `warmModelCatalogue`, `forgetModelCatalogues` with `createModelCatalogue(orchDir, logger)` returning an object whose closure owns `stored` (loaded with `readCatalogues(orchDir)` lazily on first use) and `querying`; the private helpers (`record`, `recordFailure`, `keepLastAnswer`, `queryInBackground`, `isStale`, `commandLine`) move inside or take the closure's state, bodies unchanged. `read` is today's `readModelCatalogue` body with `orchDir`/`logger` from the closure; `warm` is `warmModelCatalogue`; `forget` is `forgetModelCatalogues`.
2. types/adapter.ts, types/services.ts, services.ts: the API above.
3. pi.ts: `readonly models = { listModels: (catalogue: ModelCatalogue): readonly HarnessModel[] => parsePiModelsOutput(catalogue.read("pi", PI_MODELS_ARGV)) };` and `readonly modelWarm = { warmModels: (catalogue: ModelCatalogue): Promise<void> => catalogue.warm("pi", PI_MODELS_ARGV) };`. Delete the `listModels(orchDir?)` and `warmModels(orchDir?)` methods, `queryPiModels`, and `adapterLogger` (omp.ts is its only other importer and stops needing it). omp.ts: the same shape with "omp" / `OMP_MODELS_ARGV`, and drop `adapterLogger` from its import list.
4. registry.ts: the two functions as above; remove the `forgetModelCatalogues` import.
5. test/helpers/adapter.ts: the fake's `models` / `modelWarm` members accept the catalogue parameter (a fake may ignore it). test/adapter-roles.test.ts: only if it no longer typechecks.

Check: `bun check`. Tests: `test/adapter-roles.test.ts`.
