import { formatTimestamp } from "../format.ts";
import { callerId } from "./self.ts";
import { promptMultiselect } from "../setup/io.ts";
import { parseCommand } from "./registry.ts";
import { readRpc, writeRpc } from "./daemon.ts";
import { usageError } from "../cli/usage.ts";
import type { Invocation } from "../cli/spec.ts";
import type { ReapCandidate } from "../types/command.ts";
import type { Services } from "../types/services.ts";
import type { ResultOf } from "../daemon/client/protocol.ts";

/** The one target a lease verb names. */
function oneTarget(invocation: Invocation): string {
  const target = invocation.positional[0];
  if (target === undefined || invocation.positional.length !== 1) throw usageError(invocation);
  return target;
}

export async function cmdDetach(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("detach", args);
  const target = oneTarget(invocation);
  const { flags } = invocation;
  const json = flags.has("--json");
  const actor = await callerId(services);
  const result = await writeRpc(services, "detach", { target, actor }, { steal: flags.has("--steal") });
  if (json) process.stdout.write(JSON.stringify({ target: result.id, name: result.name, released: result.released }) + "\n");
  else process.stdout.write(result.released ? `Detached ${result.name}.\n` : `${result.name}: no lease (already detached).\n`);
}

/** Bare `orch adopt`: the orphans the caller may name, and nothing taken. */
function printOrphans(agents: ResultOf<"orphans">["agents"], json: boolean): void {
  if (json) process.stdout.write(JSON.stringify({ orphans: agents.map((agent) => ({ target: agent.id, name: agent.name })) }) + "\n");
  else if (!agents.length) process.stdout.write("No orphan agents.\n");
  else process.stdout.write(`Orphan agents, held by no live agent:\n${agents.map((agent) => `  ${agent.name} (${agent.id})\n`).join("")}Adopt them by name: orch adopt <name>...\n`);
}

export async function cmdAdopt(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("adopt", args);
  const { flags, positional } = invocation;
  const json = flags.has("--json");
  const all = flags.has("--all");
  const steal = flags.has("--steal");
  if (all && positional.length) throw usageError(invocation);
  // C4: --steal takes ONE agent from ONE live orch, deliberately. A sweep that
  // silently took every live orch's fleet would be the opposite of deliberate.
  if (steal && (all || positional.length > 1)) throw new Error("orch adopt --steal takes one named agent from a live orch.");
  if (!all && !positional.length) return printOrphans((await readRpc(services, "orphans", {})).agents, json);
  const actor = await callerId(services);
  const { results } = await writeRpc(services, "adopt", all ? { all: true, actor } : { targets: [...positional], actor }, { steal });
  const adopted = results.filter((result) => result.adopted);
  if (json) process.stdout.write(JSON.stringify({ adopted: adopted.map((result) => ({ target: result.id, name: result.name })) }) + "\n");
  else if (!adopted.length) process.stdout.write("No orphan agents to adopt.\n");
  else for (const result of adopted) process.stdout.write(`Adopted ${result.name}.\n`);
}

function reapHint(candidate: ReapCandidate): string {
  const ownership = candidate.ownership.kind === "leased"
    ? `leased by ${candidate.ownership.holder}`
    : candidate.ownership.reason === "holder-gone" ? "holder gone" : "unleased";
  const process = candidate.processLive ? "process live" : "process gone";
  const created = formatTimestamp(candidate.createdAt, "minute");
  return `${ownership} - ${process} - ${created}`;
}

function printReaped(reaped: ResultOf<"reap">["reaped"]): void {
  if (!reaped.length) process.stdout.write("Nothing reaped.\n");
  else for (const result of reaped) process.stdout.write(`Reaped ${result.name}.\n`);
}

async function reapInteractive(services: Services, actor: string): Promise<void> {
  const { candidates } = await writeRpc(services, "reap-candidates", { actor });
  const selected = await promptMultiselect("Select agents to reap", candidates.map((candidate) => ({
    value: candidate.id,
    label: `${candidate.name} (${candidate.harnessId})`,
    hint: reapHint(candidate),
    checked: candidate.classification === "dead",
  })));
  if (selected === null) return;
  const reaped: ResultOf<"reap">["reaped"] = [];
  for (const target of selected) reaped.push(...(await writeRpc(services, "reap", { target, actor })).reaped);
  printReaped(reaped);
}

export async function cmdReap(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("reap", args);
  const { flags, positional } = invocation;
  const json = flags.has("--json");
  if (flags.has("--dead")) {
    if (positional.length) throw usageError(invocation);
    const actor = await callerId(services);
    const { reaped } = await writeRpc(services, "reap", { dead: true, actor });
    if (json) process.stdout.write(JSON.stringify(reaped.map((result) => ({ target: result.id, name: result.name }))) + "\n");
    else printReaped(reaped);
    return;
  }

  if (positional.length === 0) {
    if (process.stdin.isTTY !== true) throw usageError(invocation);
    await reapInteractive(services, await callerId(services));
    return;
  }

  const target = oneTarget(invocation);
  const { reaped } = await writeRpc(services, "reap", { target });
  const result = reaped[0]!;
  if (json) process.stdout.write(JSON.stringify({ target: result.id, name: result.name, reaped: true }) + "\n");
  else process.stdout.write(`Reaped ${result.name}.\n`);
}
