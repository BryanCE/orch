import { allAdapters, resolveAdapter } from "../adapters/registry.ts";
import { allBackends } from "../backends/registry.ts";
import { loadSettingsOrNull } from "../settings/read.ts";
import { settingsPath } from "../settings/schema.ts";
import { writeSettingsDefault, writeSettingsFullTree, writeSettingsModels, writeSettingsAllowedModels, writeSettingsPreferredModels, writeSettingsEnabled, writeSettingsRuntime } from "../settings/write.ts";
import { DEFAULT_RUNTIME, ORCH_RUNTIMES, type OrchRuntime } from "../runtime.ts";
import { signedOutFix } from "../adapters/prerequisites.ts";
import { assertModelListed } from "../policy/model.ts";
import { logStep, logWarning } from "./io.ts";
import { selectAdapters, selectDefaultAdapter, selectBackends, selectDefaultBackend, selectDefaultModel, selectAllowedModels, selectRuntime } from "./wizard.ts";
import { orchDir } from "../presence/store.ts";
import { errorMessage } from "../util.ts";
import { die } from "../commands/target.ts";
import { SetupFlagError, validateSetupFlag } from "./flags.ts";
import type { SetupOptions } from "./flags.ts";
import type { AdapterId, AgentAdapter, HarnessModel } from "../types/adapter.ts";
import type { BackendId } from "../types/backend.ts";
import type { HarnessModelChoices } from "../types/command.ts";

/** Resolve the setup harness set from a comma-separated flag, the multi-select wizard, or exit. Null on cancel. */
export async function resolveProviderSet<Id extends string>(
  kind: string,
  flagName: string,
  flag: string | undefined,
  ids: readonly Id[],
  interactive: boolean,
  pick: (options: readonly Id[]) => Promise<Id[] | null>,
): Promise<Id[] | null> {
  if (flag !== undefined) {
    const list = [...new Set(flag.split(",").map((id) => id.trim()).filter(Boolean))];
    if (!list.length) die(`${flagName} needs at least one ${kind} id.`);
    return list.map((id) => validateSetupFlag(kind, id, ids));
  }
  if (interactive) {
    const picked = await pick(ids);
    if (picked === null) return null;
    if (!picked.length) die(`Select at least one ${kind}.`);
    return picked;
  }
  die(`orch setup needs ${flagName} <id[,id...]> in non-interactive mode. Supported ${kind}s: ${ids.join(", ")}.`);
}

/** Pick the active default from a selected set: the sole member, the flag/non-interactive first entry, or a prompt. Null on cancel. */
export async function resolveActiveDefault<Id extends string>(
  selected: readonly Id[],
  flagProvided: boolean,
  interactive: boolean,
  pick: (options: readonly Id[]) => Promise<Id | null>,
): Promise<Id | null> {
  if (selected.length === 1 || flagProvided || !interactive) return selected[0]!;
  return pick(selected);
}

/** Resolve repeatable model flags to the selected harnesses without crossing vocabularies. */
export function resolveModelAssignments(flags: readonly string[], harnesses: readonly AdapterId[]): Map<AdapterId, string> {
  const assignments = new Map<AdapterId, string>();
  const bare = flags.filter((value) => !value.includes("="));
  if (bare.length > 0 && harnesses.length !== 1) {
    throw new SetupFlagError(`--model ${bare[0]} is ambiguous across selected harnesses; write --model <harness>=<spec> (selected: ${harnesses.join(", ")}).`);
  }
  for (const value of flags) {
    const separator = value.indexOf("=");
    if (separator === -1) {
      const harness = harnesses[0];
      if (harness !== undefined) assignments.set(harness, value);
      continue;
    }
    const harnessName = value.slice(0, separator);
    const model = value.slice(separator + 1);
    const harness = harnesses.find((id) => id === harnessName);
    if (harness === undefined) {
      throw new SetupFlagError(`--model ${value} names unselected harness "${harnessName}"; selectable harnesses: ${harnesses.join(", ")}.`);
    }
    if (!model) throw new SetupFlagError(`--model ${value} needs a model after "=".`);
    if (assignments.has(harness)) throw new SetupFlagError(`--model for harness ${harness} was provided more than once.`);
    assignments.set(harness, model);
  }
  return assignments;
}

/** Resolve a model flag for EVERY selected harness without crossing vocabularies.
 *  Explicit `harness=model` entries target only that harness; a bare model is used only
 *  when exactly one harness is selected. Null when the user cancels. */
export async function resolveHarnessModels(
  flags: readonly string[] | string | undefined,
  harnesses: readonly AdapterId[],
  interactive: boolean,
): Promise<HarnessModelChoices | null> {
  const settings = loadSettingsOrNull(orchDir());
  const choices: HarnessModelChoices = { defaults: {}, preferred: {}, allowed: {} };
  const modelFlags = typeof flags === "string" ? [flags] : flags ?? [];
  const assignments = resolveModelAssignments(modelFlags, harnesses);
  for (const id of harnesses) {
    const harness = resolveAdapter(id);
    const offered = await readHarnessCatalogue(harness, interactive);
    const targeted = assignments.get(id);
    const chosen = await resolveDefaultModel(targeted, harness, offered, interactive);
    if (chosen === null) return null;
    // Blank means the harness is not ready; leaving it unrecorded is what lets setup finish and
    // `orch settings models --harness=<id>` fill it in once the harness can enumerate.
    if (chosen) choices.defaults[id] = chosen;

    if (!interactive || !offered.length) continue;
    // ONE list per harness: the models it may spawn, which is also the quicklist its own
    // picker cycles. Asking for both was asking the same question twice. A prompted harness
    // records what it was given, empty included — that is how an operator clears a list.
    const allowed = await selectAllowedModels(id, offered, settings?.models.allowed[id] ?? []);
    if (allowed === null) return null;
    choices.allowed[id] = allowed;
    choices.preferred[id] = allowed;
  }
  return choices;
}

/** Tell the operator how to make an installed-but-signed-out harness usable, and what to
 *  run afterwards. Skipping the model prompt is silent otherwise: an empty list looks
 *  like orch forgot to ask. */
export function emptyCatalogueHint(harnessId: string): string {
  return [
    `Hey - ${harnessId} is installed but lists no models, so it has nothing to spawn with.`,
    `It is not signed in yet, not configured, or its login went stale. No model was recorded for it.`,
    `To fix it: ${signedOutFix(harnessId)}`,
  ].join("\n");
}

/** Ask a harness what it can run, ONCE per setup run — both model prompts read this one answer,
 *  so they can never disagree about what the harness offers. Resolves against the stored
 *  catalogue, so a harness asked before answers without shelling out at all. */
export async function readHarnessCatalogue(harness: AgentAdapter, interactive: boolean): Promise<readonly HarnessModel[]> {
  if (harness.modelWarm) await harness.modelWarm.warmModels();
  if (!interactive) return harness.models?.listModels() ?? [];
  logStep(`asking ${harness.id} which models it can run...`);
  const offered = harness.models?.listModels() ?? [];
  if (offered.length) logStep(`${harness.id} lists ${offered.length} models`);
  else logWarning(emptyCatalogueHint(harness.id));
  return offered;
}

/** The model spawns of ONE harness launch on: `--model=`, else a pick from what that harness
 * reports it can run, else its own default when non-interactive. orch decides and records; the
 * harness only enumerates. Null when the user cancels, empty when the harness offers nothing
 * and the operator named nothing either. */
export async function resolveDefaultModel(
  flag: string | undefined,
  harness: AgentAdapter,
  offered: readonly HarnessModel[],
  interactive: boolean,
  pick: (harnessId: string, offered: readonly HarnessModel[], suggested: string | undefined) => Promise<string | null> = selectDefaultModel,
): Promise<string | null> {
  // A harness listing nothing is not signed in. readHarnessCatalogue already said so; asking for
  // a model it cannot resolve would only record a broken one.
  if (flag === undefined && !offered.length) return "";
  const suggested = harness.defaultModel?.defaultModelString();
  const chosen = flag ?? (interactive ? await pick(harness.id, offered, suggested) : suggested ?? offered[0]?.spec);
  if (chosen === null) return null;
  if (!chosen) return "";
  try {
    assertModelListed(harness.id, offered, chosen);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  return chosen;
}

/** Resolve the declared JS runtime from `--runtime`, the wizard, or the no-preference value.
 * Never inferred from PATH or from the runtime orch itself is executing under. Null on cancel. */
export async function resolveRuntime(
  flag: string | undefined,
  interactive: boolean,
  pick: () => Promise<OrchRuntime | null> = selectRuntime,
): Promise<OrchRuntime | null> {
  if (flag !== undefined) return validateSetupFlag("runtime", flag, ORCH_RUNTIMES);
  // Non-interactive expresses no preference, and the recorded value for no preference is node.
  if (!interactive) return DEFAULT_RUNTIME;
  return pick();
}

/** What each of a harness's two model lists was recorded as: the quicklist its own picker
 *  shows, and the gate its spawns are held to. Neither is the other, so both are named. */
export function modelListsNote(preferred: readonly string[] | undefined, allowed: readonly string[] | undefined): string {
  const quicklist = preferred?.length ?? 0;
  const gate = allowed?.length ?? 0;
  return `  picker: ${quicklist || "none"}, allowed: ${gate || "all offered"}`;
}

/** Persist the composition selections (runtime, installed sets, active defaults) to settings.json. */
export function recordComposition(
  runtime: OrchRuntime,
  adapters: AdapterId[],
  defaultAdapter: AdapterId,
  backends: BackendId[],
  defaultBackend: BackendId,
  models: HarnessModelChoices,
): void {
  // Record the runtime FIRST: it is a required key with no default, so no other write can
  // produce a valid file until it is present. Re-recording the same value is a no-op change.
  writeSettingsRuntime(orchDir(), runtime);
  // Then the installed sets — writeSettingsDefault validates the default against them.
  writeSettingsEnabled(orchDir(), { adapters, backends });
  writeSettingsDefault(orchDir(), "adapter", defaultAdapter);
  writeSettingsDefault(orchDir(), "backend", defaultBackend);
  // Every launch path resolves its harness's model from here. Recording them is not
  // optional: an install without one fails at the first spawn, including setup's own smoke.
  writeSettingsModels(orchDir(), models.defaults);
  // Two independent lists, two writers: the quicklist a harness shows in its own picker,
  // and the gate its spawns are held to. Neither may stand in for the other.
  writeSettingsPreferredModels(orchDir(), models.preferred);
  writeSettingsAllowedModels(orchDir(), models.allowed);
  // Seed the complete live settings tree only after composition writes have landed.
  writeSettingsFullTree(orchDir());
  process.stdout.write(
    `Selection recorded in ${settingsPath(orchDir())}:\n` +
    `  runtime           = ${runtime}${runtime === "deno" ? "  (sandboxed shims)" : ""}\n` +
    `  adapters          = ${adapters.join(", ")}\n` +
    `  default adapter   = ${defaultAdapter}\n` +
    `  backends          = ${backends.join(", ")}\n` +
    `  default backend   = ${defaultBackend}\n` +
    adapters.map((id) => `  model (${id})${" ".repeat(Math.max(0, 11 - id.length))} = ${models.defaults[id] ?? "(none)"}${modelListsNote(models.preferred[id], models.allowed[id])}\n`).join(""),
  );
}

export interface SetupComposition {
  runtime: OrchRuntime;
  adapters: AdapterId[];
  defaultAdapter: AdapterId;
  backends: BackendId[];
  defaultBackend: BackendId;
  models: HarnessModelChoices;
}

export async function resolveSetupComposition(options: SetupOptions): Promise<SetupComposition | null> {
  const adapterIds = allAdapters().map((adapter) => adapter.id);
  const backendIds = allBackends().map((entry) => entry.id);
  const runtime = await resolveRuntime(options.runtimeFlag, options.interactive);
  if (runtime === null) return null;
  const adapters = await resolveProviderSet("adapter", "--agent", options.adapterFlag, adapterIds, options.interactive, selectAdapters);
  if (adapters === null) return null;
  const defaultAdapter = await resolveActiveDefault(adapters, options.adapterFlag !== undefined, options.interactive, selectDefaultAdapter);
  if (defaultAdapter === null) return null;
  const backends = await resolveProviderSet("backend", "--backend", options.backendFlag, backendIds, options.interactive, selectBackends);
  if (backends === null) return null;
  const defaultBackend = await resolveActiveDefault(backends, options.backendFlag !== undefined, options.interactive, selectDefaultBackend);
  if (defaultBackend === null) return null;
  const models = await resolveHarnessModels(options.modelFlags, adapters, options.interactive);
  return models === null ? null : { runtime, adapters, defaultAdapter, backends, defaultBackend, models };
}

/** True while setup has never recorded a harness selection — including the first run, where
 * settings.json does not exist yet. "No settings.json" is the signal to run the wizard, not an
 * error, so this gate goes through the non-throwing `loadSettingsOrNull` probe rather than
 * `loadSettings` (which treats an absent file as the hard error it is for every other command).
 * A present-but-malformed file still throws here, exactly as before. */
export function compositionUnrecorded(): boolean {
  return !loadSettingsOrNull(orchDir())?.defaults.adapter;
}
