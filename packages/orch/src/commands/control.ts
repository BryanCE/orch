import { ARROW, collapse, errorMessage, isRecord, truncate } from "../util.ts";
import { writeDelivery, type Delivery } from "./delivery.ts";
import { displayName, resolveEntity, resolveLifecycle, resolveOwnedTarget, targetName, type ResolvedTarget } from "./resolve.ts";
import { renameAgent, renamedLine } from "./lifecycle/rename.ts";
import type { ChromeOutcome } from "../daemon/client/protocol.ts";
import { modelSpec } from "../policy/thinking.ts";
import { workerHeaderContextOf } from "../policy/spawner.ts";
import { callDaemon, governanceFlags, readRpc, writeRpc } from "./daemon.ts";
import { parseCommand } from "./registry.ts";
import type { Invocation } from "../cli/spec.ts";
import { usageError } from "../cli/usage.ts";
import { die } from "./target.ts";
import { humanResult } from "./results.ts";
import { readAgentThroughOrchd } from "./agent-read.ts";
import { readFleet, type FleetSnapshot } from "./fleet.ts";
import { registeredId, whoAmI, refuseNonOperatorOverride, type CallerSelf } from "./self.ts";
import { callerCredential } from "../identity/credential.ts";
import { adapterIdOrDie, agentAdapter, agentFlags } from "./selection.ts";
import { taskWithReferences } from "../worker-prompt.ts";
import { clearSession } from "./lifecycle/reset.ts";
import { admitModel, pinModels, refuseModelChange } from "./spawn/models.ts";
import { contextReference, readPromptFile } from "./prompt-file.ts";
import type { Services } from "../types/services.ts";
import type { AdapterId } from "../types/adapter.ts";
import type { ThinkingLevel } from "../types/policy.ts";
import type { AgentFlags, DispatchToAgentOptions, WriteGovernance } from "../types/command.ts";
import type { Entity } from "../types/core.ts";
import type { AgentView } from "../types/store.ts";
import { NO_TUNING, type Tuning } from "../policy/tuning.ts";
import { requestedModel, resolveTuningOrDie } from "../shared/tuning.ts";

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
  rename?: string;
};

type BroadcastOutcome =
  | { readonly kind: "delivered"; readonly key: string; readonly result: Pick<Delivery, "id" | "ack"> }
  | { readonly kind: "refused"; readonly key: string; readonly reason: string };

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

/** A verb that sends one text to one target: steer and answer. */
interface TextCommand {
  readonly json: boolean;
  readonly gov: WriteGovernance;
  readonly target: string;
  readonly text: string;
}

function parseTextCommand(verb: "steer" | "answer", args: string[]): TextCommand {
  const invocation = parseCommand(verb, args);
  const { flags, positional } = invocation;
  const target = positional[0];
  const text = positional.slice(1).join(" ");
  if (!target || !text) throw usageError(invocation);
  return { json: flags.has("--json"), gov: governanceFlags(flags), target, text };
}

/** A target a drive verb may take from a live holder with --steal. */
function resolveDriveTarget(services: Services, self: CallerSelf, target: string, gov: WriteGovernance): Promise<ResolvedTarget> {
  return resolveOwnedTarget(services, self, target, { crossSpace: gov.crossSpace, override: gov.steal });
}

export async function cmdSteer(services: Services, args: string[]): Promise<void> {
  const self = await whoAmI(services);
  const command = parseTextCommand("steer", args);
  const { json, gov, target, text } = command;
  const resolved = await resolveDriveTarget(services, self, target, gov);
  const result = await writeRpc(services, "steer", { target: resolved.entity.key, text }, gov);
  reportDelivery(services, result, { target: resolved.entity.key, name: targetName(resolved), action: "steer" }, { json, suffix: ` ${ARROW} ${truncate(collapse(text), 60)}` });
}

export function pipedText(sourceName: string, instruction: string, result: string): string {
  return `[piped from ${sourceName}] ${instruction ? instruction + "\n" : ""}${result}`;
}

function deliveryResult(result: unknown, identity: Pick<Delivery, "target" | "name" | "action">): Delivery {
  if (!isRecord(result) || typeof result.id !== "string" || (result.ack !== "acknowledged" && result.ack !== "unavailable")) {
    die("Daemon response missing delivery acknowledgement.");
  }
  return { ...identity, id: result.id, ack: result.ack };
}

function reportDelivery(services: Pick<Services, "settings">, result: unknown, identity: Pick<Delivery, "target" | "name" | "action">, options: { json: boolean; suffix?: string }): void {
  writeDelivery(deliveryResult(result, identity), { ...options, ackMs: services.settings.current().timeouts.dispatch_ack_ms });
}

export async function cmdBroadcast(services: Services, args: string[]) {
  const self = await whoAmI(services);
  const invocation = parseCommand("broadcast", args);
  const { flags, positional } = invocation;
  let all = flags.has("--all");
  const json = flags.has("--json");
  const steal = flags.has("--steal");
  const text = positional[0];
  const targets = positional.slice(1);
  if (!text) throw usageError(invocation);
  const explicitAll = all;
  if (!targets.length) all = true;
  const destinations = new Set<string>();
  const resolvedByKey = new Map<string, ResolvedTarget>();
  let fleet: FleetSnapshot | undefined;
  if (all) {
    registeredId(self);
    if (explicitAll) refuseNonOperatorOverride(self, "--all");
    fleet = await readFleet(services, true);
    // orchd answers which held agents are live.
    const { keys } = await readRpc(services, "owned-agents", { caller: callerCredential(), live: true });
    for (const key of keys) destinations.add(key);
  }
  for (const target of targets) {
    const resolved = await resolveOwnedTarget(services, self, target, { override: steal });
    resolvedByKey.set(resolved.entity.key, resolved);
    destinations.add(resolved.entity.key);
  }
  if (!destinations.size) die("No live agent dirs to broadcast to.");
  const outcomes = await steerEach(services, [...destinations], text);
  const nameOf = (key: string): string => {
    const resolved = resolvedByKey.get(key);
    const view = resolved?.view ?? fleet?.views.find((entry) => entry.id === key);
    return displayName(view?.name ?? resolved?.entity.name, key);
  };
  reportBroadcast(services, outcomes, nameOf, json);
}

/** Per target, never Promise.all + die: one agent refusing (one awaiting an
 *  answer refuses a steer) must not hide which of its siblings did receive the text. */
function steerEach(services: Services, destinations: readonly string[], text: string): Promise<BroadcastOutcome[]> {
  return Promise.all(destinations.map(async (key): Promise<BroadcastOutcome> => {
    try {
      const result = await callDaemon(services, "steer", { target: key, text });
      return { kind: "delivered", key, result };
    } catch (error: unknown) {
      return { kind: "refused", key, reason: errorMessage(error) };
    }
  }));
}

function reportBroadcast(services: Services, outcomes: readonly BroadcastOutcome[], nameOf: (key: string) => string, json: boolean): void {
  const refusals: { name: string; reason: string }[] = [];
  for (const outcome of outcomes) {
    const name = nameOf(outcome.key);
    if (outcome.kind === "delivered") {
      reportDelivery(services, outcome.result, { target: outcome.key, name, action: "broadcast" }, { json });
      continue;
    }
    const log = services.logger.forAgent(outcome.key);
    log.warn("broadcast.refused", { reason: outcome.reason, target: outcome.key });
    refusals.push({ name, reason: outcome.reason });
    if (!json) process.stdout.write(`Refused ${name}: ${outcome.reason}\n`);
  }
  if (json) process.stdout.write(JSON.stringify({ refused: refusals }) + "\n");
  if (outcomes.every((outcome) => outcome.kind === "refused")) process.exitCode = 1;
}

export async function cmdPipe(services: Services, args: string[]) {
  const self = await whoAmI(services);
  const invocation = parseCommand("pipe", args);
  const { flags, positional } = invocation;
  const json = flags.has("--json");
  const src = positional[0];
  const dst = positional[1];
  const instruction = positional.slice(2).join(" ");
  if (!src || !dst) throw usageError(invocation);
  void self;
  const resolvedSource = await resolveEntity(services, src);
  const sourceKey = resolvedSource.entity.key;
  const { reading } = await readAgentThroughOrchd(services, sourceKey, { kind: "result" });
  const resultTextValue = reading.lookup.kind === "found" ? humanResult(reading.lookup.payload) : null;
  if (!resultTextValue) die(`No result text available for "${src}".`);
  const resolvedDestination = await resolveEntity(services, dst);
  const destinationKey = resolvedDestination.entity.key;
  const sourceName = targetName(resolvedSource);
  const text = pipedText(sourceName, instruction, resultTextValue);
  const result = await writeRpc(services, "steer", { target: destinationKey, text });
  reportDelivery(services, result, { target: destinationKey, name: targetName(resolvedDestination), action: "pipe" }, { json, suffix: ` from ${sourceName}` });
}

export async function cmdAnswer(services: Services, args: string[]): Promise<void> {
  const self = await whoAmI(services);
  const command = parseTextCommand("answer", args);
  const { json, gov, target, text } = command;
  const resolved = await resolveDriveTarget(services, self, target, gov);
  // The daemon's control dispatcher applies the answer (wall + ownership + capabilities.ask gate);
  // the CLI never invokes the adapter's answer strategy directly.
  const result = await writeRpc(services, "answer", { target: resolved.entity.key, text }, gov);
  reportDelivery(services, result, { target: resolved.entity.key, name: targetName(resolved), action: "answer" }, { json });
}

export async function cmdModel(services: Services, args: string[]): Promise<void> {
  const self = await whoAmI(services);
  const invocation = parseCommand("model", args);
  const { flags, positional } = invocation;
  const json = flags.has("--json");
  const gov = governanceFlags(flags);
  const target = positional[0];
  const modelArg = positional[1];
  if (!target || !modelArg) throw usageError(invocation);
  const resolved = await resolveDriveTarget(services, self, target, gov);
  const ent = resolved.entity;
  const handle = ent.paneId ?? ent.key;
  const harness = resolved.view?.harnessId;
  if (!harness) die(`Target "${target}" has no recorded harness - cannot determine its model mechanism.`);
  const adapter = adapterIdOrDie(harness);
  const tuning = resolveTuningOrDie({ modelFlag: modelArg }, services.settings.current(), adapter, null);
  // Admitted by orchd before the pin, so a short name is expanded once and the
  // spec this command reports back is the one the agent was actually pinned to.
  const label = targetName(resolved);
  const spec = modelSpec((await admitModel(services, adapter, tuning.model, label)).model, tuning.thinking);
  const result = await setAgentModel(services, ent.key, spec, gov);
  if (json) process.stdout.write(JSON.stringify({ target: handle, name: label, requested: modelArg, ...result }) + "\n");
  else if (result.unchanged) process.stdout.write(`Kept ${label} on ${result.now}; no change.\n`);
  else process.stdout.write(`Changed ${label}'s model: ${result.old ?? "(unknown)"} ${ARROW} ${result.now}.\n`);
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
    { target: key, text, ...(options.raw === true ? {} : { worker: { harness: options.harness ?? null, context: { maySpawn: false, ...options.context } } }) },
    options.gov,
  );
  // The CLI end of the correlation chain. The id is minted by
  // the daemon, so this is the first moment the CLI can name the dispatch it just
  // made — without this record half the system writes nothing anywhere, ever.
  const log = logger.forCorrelation(delivered.id);
  log.forAgent(key).info("dispatch.cli-accepted", { target: key });
  return { accepted: true, id: delivered.id, ack: delivered.ack };
}

/**
 * Record the row for an agent this dispatch just adopted. A spawned agent already
 * has one; an adopted agent needs it under the SAME key we dispatched to, carrying
 * the dispatcher's owner token or it stays open to every other orchestrator. orchd
 * reads the process its pane runs.
 */
async function recordAdoptedAgent(services: Services, self: CallerSelf, key: string, dispatchSettings: DispatchSettings, tuning: { model: string; thinking: ThinkingLevel }): Promise<void> {
  const ent = dispatchSettings.ent;
  // An agent whose environment can address nothing has no process orch can watch, and
  // adopting it would register a row that reads as dead at once.
  if (ent.backend === null || ent.paneId === null) die(`cannot adopt ${displayName(ent.name, ent.key)}: it sits in no pane orch can read, so orch cannot watch it. Spawn it with orch instead.`);
  await callDaemon(services, "adopt-agent", {
    key,
    harnessId: dispatchSettings.adapter,
    backendId: ent.backend,
    handle: ent.paneId,
    ...(ent.space === null ? {} : { space: ent.space }),
    cwd: process.cwd(),
    name: ent.name ?? key,
    // The pair this dispatch just pinned, as resolved — never the raw flag, which
    // may still carry its `:effort` suffix.
    model: tuning.model,
    thinking: tuning.thinking,
    spawner: self.id,
    owner: self.id ?? undefined,
  });
}

/** `dispatch --rename`: the same rename `orch rename` does, before the task is sent. */
async function renameBeforeDispatch(services: Services, dispatchSettings: DispatchSettings, currentName: string, newName: string, gov: WriteGovernance): Promise<void> {
  let outcome: ChromeOutcome | null;
  try {
    const lifecycle = await resolveLifecycle(services, dispatchSettings.ent.key);
    outcome = await renameAgent(services, lifecycle, newName, gov);
  } catch (error: unknown) {
    die(`orch dispatch: ${errorMessage(error)}`);
  }
  if (!outcome) die(`Could not rename ${currentName}.`);
  if (!dispatchSettings.json) process.stdout.write(`${renamedLine(currentName, newName, outcome)}\n`);
}

/** The tuning this dispatch runs on: the one the agent holds unless the dispatch names
 *  another, and whether its harness takes a pin. Refuses before any side effect, so a
 *  refused model leaves no rename behind. */
async function admitDispatchTuning(services: Services, dispatchSettings: DispatchSettings, flags: DispatchFlags, name: string): Promise<{ tuning: Tuning; takesModel: boolean }> {
  const settings = services.settings.current();
  const adapter = dispatchSettings.adapter;
  const tuning = resolveTuningOrDie(flags, settings, adapter, dispatchSettings.view?.tuning ?? NO_TUNING);
  const admitted = await admitModel(services, adapter, tuning.model, name);
  refuseModelChange(adapter, admitted, dispatchSettings.view?.tuning.model, admitted.model);
  return { tuning: { model: admitted.model, thinking: tuning.thinking }, takesModel: admitted.takesModel };
}

/** New work lands on a clean session unless the caller asked to keep the old one.
 *  The model is pinned AFTER the clear, because a clear drops it. */
async function prepareSession(services: Services, dispatchSettings: DispatchSettings, admitted: { tuning: Tuning; takesModel: boolean }, target: { key: string; name: string; steal: boolean }): Promise<Tuning> {
  const { tuning } = admitted;
  if (!dispatchSettings.keepContext) await clearSession(services, target.key, target.steal);
  if (!admitted.takesModel) return tuning;
  const pinWarnings = await pinModels(services, services.logger, [{ key: target.key, handle: dispatchSettings.handle, name: target.name, ...tuning }]);
  if (pinWarnings.length > 0) process.exitCode = 1;
  return tuning;
}

export async function cmdDispatch(services: Services, args: string[]) {
  const self = await whoAmI(services);
  const invocation = parseCommand("dispatch", args);
  const gov = governanceFlags(invocation.flags);
  const flags = dispatchFlags(invocation);
  const dispatchSettings = await resolveDispatchSettings(services, self, invocation, flags, gov);
  const currentName = targetName({ view: dispatchSettings.view, entity: dispatchSettings.ent });
  const effectiveName = flags.rename ?? currentName;
  const admitted = await admitDispatchTuning(services, dispatchSettings, flags, currentName);
  if (flags.rename !== undefined) await renameBeforeDispatch(services, dispatchSettings, currentName, flags.rename, gov);
  // Address the daemon by the one canonical identity, never the handle: a second
  // registry row keyed by handle forks the agent and makes every later control
  // target ambiguous (dispatch/steer/reset all fail post-first-run).
  const key = dispatchSettings.ent.key;
  const { model, thinking } = await prepareSession(services, dispatchSettings, admitted, { key, name: effectiveName, steal: gov.steal === true });
  const headerContext = workerHeaderContextOf(self, services.settings.current(), dispatchSettings.view ?? undefined);
  const result = await dispatchToAgent(services, services.logger, key, dispatchSettings.prompt, { raw: dispatchSettings.raw, harness: dispatchSettings.adapter, context: headerContext, gov });
  if (dispatchSettings.view === null) await recordAdoptedAgent(services, self, key, dispatchSettings, { model, thinking });
  // The id names this dispatch in `orch status` (.dispatchId): matching the two
  // proves the agent runs the prompt this command sent, not some other delivery.
  reportDelivery(services, result, { target: key, name: effectiveName, action: "dispatch" }, { json: dispatchSettings.json });
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
  const rename = flags.value("--rename");
  if (rename !== undefined) read.rename = rename;
  return read;
}

/** The prompt body a control verb sends: typed after the target, or read from `--file`. */
export function promptBody(flags: Pick<DispatchFlags, "promptFile" | "positional">): string {
  const typed = flags.positional.slice(1).join(" ");
  if (flags.promptFile === undefined) return typed;
  if (typed) die("Give the prompt as arguments or as --file, not both.");
  return readPromptFile(flags.promptFile);
}

async function resolveDispatchSettings(services: Services, self: CallerSelf, invocation: Invocation, flags: DispatchFlags, gov: WriteGovernance): Promise<DispatchSettings> {
  const settings = services.settings.current();
  const target = flags.positional[0];
  const prompt = promptBody(flags);
  if (!target || !prompt) throw usageError(invocation);
  const resolved = await resolveDriveTarget(services, self, target, gov);
  const ent = resolved.entity;
  const handle = ent.paneId ?? ent.key;
  return { adapter: agentAdapter(flags, settings, resolved.view?.harnessId ?? ent.agent), model: requestedModel(flags), raw: flags.raw, json: flags.json, ent, view: resolved.view, handle, prompt: taskWithReferences(prompt, flags.withPaths.map(contextReference)), keepContext: flags.keepContext };
}

