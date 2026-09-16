import { formatTimestamp } from "../format.ts";
import { rpcRegisterSession } from "../daemon/client/reach.ts";
import { launchCredential } from "../identity/launch.ts";
import { promptMultiselect } from "../setup/io.ts";
import { parseCommand } from "./registry.ts";
import { writeRpc } from "./daemon.ts";
import type { ReapCandidate } from "../types/command.ts";
import type { Services } from "../types/services.ts";
import type { OrchDir } from "../types/core.ts";
import type { ResultOf } from "../daemon/client/protocol.ts";

/** Resolve the caller's orch identity in one seam for every lease command. */
async function resolveSelfOrchId(directory: OrchDir, logger: Services["logger"]): Promise<string> {
  return launchCredential() ?? (await rpcRegisterSession(directory, logger)).id;
}

/** The one target a lease verb names. */
function oneTarget(positional: readonly string[], usage: string): string {
  const target = positional[0];
  if (target === undefined || positional.length !== 1) throw new Error(usage);
  return target;
}

export async function cmdDetach(services: Services, args: string[]): Promise<void> {
  const { flags, positional } = parseCommand("detach", args);
  const target = oneTarget(positional, "usage: orch detach <target> [--steal] [--json]");
  const json = flags.has("--json");
  const actor = await resolveSelfOrchId(services.orchDir, services.logger);
  const result = await writeRpc(services, "detach", { target, actor }, { steal: flags.has("--steal") });
  if (json) process.stdout.write(JSON.stringify({ target: result.id, name: result.name, released: result.released }) + "\n");
  else process.stdout.write(result.released ? `Detached ${result.name}.\n` : `${result.name}: no lease (already detached).\n`);
}

export async function cmdAdopt(services: Services, args: string[]): Promise<void> {
  const { flags, positional } = parseCommand("adopt", args);
  const json = flags.has("--json");
  const all = flags.has("--all");
  const steal = flags.has("--steal");
  if ((!all && positional.length !== 1) || (all && positional.length)) throw new Error("usage: orch adopt <target> | --all [--steal] [--json]");
  // C4: --steal takes ONE agent from ONE live orch, deliberately. A sweep that
  // silently took every live orch's fleet would be the opposite of deliberate.
  if (all && steal) throw new Error("orch adopt --all never steals; name the agent to take it from a live orch.");
  const actor = await resolveSelfOrchId(services.orchDir, services.logger);
  const { results } = await writeRpc(services, "adopt", all ? { all: true, actor } : { target: positional[0]!, actor }, { steal });
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
  const { flags, positional } = parseCommand("reap", args);
  const json = flags.has("--json");
  if (flags.has("--dead")) {
    if (positional.length) throw new Error("usage: orch reap <target> | --dead [--json]");
    const actor = await resolveSelfOrchId(services.orchDir, services.logger);
    const { reaped } = await writeRpc(services, "reap", { dead: true, actor });
    if (json) process.stdout.write(JSON.stringify(reaped.map((result) => ({ target: result.id, name: result.name }))) + "\n");
    else printReaped(reaped);
    return;
  }

  if (positional.length === 0) {
    if (process.stdin.isTTY !== true) throw new Error("usage: orch reap <target> | --dead [--json]");
    await reapInteractive(services, await resolveSelfOrchId(services.orchDir, services.logger));
    return;
  }

  const target = oneTarget(positional, "usage: orch reap <target> [--json]");
  const { reaped } = await writeRpc(services, "reap", { target });
  const result = reaped[0]!;
  if (json) process.stdout.write(JSON.stringify({ target: result.id, name: result.name, reaped: true }) + "\n");
  else process.stdout.write(`Reaped ${result.name}.\n`);
}
