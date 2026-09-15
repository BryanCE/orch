import { buildEntities } from "../../entities/inventory.ts";
import { recipientFor, viewForKey } from "../../entities/lookup.ts";
import { resolvePane, resolveTarget } from "../../entities/resolve.ts";
import { recipientLabel } from "../../recipient.ts";
import { isAgentId } from "../../backends/identity.ts";
import { selectAgentStatus } from "../../store/status-rows.ts";
import { retryingSync } from "../../retry.ts";
import { isRecord } from "../../util.ts";
import { sleepMs } from "../../backends/shell-ready.ts";
import { workerPrompt } from "../../worker-prompt.ts";
import { workerHeaderContext } from "../../policy/spawner.ts";
import { entityAdapter } from "../status/rows.ts";
import { spawnedRecords } from "../../presence/store.ts";
import { governanceFlags, writeRpc } from "../daemon.ts";
import { parseCommand } from "../registry.ts";
import { backendTarget, die, ownsAgent, requireCallerOwnerToken } from "../target.ts";
import type { Invocation } from "../../cli/spec.ts";
import type { Services } from "../../types/services.ts";
import type { Logger, OrchDir } from "../../types/core.ts";

export function lifecycleLogger(logger: Logger, key: string) {
  return isAgentId(key) ? logger.forAgent(key) : logger;
}

/** Dispatch a prompt and retry once when the pane never enters working state. */
export async function cmdRun(services: Services, args: string[]): Promise<void> {
  const { flags, positional } = parseCommand("run", args);
  const raw = flags.has("--raw");
  const json = flags.has("--json");
  const gov = governanceFlags(services, flags);
  const target = positional[0];
  const prompt = positional.slice(1).join(" ");
  if (!target || !prompt) die('usage: orch run <target> "<prompt>" [--raw] [--steal] [--cross-space] [--json]');
  const settings = services.settings.current();
  const { ent, pane } = resolvePane(services.orchDir, settings, target, { crossSpace: gov.crossSpace });
  const headerContext = workerHeaderContext(services.orchDir, settings);
  const result = await writeRpc(services, "dispatch", { target: ent.key, text: workerPrompt(prompt, raw, entityAdapter(ent, spawnedRecords(services.orchDir)), headerContext) }, gov);
  const recipient = recipientFor(services.orchDir, ent.key);
  if (json) process.stdout.write(JSON.stringify({ target: pane, recipient, dispatched: true, ...(isRecord(result) ? result : {}) }) + "\n");
  else process.stdout.write(`Dispatched to ${recipientLabel(recipient)}.\n`);
}

export function cmdWait(services: Services, args: string[]) {
  const { flags, positional } = parseCommand("wait", args);
  const status = flags.value("--status") ?? "done";
  const defaultTimeout = services.settings.current().timeouts.wait_ms;
  const timeout = parseInt(flags.value("--timeout") ?? "", 10) || defaultTimeout;
  const json = flags.has("--json");
  const target = positional[0];
  if (!target) die("usage: orch wait <target> [--status done|idle|working|blocked] [--timeout ms]");
  const settings = services.settings.current();
  const { backend, handle } = backendTarget(services.orchDir, settings, target, "wait");
  const entity = resolveTarget(services.orchDir, settings, target);
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
export function awaitIdleAfter(orchDir: OrchDir, presenceKey: string, beforeUpdated: number | undefined, sentAt: number): boolean {
  return retryingSync(
    "await idle presence",
    () => {
      const status = selectAgentStatus(orchDir, presenceKey);
      const advanced = status !== undefined
        && (beforeUpdated === undefined || status.updatedAt > beforeUpdated)
        && status.updatedAt >= sentAt - 1000;
      return advanced && status.state === "idle";
    },
    { attempts: 300, delayMs: 250, backoff: 1 },
    { sleepSync: sleepMs, retryOnResult: (value) => !value },
  );
}

/** Every orch-owned live agent, addressed by identity key. Keying on paneId instead
 *  silently skipped the entire detached fleet — a headless agent never has a pane. */
export function ownedAgentKeys(services: Pick<Services, "orchDir" | "settings">): string[] {
  // Ownership is the OPEN lease (Rule 11). A released one is history and must
  // stop answering here, or `--all` keeps steering agents this orch let go.
  const views = spawnedRecords(services.orchDir);
  return buildEntities(services.orchDir, services.settings.current())
    .filter((ent) => {
      if (!ent.presence) return false;
      return ownsAgent(services.orchDir, viewForKey(views, ent.key) ?? { id: ent.key, heldBy: null });
    })
    .map((ent) => ent.key);
}

/** The targets a lifecycle command was given: the positionals, plus every agent
 *  this caller owns under `--all`, a right the caller must hold before the list is built. */
export function lifecycleTargets(services: Pick<Services, "orchDir" | "settings">, { flags, positional }: Invocation): { targets: string[]; all: boolean } {
  const all = flags.has("--all");
  const targets = [...positional];
  if (all) {
    requireCallerOwnerToken(services.orchDir);
    targets.push(...ownedAgentKeys(services));
  }
  return { targets, all };
}

