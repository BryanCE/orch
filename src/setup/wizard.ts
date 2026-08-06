import { intro, outro } from "@clack/prompts";
import { DEFAULT_RUNTIME, ORCH_RUNTIMES, type OrchRuntime } from "../runtime.ts";
import type { HarnessModel } from "../adapters/adapter.ts";
import { splitThinkingSuffix } from "../policy/model.ts";
import { promptAutocomplete, promptAutocompleteMultiselect, promptSelect, promptMultiselect } from "./io.ts";

const MODEL_PICKER_MAX_ITEMS = 15;

/** Pick the JS runtime this install executes under. All three are supported: orch's code is
 * runtime-agnostic, so run it with whichever you have. The one real differentiator is deno's
 * sandbox — under deno the harness shims get scoped filesystem access, an enumerated env
 * allowlist, and no network at all. orch does NOT probe PATH here; the recorded value is
 * always a selection, never inferred from what happens to be installed. Null on cancel. */
export function selectRuntime(): Promise<OrchRuntime | null> {
  return promptSelect(
    "JS runtime for this orch install"
    + " - node: the default, most widely present;"
    + " deno: sandboxed shims (scoped fs + env, no network);"
    + " bun: fastest startup",
    ORCH_RUNTIMES,
    DEFAULT_RUNTIME,
  );
}

export function setupIntro(): void {
  intro("orch setup");
}

export function setupOutro(message: string): void {
  outro(message);
}

/** Multi-select every harness to set up; null when the user cancels. */
export function selectAdapters<Id extends string>(adapters: readonly Id[]): Promise<Id[] | null> {
  return promptMultiselect("Select the harnesses you use (space to toggle)", adapters.map((id) => ({ value: id, label: id, hint: "", checked: false })));
}

/** Pick the default harness among the selected set; null when the user cancels. */
export function selectDefaultAdapter<Id extends string>(selected: readonly Id[]): Promise<Id | null> {
  return promptSelect("Default harness for new spawns", selected);
}

/** Multi-select every backend to set up; null when the user cancels. */
export function selectBackends<Id extends string>(backends: readonly Id[]): Promise<Id[] | null> {
  return promptMultiselect("Select the backends you use (space to toggle)", backends.map((id) => ({ value: id, label: id, hint: "", checked: false })));
}

/** Pick the default backend among the selected set; null when the user cancels. */
export function selectDefaultBackend<Id extends string>(selected: readonly Id[]): Promise<Id | null> {
  return promptSelect("Default backend for new spawns", selected);
}

type ModelPicker = (
  mode: "select" | "autocomplete",
  message: string,
  offered: readonly HarnessModel[],
  initial: string,
  maxItems: number,
) => Promise<string | null>;

const defaultModelPicker: ModelPicker = (mode, message, offered, initial, maxItems) =>
  mode === "autocomplete"
    ? promptAutocomplete(
      message,
      offered.map((model) => ({ value: model.spec, label: model.spec, ...(model.label ? { hint: model.label } : {}) })),
      initial,
      maxItems,
    )
    : promptSelect(message, offered.map((model) => model.spec), initial);

/** Pick the model one harness's spawns launch on, from the models that harness reports it can
 *  run — the prompt names the harness because each has its own vocabulary. Callers must hold a
 *  non-empty catalogue; a harness enumerating nothing is warned about, never prompted for. Large
 *  catalogues use a searchable, bounded view; clearing the query browses them all. Null on cancel. */
export async function selectDefaultModel(
  harnessId: string,
  offered: readonly HarnessModel[],
  suggested: string | undefined,
  pick: ModelPicker = defaultModelPicker,
): Promise<string | null> {
  const specs = offered.map((model) => model.spec);
  const suggestedBare = suggested === undefined ? undefined : splitThinkingSuffix(suggested).bare;
  const initial = suggestedBare !== undefined && specs.includes(suggestedBare) ? suggestedBare : specs[0]!;
  const searchable = offered.length > MODEL_PICKER_MAX_ITEMS;
  const message = searchable
    ? `Default model for ${harnessId} spawns (${offered.length} available; type to search or browse)`
    : `Default model for ${harnessId} spawns`;
  const chosen = await pick(searchable ? "autocomplete" : "select", message, offered, initial, MODEL_PICKER_MAX_ITEMS);
  if (chosen === null) return null;
  return suggested !== undefined && suggestedBare === chosen ? suggested : chosen;
}

/** Multi-select which of a harness's models its spawns may launch. Empty means every model
 *  that harness offers stays allowed — orch ships no built-in restriction. A harness that
 *  enumerates nothing has nothing to choose from, so it is skipped. Null on cancel. */
export function selectAllowedModels(
  harnessId: string,
  offered: readonly HarnessModel[],
  already: readonly string[],
): Promise<string[] | null> {
  const checked = new Set(already);
  const message = offered.length > MODEL_PICKER_MAX_ITEMS
    ? `Models ${harnessId} spawns may use (${offered.length} available; type to search or browse, none = allow all)`
    : `Models ${harnessId} spawns may use (space to toggle, none = allow all)`;
  const options = offered.map((model) => ({
    value: model.spec,
    label: model.spec,
    ...(model.label ? { hint: model.label } : {}),
    checked: checked.has(model.spec),
  }));
  return offered.length > MODEL_PICKER_MAX_ITEMS
    ? promptAutocompleteMultiselect(message, options, MODEL_PICKER_MAX_ITEMS)
    : promptMultiselect(message, options.map((option) => ({ ...option, hint: option.hint ?? "" })));
}

/** Multi-select which missing prerequisites to install; null when the user cancels, [] when none are missing. */
export function chooseInstalls(missing: readonly { bin: string; cmd: string }[]): Promise<string[] | null> {
  return promptMultiselect("Select installations", missing.map(({ bin, cmd }) => ({ value: bin, label: bin, hint: cmd })));
}

/** Multi-select which available notifiers to configure (none pre-checked); null on cancel, [] when none are offered. */
export function selectNotifiers(ids: readonly string[]): Promise<string[] | null> {
  return promptMultiselect("Configure notifiers (space to toggle)", ids.map((id) => ({ value: id, label: id, hint: "", checked: false })));
}
