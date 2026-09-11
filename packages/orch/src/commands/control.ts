import * as path from "node:path";
import { collapse, recipientFor, recipientLabel, resolveTarget } from "../entities.ts";
import { STATUS_FILE } from "../presence/schema.ts";
import { spawnedRecords } from "../presence/store.ts";
import { orchDir, presenceAgentDir, readPresenceStatus } from "../presence/writer.ts";
import { registerSpawnedAgent } from "../store/spawn-registration.ts";
import { errorMessage, isRecord, truncate } from "../util.ts";
import { loadSettings } from "../settings/read.ts";
import { spawnerIdentity } from "../policy/spawner.ts";
import { modelSpec } from "../policy/thinking.ts";
import { callDaemon, parseGovernance, writeRpc } from "./daemon.ts";
import { assertAgentOwned, callerOwnerToken, die, livePanePresenceEntries, remoteWrite, requireCallerOwnerToken, requirePresenceTarget, resultText, targetHost, ownsAgent } from "./target.ts";
import { entityAdapter } from "./status.ts";
import { pickAdapter, requestedModel } from "./selection.ts";
import { taskWithReferences, workerPrompt } from "../worker-prompt.ts";
import { clearSession } from "./lifecycle/reset.ts";
import { contextReference, readPromptFile } from "./prompt-file.ts";
import { workerHeaderContext } from "../policy/spawner.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { commandLogger } from "./logging.ts";
import type { AdapterId } from "../types/adapter.ts";
import type { PresenceEntry } from "../types/presence.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { AgentFlags, DispatchToAgentOptions, WriteGovernance } from "../types/command.ts";
import type { Entity } from "../types/core.ts";

type DispatchFlags = AgentFlags & {
  raw: boolean;
  json: boolean;
  doWait: boolean;
  thenTarget: string | null;
  thenNote: string;
  /** Path the prompt body is read from, or "-" for stdin. Unset means the positionals are the prompt. */
  promptFile?: string;
  /** Where the agent's context lives; each `--with` adds one. Orch checks each exists and never reads it. */
  withPaths: string[];
  /** Send the work onto the session the agent already has, instead of a clean one. */
  keepContext: boolean;
  positional: string[];
};

interface DispatchSettings {
  adapter: AdapterId;
  /** Set only when this dispatch named a model; null leaves the agent on the one it spawned with. */
  model: string | null;
  raw: boolean;
  json: boolean;
  doWait: boolean;
  thenNote: string;
  ent: Entity;
  /** What the caller called the agent back to itself: its handle, else its key. */
  handle: string;
  prompt: string;
  keepContext: boolean;
  destination: Entity | null;
}

export async function cmdSteer(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const { gov, rest: cleanArgs } = parseGovernance(args.filter((arg) => arg !== "--json"));
  const target = cleanArgs[0];
  const text = cleanArgs.slice(1).join(" ");
  if (!target || !text) die('usage: orch steer <target> <text...> [--steal] [--cross-space] [--json]');
  const remote = targetHost(target);
  if (remote) {
    remoteWrite(remote.host, "steer", [remote.target, text, ...(json ? ["--json"] : [])]);
    return;
  }
  const entity = resolveTarget(target, { crossSpace: gov.crossSpace });
  assertAgentOwned(target, entity, gov.steal);
  const result = await writeRpc("steer", { target: entity.key, text }, gov);
  reportControlDelivery("steered", entity.key, result, json, ` -> ${truncate(collapse(text), 60)}`);
}

function reportControlDelivery(action: "steered" | "answered" | "dispatched", key: string, result: unknown, json: boolean, suffix: string, dispatchAckMs?: number): void {
  if (!isRecord(result) || (result.ack !== "acknowledged" && result.ack !== "unavailable")) die("Daemon response missing delivery acknowledgement.");
  const confirmed = result.ack === "acknowledged";
  const recipient = recipientFor(key);
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

export async function cmdBroadcast(args: string[]) {
  let all = false;
  const json = args.includes("--json");
  const force = args.includes("--force");
  const positional: string[] = [];
  for (const arg of args) {
    if (arg === "--all") all = true;
    else if (arg === "--json" || arg === "--force") continue;
    else positional.push(arg);
  }
  const text = positional[0];
  const targets = positional.slice(1);
  if (!text) die('usage: orch broadcast "<text>" [target ...|--all]');
  if (!targets.length) all = true;
  const destinations = new Map<string, PresenceEntry>();
  if (all) {
    requireCallerOwnerToken();
    for (const pres of livePanePresenceEntries()) {
      const record = spawnedRecords().get(pres.key);
      if (record && ownsAgent(record)) destinations.set(pres.key, pres);
    }
  }
  for (const target of targets) {
    const ent = requirePresenceTarget(target);
    assertAgentOwned(target, ent, force);
    destinations.set(ent.presence!.key, ent.presence!);
  }
  if (!destinations.size) die("No live agent dirs to broadcast to.");
  // Per target, never Promise.all + die: one agent refusing (one awaiting an
  // answer refuses a steer) must not hide which of its siblings did receive the text.
  const refusals: { key: string; reason: string }[] = [];
  await Promise.all([...destinations.values()].map(async (pres) => {
    try {
      await callDaemon("steer", { target: pres.key, text });
    } catch (error: unknown) {
      refusals.push({ key: pres.key, reason: errorMessage(error) });
    }
  }));
  const delivered = destinations.size - refusals.length;
  if (json) process.stdout.write(JSON.stringify({ count: delivered, refused: refusals, broadcast: true }) + "\n");
  else {
    process.stdout.write(`Broadcast to ${delivered} of ${destinations.size} agent(s).\n`);
    for (const refusal of refusals) {
      const identity = tryParseIdentity(refusal.key);
      const log = identity ? commandLogger().forAgent(identity.id) : commandLogger();
      log.warn("broadcast.refused", { reason: refusal.reason, target: refusal.key });
      process.stdout.write(`  refused ${recipientLabel(recipientFor(refusal.key))}: ${refusal.reason}\n`);
    }
  }
  if (delivered === 0) process.exitCode = 1;
}

export async function cmdPipe(args: string[]) {
  const json = args.includes("--json");
  const cleanArgs = args.filter((arg) => arg !== "--json");
  const src = cleanArgs[0];
  const dst = cleanArgs[1];
  const instruction = cleanArgs.slice(2).join(" ");
  if (!src || !dst) die('usage: orch pipe <src> <dst> ["instruction"] [--json]');
  const source = requirePresenceTarget(src);
  const extractInput = { key: source.presence!.key, sessionPath: source.sessionPath ?? undefined };
  const resultTextValue = entityAdapter(source)?.extractResult(extractInput) ?? resultText(source.presence!.result);
  if (!resultTextValue) die(`No result text available for "${src}".`);
  const destination = requirePresenceTarget(dst);
  const text = `[piped from ${source.presence!.key}] ${instruction ? instruction + "\n" : ""}${resultTextValue}`;
  await writeRpc("steer", { target: destination.presence!.key, text });
  if (json) process.stdout.write(JSON.stringify({ source: source.presence!.key, destination: destination.presence!.key, piped: true }) + "\n");
  else process.stdout.write(`Piped ${source.presence!.key} -> ${destination.presence!.key}.\n`);
}

export async function cmdAnswer(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const { gov, rest } = parseGovernance(args.filter((arg) => arg !== "--json"));
  const target = rest[0];
  const text = rest.slice(1).join(" ");
  if (!target || !text) die('usage: orch answer <target> "<text>" [--steal] [--cross-space] [--json]');
  const remote = targetHost(target);
  if (remote) {
    remoteWrite(remote.host, "answer", [remote.target, text, ...(gov.steal ? ["--steal"] : []), ...(gov.crossSpace ? ["--cross-space"] : []), ...(json ? ["--json"] : [])]);
    return;
  }
  const ent = resolveTarget(target, { crossSpace: gov.crossSpace });
  if (!ent.presence) die(`Target "${target}" has no agent dir.`);
  // The daemon's control dispatcher applies the answer (wall + ownership + capabilities.ask gate);
  // the CLI never invokes the adapter's answer strategy directly.
  const result = await writeRpc("answer", { target: ent.presence.key, text }, gov);
  reportControlDelivery("answered", ent.presence.key, result, json, ".");
}

export async function cmdModel(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const { gov, rest } = parseGovernance(args.filter((arg) => arg !== "--no-wait" && arg !== "--json"));
  const target = rest[0];
  const modelArg = rest[1];
  if (!target || !modelArg) die("usage: orch model <target> <model[:thinking]> [--steal] [--cross-space] [--no-wait]");
  const ent = resolveTarget(target, { crossSpace: gov.crossSpace });
  assertAgentOwned(target, ent, gov.steal);
  const handle = ent.paneId ?? ent.key;
  const result = await setAgentModel(ent.key, modelArg, gov);
  const recipient = recipientFor(ent.key);
  const label = recipientLabel(recipient);
  if (json) process.stdout.write(JSON.stringify({ target: handle, recipient, requested: modelArg, ...result }) + "\n");
  else if (result.unchanged) process.stdout.write(`${label}: already ${modelArg} (no-op)\n`);
  else process.stdout.write(`${label}: ${result.old ?? "(unknown)"} -> ${result.now} (accepted)\n`);
}

/** Retarget an agent's model. Throws with the agent's own reason when it refuses —
 *  the daemon does not return until the agent has confirmed the change. */
async function setAgentModel(agentKey: string, modelArg: string, gov: WriteGovernance = {}): Promise<{ old: string | null; now: string; unchanged: boolean }> {
  const old = readPresenceStatus(path.join(presenceAgentDir(agentKey), STATUS_FILE));
  // A presence record stores the model structurally; render it in the same provider/id:thinking
  // form the caller passes, so the reported previous value and the no-op comparison both work.
  const previous = old?.model?.id ? modelSpec(`${old.model.provider ?? ""}/${old.model.id}`, old.thinking) : null;
  await writeRpc("set-model", { target: agentKey, model: modelArg }, gov);
  return { old: previous, now: modelArg, unchanged: previous === modelArg };
}

/** Deliver a prompt through orchd's canonical dispatch path. */
export async function dispatchToAgent(key: string, text: string, options: DispatchToAgentOptions = {}): Promise<{ accepted: true; id: string; ack: "acknowledged" | "unavailable" }> {
  const delivered = await writeRpc(
    "dispatch",
    { target: key, text: workerPrompt(text, options.raw ?? false, options.adapter, options.context ?? {}) },
    options.gov,
  );
  if (!isRecord(delivered) || delivered.accepted !== true || typeof delivered.id !== "string" || (delivered.ack !== "acknowledged" && delivered.ack !== "unavailable")) throw new Error("dispatch response missing acceptance details");
  // The CLI end of the correlation chain. The id is minted by
  // the daemon, so this is the first moment the CLI can name the dispatch it just
  // made — without this record half the system writes nothing anywhere, ever.
  const identity = tryParseIdentity(key);
  const log = commandLogger().forCorrelation(delivered.id);
  (identity ? log.forAgent(identity.id) : log).info("dispatch.cli-accepted", { target: key });
  return { accepted: true, id: delivered.id, ack: delivered.ack };
}

/** Forward the whole command to the host that owns the target, and say whether it went. */
function forwardedToTargetHost(args: string[], target: string | undefined): boolean {
  const remote = target ? targetHost(target) : null;
  if (!remote || !target) return false;
  const remoteArgs = [...args];
  const index = remoteArgs.indexOf(target);
  if (index >= 0) remoteArgs[index] = remote.target;
  remoteWrite(remote.host, "dispatch", remoteArgs);
  return true;
}

/**
 * Record the row for an agent this dispatch just adopted. A spawned agent already
 * has one; an adopted agent needs it under the SAME key we dispatched to, carrying
 * the dispatcher's owner token or it stays open to every other orchestrator.
 */
function recordAdoptedAgent(key: string, dispatchSettings: DispatchSettings): void {
  registerSpawnedAgent(orchDir(), {
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
    model: dispatchSettings.model ?? "",
    spawner: spawnerIdentity().key,
    owner: callerOwnerToken(),
  });
}

export async function cmdDispatch(args: string[]) {
  const { gov, rest } = parseGovernance(args);
  const flags = parseDispatchFlags(rest);
  if (flags.doWait || flags.thenTarget) die('usage: orch dispatch <target> "<prompt>" | --file <path>|- [--with <path>]... [--keep-context] [--raw] [--model provider/id:think] [--agent adapter] [--steal] [--cross-space]');
  if (forwardedToTargetHost(args, flags.positional[0])) return;
  const settings = loadSettings(orchDir());
  const dispatchSettings = resolveDispatchSettings(flags, settings, gov);
  // Address the daemon by the one canonical identity, never the handle: a second
  // registry row keyed by handle forks the agent and makes every later control
  // target ambiguous (dispatch/steer/reset all fail post-first-run).
  const key = dispatchSettings.ent.key;
  // New work lands on a clean session unless the caller asked to keep the old one.
  // The model is pinned AFTER the clear, because a clear drops it.
  if (!dispatchSettings.keepContext) await clearSession(key, gov.steal === true);
  if (dispatchSettings.model) await setAgentModel(key, dispatchSettings.model, gov);
  const headerContext = workerHeaderContext(settings);
  const result = await dispatchToAgent(key, dispatchSettings.prompt, { raw: dispatchSettings.raw, adapter: entityAdapter(dispatchSettings.ent), context: headerContext, gov });
  if (!spawnedRecords().has(key)) recordAdoptedAgent(key, dispatchSettings);
  // The id names this dispatch in `orch status` (.dispatchId): matching the two
  // proves the agent runs the prompt this command sent, not some other delivery.
  reportControlDelivery("dispatched", key, result, dispatchSettings.json, "", settings.timeouts.dispatch_ack_ms);
}

export function parseDispatchFlags(args: string[]): DispatchFlags {
  const commandArgs = args.filter((argument) => argument !== "--raw" && argument !== "--json" && argument !== "--keep-context");
  const flags: DispatchFlags = { raw: args.includes("--raw"), json: args.includes("--json"), doWait: false, thenTarget: null, thenNote: "", withPaths: [], keepContext: args.includes("--keep-context"), positional: [] };
  for (let i = 0; i < commandArgs.length; i++) {
    const argument = commandArgs[i];
    if (argument === "--model") flags.modelFlag = commandArgs[++i];
    else if (argument === "--file") flags.promptFile = commandArgs[++i];
    else if (argument === "--with") flags.withPaths.push(commandArgs[++i]!);
    else if (argument === "--agent" || argument === "--adapter") flags.adapterFlag = commandArgs[++i];
    else if (argument === "--wait") flags.doWait = true;
    else if (argument === "--then") {
      flags.thenTarget = commandArgs[++i] ?? null;
      flags.thenNote = commandArgs.slice(i + 1).join(" ");
      break;
    } else flags.positional.push(argument!);
  }
  return flags;
}

/** The prompt body a control verb sends: typed after the target, or read from `--file`. */
export function promptBody(flags: Pick<DispatchFlags, "promptFile" | "positional">): string {
  const typed = flags.positional.slice(1).join(" ");
  if (flags.promptFile === undefined) return typed;
  if (typed) die("Give the prompt as arguments or as --file, not both.");
  return readPromptFile(flags.promptFile);
}

function resolveDispatchSettings(flags: DispatchFlags, settings: OrchSettings, gov: WriteGovernance = {}): DispatchSettings {
  const target = flags.positional[0];
  const prompt = promptBody(flags);
  if (!target || !prompt) die('usage: orch dispatch <target> "<prompt>" | --file <path>|- [--with <path>]... [--keep-context] [--raw] [--model provider/id:think] [--agent adapter]');
  const ent = resolveTarget(target, { crossSpace: gov.crossSpace });
  assertAgentOwned(target, ent, gov.steal);
  const handle = ent.paneId ?? ent.key;
  const destination = flags.thenTarget ? requirePresenceTarget(flags.thenTarget) : null;
  if (flags.thenTarget && !ent.presence) die(`Target "${target}" has no agent dir for --then.`);
  return { adapter: pickAdapter(flags, settings), model: requestedModel(flags), raw: flags.raw, json: flags.json, doWait: flags.doWait, thenNote: flags.thenNote, ent, handle, prompt: taskWithReferences(prompt, flags.withPaths.map(contextReference)), keepContext: flags.keepContext, destination };
}

