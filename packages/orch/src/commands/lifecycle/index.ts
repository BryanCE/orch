import { recipientOf } from "../../entities/lookup.ts";
import { recipientLabel } from "../../recipient.ts";
import { isAgentId } from "../../backends/identity.ts";
import { retryingAsync } from "../../retry.ts";
import { workerPrompt } from "../../worker-prompt.ts";
import { isRecord } from "../../util.ts";
import { workerHeaderContextOf } from "../../policy/spawner.ts";
import { getAdapter } from "../../adapters/registry.ts";
import { governanceFlags, readRpc, writeRpc } from "../daemon.ts";
import { callerCredential } from "../../identity/credential.ts";
import { parseCommand } from "../registry.ts";
import { die } from "../target.ts";
import { resolveEntity, resolveLifecycle } from "../resolve.ts";
import { whoAmI, refuseNonOperatorOverride, type CallerSelf } from "../self.ts";
import type { Invocation } from "../../cli/spec.ts";
import type { DaemonClient, Services } from "../../types/services.ts";
import type { Logger } from "../../types/core.ts";
import { describeHandle } from "../../backends/backend.ts";
import { parseCount } from "../panes.ts";

export function lifecycleLogger(logger: Logger, key: string) {
  return isAgentId(key) ? logger.forAgent(key) : logger;
}

/** Dispatch a prompt and retry once when the pane never enters working state. */
export async function cmdRun(services: Services, args: string[]): Promise<void> {
  const { flags, positional } = parseCommand("run", args);
  const raw = flags.has("--raw");
  const json = flags.has("--json");
  const gov = governanceFlags(flags);
  const target = positional[0];
  const prompt = positional.slice(1).join(" ");
  if (!target || !prompt) die('usage: orch run <target> "<prompt>" [--raw] [--steal] [--cross-space] [--json]');
  const self = await whoAmI(services);
  const resolved = await resolveEntity(services, target, { crossSpace: gov.crossSpace });
  if (!resolved.entity.paneId) die(`Target "${target}" has no pane.`);
  const settings = services.settings.current();
  const headerContext = workerHeaderContextOf(self, settings, resolved.view?.cwd);
  const adapter = getAdapter(resolved.view?.harnessId ?? resolved.entity.agent ?? "");
  const result = await writeRpc(services, "dispatch", { target: resolved.entity.key, text: workerPrompt(prompt, raw, adapter, headerContext) }, gov);
  const recipient = recipientOf(resolved.view ?? undefined, resolved.entity.space ?? "space", resolved.entity.key);
  if (json) process.stdout.write(JSON.stringify({ target: resolved.entity.paneId, recipient, dispatched: true, ...(isRecord(result) ? result : {}) }) + "\n");
  else process.stdout.write(`Dispatched to ${recipientLabel(recipient)}.\n`);
}

export async function cmdWait(services: Services, args: string[]): Promise<void> {
  const { flags, positional } = parseCommand("wait", args);
  const status = flags.value("--status") ?? "done";
  const defaultTimeout = services.settings.current().timeouts.wait_ms;
  const timeout = parseCount(flags.value("--timeout"), defaultTimeout);
  const json = flags.has("--json");
  const target = positional[0];
  if (!target) die("usage: orch wait <target> [--status done|idle|working|blocked] [--timeout ms]");
  const { backend, handle, entity } = await resolveLifecycle(services, target);
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
  if (json) process.stdout.write(JSON.stringify({ target: describeHandle(handle), status, reached: true }) + "\n");
  else process.stdout.write(`${describeHandle(handle)} reached "${status}".\n`);
}

/** Block until the agent's own presence status reports idle from a write newer than
 *  the one we replaced. A stale idle is the pre-reset session answering for the new one. */
export async function awaitIdleAfter(services: DaemonClient, presenceKey: string, beforeUpdated: number | undefined, sentAt: number): Promise<boolean> {
  return retryingAsync(
    "await idle presence",
    async () => {
      const { status } = await readRpc(services, "agent-status", { target: presenceKey });
      const advanced = status !== null
        && (beforeUpdated === undefined || status.updatedAt > beforeUpdated)
        && status.updatedAt >= sentAt - 1000;
      return advanced && status.state === "idle";
    },
    { attempts: 300, delayMs: 250, backoff: 1 },
    { retryOnResult: (value) => !value },
  );
}

/** Every orch-owned live agent, addressed by identity key. Keying on paneId instead
 *  silently skipped the entire detached fleet — a headless agent never has a pane. */
export async function ownedAgentKeys(services: DaemonClient): Promise<string[]> {
  // Ownership is the OPEN lease (Rule 11). A released one is history and must
  // stop answering here, or `--all` keeps steering agents this orch let go.
  const { keys } = await readRpc(services, "owned-agents", { caller: callerCredential() });
  return keys;
}

/** The targets a lifecycle command was given: the positionals, plus every agent
 *  this caller owns under `--all`, a right the caller must hold before the list is built. */
export async function lifecycleTargets(services: DaemonClient, self: CallerSelf, { flags, positional }: Invocation): Promise<{ targets: string[]; all: boolean }> {
  const all = flags.has("--all");
  const targets = [...positional];
  if (all) {
    refuseNonOperatorOverride(self, "--all");
    if (self.id === null) die("Bulk operation refused: this orch is not registered; spawn or adopt an agent first, or name the targets.");
    targets.push(...await ownedAgentKeys(services));
  }
  return { targets, all };
}

