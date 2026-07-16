import { intro, outro } from "@clack/prompts";
import { promptSelect, promptMultiselect } from "./io.ts";

export function setupIntro(): void {
  intro("orch setup");
}

export function setupOutro(message: string): void {
  outro(message);
}

/** Multi-select every harness to set up; null when the user cancels. */
export function selectAdapters(adapters: readonly string[]): Promise<string[] | null> {
  return promptMultiselect("Select the harnesses you use (space to toggle)", adapters.map((id) => ({ value: id, label: id, hint: "", checked: false })));
}

/** Pick the default harness among the selected set; null when the user cancels. */
export function selectDefaultAdapter(selected: readonly string[]): Promise<string | null> {
  return promptSelect("Default harness for new spawns", selected);
}

/** Multi-select every backend to set up; null when the user cancels. */
export function selectBackends(backends: readonly string[]): Promise<string[] | null> {
  return promptMultiselect("Select the backends you use (space to toggle)", backends.map((id) => ({ value: id, label: id, hint: "", checked: false })));
}

/** Pick the default backend among the selected set; null when the user cancels. */
export function selectDefaultBackend(selected: readonly string[]): Promise<string | null> {
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
