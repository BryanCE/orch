import { intro, outro } from "@clack/prompts";
import { DEFAULT_RUNTIME, ORCH_RUNTIMES, type OrchRuntime } from "../runtime.ts";
import { promptSelect, promptMultiselect } from "./io.ts";

/** Pick the JS runtime this install executes under. All three are supported: orch's code is
 * runtime-agnostic, so run it with whichever you have. The one real differentiator is deno's
 * sandbox — under deno the harness shims get scoped filesystem access, an enumerated env
 * allowlist, and no network at all. orch does NOT probe PATH here; the recorded value is
 * always a selection, never inferred from what happens to be installed. Null on cancel. */
export function selectRuntime(): Promise<OrchRuntime | null> {
  return promptSelect(
    "JS runtime for this orch install"
    + " — node: the default, most widely present;"
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

/** Multi-select which missing prerequisites to install; null when the user cancels, [] when none are missing. */
export function chooseInstalls(missing: readonly { bin: string; cmd: string }[]): Promise<string[] | null> {
  return promptMultiselect("Select installations", missing.map(({ bin, cmd }) => ({ value: bin, label: bin, hint: cmd })));
}

/** Multi-select which available notifiers to configure (none pre-checked); null on cancel, [] when none are offered. */
export function selectNotifiers(ids: readonly string[]): Promise<string[] | null> {
  return promptMultiselect("Configure notifiers (space to toggle)", ids.map((id) => ({ value: id, label: id, hint: "", checked: false })));
}
