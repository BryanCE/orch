import * as path from "node:path";
import { STATUS_FILE } from "../../presence/schema.ts";
import { orchDir, presenceAgentDir, readPresenceStatus } from "../../presence/store.ts";
import { reclaimAgent } from "../../store/agent-rows.ts";
import { resolveThinking, splitThinkingSuffix } from "../../policy/thinking.ts";
import { assertLaunchModelAllowed, launchModel, pinModels } from "../spawn/models.ts";
import { pickAdapter, resolveAdapterOrDie } from "../selection.ts";
import { writeRpc } from "../daemon.ts";
import { assertAgentOwned, die, requireCallerOwnerToken, resolveLifecycleTarget } from "../target.ts";
import { ownedAgentKeys, awaitIdleAfter } from "./index.ts";
import { agentIdOf, describeHandle } from "./close.ts";
import { loadConfig } from "../../config.ts";
import type { AgentFlags } from "../../types/command.ts";

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
  // A cleared session drops back to the harness's own default, so reset re-pins on
  // exactly the terms a spawn does: the model named here, else the configured default.
  const config = loadConfig(orchDir());
  const adapter = resolveAdapterOrDie(pickAdapter(flags, config));
  const model = launchModel(flags, config, adapter);
  // Reset re-pins on exactly the terms a spawn does, and that includes the
  // thinking effort: re-pinning the bare model dropped the level and every reset
  // silently returned the agent to the harness default.
  const thinking = resolveThinking({
    flag: flags.thinkingFlag,
    modelSuffix: splitThinkingSuffix(flags.modelFlag ?? config.defaults.models[adapter.id] ?? "").thinking,
    harness: adapter.id,
    config,
  });
  assertLaunchModelAllowed(adapter.id, model);
  const cleared: { key: string; pane: string; name: string }[] = [];
  const results: { target: string; cleared: true; ready: true }[] = [];
  for (const target of targets) {
    // A detached agent has no pane, so it resolves through the lifecycle target
    // resolver; resolvePane would reject the whole headless fleet outright.
    const { entity: ent, handle } = resolveLifecycleTarget(target);
    const pane = describeHandle(handle);
    assertAgentOwned(target, ent, force);
    const statusPath = path.join(presenceAgentDir(ent.key), STATUS_FILE);
    const before = readPresenceStatus(statusPath);
    const beforeUpdated = Date.parse(typeof before?.updatedAt === "string" ? before.updatedAt : "");
    const sentAt = Date.now();
    // The daemon owns every lifecycle mechanism: a console gets the adapter's
    // text, a detached agent has none and is refused. Neither is the CLI's to choose.
    reclaimAgent(orchDir(), agentIdOf(ent.key));
    await writeRpc("lifecycle", { target: ent.key, verb: "reset" });
    if (!awaitIdleAfter(statusPath, beforeUpdated, sentAt)) die(`${pane}: reset did not become ready within 75s.`);
    cleared.push({ key: ent.key, pane, name: ent.name ?? pane });
    results.push({ target: pane, cleared: true, ready: true });
    if (!json) process.stdout.write(`Cleared session on ${pane}; ready.\n`);
  }
  // A reset that could not re-pin its model left the agent on the wrong one, and
  // re-running reset is idempotent — unlike a spawn, nothing duplicates on retry.
  if ((await pinModels(cleared, model, thinking)).length) process.exitCode = 1;
  if (json) process.stdout.write(JSON.stringify(results.length === 1 ? results[0] : results) + "\n");
  else process.stdout.write(`Pinned ${cleared.length} reset agent(s) to ${model}.\n`);
}
