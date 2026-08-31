import { bridgeRegistered, orchDir } from "../../presence/store.ts";
import { loadSettings } from "../../settings/read.ts";
import { maySpawnFrom } from "../../worker-prompt.ts";
import { resolveAdapterOrDie } from "../selection.ts";
import { tryParseIdentity } from "../../backends/identity.ts";
import { readGroupLayout } from "../../backends/tiling.ts";
import { dispatchToAgent } from "../control.ts";
import { errorMessage, sleep } from "../../util.ts";
import { daemonOutage } from "../../daemon/reach.ts";
import { selfId } from "../../identity/self.ts";
import { agentViewIndex, presenceById } from "../target.ts";
import { computeFleetCapacity, formatCapacityLine } from "../../policy/capacity.ts";
import { commandLogger } from "../logging.ts";
import type { Backend } from "../../types/backend.ts";
import type { AgentAdapter } from "../../types/adapter.ts";
import type { CreatedAgent } from "../../types/command.ts";
import { pinModels } from "./models.ts";
import type { SpawnSettings } from "./flags.ts";


export function spawnLogger(key?: string) {
  const agentId = key ? tryParseIdentity(key)?.id : undefined;
  return agentId ? commandLogger().forAgent(agentId) : commandLogger();
}

/** Wait for every agent to write its bridge dir; returns only the ones that registered. */
export async function awaitBridgeRegistration(created: { key: string; pane: string; name: string }[], json = false): Promise<CreatedAgent[]> {
  const pending = new Map(created.map((c) => [c.key, c]));
  const registered = new Map<string, CreatedAgent>();
  const deadline = Date.now() + 60_000;
  if (!json) process.stdout.write("\nWaiting for agents to register:\n");
  while (pending.size && Date.now() < deadline) {
    for (const [key, agent] of [...pending]) {
      if (bridgeRegistered(key)) {
        pending.delete(key);
        registered.set(key, agent);
        if (!json) process.stdout.write(`  ok      ${agent.pane}  ${agent.name}\n`);
      }
    }
    await sleep(500);
  }
  // A stalled agent is a failed spawn: it holds its name and answers no control
  // traffic. Reporting it on stdout while exiting 0 is what let a scripted fleet
  // launch read as success and dispatch into panes that never came up.
  for (const agent of pending.values()) {
    spawnLogger(agent.key).error("spawn.stalled", { handle: agent.pane, name: agent.name });
    process.stdout.write(`  STALLED ${agent.pane}  ${agent.name} - no bridge dir; try: orch restart ${agent.name}\n`);
  }
  if (pending.size) process.exitCode = 1;
  return [...registered.values()];
}

/** A launch that placed fewer agents than were asked for FAILED; a warning line
 *  and a zero exit is how "spawn 3" quietly delivering 1 read as success. */
export function reportShortfall(requested: number, placed: number): void {
  if (placed >= requested) return;
  commandLogger().error("spawn.shortfall", { requested, placed });
  process.stdout.write(`placed ${placed} of ${requested} requested agent(s)\n`);
  process.exitCode = 1;
}

/** How many agents actually came up, or `null` when the harness cannot say.
 *  A harness with no start-up presence signal leaves a launch unverifiable, and reporting
 *  an unverified launch as a success is how a fleet of ghosts reads as a healthy one. */
export async function confirmAgentsCameUp(adapter: AgentAdapter, created: CreatedAgent[], json: boolean): Promise<CreatedAgent[] | null> {
  if (adapter.presenceRegistration) {
    return await awaitBridgeRegistration(created, json);
  }
  commandLogger().warn("spawn.unverified", { adapter: adapter.id, count: created.length });
  process.stdout.write(`warning: ${adapter.id} writes no presence record at session start - ${created.length} agent(s) UNVERIFIED; check 'orch status' before dispatching\n`);
  return null;
}

export function printLayout(backend: Backend, group: string, header: string) {
  const role = backend.groupLayout;
  if (!role) return;
  const layout = readGroupLayout(role, group);
  const names = new Map((backend.paneInventory?.list() ?? []).map((target) => [String(target.handle), target.name ?? "-"]));
  process.stdout.write(header + "\n");
  const rows = layout.panes.map((p) => [
    String(p.handle),
    names.get(String(p.handle)) ?? "-", 
    `${p.rect.width}x${p.rect.height} @${p.rect.x},${p.rect.y}`,
  ]);
  const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
  const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
  for (const r of rows)
    process.stdout.write(`  ${r[0]!.padEnd(w0)}  ${r[1]!.padEnd(w1)}  ${r[2]!}\n`);
}

/** The command one harness launches under, built by that harness's own adapter. `launch` carries
 *  what this launch selected — the model it starts on and the quicklist its picker shows — so a
 *  previewed command is the command the backend actually runs. */
/** Announce a fleet whose control plane is down, and fail the launch. Panes without
 *  orchd are UNMANAGED: no steer, model pin, or result reaches them, and printing
 *  the tiling and "Spawned N agent(s)" over that silence is what sent an operator
 *  dispatching into a fleet that answered nothing. Null when orchd answers. */
export async function reportControlPlaneOutage(paneCount: number): Promise<string | null> {
  const outage = await daemonOutage();
  if (!outage) return null;
  commandLogger().error("spawn.control-plane-unreachable", { panes: paneCount, error: outage });
  process.stdout.write(`CONTROL PLANE UNREACHABLE - ${paneCount} pane(s) are UNMANAGED: ${outage}\n`);
  process.exitCode = 1;
  return outage;
}

export async function reportSpawnResults(settings: SpawnSettings, group: string, tabLabel: string, created: CreatedAgent[], backend: Backend): Promise<void> {
  const settingsFile = loadSettings(orchDir());
  const maySpawn = maySpawnFrom(orchDir(), selfId(), settingsFile.fleet.max_depth);
  if (!settings.json) {
    for (const agent of created) process.stdout.write(`${agent.pane}  ${agent.name}  [${tabLabel}]  ${settings.cmd}\n`);
    printLayout(backend, group, "\nFinal tiling:");
  }
  reportShortfall(settings.n, created.length);
  const registeredAgents = await confirmAgentsCameUp(resolveAdapterOrDie(settings.adapter), created, settings.json);
  const registered = registeredAgents?.length ?? null;
  if (!settings.json) {
    const views = agentViewIndex();
    const presence = presenceById();
    const caller = selfId();
    const callerRoot = caller === undefined
      ? created.map((agent) => tryParseIdentity(agent.key)?.id).flatMap((id) => id === undefined ? [] : [views.get(id)?.rootAgentId]).find((root): root is string => root !== undefined)
      : views.get(caller)?.rootAgentId;
    const capacity = computeFleetCapacity(views, presence, settingsFile, { packRootId: callerRoot });
    const cap = capacity.pack.cap === null ? "unlimited" : String(capacity.pack.cap);
    process.stdout.write(`\nSpawned ${created.length} (pack now ${capacity.pack.used}/${cap}) on tab "${tabLabel}" (no focus stolen).\n`);
    process.stdout.write(`${formatCapacityLine(capacity, callerRoot)}\n`);
  }
  if (registeredAgents) {
    const registeredKeys = new Set(registeredAgents.map((agent) => agent.key));
    for (const agent of created) {
      if (!registeredKeys.has(agent.key)) {
        spawnLogger(agent.key).warn("spawn.not-registered", { name: agent.name });
        process.stdout.write(`not pinned: ${agent.name} never registered\n`);
      }
    }
  }
  const warnings = await pinModels(registeredAgents ?? [], settings.model, settings.thinking);
  const dispatches: { name: string; key: string; dispatchId: string }[] = [];
  if (registeredAgents && settings.prompts.length > 0) {
    const registeredKeys = new Set(registeredAgents.map((agent) => agent.key));
    for (const [index, agent] of created.entries()) {
      if (!registeredKeys.has(agent.key)) {
        process.stdout.write(`not dispatched: ${agent.name} never registered\n`);
        continue;
      }
      const text = settings.prompts.length === 1 ? settings.prompts[0]! : settings.prompts[index]!;
      try {
        const { dispatchId } = await dispatchToAgent(agent.key, text, {
          adapter: resolveAdapterOrDie(settings.adapter),
          context: { maySpawn, lockedCommands: settingsFile.locked_commands, spawnerRepliable: true },
        });
        dispatches.push({ name: agent.name, key: agent.key, dispatchId });
        if (!settings.json) process.stdout.write(`dispatched ${agent.name} ${dispatchId}\n`);
      } catch (error: unknown) {
        const message = errorMessage(error);
        spawnLogger(agent.key).error("spawn.dispatch-failed", { name: agent.name, error: message });
        process.stdout.write(`warning: could not dispatch ${agent.name}: ${message}\n`);
      }
    }
  }
  const outage = warnings.length ? await reportControlPlaneOutage(created.length) : null;
  if (settings.json) process.stdout.write(JSON.stringify({
    backend: settings.backend,
    tab: tabLabel,
    agents: created,
    requested: settings.n,
    created: created.length,
    registered,
    warnings,
    dispatches,
    daemon: outage ?? "ok",
  }) + "\n");
  else process.stdout.write(`\n'orch status' shows the fleet.\n`);
}
