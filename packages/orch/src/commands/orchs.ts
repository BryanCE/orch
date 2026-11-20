// Leading orchs reaching each other: `orch orchs` lists them, `orch message` talks to one.
import { basename, resolve } from "node:path";
import { callerCredential } from "../identity/credential.ts";
import { renderTable } from "../table.ts";
import { parseTextCommand } from "./control.ts";
import { readRpc, writeRpc } from "./daemon.ts";
import { writeDelivery } from "./delivery.ts";
import { parseCommand } from "./registry.ts";
import { callerId } from "./self.ts";
import { die } from "./target.ts";
import { usageError } from "../cli/usage.ts";
import type { Invocation } from "../cli/spec.ts";
import type { PeerOrch } from "../daemon/client/protocol.ts";
import type { Services } from "../types/services.ts";

const COLUMNS = ["NAME", "HARNESS", "SPACE", "HOST", "PROJECT"];
const NO_ORCHS = "No other leading orch is live.";

function readOrchs(services: Services): Promise<PeerOrch[]> {
  return readRpc(services, "orchs", { caller: callerCredential() }).then((answer) => answer.orchs);
}

function orchRow(orch: PeerOrch): string[] {
  return [orch.label === null ? orch.name : `${orch.name} (${orch.label})`, orch.harness, orch.space ?? "-", orch.host, orch.project];
}

export async function cmdOrchs(services: Services, args: string[]): Promise<void> {
  const json = parseCommand("orchs", args).flags.has("--json");
  const orchs = await readOrchs(services);
  if (json) process.stdout.write(`${JSON.stringify({ orchs })}\n`);
  else if (orchs.length === 0) process.stdout.write(`${NO_ORCHS}\n`);
  else process.stdout.write(`${renderTable(COLUMNS, orchs.map(orchRow), [])}\n`);
}

function namesOrch(orch: PeerOrch, target: string): boolean {
  return orch.id === target || orch.name === target || orch.label === target;
}

function worksIn(orch: PeerOrch, target: string): boolean {
  const path = resolve(target);
  return [orch.project, orch.cwd].some((place) => place === target || place === path || basename(place) === target);
}

/** The orchs a target names: by id, name or label first, else by the project or directory it works in. */
export function matchOrchs(orchs: readonly PeerOrch[], target: string): PeerOrch[] {
  const named = orchs.filter((orch) => namesOrch(orch, target));
  return named.length > 0 ? named : orchs.filter((orch) => worksIn(orch, target));
}

function candidateLines(orchs: readonly PeerOrch[]): string {
  return orchs.map((orch) => `  ${orch.name} in ${orch.project}`).join("\n");
}

function onlyOrch(orchs: readonly PeerOrch[], target: string): PeerOrch {
  const matches = matchOrchs(orchs, target);
  const [match] = matches;
  if (matches.length === 1 && match !== undefined) return match;
  if (matches.length > 1) die(`${target} names several leading orchs. Name one:\n${candidateLines(matches)}`);
  if (orchs.length === 0) die(NO_ORCHS);
  die(`No leading orch matches ${target}. Live orchs:\n${candidateLines(orchs)}`);
}

async function readMessage(services: Services, invocation: Invocation): Promise<void> {
  const [code] = invocation.positional;
  if (code === undefined || invocation.positional.length > 1) throw usageError(invocation);
  const mail = await readRpc(services, "mail-text", { caller: callerCredential(), code });
  process.stdout.write(invocation.flags.has("--json") ? `${JSON.stringify(mail)}\n` : `${mail.text}\n`);
}

export async function cmdMessage(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("message", args);
  if (invocation.command.name === "read") return readMessage(services, invocation);
  const { json, target, text } = parseTextCommand("message", args);
  const from = await callerId(services);
  const orch = onlyOrch(await readOrchs(services), target);
  const sent = await writeRpc(services, "message", { from, target: orch.id, text });
  writeDelivery({ target: orch.id, name: orch.name, action: "message", id: sent.id, ack: sent.ack }, { json });
}
