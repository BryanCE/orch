import * as files from "node:fs";
import * as path from "node:path";
import { collapse, recipientFor, recipientLabel, resolveTarget, type Entity } from "../entities.ts";
import { QUESTION_FILE, STATUS_FILE } from "../presence/schema.ts";
import { orchDir, presenceAgentDir, readPresenceStatus, recordSpawned, spawnedRecords } from "../presence/store.ts";
import { errorMessage, isRecord, truncate } from "../util.ts";
import { loadConfig } from "../config.ts";
import { spawnerIdentity } from "../policy/spawner.ts";
import { callDaemon, parseGovernance, writeRpc, type WriteGovernance } from "./daemon.ts";
import { assertAgentOwned, callerOwnerToken, die, livePanePresenceEntries, parseTargetPrompt, remoteWrite, requireCallerOwnerToken, requirePresenceTarget, resultText, targetHost, ownsAgent } from "./target.ts";
import { entityAdapter } from "./status.ts";
import { pickAdapter, requestedModel, spawnerIsRepliable, workerPrompt, type AgentFlags } from "./spawn.ts";
import type { WorkerHeaderContext } from "../worker-prompt.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { commandLogger } from "./logging.ts";
import type { AdapterId, AgentAdapter } from "../types/adapter.ts";
import type { PresenceEntry } from "../types/presence.ts";
import type { OrchConfig } from "../types/config.ts";

type DispatchFlags = AgentFlags & {
  raw: boolean;
  json: boolean;
  doWait: boolean;
  thenTarget: string | null;
  thenNote: string;
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
  pane: string;
  prompt: string;
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
  if (!entity.paneId) {
    if (!entity.presence) die(`Target "${target}" has no agent presence.`);
    // The daemon's control dispatcher applies the effect; the CLI never steers directly.
    const key = entity.presence.key;
    const result = await writeRpc("steer", { target: key, text }, gov);
    const recipient = recipientFor(key);
    if (json) process.stdout.write(JSON.stringify({ target: key, recipient, steered: true, ...(isRecord(result) ? result : {}) }) + "\n");
    else process.stdout.write(`Steered ${recipientLabel(recipient)} -> ${truncate(collapse(text), 60)}\n`);
    return;
  }
  const result = await writeRpc("steer", { target: entity.key, text }, gov);
  const recipient = recipientFor(entity.key);
  if (json) process.stdout.write(JSON.stringify({ target: entity.paneId, recipient, steered: true, ...(isRecord(result) ? result : {}) }) + "\n");
  else process.stdout.write(`Steered ${recipientLabel(recipient)} -> ${truncate(collapse(text), 60)}\n`);
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
  if (!destinations.size) die("No live pane agent dirs to broadcast to.");
  // Per target, never Promise.all + die: one agent refusing (a pane awaiting an
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
      process.stderr.write(`  refused ${recipientLabel(recipientFor(refusal.key))}: ${refusal.reason}\n`);
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
  const force = args.includes("--force");
  const json = args.includes("--json");
  const { gov, rest } = parseGovernance(args.filter((arg) => arg !== "--json"));
  const { target, prompt: text } = parseTargetPrompt(rest, "--force", 'usage: orch answer <target> "<text>" [--force] [--steal] [--cross-space] [--json]');
  const remote = targetHost(target);
  if (remote) {
    remoteWrite(remote.host, "answer", [remote.target, text, ...(force ? ["--force"] : []), ...(gov.steal ? ["--steal"] : []), ...(gov.crossSpace ? ["--cross-space"] : []), ...(json ? ["--json"] : [])]);
    return;
  }
  const ent = resolveTarget(target, { crossSpace: gov.crossSpace });
  const questionPath = ent.presence ? path.join(ent.presence.dir, QUESTION_FILE) : null;
  if (!force && (!questionPath || !files.existsSync(questionPath)))
    die(`Target "${target}" requires a pending question. Use --force to answer anyway.`);
  if (!ent.presence) die(`Target "${target}" has no agent dir.`);
  // The daemon's control dispatcher applies the answer (wall + ownership + capabilities.ask gate);
  // the CLI never invokes the adapter's answer strategy directly.
  const result = await writeRpc("answer", { target: ent.presence.key, text }, gov);
  const recipient = recipientFor(ent.presence.key);
  if (json) process.stdout.write(JSON.stringify({ target: ent.presence.key, recipient, answered: true, ...(isRecord(result) ? result : {}) }) + "\n");
  else process.stdout.write(`Answered ${recipientLabel(recipient)}.\n`);
}

export async function cmdModel(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const { gov, rest } = parseGovernance(args.filter((arg) => arg !== "--no-wait" && arg !== "--json"));
  const target = rest[0];
  const modelArg = rest[1];
  if (!target || !modelArg) die("usage: orch model <target> <model[:thinking]> [--steal] [--cross-space] [--no-wait]");
  const ent = resolveTarget(target, { crossSpace: gov.crossSpace });
  assertAgentOwned(target, ent, gov.steal);
  const pane = ent.paneId ?? ent.key;
  const result = await setAgentModel(ent.key, modelArg, gov);
  const recipient = recipientFor(ent.key);
  const label = recipientLabel(recipient);
  if (json) process.stdout.write(JSON.stringify({ target: pane, recipient, requested: modelArg, ...result }) + "\n");
  else if (result.unchanged) process.stdout.write(`${label}: already ${modelArg} (no-op)\n`);
  else process.stdout.write(`${label}: ${result.old ?? "(unknown)"} -> ${result.now} (accepted)\n`);
}

/** Retarget an agent's model. Throws with the agent's own reason when it refuses —
 *  the daemon does not return until the agent has confirmed the change. */
async function setAgentModel(agentKey: string, modelArg: string, gov: WriteGovernance = {}): Promise<{ old: string | null; now: string; unchanged: boolean }> {
  const old = readPresenceStatus(path.join(presenceAgentDir(agentKey), STATUS_FILE));
  // A presence record stores the model structurally; render it in the same provider/id:thinking
  // form the caller passes, so the reported previous value and the no-op comparison both work.
  const previous = old?.model?.id
    ? `${old.model.provider ?? ""}/${old.model.id}${old.thinking ? `:${old.thinking}` : ""}`
    : null;
  await writeRpc("set-model", { target: agentKey, model: modelArg }, gov);
  return { old: previous, now: modelArg, unchanged: previous === modelArg };
}

export interface DispatchToAgentOptions {
  raw?: boolean;
  adapter?: AgentAdapter;
  context?: WorkerHeaderContext;
  gov?: WriteGovernance;
}

/** Deliver a prompt through orchd's canonical dispatch path. */
export async function dispatchToAgent(key: string, text: string, options: DispatchToAgentOptions = {}): Promise<{ dispatchId: string }> {
  const delivered = await writeRpc(
    "dispatch",
    { target: key, text: workerPrompt(text, options.raw ?? false, options.adapter, options.context ?? {}) },
    options.gov,
  );
  if (!isRecord(delivered) || typeof delivered.id !== "string") throw new Error("dispatch response missing dispatch id");
  // The CLI end of the correlation chain (TASKS/13 section 3). The id is minted by
  // the daemon, so this is the first moment the CLI can name the dispatch it just
  // made — without this record half the system writes nothing anywhere, ever.
  const identity = tryParseIdentity(key);
  const log = commandLogger().forCorrelation(delivered.id);
  (identity ? log.forAgent(identity.id) : log).info("dispatch.cli-accepted", { target: key });
  return { dispatchId: delivered.id };
}

export async function cmdDispatch(args: string[]) {
  const { gov, rest } = parseGovernance(args);
  const flags = parseDispatchFlags(rest);
  if (flags.doWait || flags.thenTarget) die('usage: orch dispatch <target> "<prompt>" [--raw] [--model provider/id:think] [--agent adapter] [--steal] [--cross-space]');
  const target = flags.positional[0];
  if (target) {
    const remote = targetHost(target);
    if (remote) {
      const remoteArgs = [...args];
      const index = remoteArgs.indexOf(target);
      if (index >= 0) remoteArgs[index] = remote.target;
      remoteWrite(remote.host, "dispatch", remoteArgs);
      return;
    }
  }
  const config = loadConfig(orchDir());
  const settings = resolveDispatchSettings(flags, config, gov);
  // Address the daemon by the one canonical identity, never the pane id: a
  // second registry row keyed by pane id forks the agent and makes every later
  // control target ambiguous (dispatch/steer/reset all fail post-first-run).
  const key = settings.ent.key;
  if (settings.model) await setAgentModel(key, settings.model, gov);
  const headerContext = { lockedCommands: config.locked_commands, spawnerRepliable: spawnerIsRepliable() };
  const { dispatchId } = await dispatchToAgent(key, settings.prompt, { raw: settings.raw, adapter: entityAdapter(settings.ent), context: headerContext, gov });
  // A spawned agent is already registered under its key; only an unrecorded
  // bare pane needs a row, and it must carry the same key we just dispatched to.
  // Dispatching to a bare pane adopts it: the record carries the dispatcher's
  // owner token, or the adopted pane stays open to every other orchestrator.
  if (!spawnedRecords().has(key)) {
    const spawner = spawnerIdentity();
    recordSpawned(key, { adapter: settings.adapter, model: settings.model ?? undefined, owner: callerOwnerToken(), spawnedBy: spawner.key ?? undefined, spawnedByLabel: spawner.label });
  }
  const recipient = recipientFor(key);
  // The id names this dispatch in `orch status` (.dispatchId): matching the two
  // proves the pane runs the prompt this command sent, not some other delivery.
  const result = { id: dispatchId };
  if (settings.json) process.stdout.write(JSON.stringify({ target: settings.pane, recipient, dispatched: true, ...(isRecord(result) ? result : {}) }) + "\n");
  else process.stdout.write(`Dispatched to ${recipientLabel(recipient)}${dispatchId ? ` (dispatch ${dispatchId})` : ""}.\n`);
}

export function parseDispatchFlags(args: string[]): DispatchFlags {
  const commandArgs = args.filter((argument) => argument !== "--raw" && argument !== "--json");
  const flags: DispatchFlags = { raw: args.includes("--raw"), json: args.includes("--json"), doWait: false, thenTarget: null, thenNote: "", positional: [] };
  for (let i = 0; i < commandArgs.length; i++) {
    const argument = commandArgs[i];
    if (argument === "--model") flags.modelFlag = commandArgs[++i];
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

function resolveDispatchSettings(flags: DispatchFlags, config: OrchConfig, gov: WriteGovernance = {}): DispatchSettings {
  const target = flags.positional[0];
  const prompt = flags.positional.slice(1).join(" ");
  if (!target || !prompt) die('usage: orch dispatch <target> "<prompt>" [--raw] [--model provider/id:think] [--agent adapter] [--wait] [--then <dst> ["note"]]');
  const ent = resolveTarget(target, { crossSpace: gov.crossSpace });
  assertAgentOwned(target, ent, gov.steal);
  const pane = ent.paneId ?? ent.key;
  const destination = flags.thenTarget ? requirePresenceTarget(flags.thenTarget) : null;
  if (flags.thenTarget && !ent.presence) die(`Target "${target}" has no agent dir for --then.`);
  return { adapter: pickAdapter(flags, config), model: requestedModel(flags), raw: flags.raw, json: flags.json, doWait: flags.doWait, thenNote: flags.thenNote, ent, pane, prompt, destination };
}

