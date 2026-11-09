// `orch spawn` and `orch tile`: the CLI parses, asks orchd to launch, and reports. orchd admits
// the launch, places it in the caller's plexer, makes worktrees and starts every agent.
import { agentFlags } from "../selection.ts";
import { parseCommand } from "../registry.ts";
import { writeRpc } from "../daemon.ts";
import { whoAmI } from "../self.ts";
import { resolveLaunchAgent, resolveSpawnSettings, resolveWorktreeIntent, parseSpawnFlags, worktreeFlags, type SpawnRequest } from "./flags.ts";
import { pinModels } from "./models.ts";
import { resolveSpawnNames } from "./names.ts";
import { reportHeadlessSpawn, reportSpawnResults, writeNotes } from "./report.ts";
import { usageError } from "../../cli/usage.ts";
import type { ResultOf } from "../../daemon/client/protocol.ts";
import type { Services } from "../../types/services.ts";
import type { OrchSettings } from "../../types/settings.ts";

/** An environment without the role a command needs cannot do it. That is an ANSWER
 *  with exit 0, never a throw and never a silent empty result. */
function answerNoEnvironmentRole(json: boolean, text: string): void {
  const answer = { outcome: "answer", reason: "no-environment-role", text };
  if (json) process.stdout.write(JSON.stringify(answer) + "\n");
  else process.stdout.write(`${answer.text}\n`);
}

/** How long orchd may take to launch: each agent's harness command, and its worktree when asked. */
function launchBudgetMs(settings: OrchSettings, agents: number, worktree: boolean): number {
  return agents * (settings.timeouts.adapter_command_ms + (worktree ? settings.worktrees.timeout_ms : 0));
}

async function executeSpawn(services: Services, request: SpawnRequest): Promise<void> {
  const settings = services.settings.current();
  const self = await whoAmI(services);
  const { params } = request;
  const answer = await writeRpc(services, "spawn", params, {}, launchBudgetMs(settings, params.agents.length, params.worktree !== null));
  if (answer.outcome === "answer") return answerNoEnvironmentRole(request.json, answer.text);
  writeNotes(answer.notes);
  if (answer.headless) return reportHeadlessSpawn(services, request, answer);
  await reportSpawnResults(services, self, request, answer);
}

export async function cmdSpawn(services: Services, args: string[]) {
  await executeSpawn(services, resolveSpawnSettings(parseSpawnFlags(args), services.settings.current()));
}

/** The tab `orch tile` fills and the name of the agent it adds. Tile CREATES an agent, so it
 *  names one too: an agent called `tile-3` says nothing about the slice it holds. */
function tileNames(invocation: ReturnType<typeof parseCommand>): { target: string; name: string } {
  const [target, requested] = invocation.positional;
  if (!target || !requested) throw usageError(invocation);
  return { target, name: resolveSpawnNames(invocation, [requested])[0]! };
}

/** Report the tiled agent, and the tab's tiling when a person reads it. */
function reportTiled(json: boolean, tiled: Extract<ResultOf<"tile">, { outcome: "tiled" }>): void {
  const { agent, tab } = tiled;
  if (json) {
    process.stdout.write(JSON.stringify({ handle: agent.handle, key: agent.key, name: agent.name, tab, added: true }) + "\n");
    return;
  }
  process.stdout.write(`Added ${agent.handle} (${agent.name}) to group ${tab} running ${agent.harness}.\n`);
  process.stdout.write("\nFinal tiling:\n");
  const w0 = Math.max(...tiled.layout.map((row) => row.handle.length), 4);
  const w1 = Math.max(...tiled.layout.map((row) => row.name.length), 4);
  for (const row of tiled.layout) process.stdout.write(`  ${row.handle.padEnd(w0)}  ${row.name.padEnd(w1)}  ${row.size}\n`);
}

export async function cmdTile(services: Services, args: string[]) {
  const invocation = parseCommand("tile", args);
  const { flags } = invocation;
  const json = flags.has("--json");
  const launch = agentFlags(flags);
  const settings = services.settings.current();
  const { harness, model, thinking } = resolveLaunchAgent(launch, settings);
  const { target, name } = tileNames(invocation);
  const worktree = resolveWorktreeIntent(invocation, worktreeFlags(flags), settings);
  const tiled = await writeRpc(services, "tile", {
    tab: target,
    agent: { name, harness, model, thinking },
    cmd: flags.value("--cmd") ?? null,
    plexer: launch.backendFlag ?? null,
    cwd: flags.value("--dir") ?? process.cwd(),
    worktree,
  }, {}, launchBudgetMs(settings, 1, worktree !== null));
  if (tiled.outcome === "answer") return answerNoEnvironmentRole(json, tiled.text);
  reportTiled(json, tiled);
  // A harness that cannot change a running session's model launched on it already.
  if (tiled.harness.takesModel) await pinModels(services, services.logger, [tiled.agent]);
}
