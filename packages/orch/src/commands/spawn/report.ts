import { rpcCall } from "../../daemon/rpc/client.ts";
import { loadPresence } from "../../presence/store.ts";
import { maySpawnFrom } from "../../policy/spawner.ts";
import { workerRules } from "../../worker-prompt.ts";
import { resolveAdapterOrDie } from "../selection.ts";
import { readGroupLayout } from "../../backends/tiling.ts";
import { dispatchToAgent } from "../control.ts";
import { errorMessage, sleep } from "../../util.ts";
import { daemonOutage } from "../../daemon/reach.ts";
import { selfId } from "../../identity/self.ts";
import { agentViewIndex, presenceById } from "../target.ts";
import { isAgentId } from "../../backends/identity.ts";
import { computeFleetCapacity, formatCapacityLine, packsUsed } from "../../policy/capacity.ts";
import type { Backend } from "../../types/backend.ts";
import type { Logger, OrchDir } from "../../types/core.ts";
import type { Services } from "../../types/services.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { AgentAdapter } from "../../types/adapter.ts";
import type { CreatedAgent } from "../../types/command.ts";
import { pinModels } from "./models.ts";
import type { SpawnSettings } from "./flags.ts";
import type { ResultOf } from "../../daemon/rpc/protocol.ts";


export function spawnLogger(logger: Logger, key?: string): Logger {
  return key !== undefined && isAgentId(key) ? logger.forAgent(key) : logger;
}

/** Return the keys whose bridge is attached in one daemon status response. */
function attachedBridgeKeys(answer: ResultOf<"status"> | null): ReadonlySet<string> {
  return new Set(answer?.rows.filter((row) => row.bridgeAttached === true).map((row) => row.key));
}

/** Wait for every agent's bridge to attach; returns only the ones that attached. */
export async function awaitBridgeAttach(orchDir: OrchDir, logger: Logger, created: { key: string; handle: string; name: string }[], json = false): Promise<CreatedAgent[]> {
  const pending = new Map(created.map((c) => [c.key, c]));
  const attached = new Map<string, CreatedAgent>();
  const deadline = Date.now() + 60_000;
  if (!json) process.stdout.write("\nWaiting for agents to attach:\n");
  while (pending.size && Date.now() < deadline) {
    let answer: ResultOf<"status"> | null = null;
    try {
      answer = await rpcCall(orchDir, "status", undefined);
    } catch {
      // The daemon may be briefly unavailable while a bridge starts; keep polling
      // until the same spawn deadline used by the old registration wait.
    }
    const keys = attachedBridgeKeys(answer);
    for (const [key, agent] of [...pending]) {
      if (keys.has(key)) {
        pending.delete(key);
        attached.set(key, agent);
        if (!json) process.stdout.write(`  ok      ${agent.handle}  ${agent.name}\n`);
      }
    }
    if (pending.size) await sleep(500);
  }
  // A stalled agent is a failed spawn: it holds its name and answers no control
  // traffic. Reporting it on stdout while exiting 0 is what let a scripted fleet
  // launch read as success and dispatch into agents that never came up.
  for (const agent of pending.values()) {
    spawnLogger(logger, agent.key).error("spawn.stalled", { handle: agent.handle, name: agent.name });
    process.stdout.write(`  STALLED ${agent.handle}  ${agent.name} - bridge never attached; try: orch restart ${agent.name}\n`);
  }
  if (pending.size) process.exitCode = 1;
  return [...attached.values()];
}

/** A launch that placed fewer agents than were asked for FAILED; a warning line
 *  and a zero exit is how "spawn 3" quietly delivering 1 read as success. */
export function reportShortfall(logger: Logger, requested: number, placed: number): void {
  if (placed >= requested) return;
  logger.error("spawn.shortfall", { requested, placed });
  process.stdout.write(`placed ${placed} of ${requested} requested agent(s)\n`);
  process.exitCode = 1;
}

/** How many agents actually came up, or `null` when the harness cannot say.
 *  A harness with no start-up presence signal leaves a launch unverifiable, and reporting
 *  an unverified launch as a success is how a fleet of ghosts reads as a healthy one. */
async function confirmAgentsCameUp(orchDir: OrchDir, logger: Logger, adapter: AgentAdapter, created: CreatedAgent[], json: boolean): Promise<CreatedAgent[] | null> {
  if (adapter.bridge) {
    return await awaitBridgeAttach(orchDir, logger, created, json);
  }
  logger.warn("spawn.unverified", { adapter: adapter.id, count: created.length });
  process.stdout.write(`warning: ${adapter.id} writes no presence record at session start - ${created.length} agent(s) UNVERIFIED; check 'orch status' before dispatching\n`);
  return null;
}

export function printLayout(backend: Backend, group: string, header: string) {
  const role = backend.groupLayout;
  if (!role) return;
  const layout = readGroupLayout(role, group);
  const names = new Map((backend.placementInventory?.list() ?? []).map((target) => [String(target.handle), target.name ?? "-"]));
  process.stdout.write(header + "\n");
  const rows = layout.placements.map((p) => [
    String(p.handle),
    names.get(String(p.handle)) ?? "-", 
    `${p.rect.width}x${p.rect.height} @${p.rect.x},${p.rect.y}`,
  ]);
  const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
  const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
  for (const r of rows)
    process.stdout.write(`  ${r[0]!.padEnd(w0)}  ${r[1]!.padEnd(w1)}  ${r[2]!}\n`);
}

/** Announce a fleet whose control plane is down, and fail the launch. Panes without
 *  orchd are UNMANAGED: no steer, model pin, or result reaches them, and printing
 *  the tiling and "Spawned N agent(s)" over that silence is what sent an operator
 *  dispatching into a fleet that answered nothing. Null when orchd answers. */
async function reportControlPlaneOutage(orchDir: OrchDir, logger: Logger, placementCount: number): Promise<string | null> {
  const outage = await daemonOutage(orchDir);
  if (!outage) return null;
  logger.error("spawn.control-plane-unreachable", { panes: placementCount, error: outage });
  process.stdout.write(`CONTROL PLANE UNREACHABLE - ${placementCount} pane(s) are UNMANAGED: ${outage}\n`);
  process.exitCode = 1;
  return outage;
}

export async function reportSpawnResults(services: Pick<Services, "orchDir" | "settings" | "logger">, logger: Logger, settingsFile: OrchSettings, settings: SpawnSettings, group: string, tabLabel: string, created: CreatedAgent[], backend: Backend): Promise<void> {
  const { orchDir } = services;
  const maySpawn = maySpawnFrom(orchDir, selfId(orchDir), settingsFile.fleet.max_depth);
  if (!settings.json) {
    for (const agent of created) process.stdout.write(`${agent.handle}  ${agent.name}  [${tabLabel}]  ${settings.cmd}\n`);
    printLayout(backend, group, "\nFinal tiling:");
  }
  reportShortfall(logger, settings.agents.length, created.length);
  const registeredAgents = await confirmAgentsCameUp(orchDir, logger, resolveAdapterOrDie(settings.adapter), created, settings.json);
  const registered = registeredAgents?.length ?? null;
  if (!settings.json) {
    const views = agentViewIndex(orchDir);
    const presence = presenceById(loadPresence(orchDir));
    const caller = selfId(orchDir);
    const callerRoot = caller === undefined
      ? created.map((agent) => views.get(agent.key)?.rootAgentId).find((root): root is string => root !== undefined)
      : views.get(caller)?.rootAgentId;
    const capacity = computeFleetCapacity(views, presence, settingsFile, { packRootId: callerRoot });
    process.stdout.write(`\nSpawned ${created.length} (pack now ${packsUsed(capacity)}/${settingsFile.fleet.max_agents_per_pack}) on tab "${tabLabel}" (no focus stolen).\n`);
    process.stdout.write(`${formatCapacityLine(capacity, callerRoot)}\n`);
  }
  if (registeredAgents) {
    const registeredKeys = new Set(registeredAgents.map((agent) => agent.key));
    for (const agent of created) {
      if (!registeredKeys.has(agent.key)) {
        spawnLogger(logger, agent.key).warn("spawn.not-registered", { name: agent.name });
        process.stdout.write(`not pinned: ${agent.name} never registered\n`);
      }
    }
  }
  const pinEntries = (registeredAgents ?? []).flatMap((agent) => {
    const plan = settings.agents.find((candidate) => candidate.name === agent.name);
    return plan === undefined ? [] : [{ ...agent, model: plan.model, thinking: plan.thinking }];
  });
  const warnings = await pinModels(services, logger, pinEntries);
  const dispatches: { name: string; key: string; dispatchId: string }[] = [];
  if (registeredAgents && settings.agents.some((agent) => agent.prompt !== null)) {
    const registeredKeys = new Set(registeredAgents.map((agent) => agent.key));
    for (const [index, agent] of created.entries()) {
      if (!registeredKeys.has(agent.key)) {
        process.stdout.write(`not dispatched: ${agent.name} never registered\n`);
        continue;
      }
      const text = settings.agents[index]?.prompt;
      if (text === undefined || text === null) continue;
      try {
        const { id: dispatchId } = await dispatchToAgent(services, logger, agent.key, text, {
          adapter: resolveAdapterOrDie(settings.adapter),
          context: { maySpawn, spawnerRepliable: true, ...workerRules(settingsFile) },
        });
        dispatches.push({ name: agent.name, key: agent.key, dispatchId });
        if (!settings.json) process.stdout.write(`dispatched ${agent.name} ${dispatchId}\n`);
      } catch (error: unknown) {
        const message = errorMessage(error);
        spawnLogger(logger, agent.key).error("spawn.dispatch-failed", { name: agent.name, error: message });
        process.stdout.write(`warning: could not dispatch ${agent.name}: ${message}\n`);
      }
    }
  }
  const outage = warnings.length ? await reportControlPlaneOutage(orchDir, logger, created.length) : null;
  if (settings.json) process.stdout.write(JSON.stringify({
    backend: settings.backend,
    tab: tabLabel,
    agents: created,
    requested: settings.agents.length,
    created: created.length,
    registered,
    warnings,
    dispatches,
    daemon: outage ?? "ok",
  }) + "\n");
  else process.stdout.write(`\n'orch status' shows the fleet.\n`);
}
