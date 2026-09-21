import { rpcCall } from "../../daemon/client/rpc.ts";
import { maySpawnBelow } from "../../policy/spawner.ts";
import { workerRules } from "../../worker-prompt.ts";
import { resolveAdapterOrDie } from "../selection.ts";
import { readGroupLayout } from "../../backends/tiling.ts";
import { dispatchToAgent } from "../control.ts";
import { errorMessage, sleep } from "../../util.ts";
import { daemonOutage } from "../../daemon/client/reach.ts";
import { readFleet, type FleetSnapshot } from "../fleet.ts";
import { admissionFleet } from "./admission.ts";
import type { CallerSelf } from "../self.ts";
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
import type { ResultOf } from "../../daemon/client/protocol.ts";


export function spawnLogger(logger: Logger, key?: string): Logger {
  return key !== undefined && isAgentId(key) ? logger.forAgent(key) : logger;
}

/** Return the keys whose bridge is attached in one daemon status response. */
function attachedBridgeKeys(answer: ResultOf<"status"> | null): ReadonlySet<string> {
  return new Set(answer?.rows.filter((row) => row.bridgeAttached === true).map((row) => row.key));
}

/** Wait for every agent's bridge to attach; returns only the ones that attached. */
export async function awaitBridgeAttach(orchDir: OrchDir, logger: Logger, created: { key: string; handle: string; name: string }[], timeouts: OrchSettings["timeouts"], json = false): Promise<CreatedAgent[]> {
  const pending = new Map(created.map((c) => [c.key, c]));
  const attached = new Map<string, CreatedAgent>();
  const deadline = Date.now() + timeouts.spawn_attach_ms;
  if (!json) process.stdout.write("\nWaiting for agents to attach:\n");
  while (pending.size && Date.now() < deadline) {
    let answer: ResultOf<"status"> | null = null;
    try {
      answer = await rpcCall(orchDir, "status", undefined);
    } catch {
      // The daemon may be briefly unavailable while a bridge starts; keep polling until the deadline.
    }
    const keys = attachedBridgeKeys(answer);
    for (const [key, agent] of [...pending]) {
      if (keys.has(key)) {
        pending.delete(key);
        attached.set(key, agent);
        if (!json) process.stdout.write(`  ok      ${agent.handle}  ${agent.name}\n`);
      }
    }
    if (pending.size) await sleep(timeouts.spawn_attach_poll_ms);
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
async function confirmAgentsCameUp(orchDir: OrchDir, logger: Logger, adapter: AgentAdapter, created: CreatedAgent[], timeouts: OrchSettings["timeouts"], json: boolean): Promise<CreatedAgent[] | null> {
  if (adapter.bridge) {
    return await awaitBridgeAttach(orchDir, logger, created, timeouts, json);
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

function printSpawnAgentLines(settings: SpawnSettings, created: readonly CreatedAgent[], backend: Backend, group: string, tabLabel: string): void {
  if (!settings.json) {
    for (const agent of created) process.stdout.write(`${agent.handle}  ${agent.name}  [${tabLabel}]  ${settings.cmd}\n`);
    printLayout(backend, group, "\nFinal tiling:");
  }
}

async function printFleetCapacitySummary(services: Pick<Services, "settings" | "orchDir" | "logger">, self: CallerSelf, settingsFile: OrchSettings, settings: SpawnSettings, created: readonly CreatedAgent[], tabLabel: string): Promise<void> {
  const fleet: FleetSnapshot = await readFleet(services, true);
  const { views, presence } = admissionFleet(fleet);
  if (!settings.json) {
    const caller = self.id ?? undefined;
    const callerRoot = caller === undefined
      ? created.map((agent) => views.get(agent.key)?.rootAgentId).find((root): root is string => root !== undefined)
      : views.get(caller)?.rootAgentId;
    const capacity = computeFleetCapacity(views, presence, settingsFile, { packRootId: callerRoot });
    process.stdout.write(`\nSpawned ${created.length} (pack now ${packsUsed(capacity)}/${settingsFile.fleet.max_agents_per_pack}) on tab "${tabLabel}" (no focus stolen).\n`);
    process.stdout.write(`${formatCapacityLine(capacity, callerRoot)}\n`);
  }
}

function warnUnregisteredAgents(logger: Logger, created: readonly CreatedAgent[], registeredAgents: readonly CreatedAgent[]): void {
  const registeredKeys = new Set(registeredAgents.map((agent) => agent.key));
  for (const agent of created) {
    if (!registeredKeys.has(agent.key)) {
      spawnLogger(logger, agent.key).warn("spawn.not-attached", { name: agent.name });
      process.stdout.write(`not pinned: ${agent.name} bridge not attached; try: orch model ${agent.name} <model>\n`);
    }
  }
}

function buildSpawnPinEntries(registeredAgents: readonly CreatedAgent[] | null, settings: SpawnSettings): Parameters<typeof pinModels>[2] {
  return (registeredAgents ?? []).flatMap((agent) => {
    const plan = settings.agents.find((candidate) => candidate.name === agent.name);
    return plan === undefined ? [] : [{ ...agent, model: plan.model, thinking: plan.thinking }];
  });
}

/** Hand every launch prompt to orchd. The outbox holds a write whose bridge is not
 *  attached yet and re-pushes it on attach, so a stalled agent still gets its prompt:
 *  skipping it here is what turned a slow attach into a dropped dispatch. */
async function dispatchSpawnPrompts(services: Pick<Services, "orchDir" | "settings" | "logger">, self: CallerSelf, logger: Logger, settingsFile: OrchSettings, settings: SpawnSettings, created: readonly CreatedAgent[]): Promise<{ name: string; key: string; dispatchId: string }[]> {
  const dispatches: { name: string; key: string; dispatchId: string }[] = [];
  const maySpawn = maySpawnBelow(self, settingsFile.fleet.max_depth);
  for (const [index, agent] of created.entries()) {
    const text = settings.agents[index]?.prompt;
    if (text === undefined || text === null) continue;
    try {
      const { id: dispatchId, ack } = await dispatchToAgent(services, logger, agent.key, text, {
        adapter: resolveAdapterOrDie(settings.adapter),
        context: { maySpawn, spawnerRepliable: self.id !== null, ...workerRules(settingsFile) },
      });
      dispatches.push({ name: agent.name, key: agent.key, dispatchId });
      const verb = ack === "acknowledged" ? "dispatched" : "queued";
      if (!settings.json) process.stdout.write(`${verb} ${agent.name} ${dispatchId}\n`);
    } catch (error: unknown) {
      const message = errorMessage(error);
      spawnLogger(logger, agent.key).error("spawn.dispatch-failed", { name: agent.name, error: message });
      process.stdout.write(`warning: could not dispatch ${agent.name}: ${message}\n`);
    }
  }
  return dispatches;
}

export async function reportSpawnResults(services: Pick<Services, "orchDir" | "settings" | "logger">, self: CallerSelf, logger: Logger, settingsFile: OrchSettings, settings: SpawnSettings, group: string, tabLabel: string, created: CreatedAgent[], backend: Backend): Promise<void> {
  printSpawnAgentLines(settings, created, backend, group, tabLabel);
  reportShortfall(logger, settings.agents.length, created.length);
  const registeredAgents = await confirmAgentsCameUp(services.orchDir, logger, resolveAdapterOrDie(settings.adapter), created, settingsFile.timeouts, settings.json);
  const registered = registeredAgents?.length ?? null;
  await printFleetCapacitySummary(services, self, settingsFile, settings, created, tabLabel);
  if (registeredAgents) warnUnregisteredAgents(logger, created, registeredAgents);
  const pinEntries = buildSpawnPinEntries(registeredAgents, settings);
  const warnings = await pinModels(services, logger, pinEntries);
  const dispatches = await dispatchSpawnPrompts(services, self, logger, settingsFile, settings, created);
  const outage = warnings.length ? await reportControlPlaneOutage(services.orchDir, logger, created.length) : null;
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
