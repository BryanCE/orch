/**
 * Prompts orchd typed into a harness's input, held until the harness reports the
 * prompt it took (`report-prompt`). That report is the delivery ack, and it is what
 * binds the run that follows to the dispatch id orch handed out.
 */
import type { ControlAction } from "../types/control.ts";

export interface TypedPrompt {
  readonly id: string;
  readonly kind: Extract<ControlAction, { text: string }>["kind"];
  readonly text: string;
}

const typed = new Map<string, TypedPrompt[]>();

function normalized(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Hold a prompt about to be typed into the target's input. */
export function expectEcho(target: string, prompt: TypedPrompt): void {
  typed.set(target, [...(typed.get(target) ?? []), prompt]);
}

/** Take the held prompt the harness just reported: the one with the same text, else the oldest. */
export function takeEcho(target: string, submitted: string): TypedPrompt | undefined {
  const held = typed.get(target) ?? [];
  const wanted = normalized(submitted);
  const prompt = held.find((candidate) => normalized(candidate.text) === wanted) ?? held[0];
  if (prompt === undefined) return undefined;
  const rest = held.filter((candidate) => candidate !== prompt);
  if (rest.length === 0) typed.delete(target);
  else typed.set(target, rest);
  return prompt;
}

/** True while a typed prompt still waits for its echo. */
export function echoAwaited(id: string): boolean {
  for (const held of typed.values()) if (held.some((prompt) => prompt.id === id)) return true;
  return false;
}

/** Drop every held prompt of an agent that is gone. */
export function forgetEchoes(target: string): void {
  typed.delete(target);
}
