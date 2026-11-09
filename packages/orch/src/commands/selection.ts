/**
 * What a command SELECTED: which harness it runs on and which model it named.
 *
 * A leaf on purpose. These sat in `spawn.ts`, so every command that merely reads
 * a `--harness`/`--model` flag had to import the whole launch path — and
 * `control.ts` importing them while `spawn.ts` imported `dispatchToAgent` back
 * was a cycle between two of the largest files in the repo. Nothing here starts
 * anything; the launch decisions that DO (model admission, the launch command) run in orchd.
 */
import { resolveSetting } from "../settings/read.ts";
import { isAdapterId } from "../shared/harness.ts";
import { SpawnRefusalError } from "../refusal.ts";
import { die } from "./target.ts";
import { ADAPTER_IDS, type AdapterId } from "../types/adapter.ts";
import type { ParsedFlags } from "../cli/spec.ts";
import type { AgentFlags } from "../types/command.ts";
import type { OrchSettings } from "../types/settings.ts";

/** The harness, plexer, model, and thinking a command's parsed flags named. Absent flags stay absent. */
export function agentFlags(flags: ParsedFlags): AgentFlags {
  const selected: AgentFlags = {};
  const harness = flags.value("--harness");
  if (harness !== undefined) selected.adapterFlag = harness;
  const plexer = flags.value("--plexer");
  if (plexer !== undefined) selected.backendFlag = plexer;
  const model = flags.value("--model");
  if (model !== undefined) selected.modelFlag = model;
  const thinking = flags.value("--thinking");
  if (thinking !== undefined) selected.thinkingFlag = thinking;
  return selected;
}

/** A harness id, refused with the supported ones when it names none. */
export function adapterIdOrDie(id: string): AdapterId {
  if (isAdapterId(id)) return id;
  throw new SpawnRefusalError(`Unknown adapter "${id}". Supported adapters: ${ADAPTER_IDS.join(", ")}.`);
}

export function pickAdapter(flags: AgentFlags, settings: OrchSettings): AdapterId {
  const selected = resolveSetting({ flag: flags.adapterFlag, settings: settings.defaults.adapter, fallback: "" });
  if (!selected) die("no harness selected - pass --harness <harness> or run `orch setup` to pick one");
  // Validate the id here, at the boundary, so everything downstream carries AdapterId.
  return adapterIdOrDie(selected);
}

/** The harness a running agent runs: the one orch recorded for it. Only an agent with no
 *  record falls back to the selection; a `--harness` that names another harness is refused. */
export function agentAdapter(flags: AgentFlags, settings: OrchSettings, recorded: string | null | undefined): AdapterId {
  if (!recorded) return pickAdapter(flags, settings);
  const adapter = adapterIdOrDie(recorded);
  if (flags.adapterFlag !== undefined && flags.adapterFlag !== adapter) die(`this agent runs ${adapter}; --harness ${flags.adapterFlag} cannot change it`);
  return adapter;
}
