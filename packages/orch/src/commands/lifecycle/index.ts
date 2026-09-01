import { buildEntities, recipientFor, recipientLabel, resolvePane, resolveTarget } from "../../entities.ts";
import { tryParseIdentity } from "../../backends/identity.ts";
import { orchDir, readPresenceStatus } from "../../presence/store.ts";
import { selfId } from "../../identity/self.ts";
import { retryingSync } from "../../retry.ts";
import { isRecord } from "../../util.ts";
import { loadSettings } from "../../settings/read.ts";
import { sleepMs } from "../../backends/pane-ready.ts";
import { workerPrompt } from "../../worker-prompt.ts";
import { maySpawnFrom, spawnerIsRepliable } from "../../policy/spawner.ts";
import { entityAdapter } from "../status.ts";
import { parseGovernance, writeRpc } from "../daemon.ts";
import { agentViewIndex, backendTarget, die, ownsAgent, parseTargetPrompt, requireCallerOwnerToken, viewForKey } from "../target.ts";
import { commandLogger } from "../logging.ts";

export function lifecycleLogger(key: string) {
  const agentId = tryParseIdentity(key)?.id;
  return agentId ? commandLogger().forAgent(agentId) : commandLogger();
}

/** Dispatch a prompt and retry once when the pane never enters working state. */
export async function cmdRun(args: string[]): Promise<void> {
  const raw = args.includes("--raw");
  const json = args.includes("--json");
  const { gov, rest } = parseGovernance(args.filter((arg) => arg !== "--json"));
  const { target, prompt } = parseTargetPrompt(rest, "--raw", 'usage: orch run <target> "<prompt>" [--raw] [--steal] [--cross-space] [--json]');
  const { ent, pane } = resolvePane(target, { crossSpace: gov.crossSpace });
  const settings = loadSettings(orchDir());
  const headerContext = { maySpawn: maySpawnFrom(orchDir(), selfId(), settings.fleet.max_depth), lockedCommands: settings.locked_commands, spawnerRepliable: spawnerIsRepliable() };
  const result = await writeRpc("dispatch", { target: ent.key, text: workerPrompt(prompt, raw, entityAdapter(ent), headerContext) }, gov);
  const recipient = recipientFor(ent.key);
  if (json) process.stdout.write(JSON.stringify({ target: pane, recipient, dispatched: true, ...(isRecord(result) ? result : {}) }) + "\n");
  else process.stdout.write(`Dispatched to ${recipientLabel(recipient)}.\n`);
}

export function cmdWait(args: string[]) {
  let status = "done";
  const defaultTimeout = loadSettings(orchDir()).timeouts.wait_ms;
  let timeout = defaultTimeout;
  const json = args.includes("--json");
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--status") status = args[++i]!;
    else if (args[i] === "--timeout") timeout = parseInt(args[++i]!, 10) || defaultTimeout;
    else if (args[i] === "--json") continue;
    else positional.push(args[i]!);
  }
  const target = positional[0];
  if (!target) die("usage: orch wait <target> [--status done|idle|working|blocked] [--timeout ms]");
  const { backend, handle } = backendTarget(target, "wait");
  const entity = resolveTarget(target);
  if (!entity.paneId) {
    if (json) process.stdout.write(JSON.stringify({ outcome: "answer", reason: "no-pane", text: `${target} has no pane; wait does not apply.` }) + "\n");
    else process.stdout.write(`${target} has no pane; wait does not apply.\n`);
    return;
  }
  const role = backend.agentStatus;
  if (!role) {
    if (json) process.stdout.write(JSON.stringify({ outcome: "answer", reason: "no-environment-role", text: "this pane environment does not provide wait" }) + "\n");
    else process.stdout.write("this pane environment does not provide wait\n");
    return;
  }
  role.wait(handle, status, timeout);
  if (json) process.stdout.write(JSON.stringify({ target: handle, status, reached: true }) + "\n");
  else process.stdout.write(`${handle} reached "${status}".\n`);
}

/** Block until the agent's own presence status reports idle from a write newer than
 *  the one we replaced. A stale idle is the pre-reset session answering for the new one. */
export function awaitIdleAfter(statusPath: string, beforeUpdated: number, sentAt: number): boolean {
  return retryingSync(
    "await idle presence",
    () => {
      const status = readPresenceStatus(statusPath);
      const updated = Date.parse(typeof status?.updatedAt === "string" ? status.updatedAt : "");
      const advanced = Number.isFinite(updated)
        && (!Number.isFinite(beforeUpdated) || updated > beforeUpdated)
        && updated >= sentAt - 1000;
      return advanced && status?.state === "idle";
    },
    { attempts: 300, delayMs: 250, backoff: 1 },
    { sleepSync: sleepMs, retryOnResult: (value) => !value },
  );
}

/** Every orch-owned live agent, addressed by identity key. Keying on paneId instead
 *  silently skipped the entire detached fleet — a headless agent never has a pane. */
export function ownedAgentKeys(): string[] {
  // Ownership is the OPEN lease (Rule 11). A released one is history and must
  // stop answering here, or `--all` keeps steering agents this orch let go.
  const views = agentViewIndex();
  return buildEntities()
    .filter((ent) => {
      if (!ent.presence) return false;
      return ownsAgent(viewForKey(views, ent.key) ?? { id: ent.key, heldBy: null });
    })
    .map((ent) => ent.key);
}

/** The targets a lifecycle command was given.
 *
 *  `reload` and `restart` collected these with two hand-written loops that
 *  differed only in whether a flag took a value, so `--all` meant "every agent
 *  this caller owns" in two places. One place now. */
export function lifecycleTargets(
  args: readonly string[],
  booleans: readonly string[],
  valueFlags: readonly string[] = [],
): { targets: string[]; values: Map<string, string>; all: boolean } {
  const known = new Set(booleans);
  const takesValue = new Set(valueFlags);
  const values = new Map<string, string>();
  const targets: string[] = [];
  let all = false;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    if (takesValue.has(argument)) { values.set(argument, args[++index] ?? ""); continue; }
    if (argument === "--all") { all = true; continue; }
    if (known.has(argument)) continue;
    targets.push(argument);
  }
  // `--all` is every agent this caller OWNS, which is a right the caller has to
  // hold before the list is even built.
  if (all) {
    requireCallerOwnerToken();
    targets.push(...ownedAgentKeys());
  }
  return { targets, values, all };
}

