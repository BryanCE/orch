// Harness questions only an adapter can answer: what each harness can run, and the files orch's
// settings build for it. The adapters run here, in orchd; the CLI asks and prints.
import { refreshAdapterCatalogues, resolveAdapter, syncAdapterSettingsFiles } from "../../../adapters/registry.ts";
import { errorMessage } from "../../../util.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";
import type { DaemonState } from "../state.ts";

/** What each named harness reports it can run, the model it suggests by default, and whether it
 *  takes a compaction point. A harness that warms its catalogue in the background is warmed first.
 *  One that cannot enumerate lists nothing rather than borrowing another harness's catalogue; one
 *  that fails says why. */
export async function harnessCatalogues(state: DaemonState, params: ParamsOf<"harness-catalogues">): Promise<ResultOf<"harness-catalogues">> {
  const { logger, models } = state.services;
  return {
    catalogues: await Promise.all(params.harnesses.map(async (id) => {
      const adapter = resolveAdapter(id);
      const suggested = adapter.defaultModel?.defaultModelString() ?? null;
      const compaction = adapter.compaction !== null;
      try {
        if (adapter.modelWarm) await adapter.modelWarm.warmModels(models);
        return { id, models: [...adapter.models?.listModels(models) ?? []], suggested, compaction, error: null };
      } catch (error: unknown) {
        const message = errorMessage(error);
        logger.error("models.catalogue-failed", { adapter: id, error: message });
        return { id, models: [], suggested, compaction, error: message };
      }
    })),
  };
}

/** Ask every harness again, for a model installed minutes ago. */
export async function refreshCatalogues(state: DaemonState): Promise<ResultOf<"catalogue-refresh">> {
  await refreshAdapterCatalogues(state.services.models);
  return { ok: true };
}

/** Bring each enabled harness's file in step with settings.json as it is on disk now: the CLI
 *  calls this right after it wrote the file, before orchd's watcher has seen the edit. */
export function syncHarnessFiles(state: DaemonState): ResultOf<"harness-files-sync"> {
  if (state.settingsWatch === undefined) state.services.settings.reload();
  else state.settingsWatch.reload();
  return { written: syncAdapterSettingsFiles(state.directory, state.services.settings.current()) };
}
