import * as path from "node:path";
import { STATUS_FILE } from "../../presence/schema.ts";
import { orchDir, presenceAgentDir, readPresenceStatus } from "../../presence/writer.ts";
import { reclaimAgent } from "../../store/agent-rows.ts";
import { modelSpec } from "../../policy/thinking.ts";
import { assertLaunchModelAllowed, pinModels } from "../spawn/models.ts";
import { pickAdapter, resolveAdapterOrDie, resolveTuningOrDie } from "../selection.ts";
import { writeRpc } from "../daemon.ts";
import { assertAgentOwned, die, requireCallerOwnerToken, resolveLifecycleTarget } from "../target.ts";
import { ownedAgentKeys, awaitIdleAfter } from "./index.ts";
import { describeHandle } from "./close.ts";
import { loadSettings } from "../../settings/read.ts";
import type { AgentFlags } from "../../types/command.ts";

interface ClearedAgent { key: string; handle: string; name: string }

function parseResetArgs(args: string[]): { targets: string[]; flags: AgentFlags } {
  const targets: string[] = [];
  const flags: AgentFlags = {};
  if (args.includes("--all")) requireCallerOwnerToken();
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (arg === "--json" || arg === "--force") continue;
    if (arg === "--model") { flags.modelFlag = args[++index]; continue; }
    if (arg === "--thinking") { flags.thinkingFlag = args[++index]; continue; }
    if (arg === "--all") targets.push(...ownedAgentKeys());
    else targets.push(arg);
  }
  return { targets, flags };
}

/** Clear one agent's session and wait for it to come back ready. */
export async function clearSession(target: string, force: boolean): Promise<ClearedAgent> {
  // Resolved through the lifecycle resolver, which answers for an agent placed
  // nowhere; the placement resolver rejects the whole headless fleet outright.
  const { entity: ent, handle } = resolveLifecycleTarget(target);
  const label = describeHandle(handle);
  assertAgentOwned(target, ent, force);
  const statusPath = path.join(presenceAgentDir(ent.key), STATUS_FILE);
  const before = readPresenceStatus(statusPath);
  const beforeUpdated = Date.parse(typeof before?.updatedAt === "string" ? before.updatedAt : "");
  const sentAt = Date.now();
  // The daemon owns every lifecycle mechanism: a console gets the adapter's
  // text, an agent with none is refused. Neither is the CLI's to choose.
  reclaimAgent(orchDir(), ent.key);
  await writeRpc("lifecycle", { target: ent.key, verb: "reset" });
  if (!awaitIdleAfter(statusPath, beforeUpdated, sentAt)) die(`${label}: reset did not become ready within 75s.`);
  return { key: ent.key, handle: label, name: ent.name ?? label };
}

export async function cmdNew(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const force = args.includes("--force");
  const { targets, flags } = parseResetArgs(args);
  if (!targets.length) die("usage: orch reset <target>... | --all [--model <model>] [--thinking <level>] [--json]");
  // Check ownership before resolving model configuration: a driving verb must
  // name a live foreign holder even when this caller has no model selected.
  for (const target of targets) {
    const { entity: ent } = resolveLifecycleTarget(target);
    assertAgentOwned(target, ent, force);
  }
  const settings = loadSettings(orchDir());
  const adapter = resolveAdapterOrDie(pickAdapter(flags, settings));
  const tuning = resolveTuningOrDie(flags, settings, adapter.id);
  const { model, thinking } = tuning;
  assertLaunchModelAllowed(adapter.id, model);
  const cleared: ClearedAgent[] = [];
  for (const target of targets) {
    const agent = await clearSession(target, force);
    cleared.push(agent);
    if (!json) process.stdout.write(`Cleared session on ${agent.handle}; ready.\n`);
  }
  // A reset that could not re-pin its model left the agent on the wrong one, and
  // re-running reset is idempotent — unlike a spawn, nothing duplicates on retry.
  if ((await pinModels(cleared, model, thinking)).length) process.exitCode = 1;
  const results = cleared.map((agent) => ({ target: agent.handle, cleared: true, ready: true }));
  if (json) process.stdout.write(JSON.stringify(results.length === 1 ? results[0] : results) + "\n");
  else process.stdout.write(`Pinned ${cleared.length} reset agent(s) to ${modelSpec(model, thinking)}.\n`);
}
