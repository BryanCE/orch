import { recipientOf } from "../entities/lookup.ts";
import { recipientLabel } from "../recipient.ts";
import { collapse, errorMessage, isRecord, truncate } from "../util.ts";
import { isAgentId } from "../backends/identity.ts";
import { getAdapter } from "../adapters/registry.ts";
import { modelSpec } from "../policy/thinking.ts";
import { spawnerIdentityOf, workerHeaderContextOf } from "../policy/spawner.ts";
import { callDaemon, governanceFlags, readRpc, writeRpc } from "./daemon.ts";
import { parseCommand } from "./registry.ts";
import type { Invocation } from "../cli/spec.ts";
import { die, remoteWrite, resultText, targetHost } from "./target.ts";
import { resolveEntity, resolveOwnedTarget, type ResolvedTarget } from "./resolve.ts";
import { readFleet, type FleetSnapshot } from "./fleet.ts";
import { whoAmI, refuseNonOperatorOverride, type CallerSelf } from "./self.ts";
import { callerCredential } from "../identity/credential.ts";
import { agentFlags, pickAdapter, requestedModel, resolveAdapterOrDie, resolveTuningOrDie } from "./selection.ts";
import { taskWithReferences, workerPrompt } from "../worker-prompt.ts";
import { clearSession } from "./lifecycle/reset.ts";
import { admitLaunchModel, pinModels } from "./spawn/models.ts";
import { contextReference, readPromptFile } from "./prompt-file.ts";
import { getBackend } from "../backends/registry.ts";
import type { Services } from "../types/services.ts";
import type { AdapterId } from "../types/adapter.ts";
import type { RecordedProcess } from "../types/backend.ts";
import type { PresenceEntry } from "../types/presence.ts";
import type { ThinkingLevel } from "../types/policy.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { AgentFlags, DispatchToAgentOptions, WriteGovernance } from "../types/command.ts";
import type { Entity, Recipient } from "../types/core.ts";
import type { AgentView } from "../types/store.ts";
import { NO_TUNING } from "../policy/tuning.ts";

type DispatchFlags = AgentFlags & {
  raw: boolean;
  json: boolean;
  /** Path the prompt body is read from, or "-" for stdin. Unset means the positionals are the prompt. */
  promptFile?: string;
  /** Where the agent's context lives; each `--with` adds one. Orch checks each exists and never reads it. */
  withPaths: readonly string[];
  /** Send the work onto the session the agent already has, instead of a clean one. */
  keepContext: boolean;
  positional: readonly string[];
};

interface DispatchSettings {
  adapter: AdapterId;
  /** Set only when this dispatch named a model; null leaves the agent on the one it spawned with. */
  model: string | null;
  raw: boolean;
  json: boolean;
  ent: Entity;
  view: AgentView | null;
  /** What the caller called the agent back to itself: its handle, else its key. */
  handle: string;
  prompt: string;
  keepContext: boolean;
}


export async function cmdSteer(services: Services, args: string[]): Promise<void> {
  const self = await whoAmI(services);
  const { flags, positional } = parseCommand("steer", args);
  const json = flags.has("--json");
  const gov = governanceFlags(flags);
  const target = positional[0];
  const text = positional.slice(1).join(" ");
  if (!target || !text) die('usage: orch steer <target> <text...> [--steal] [--cross-space] [--json]');
  const remote = targetHost(services.settings.current().hosts, target);
  if (remote) {
    remoteWrite(services.settings.current().hosts, remote.host, "steer", [remote.target, text, ...(json ? ["--json"] : [])]);
    return;
  }
  const resolved = await resolveOwnedTarget(services, self, target, { crossSpace: gov.crossSpace, override: gov.steal, overrideFlag: "--steal" });
  const result = await writeRpc(services, "steer", { target: resolved.entity.key, text }, gov);
  const recipient = recipientOf(resolved.view ?? undefined, resolved.entity.space ?? "space", resolved.entity.key);
  reportControlDelivery(recipient, "steered", resolved.entity.key, result, json, ` -> ${truncate(collapse(text), 60)}`);
}

function reportControlDelivery(recipient: Recipient, action: "steered" | "answered" | "dispatched", key: string, result: unknown, json: boolean, suffix: string, dispatchAckMs?: number): void {
  if (!isRecord(result) || (result.ack !== "acknowledged" && result.ack !== "unavailable")) die("Daemon response missing delivery acknowledgement.");
  const confirmed = result.ack === "acknowledged";
  if (json) {
    process.stdout.write(JSON.stringify({ target: key, recipient, [action]: confirmed, ...result }) + "\n");
    return;
  }
  if (action === "dispatched") {
    if (typeof result.id !== "string" || dispatchAckMs === undefined) die("Daemon response missing dispatch acknowledgement details.");
    const status = confirmed ? "Delivered" : "Queued";
    const detail = confirmed ? "" : `: no bridge ack within ${dispatchAckMs}ms`;
    process.stdout.write(`${status} to ${recipientLabel(recipient)} (dispatch ${result.id})${detail}\n`);
    return;
  }
  const verb = confirmed ? (action === "steered" ? "Steered" : "Answered") : "Sent to";
  const ack = confirmed ? "acknowledged" : "ack unavailable; consumption unconfirmed";
  process.stdout.write(`${verb} ${recipientLabel(recipient)} (${ack})${suffix}\n`);
}

export async function cmdBroadcast(services: Services, args: string[]) {
  const self = await whoAmI(services);
  const { flags, positional } = parseCommand("broadcast", args);
  let all = flags.has("--all");
  const json = flags.has("--json");
  const force = flags.has("--force");
  const text = positional[0];
  const targets = positional.slice(1);
  if (!text) die('usage: orch broadcast "<text>" [target ...|--all]');
  const explicitAll = all;
  if (!targets.length) all = true;
  const destinations = new Map<string, PresenceEntry>();
  const resolvedByKey = new Map<string, ResolvedTarget>();
  let fleet: FleetSnapshot | undefined;
  if (all) {
    if (self.id === null) die("Bulk operation refused: this orch is not registered; spawn or adopt an agent first, or name the targets.");
    if (explicitAll) refuseNonOperatorOverride(self, "--all");
    fleet = await readFleet(services, true);
    const { keys } = await readRpc(services, "owned-agents", { caller: callerCredential() });
    for (const key of keys) {
      const pres = fleet.presence.find((entry) => entry.key === key);
      if (pres?.alive) destinations.set(key, pres);
    }
  }
  for (const target of targets) {
    const resolved = await resolveOwnedTarget(services, self, target, { override: force });
    if (!resolved.entity.presence) die(`Target "${target}" has no agent dir.`);
    resolvedByKey.set(resolved.entity.key, resolved);
    destinations.set(resolved.entity.presence.key, resolved.entity.presence);
  }
  if (!destinations.size) die("No live agent dirs to broadcast to.");
  // Per target, never Promise.all + die: one agent refusing (one awaiting an
  // answer refuses a steer) must not hide which of its siblings did receive the text.
  const refusals: { key: string; reason: string }[] = [];
  await Promise.all([...destinations.values()].map(async (pres) => {
    try {
      await callDaemon(services, "steer", { target: pres.key, text });
    } catch (error: unknown) {
      refusals.push({ key: pres.key, reason: errorMessage(error) });
    }
  }));
  const delivered = destinations.size - refusals.length;
  if (json) process.stdout.write(JSON.stringify({ count: delivered, refused: refusals, broadcast: true }) + "\n");
  else {
    process.stdout.write(`Broadcast to ${delivered} of ${destinations.size} agent(s).\n`);
    for (const refusal of refusals) {
      const log = isAgentId(refusal.key) ? services.logger.forAgent(refusal.key) : services.logger;
      log.warn("broadcast.refused", { reason: refusal.reason, target: refusal.key });
      const resolved = resolvedByKey.get(refusal.key);
      const view = resolved?.view ?? fleet?.views.find((entry) => entry.id === refusal.key);
      const space = resolved?.entity.space ?? view?.environment.space ?? "space";
      process.stdout.write(`  refused ${recipientLabel(recipientOf(view, space, refusal.key))}: ${refusal.reason}\n`);
    }
  }
  if (delivered === 0) process.exitCode = 1;
}

export async function cmdPipe(services: Services, args: string[]) {
  const self = await whoAmI(services);
  const { flags, positional } = parseCommand("pipe", args);
  const json = flags.has("--json");
  const src = positional[0];
  const dst = positional[1];
  const instruction = positional.slice(2).join(" ");
  if (!src || !dst) die('usage: orch pipe <src> <dst> ["instruction"] [--json]');
  void self;
  const resolvedSource = await resolveEntity(services, src);
  const source = resolvedSource.entity;
  if (!source.presence) die(`Target "${src}" has no agent dir.`);
  const extractInput = { key: source.presence.key, sessionPath: source.sessionPath ?? undefined };
  const adapter = getAdapter(resolvedSource.view?.harnessId ?? source.agent ?? "");
  const resultTextValue = adapter?.extractResult(extractInput, services.orchDir) ?? resultText(source.presence.result);
  if (!resultTextValue) die(`No result text available for "${src}".`);
  const resolvedDestination = await resolveEntity(services, dst);
  const destination = resolvedDestination.entity;
  if (!destination.presence) die(`Target "${dst}" has no agent dir.`);
  const text = `[piped from ${source.presence.key}] ${instruction ? instruction + "\n" : ""}${resultTextValue}`;
  await writeRpc(services, "steer", { target: destination.presence.key, text });
  if (json) process.stdout.write(JSON.stringify({ source: source.presence.key, destination: destination.presence.key, piped: true }) + "\n");
  else process.stdout.write(`Piped ${source.presence.key} -> ${destination.presence.key}.\n`);
}

export async function cmdAnswer(services: Services, args: string[]): Promise<void> {
  const self = await whoAmI(services);
  const { flags, positional } = parseCommand("answer", args);
  const json = flags.has("--json");
  const gov = governanceFlags(flags);
  const target = positional[0];
  const text = positional.slice(1).join(" ");
  if (!target || !text) die('usage: orch answer <target> "<text>" [--steal] [--cross-space] [--json]');
  const remote = targetHost(services.settings.current().hosts, target);
  if (remote) {
    remoteWrite(services.settings.current().hosts, remote.host, "answer", [remote.target, text, ...(gov.steal ? ["--steal"] : []), ...(gov.crossSpace ? ["--cross-space"] : []), ...(json ? ["--json"] : [])]);
    return;
  }
  const resolved = await resolveOwnedTarget(services, self, target, { crossSpace: gov.crossSpace, override: gov.steal, overrideFlag: "--steal" });
  if (!resolved.entity.presence) die(`Target "${target}" has no agent dir.`);
  // The daemon's control dispatcher applies the answer (wall + ownership + capabilities.ask gate);
  // the CLI never invokes the adapter's answer strategy directly.
  const result = await writeRpc(services, "answer", { target: resolved.entity.presence.key, text }, gov);
  const recipient = recipientOf(resolved.view ?? undefined, resolved.entity.space ?? "space", resolved.entity.key);
  reportControlDelivery(recipient, "answered", resolved.entity.presence.key, result, json, ".");
}

export async function cmdModel(services: Services, args: string[]): Promise<void> {
  const self = await whoAmI(services);
  const { flags, positional } = parseCommand("model", args);
  const json = flags.has("--json");
  const gov = governanceFlags(flags);
  const target = positional[0];
  const modelArg = positional[1];
  if (!target || !modelArg) die("usage: orch model <target> <model[:thinking]> [--steal] [--cross-space] [--no-wait]");
  const resolved = await resolveOwnedTarget(services, self, target, { crossSpace: gov.crossSpace, override: gov.steal, overrideFlag: "--steal" });
  const ent = resolved.entity;
  const handle = ent.paneId ?? ent.key;
  const harness = resolved.view?.harnessId;
  if (!harness) die(`Target "${target}" has no recorded harness - cannot determine its model mechanism.`);
  const adapter = resolveAdapterOrDie(harness);
  const tuning = resolveTuningOrDie({ modelFlag: modelArg }, services.settings.current(), adapter.id, null);
  // Admitted here, before the daemon sees it, so a short name is expanded once and the
  // spec this command reports back is the one the agent was actually pinned to.
  const spec = modelSpec(admitLaunchModel(services.settings.current(), adapter.id, services.models, tuning.model), tuning.thinking);
  const result = await setAgentModel(services, ent.key, spec, gov);
  const recipient = recipientOf(resolved.view ?? undefined, ent.space ?? "space", ent.key);
  const label = recipientLabel(recipient);
  if (json) process.stdout.write(JSON.stringify({ target: handle, recipient, requested: modelArg, ...result }) + "\n");
  else if (result.unchanged) process.stdout.write(`${label}: already ${modelArg} (no-op)\n`);
  else process.stdout.write(`${label}: ${result.old ?? "(unknown)"} -> ${result.now} (accepted)\n`);
}

/** Retarget an agent's model. Throws with the agent's own reason when it refuses —
 *  the daemon does not return until the agent has confirmed the change. */
async function setAgentModel(services: Pick<Services, "orchDir" | "settings" | "logger">, agentKey: string, modelArg: string, gov: WriteGovernance = {}): Promise<{ old: string | null; now: string; unchanged: boolean }> {
  const { status: old } = await readRpc(services, "agent-status", { target: agentKey });
  // A presence record stores the model structurally; render it in the same provider/id:thinking
  // form the caller passes, so the reported previous value and the no-op comparison both work.
  const previous = old?.modelId ? modelSpec(`${old.modelProvider ?? ""}/${old.modelId}`, old.thinking) : null;
  await writeRpc(services, "set-model", { target: agentKey, model: modelArg }, gov);
  return { old: previous, now: modelArg, unchanged: previous === modelArg };
}

/** Deliver a prompt through orchd's canonical dispatch path. */
export async function dispatchToAgent(services: Pick<Services, "orchDir" | "settings" | "logger">, logger: Services["logger"], key: string, text: string, options: DispatchToAgentOptions = {}): Promise<{ accepted: true; id: string; ack: "acknowledged" | "unavailable" }> {
  const delivered = await writeRpc(
    services,
    "dispatch",
    { target: key, text: workerPrompt(text, options.raw ?? false, options.adapter, options.context ?? {}) },
    options.gov,
  );
  // The CLI end of the correlation chain. The id is minted by
  // the daemon, so this is the first moment the CLI can name the dispatch it just
  // made — without this record half the system writes nothing anywhere, ever.
  const log = logger.forCorrelation(delivered.id);
  (isAgentId(key) ? log.forAgent(key) : log).info("dispatch.cli-accepted", { target: key });
  return { accepted: true, id: delivered.id, ack: delivered.ack };
}

/** Forward the whole command to the host that owns the target, and say whether it went. */
function forwardedToTargetHost(hosts: OrchSettings["hosts"], args: string[], target: string | undefined): boolean {
  const remote = target ? targetHost(hosts, target) : null;
  if (!remote || !target) return false;
  const remoteArgs = [...args];
  const index = remoteArgs.indexOf(target);
  if (index >= 0) remoteArgs[index] = remote.target;
  remoteWrite(hosts, remote.host, "dispatch", remoteArgs);
  return true;
}

/**
 * Record the row for an agent this dispatch just adopted. A spawned agent already
 * has one; an adopted agent needs it under the SAME key we dispatched to, carrying
 * the dispatcher's owner token or it stays open to every other orchestrator.
 */
async function recordAdoptedAgent(services: Services, self: CallerSelf, key: string, dispatchSettings: DispatchSettings, tuning: { model: string; thinking: ThinkingLevel }): Promise<void> {
  await callDaemon(services, "register-agent", {
    key,
    harnessId: dispatchSettings.adapter,
    // An entity that names no plexer is in no plexer, and that is the answer —
    // never a sentinel id standing in for a missing one (Rule 11, and the
    // `backendId` contract in SpawnRegistration). Absent here means no row in
    // `agent_plexers`.
    ...(dispatchSettings.ent.backend === null ? {} : { backendId: dispatchSettings.ent.backend }),
    // orch did not place this agent, so it claims no place for it. Whatever
    // address the environment already had is carried below as the handle.
    placed: false,
    ...(dispatchSettings.ent.paneId === null ? {} : { handle: dispatchSettings.ent.paneId }),
    ...(dispatchSettings.ent.space === null ? {} : { space: dispatchSettings.ent.space }),
    cwd: process.cwd(),
    name: dispatchSettings.ent.name ?? key,
    // The pair this dispatch just pinned, as resolved — never the raw flag, which
    // may still carry its `:effort` suffix.
    model: tuning.model,
    thinking: tuning.thinking,
    spawner: spawnerIdentityOf(self).key,
    owner: self.id ?? undefined,
    process: adoptedProcess(dispatchSettings.ent),
  });
}

/** The process an adopted agent runs in, as the environment it already sits in
 *  states it. An agent whose environment can address nothing has no process orch
 *  can watch, and adopting it would register a row that reads as dead at once. */
function adoptedProcess(ent: Entity): RecordedProcess {
  const backend = ent.backend === null ? undefined : getBackend(ent.backend);
  if (backend === undefined || ent.paneId === null) die(`cannot adopt ${ent.key}: it sits in no pane orch can read, so orch cannot watch it. Spawn it with orch instead.`);
  return backend.process.running(ent.paneId);
}

export async function cmdDispatch(services: Services, args: string[]) {
  const self = await whoAmI(services);
  const invocation = parseCommand("dispatch", args);
  const gov = governanceFlags(invocation.flags);
  const flags = dispatchFlags(invocation);
  const settings = services.settings.current();
  if (forwardedToTargetHost(settings.hosts, args, flags.positional[0])) return;
  const dispatchSettings = await resolveDispatchSettings(services, self, flags, settings, gov);
  // Address the daemon by the one canonical identity, never the handle: a second
  // registry row keyed by handle forks the agent and makes every later control
  // target ambiguous (dispatch/steer/reset all fail post-first-run).
  const key = dispatchSettings.ent.key;
  // New work lands on a clean session unless the caller asked to keep the old one.
  // The model is pinned AFTER the clear, because a clear drops it. The pin is the
  // one the agent already holds unless this dispatch names another: a clear
  // resets the session, never the tuning the orchestrator chose.
  const adapter = resolveAdapterOrDie(dispatchSettings.adapter);
  const tuning = resolveTuningOrDie(flags, settings, adapter.id, dispatchSettings.view?.tuning ?? NO_TUNING);
  const { thinking } = tuning;
  const model = admitLaunchModel(settings, adapter.id, services.models, tuning.model);
  if (!dispatchSettings.keepContext) await clearSession(services, key, gov.steal === true);
  const pinWarnings = await pinModels(services, services.logger, [{ key, handle: dispatchSettings.handle, name: dispatchSettings.ent.name ?? dispatchSettings.handle, model, thinking }]);
  if (pinWarnings.length > 0) process.exitCode = 1;
  const headerContext = workerHeaderContextOf(self, settings);
  const agentAdapter = getAdapter(dispatchSettings.view?.harnessId ?? dispatchSettings.ent.agent ?? "");
  const result = await dispatchToAgent(services, services.logger, key, dispatchSettings.prompt, { raw: dispatchSettings.raw, adapter: agentAdapter, context: headerContext, gov });
  if (dispatchSettings.view === null) await recordAdoptedAgent(services, self, key, dispatchSettings, { model, thinking });
  // The id names this dispatch in `orch status` (.dispatchId): matching the two
  // proves the agent runs the prompt this command sent, not some other delivery.
  const recipient = recipientOf(dispatchSettings.view ?? undefined, dispatchSettings.ent.space ?? "space", key);
  reportControlDelivery(recipient, "dispatched", key, result, dispatchSettings.json, "", settings.timeouts.dispatch_ack_ms);
}

/** The dispatch spec's flags as the resolvers read them. Exported for tests. */
export function dispatchFlags({ flags, positional }: Invocation): DispatchFlags {
  const read: DispatchFlags = {
    ...agentFlags(flags),
    raw: flags.has("--raw"),
    json: flags.has("--json"),
    withPaths: flags.values("--with"),
    keepContext: flags.has("--keep-context"),
    positional,
  };
  const promptFile = flags.value("--file");
  if (promptFile !== undefined) read.promptFile = promptFile;
  return read;
}

/** The prompt body a control verb sends: typed after the target, or read from `--file`. */
export function promptBody(flags: Pick<DispatchFlags, "promptFile" | "positional">): string {
  const typed = flags.positional.slice(1).join(" ");
  if (flags.promptFile === undefined) return typed;
  if (typed) die("Give the prompt as arguments or as --file, not both.");
  return readPromptFile(flags.promptFile);
}

async function resolveDispatchSettings(services: Services, self: CallerSelf, flags: DispatchFlags, settings: OrchSettings, gov: WriteGovernance = {}): Promise<DispatchSettings> {
  const target = flags.positional[0];
  const prompt = promptBody(flags);
  if (!target || !prompt) die('usage: orch dispatch <target> "<prompt>" | --file <path>|- [--with <path>]... [--keep-context] [--raw] [--model provider/id:think] [--thinking <level>] [--agent adapter]');
  const resolved = await resolveOwnedTarget(services, self, target, { crossSpace: gov.crossSpace, override: gov.steal, overrideFlag: "--steal" });
  const ent = resolved.entity;
  const handle = ent.paneId ?? ent.key;
  return { adapter: pickAdapter(flags, settings), model: requestedModel(flags), raw: flags.raw, json: flags.json, ent, view: resolved.view, handle, prompt: taskWithReferences(prompt, flags.withPaths.map(contextReference)), keepContext: flags.keepContext };
}

