import { rpcCall } from "../../daemon/client/rpc.ts";
import { maySpawnBelow } from "../../policy/spawner.ts";
import { workerRules } from "../../worker-prompt.ts";
import { resolveAdapterOrDie } from "../selection.ts";
import { takesModel } from "../../adapters/adapter.ts";
import { readGroupLayout } from "../../backends/tiling.ts";
import { dispatchToAgent } from "../control.ts";
import { writeDelivery } from "../delivery.ts";
import { errorMessage, sleep } from "../../util.ts";
import { daemonOutage } from "../../daemon/client/reach.ts";
import type { CallerSelf } from "../self.ts";
import { isAgentId } from "../../backends/identity.ts";
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

type StatusWireRow = ResultOf<"status">["rows"][number];

/** What says an agent came up: its bridge attached, or the status its harness reports on
 *  start. Null when the harness gives no start-up signal at all. */
function startupSignal(adapter: AgentAdapter): ((row: StatusWireRow) => boolean) | null {
  if (adapter.bridge) return (row) => row.bridgeAttached === true;
  return adapter.hooks?.reports.includes("start") ? (row) => !row.stateFallback : null;
}

/** Return the keys that came up in one daemon status response. */
function upKeys(answer: ResultOf<"status"> | null, isUp: (row: StatusWireRow) => boolean): ReadonlySet<string> {
  return new Set(answer?.rows.filter(isUp).map((row) => row.key));
}

/** Wait for every agent to come up; returns only the ones that did. */
async function awaitAgentsUp(orchDir: OrchDir, logger: Logger, created: readonly CreatedAgent[], timeouts: OrchSettings["timeouts"], json: boolean, isUp: (row: StatusWireRow) => boolean): Promise<CreatedAgent[]> {
  const pending = new Map(created.map((c) => [c.key, c]));
  const up = new Map<string, CreatedAgent>();
  const deadline = Date.now() + timeouts.spawn_attach_ms;
  while (pending.size && Date.now() < deadline) {
    let answer: ResultOf<"status"> | null = null;
    try {
      answer = await rpcCall(orchDir, "status", { caller: null });
    } catch {
      // The daemon may be briefly unavailable while an agent starts; keep polling until the deadline.
    }
    const keys = upKeys(answer, isUp);
    for (const [key, agent] of [...pending]) {
      if (keys.has(key)) {
        pending.delete(key);
        up.set(key, agent);
        if (!json) process.stdout.write(`Spawned ${agent.name}\n`);
      }
    }
    if (pending.size) await sleep(timeouts.spawn_attach_poll_ms);
  }
  // A stalled agent is a failed spawn: it holds its name and answers no control
  // traffic. Reporting it on stdout while exiting 0 is what let a scripted fleet
  // launch read as success and dispatch into agents that never came up.
  for (const agent of pending.values()) {
    spawnLogger(logger, agent.key).error("spawn.stalled", { handle: agent.handle, name: agent.name });
    process.stdout.write(`STALLED ${agent.handle}  ${agent.name} - never came up; try: orch restart ${agent.name}\n`);
  }
  if (pending.size) process.exitCode = 1;
  return [...up.values()];
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
export async function confirmAgentsCameUp(orchDir: OrchDir, logger: Logger, adapter: AgentAdapter, created: readonly CreatedAgent[], timeouts: OrchSettings["timeouts"], json: boolean): Promise<CreatedAgent[] | null> {
  const isUp = startupSignal(adapter);
  if (isUp !== null) return await awaitAgentsUp(orchDir, logger, created, timeouts, json, isUp);
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
async function dispatchSpawnPrompts(services: Pick<Services, "orchDir" | "settings" | "logger">, self: CallerSelf, logger: Logger, settingsFile: OrchSettings, settings: SpawnSettings, created: readonly CreatedAgent[]): Promise<{ name: string; key: string; id: string; ack: "acknowledged" | "unavailable" }[]> {
  const dispatches: { name: string; key: string; id: string; ack: "acknowledged" | "unavailable" }[] = [];
  const maySpawn = maySpawnBelow(self, settingsFile.fleet.max_depth);
  for (const [index, agent] of created.entries()) {
    const text = settings.agents[index]?.prompt;
    if (text === undefined || text === null) continue;
    try {
      const { id, ack } = await dispatchToAgent(services, logger, agent.key, text, {
        adapter: resolveAdapterOrDie(settings.adapter),
        context: { maySpawn, cwd: settings.cwd, spawnerRepliable: self.id !== null, ...workerRules(settingsFile) },
      });
      dispatches.push({ name: agent.name, key: agent.key, id, ack });
      if (!settings.json) writeDelivery({ target: agent.key, name: agent.name, action: "dispatch", id, ack }, {
        json: false,
        ackMs: settingsFile.timeouts.dispatch_ack_ms,
      });
    } catch (error: unknown) {
      const message = errorMessage(error);
      spawnLogger(logger, agent.key).error("spawn.dispatch-failed", { name: agent.name, error: message });
      process.stdout.write(`warning: could not dispatch ${agent.name}: ${message}\n`);
    }
  }
  return dispatches;
}

export async function reportSpawnResults(services: Pick<Services, "orchDir" | "settings" | "logger">, self: CallerSelf, logger: Logger, settingsFile: OrchSettings, settings: SpawnSettings, tabLabel: string, created: CreatedAgent[]): Promise<void> {
  reportShortfall(logger, settings.agents.length, created.length);
  const adapter = resolveAdapterOrDie(settings.adapter);
  const registeredAgents = await confirmAgentsCameUp(services.orchDir, logger, adapter, created, settingsFile.timeouts, settings.json);
  const registered = registeredAgents?.length ?? null;
  // A harness that cannot change a running session's model launched on it already.
  const pinnable = takesModel(adapter) ? registeredAgents : null;
  if (pinnable) warnUnregisteredAgents(logger, created, pinnable);
  const pinEntries = buildSpawnPinEntries(pinnable, settings);
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
}
