import * as files from "node:fs";
import * as path from "node:path";
import { collapse, resolvePane, resolveTarget, type Entity } from "../entities.ts";
import { STATUS_FILE } from "../presence/schema.ts";
import { orchDir, presenceAgentDir, readPresenceStatus, recordSpawned, spawnedRecords, type PresenceEntry } from "../presence/store.ts";
import { isRecord, truncate } from "../util.ts";
import { loadConfig, type OrchConfig } from "../config.ts";
import { resolveAdapter } from "../adapters/registry.ts";
import { parseGovernance, writeRpc, type WriteGovernance } from "./daemon.ts";
import { assertAgentOwned, die, livePanePresenceEntries, parseTargetPrompt, remoteWrite, requirePresenceTarget, resultText, targetHost, ownsAgent } from "./target.ts";
import { entityAdapter } from "./status.ts";
import { resolveAgentSettings, workerPrompt, type AgentFlags, type AgentSettings } from "./spawn.ts";

type DispatchFlags = AgentFlags & {
  raw: boolean;
  json: boolean;
  doWait: boolean;
  thenTarget: string | null;
  thenNote: string;
  positional: string[];
};

type DispatchSettings = AgentSettings & {
  raw: boolean;
  json: boolean;
  doWait: boolean;
  thenNote: string;
  ent: Entity;
  pane: string;
  prompt: string;
  destination: Entity | null;
};


export async function cmdSteer(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const { gov, rest: cleanArgs } = parseGovernance(args.filter((arg) => arg !== "--json"));
  const target = cleanArgs[0];
  const text = cleanArgs.slice(1).join(" ");
  if (!target || !text) die('usage: orch steer <target> <text...> [--steal] [--cross-workspace] [--json]');
  const remote = targetHost(target);
  if (remote) {
    remoteWrite(remote.host, "steer", [remote.target, text, ...(json ? ["--json"] : [])]);
    return;
  }
  const entity = resolveTarget(target, { crossWorkspace: gov.crossWorkspace });
  if (!entity.paneId) {
    if (!entity.presence) die(`Target "${target}" has no agent presence.`);
    // The daemon's control dispatcher applies the effect; the CLI never steers directly.
    const key = entity.presence.key;
    const result = await writeRpc("steer", { target: key, text }, gov);
    if (json) process.stdout.write(JSON.stringify({ target: key, steered: true, ...(isRecord(result) ? result : {}) }) + "\n");
    else process.stdout.write(`Steered ${key} → ${truncate(collapse(text), 60)}\n`);
    return;
  }
  const pane = entity.paneId;
  const result = await writeRpc("steer", { target: pane, text }, gov);
  if (json) process.stdout.write(JSON.stringify({ target: pane, steered: true, ...(isRecord(result) ? result : {}) }) + "\n");
  else process.stdout.write(`Steered ${pane} → ${truncate(collapse(text), 60)}\n`);
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
  await Promise.all([...destinations.values()].map((pres) => writeRpc("steer", { target: pres.key, text })));
  if (json) process.stdout.write(JSON.stringify({ count: destinations.size, broadcast: true }) + "\n");
  else process.stdout.write(`Broadcast to ${destinations.size} agent(s).\n`);
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
  else process.stdout.write(`Piped ${source.presence!.key} → ${destination.presence!.key}.\n`);
}

export async function cmdAnswer(args: string[]): Promise<void> {
  const force = args.includes("--force");
  const json = args.includes("--json");
  const { gov, rest } = parseGovernance(args.filter((arg) => arg !== "--json"));
  const { target, prompt: text } = parseTargetPrompt(rest, "--force", 'usage: orch answer <target> "<text>" [--force] [--steal] [--cross-workspace] [--json]');
  const remote = targetHost(target);
  if (remote) {
    remoteWrite(remote.host, "answer", [remote.target, text, ...(force ? ["--force"] : []), ...(gov.steal ? ["--steal"] : []), ...(gov.crossWorkspace ? ["--cross-workspace"] : []), ...(json ? ["--json"] : [])]);
    return;
  }
  const ent = resolveTarget(target, { crossWorkspace: gov.crossWorkspace });
  const questionPath = ent.presence ? path.join(ent.presence.dir, "question.json") : null;
  if (!force && (!questionPath || !files.existsSync(questionPath)))
    die(`Target "${target}" requires a pending question. Use --force to answer anyway.`);
  if (!ent.presence) die(`Target "${target}" has no agent dir.`);
  // The daemon's control dispatcher applies the answer (wall + ownership + caps.ask gate);
  // the CLI never invokes the adapter's answer strategy directly.
  const result = await writeRpc("answer", { target: ent.presence.key, text }, gov);
  if (json) process.stdout.write(JSON.stringify({ target: ent.presence.key, answered: true, ...(isRecord(result) ? result : {}) }) + "\n");
  else process.stdout.write(`Answered ${ent.presence.key}.\n`);
}

export async function cmdModel(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const { gov, rest } = parseGovernance(args.filter((arg) => arg !== "--no-wait" && arg !== "--json"));
  const target = rest[0];
  const modelArg = rest[1];
  if (!target || !modelArg) die("usage: orch model <target> <provider/model[:thinking]> [--steal] [--cross-workspace] [--no-wait]");
  const { pane } = resolvePane(target, { crossWorkspace: gov.crossWorkspace });
  const result = await setAgentModel(pane, modelArg, gov);
  if (json) process.stdout.write(JSON.stringify({ target: pane, requested: modelArg, ...result }) + "\n");
  else if (result.unchanged) process.stdout.write(`${pane}: already ${modelArg} (no-op)\n`);
  else process.stdout.write(`${pane}: ${result.old ?? "(unknown)"} → ${result.now} (accepted)\n`);
}

async function setAgentModel(agentKey: string, modelArg: string, gov: WriteGovernance = {}): Promise<{ old: string | null; now: string; confirmed: true; unchanged: boolean }> {
  const old = readPresenceStatus(path.join(presenceAgentDir(agentKey), STATUS_FILE));
  // A presence record stores the model structurally; render it in the same provider/id:thinking
  // form the caller passes, so the reported previous value and the no-op comparison both work.
  const previous = old?.model?.id
    ? `${old.model.provider ?? ""}/${old.model.id}${old.thinking ? `:${old.thinking}` : ""}`
    : null;
  await writeRpc("set-model", { target: agentKey, model: modelArg }, gov);
  return { old: previous, now: modelArg, confirmed: true, unchanged: previous === modelArg };
}

export async function cmdDispatch(args: string[]) {
  const { gov, rest } = parseGovernance(args);
  const flags = parseDispatchFlags(rest);
  if (flags.doWait || flags.thenTarget) die('usage: orch dispatch <target> "<prompt>" [--raw] [--model provider/id:think] [--agent adapter] [--steal] [--cross-workspace]');
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
  if (settings.model) await setAgentModel(settings.pane, settings.model, gov);
  const result = await writeRpc("dispatch", { target: settings.pane, text: workerPrompt(settings.prompt, settings.raw, entityAdapter(settings.ent), config.locked_commands) }, gov);
  recordSpawned(settings.pane, { adapter: settings.adapter, model: settings.model ?? undefined });
  if (settings.json) process.stdout.write(JSON.stringify({ target: settings.pane, dispatched: true, ...(isRecord(result) ? result : {}) }) + "\n");
  else process.stdout.write(`Dispatched to ${settings.pane}.\n`);
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
  const { ent, pane } = resolvePane(target, { crossWorkspace: gov.crossWorkspace });
  const settings = resolveAgentSettings(flags, config);
  resolveAdapter(settings.adapter);
  const destination = flags.thenTarget ? requirePresenceTarget(flags.thenTarget) : null;
  if (flags.thenTarget && !ent.presence) die(`Target "${target}" has no agent dir for --then.`);
  return { ...settings, raw: flags.raw, json: flags.json, doWait: flags.doWait, thenNote: flags.thenNote, ent, pane, prompt, destination };
}

