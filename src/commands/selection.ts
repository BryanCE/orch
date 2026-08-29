/**
 * What a command SELECTED: which harness it runs on and which model it named.
 *
 * A leaf on purpose. These sat in `spawn.ts`, so every command that merely reads
 * a `--agent`/`--model` flag had to import the whole launch path — and
 * `control.ts` importing them while `spawn.ts` imported `dispatchToAgent` back
 * was a cycle between two of the largest files in the repo. Nothing here starts
 * anything; the launch decisions that DO (`launchModel`, `assertLaunchModelAllowed`)
 * stay with the launch.
 */
import { resolveSetting } from "../config.ts";
import { resolveAdapter as resolveRegisteredAdapter } from "../adapters/registry.ts";
import { SpawnRefusalError } from "../refusal.ts";
import { errorMessage } from "../util.ts";
import { die } from "./target.ts";
import type { AdapterId, AgentAdapter } from "../types/adapter.ts";
import type { AgentFlags } from "../types/command.ts";
import type { OrchConfig } from "../types/config.ts";

export function resolveAdapterOrDie(id: string): AgentAdapter {
  try {
    return resolveRegisteredAdapter(id);
  } catch (error: unknown) {
    throw new SpawnRefusalError(errorMessage(error));
  }
}

export function pickAdapter(flags: AgentFlags, config: OrchConfig): AdapterId {
  const selected = resolveSetting({ flag: flags.adapterFlag, env: "ORCH_ADAPTER", config: config.defaults.adapter, fallback: "" });
  if (!selected) die("no harness selected - pass --agent <id> or run `orch setup` to pick one");
  // Validate the id here, at the boundary, so everything downstream carries AdapterId.
  return resolveAdapterOrDie(selected).id;
}

/** The model THIS command named, or null when the caller named none. NEVER the
 *  configured default: only a launch may apply that. A dispatch that fell back to
 *  it re-pinned every agent to the default and erased the model it spawned on. */
export function requestedModel(flags: AgentFlags): string | null {
  return resolveSetting({ flag: flags.modelFlag, env: "ORCH_MODEL", fallback: "" }) || null;
}
