import { isAgentId } from "../../backends/identity.ts";
import { retryingAsync } from "../../retry.ts";
import { readRpc } from "../daemon.ts";
import { callerCredential } from "../../identity/credential.ts";
import { parseCommand } from "../registry.ts";
import { die } from "../target.ts";
import { resolveLifecycle, targetName } from "../resolve.ts";
import { refuseNonOperatorOverride, type CallerSelf } from "../self.ts";
import { durationSpan } from "../../cli/duration.ts";
import { usageError } from "../../cli/usage.ts";
import type { Invocation } from "../../cli/spec.ts";
import type { DaemonClient, Services } from "../../types/services.ts";
import type { Logger } from "../../types/core.ts";
import { describeHandle } from "../../backends/backend.ts";

export function lifecycleLogger(logger: Logger, key: string) {
  return isAgentId(key) ? logger.forAgent(key) : logger;
}

export async function cmdWait(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("wait", args);
  const { flags, positional } = invocation;
  const status = flags.value("--status") ?? "done";
  const timeoutText = flags.value("--timeout");
  const timeout = timeoutText === undefined ? services.settings.current().timeouts.wait_ms : durationSpan(timeoutText, Date.now());
  const json = flags.has("--json");
  const target = positional[0];
  if (!target) throw usageError(invocation);
  const resolved = await resolveLifecycle(services, target);
  const { backend, handle, entity } = resolved;
  const name = targetName(resolved);
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
  else process.stdout.write(`${name} reached "${status}".\n`);
}

/** Block until the agent's own presence status reports idle from a write newer than
 *  the one we replaced. A stale idle is the pre-reset session answering for the new one. */
export async function awaitIdleAfter(services: DaemonClient, presenceKey: string, beforeUpdated: number | undefined, sentAt: number): Promise<boolean> {
  const { reset_ready_ms, reset_poll_ms } = services.settings.current().timeouts;
  return retryingAsync(
    "await idle presence",
    async () => {
      const { status } = await readRpc(services, "agent-status", { target: presenceKey });
      const advanced = status !== null
        && (beforeUpdated === undefined || status.updatedAt > beforeUpdated)
        && status.updatedAt >= sentAt - 1000;
      return advanced && status.state === "idle";
    },
    { attempts: Math.ceil(reset_ready_ms / reset_poll_ms), delayMs: reset_poll_ms, backoff: 1 },
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

