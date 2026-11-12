import type { PipesProcess } from "../../types/pipes.ts";

const entries = new Map<string, PipesProcess>();

/** Hold one piped process under an agent's id. */
export function holdPipes(agentId: string, process: PipesProcess): void {
  if (entries.has(agentId)) throw new Error(`a pipes process is already held for ${agentId}`);
  entries.set(agentId, process);
  void process.exited.then(() => {
    if (entries.get(agentId) === process) entries.delete(agentId);
  });
}

/** Return the process held for an agent, if any. */
export function heldPipes(agentId: string): PipesProcess | null {
  return entries.get(agentId) ?? null;
}

/** Kill and forget an agent's held process. */
export function releasePipes(agentId: string): void {
  const process = entries.get(agentId);
  entries.delete(agentId);
  process?.kill();
}

/** Kill and forget every piped process held by orchd. */
export function dropHeldPipes(): void {
  for (const agentId of entries.keys()) releasePipes(agentId);
}
