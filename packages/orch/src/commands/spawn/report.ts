// After orchd launched a fleet: wait for each agent to come up, pin its model, hand it its first
// task, and report. Everything here asks orchd; nothing touches an agent.
import { rpcCall } from "../../daemon/client/rpc.ts";
import { maySpawnBelow } from "../../policy/spawner.ts";
import { workerRules } from "../../worker-prompt.ts";
import { dispatchToAgent } from "../control.ts";
import { writeDelivery } from "../delivery.ts";
import { errorMessage, sleep } from "../../util.ts";
import { daemonOutage } from "../../daemon/client/reach.ts";
import type { CallerSelf } from "../self.ts";
import { isAgentId } from "../../shared/agent-id.ts";
import type { Logger, OrchDir } from "../../types/core.ts";
import type { Services } from "../../types/services.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { AdapterId } from "../../types/adapter.ts";
import type { HarnessTraits, ResultOf } from "../../daemon/client/protocol.ts";
import { pinModels } from "./models.ts";
import type { SpawnRequest } from "./flags.ts";

/** What orchd answered a spawn that launched. */
export type Spawned = Extract<ResultOf<"spawn">, { outcome: "spawned" }>;
/** One agent orchd launched, with the tuning it launched on. */
type SpawnedAgent = Spawned["agents"][number];

function spawnLogger(logger: Logger, key?: string): Logger {
  return key !== undefined && isAgentId(key) ? logger.forAgent(key) : logger;
}

type StatusWireRow = ResultOf<"status">["rows"][number];

/** What says an agent came up: its bridge attached, or the status its harness reports on
 *  start. Null when the harness gives no start-up signal at all. */
function startupSignal(traits: HarnessTraits): ((row: StatusWireRow) => boolean) | null {
  if (traits.startup === "bridge") return (row) => row.bridgeAttached === true;
  return traits.startup === "start" ? (row) => !row.stateFallback : null;
}

/** Return the keys that came up in one daemon status response. */
function upKeys(answer: ResultOf<"status"> | null, isUp: (row: StatusWireRow) => boolean): ReadonlySet<string> {
  return new Set(answer?.rows.filter(isUp).map((row) => row.key));
}

/** Wait for every agent to come up; returns only the ones that did. */
async function awaitAgentsUp(orchDir: OrchDir, logger: Logger, created: readonly SpawnedAgent[], timeouts: OrchSettings["timeouts"], json: boolean, isUp: (row: StatusWireRow) => boolean): Promise<SpawnedAgent[]> {
  const pending = new Map(created.map((c) => [c.key, c]));
  const up = new Map<string, SpawnedAgent>();
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
function reportShortfall(logger: Logger, requested: number, placed: number): void {
  if (placed >= requested) return;
  logger.error("spawn.shortfall", { requested, placed });
  process.stdout.write(`placed ${placed} of ${requested} requested agent(s)\n`);
  process.exitCode = 1;
}

/** How many agents actually came up, or `null` when the harness cannot say.
 *  A harness with no start-up presence signal leaves a launch unverifiable, and reporting
 *  an unverified launch as a success is how a fleet of ghosts reads as a healthy one. */
async function confirmAgentsCameUp(orchDir: OrchDir, logger: Logger, traits: HarnessTraits, created: readonly SpawnedAgent[], timeouts: OrchSettings["timeouts"], json: boolean): Promise<SpawnedAgent[] | null> {
  const isUp = startupSignal(traits);
  if (isUp !== null) return await awaitAgentsUp(orchDir, logger, created, timeouts, json, isUp);
  logger.warn("spawn.unverified", { adapter: traits.id, count: created.length });
  process.stdout.write(`warning: ${traits.id} writes no presence record at session start - ${created.length} agent(s) UNVERIFIED; check 'orch status' before dispatching\n`);
  return null;
}

interface HarnessConfirmation {
  traits: HarnessTraits;
  agents: SpawnedAgent[];
  up: SpawnedAgent[] | null;
}

/** Confirm each harness's agents by that harness's own start-up signal, all at once. */
async function confirmFleetCameUp(orchDir: OrchDir, logger: Logger, spawned: Spawned, json: boolean, timeouts: OrchSettings["timeouts"]): Promise<HarnessConfirmation[]> {
  const groups = new Map<AdapterId, SpawnedAgent[]>();
  for (const agent of spawned.agents) groups.set(agent.harness, [...groups.get(agent.harness) ?? [], agent]);
  return await Promise.all([...groups].map(async ([id, agents]) => {
    const traits = spawned.harnesses.find((harness) => harness.id === id);
    if (traits === undefined) throw new Error(`orchd named no traits for harness ${id}`);
    return { traits, agents, up: await confirmAgentsCameUp(orchDir, logger, traits, agents, timeouts, json) };
  }));
}

/** How many agents came up, or null when any harness in the fleet cannot say. */
function registeredCount(confirmed: readonly HarnessConfirmation[]): number | null {
  if (confirmed.some((group) => group.up === null)) return null;
  return confirmed.reduce((sum, group) => sum + (group.up?.length ?? 0), 0);
}

/** Print what orchd reported while it launched: warnings and why a launch went headless. */
export function writeNotes(notes: readonly string[]): void {
  for (const note of notes) process.stdout.write(`${note}\n`);
}

/** Announce a fleet whose control plane is down, and fail the launch. Panes without
 *  orchd are UNMANAGED: no steer, model pin, or result reaches them, and printing
 *  "Spawned N agent(s)" over that silence is what sent an operator dispatching into a
 *  fleet that answered nothing. Null when orchd answers. */
async function reportControlPlaneOutage(orchDir: OrchDir, logger: Logger, placementCount: number): Promise<string | null> {
  const outage = await daemonOutage(orchDir);
  if (!outage) return null;
  logger.error("spawn.control-plane-unreachable", { panes: placementCount, error: outage });
  process.stdout.write(`CONTROL PLANE UNREACHABLE - ${placementCount} pane(s) are UNMANAGED: ${outage}\n`);
  process.exitCode = 1;
  return outage;
}

function warnUnregisteredAgents(logger: Logger, created: readonly SpawnedAgent[], registeredAgents: readonly SpawnedAgent[]): void {
  const registeredKeys = new Set(registeredAgents.map((agent) => agent.key));
  for (const agent of created) {
    if (!registeredKeys.has(agent.key)) {
      spawnLogger(logger, agent.key).warn("spawn.not-attached", { name: agent.name });
      process.stdout.write(`not pinned: ${agent.name} bridge not attached; try: orch model ${agent.name} <model>\n`);
    }
  }
}

/** Hand every launch prompt to orchd. The outbox holds a write whose bridge is not
 *  attached yet and re-pushes it on attach, so a stalled agent still gets its prompt:
 *  skipping it here is what turned a slow attach into a dropped dispatch. */
async function dispatchSpawnPrompts(services: Pick<Services, "orchDir" | "settings" | "logger">, self: CallerSelf, request: SpawnRequest, created: readonly SpawnedAgent[]): Promise<{ name: string; key: string; id: string; ack: "acknowledged" | "unavailable" }[]> {
  const { logger } = services;
  const settingsFile = services.settings.current();
  const dispatches: { name: string; key: string; id: string; ack: "acknowledged" | "unavailable" }[] = [];
  const maySpawn = maySpawnBelow(self, settingsFile.fleet.max_depth);
  for (const agent of created) {
    const prompt = request.params.agents.find((plan) => plan.name === agent.name)?.prompt ?? null;
    if (prompt === null) continue;
    try {
      const { id, ack } = await dispatchToAgent(services, logger, agent.key, prompt, {
        harness: agent.harness,
        context: { maySpawn, cwd: agent.cwd, ...(agent.branch === null ? {} : { worktreeBranch: agent.branch }), spawnerRepliable: self.id !== null, ...workerRules(settingsFile) },
      });
      dispatches.push({ name: agent.name, key: agent.key, id, ack });
      if (!request.json) writeDelivery({ target: agent.key, name: agent.name, action: "dispatch", id, ack }, {
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

/** A placed fleet: confirm it came up, pin each model a running session takes, dispatch the
 *  launch prompts, and report. */
export async function reportSpawnResults(services: Pick<Services, "orchDir" | "settings" | "logger">, self: CallerSelf, request: SpawnRequest, spawned: Spawned): Promise<void> {
  const { logger } = services;
  const created = spawned.agents;
  reportShortfall(logger, spawned.requested, created.length);
  const confirmed = await confirmFleetCameUp(services.orchDir, logger, spawned, request.json, services.settings.current().timeouts);
  const registered = registeredCount(confirmed);
  // A harness that cannot change a running session's model launched on it already.
  const pinnable = confirmed.flatMap(({ traits, agents, up }) => traits.takesModel && up !== null ? [{ agents, up }] : []);
  for (const group of pinnable) warnUnregisteredAgents(logger, group.agents, group.up);
  const warnings = await pinModels(services, logger, pinnable.flatMap((group) => group.up));
  const dispatches = await dispatchSpawnPrompts(services, self, request, created);
  const outage = warnings.length ? await reportControlPlaneOutage(services.orchDir, logger, created.length) : null;
  if (request.json) process.stdout.write(JSON.stringify({
    backend: spawned.backend,
    tab: spawned.tab,
    agents: created.map(createdAgent),
    requested: spawned.requested,
    created: created.length,
    registered,
    warnings,
    dispatches,
    daemon: outage ?? "ok",
  }) + "\n");
}

/** An agent as a spawn's JSON names it. */
function createdAgent(agent: SpawnedAgent): { key: string; handle: string; name: string; cwd: string; branch: string | null } {
  return { key: agent.key, handle: agent.handle, name: agent.name, cwd: agent.cwd, branch: agent.branch };
}

/** A headless fleet: the same gate the placed path uses, since returning before an agent comes
 *  up hands the caller a key it cannot dispatch to yet. An agent on another host comes up to
 *  that host's orchd, never this one, so nothing here watches for it. */
export async function reportHeadlessSpawn(services: Pick<Services, "orchDir" | "logger" | "settings">, request: SpawnRequest, spawned: Spawned): Promise<void> {
  const created = spawned.agents;
  reportShortfall(services.logger, spawned.requested, created.length);
  if (spawned.host !== null) {
    if (request.json) {
      process.stdout.write(JSON.stringify({ backend: spawned.backend, host: spawned.host, agents: created.map(createdAgent), panes: spawned.panes, requested: spawned.requested, created: created.length, registered: null }) + "\n");
      return;
    }
    for (const agent of created) {
      const pane = spawned.panes.find((shown) => shown.key === agent.key)?.handle;
      const shown = pane === undefined ? "" : ` Pane ${pane} shows it here.`;
      process.stdout.write(`${agent.key}  ${agent.name} - started on ${spawned.host}.${shown} orch monitor follows it.\n`);
    }
    return;
  }
  const confirmed = await confirmFleetCameUp(services.orchDir, services.logger, spawned, request.json, services.settings.current().timeouts);
  if (!request.json) return;
  process.stdout.write(JSON.stringify({
    backend: spawned.backend,
    agents: created.map(createdAgent),
    requested: spawned.requested,
    created: created.length,
    registered: registeredCount(confirmed),
  }) + "\n");
}
