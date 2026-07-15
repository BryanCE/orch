import { intro, outro } from "@clack/prompts";
import { promptSelect, promptMultiselect } from "./io.ts";

export function setupIntro(): void {
  intro("orch setup");
}

export function setupOutro(message: string): void {
  outro(message);
}

/** Pick the agent adapter; null when the user cancels. */
export function selectAdapter(adapters: readonly string[], current?: string): Promise<string | null> {
  return promptSelect("Select an adapter", adapters, current);
}

/** Pick the execution backend; null when the user cancels. */
export function selectBackend(backends: readonly string[], current?: string): Promise<string | null> {
  return promptSelect("Select a backend", backends, current);
}

/** Multi-select which missing prerequisites to install; null when the user cancels, [] when none are missing. */
export function chooseInstalls(missing: readonly { bin: string; cmd: string }[]): Promise<string[] | null> {
  return promptMultiselect("Select installations", missing.map(({ bin, cmd }) => ({ value: bin, label: bin, hint: cmd })));
}
