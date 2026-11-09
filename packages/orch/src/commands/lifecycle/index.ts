import { readRpc } from "../daemon.ts";
import { callerCredential } from "../../identity/credential.ts";
import { parseCommand } from "../registry.ts";
import { placeLabel, resolveLifecycle, targetName } from "../resolve.ts";
import { AGENT_STATES, isAgentState } from "../../agent-state.ts";
import { hostCallTimeoutMs } from "../host.ts";
import { die } from "../target.ts";
import { ARROW } from "../../util.ts";
import { registeredId, refuseNonOperatorOverride, whoAmI, type CallerSelf } from "../self.ts";
import { durationSpan } from "../../cli/duration.ts";
import { usageError } from "../../cli/usage.ts";
import { agentFlags } from "../selection.ts";
import type { Invocation } from "../../cli/spec.ts";
import type { AgentFlags } from "../../types/command.ts";
import type { DaemonClient, Services } from "../../types/services.ts";

export async function cmdWait(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("wait", args);
  const { flags, positional } = invocation;
  const status = flags.value("--status") ?? "done";
  if (!isAgentState(status)) throw usageError(invocation, `--status takes one of ${AGENT_STATES.join(", ")}, not "${status}"`);
  const timeoutText = flags.value("--timeout");
  const timeout = timeoutText === undefined ? services.settings.current().timeouts.wait_ms : durationSpan(timeoutText, Date.now());
  const json = flags.has("--json");
  const target = positional[0];
  if (!target) throw usageError(invocation);
  const resolved = await resolveLifecycle(services, target);
  const name = targetName(resolved);
  // orchd waits on the state the agent reports, where it runs.
  const waited = await readRpc(services, "agent-wait", { caller: callerCredential(), target: resolved.key, status, timeoutMs: timeout }, timeout + hostCallTimeoutMs(services));
  if (!waited.reached) die(`wait for ${name} ${ARROW} "${status}" timed out; its last state is ${waited.state ?? "unknown"}.`);
  if (json) process.stdout.write(JSON.stringify({ target: placeLabel(resolved), status, reached: true }) + "\n");
  else process.stdout.write(`${name} reached "${status}".\n`);
}

/** Every orch-owned live agent, addressed by identity key. Keying on paneId instead
 *  silently skipped the entire detached fleet — a headless agent never has a pane. */
export async function ownedAgentKeys(services: DaemonClient): Promise<string[]> {
  // Ownership is the OPEN lease (Rule 11). A released one is history and must
  // stop answering here, or `--all` keeps steering agents this orch let go.
  const { keys } = await readRpc(services, "owned-agents", { caller: callerCredential(), live: false });
  return keys;
}

/** The targets a lifecycle command was given: the positionals, plus every agent
 *  this caller owns under `--all`, a right the caller must hold before the list is built. */
export async function lifecycleTargets(services: DaemonClient, self: CallerSelf, { flags, positional }: Invocation): Promise<{ targets: string[]; all: boolean }> {
  const all = flags.has("--all");
  const targets = [...positional];
  if (all) {
    refuseNonOperatorOverride(self, "--all");
    registeredId(self);
    targets.push(...await ownedAgentKeys(services));
  }
  return { targets, all };
}

/** A drive verb's caller, its targets, and the flags every drive verb reads. A verb given no target is a usage error. */
export async function requireLifecycleTargets(services: DaemonClient, verb: string, args: readonly string[]): Promise<{ invocation: Invocation; self: CallerSelf; targets: string[]; json: boolean; steal: boolean; selection: AgentFlags }> {
  const invocation = parseCommand(verb, args);
  const self = await whoAmI(services);
  const { targets } = await lifecycleTargets(services, self, invocation);
  if (!targets.length) throw usageError(invocation);
  const { flags } = invocation;
  return { invocation, self, targets, json: flags.has("--json"), steal: flags.has("--steal"), selection: agentFlags(flags) };
}

