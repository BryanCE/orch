import { errorMessage } from "../../util.ts";
import { askDaemon, writeRpc } from "../daemon.ts";
import { hostCallTimeoutMs } from "../host.ts";
import { placeLabel, resolveLifecycle, refuseForeignHolder, targetName } from "../resolve.ts";
import { whoAmI, type CallerSelf } from "../self.ts";
import { lifecycleTargets, requireLifecycleTargets } from "./index.ts";
import { parseCommand } from "../registry.ts";
import { formFlag } from "../spawn/flags.ts";
import { usageError } from "../../cli/usage.ts";
import type { LifecycleOutcome, LifecycleRequest } from "../../daemon/client/protocol.ts";
import type { AgentFlags } from "../../types/command.ts";
import type { FormId } from "../../types/form.ts";
import type { Services } from "../../types/services.ts";

export interface ReloadResult {
  handle: string;
  ok: boolean;
  reason?: string;
}

/** How long a reload or restart may take in orchd: a reload waits once on the agent's bridge;
 *  a restart waits on the old harness to quit and the new one to come up. */
function lifecycleWaitMs(services: Pick<Services, "settings">, request: LifecycleRequest): number {
  const readyMs = services.settings.current().timeouts.reset_ready_ms;
  return (request.verb === "restart" ? 2 * readyMs : readyMs) + hostCallTimeoutMs(services);
}

/** Resolve one target, refuse a foreign holder, and have orchd reload or restart it where it runs. */
async function relaunch(services: Services, self: CallerSelf, target: string, steal: boolean, request: LifecycleRequest): Promise<{ readonly name: string; readonly label: string; readonly outcome: LifecycleOutcome }> {
  const resolved = await resolveLifecycle(services, target);
  refuseForeignHolder(self, target, resolved, steal);
  const outcome = await writeRpc(services, "lifecycle", { target: resolved.key, request }, { steal }, lifecycleWaitMs(services, request));
  return { name: targetName(resolved), label: placeLabel(resolved), outcome };
}

async function reloadOne(services: Services, self: CallerSelf, target: string, steal: boolean): Promise<ReloadResult> {
  try {
    const { label, outcome } = await relaunch(services, self, target, steal, { verb: "reload" });
    return outcome.ok ? { handle: label, ok: true } : { handle: label, ok: false, reason: outcome.reason ?? "reload failed" };
  } catch (error: unknown) {
    return { handle: target, ok: false, reason: errorMessage(error) };
  }
}

function reportReloads(results: readonly ReloadResult[], json: boolean): void {
  const ok = results.filter((result) => result.ok).length;
  if (json) {
    process.stdout.write(JSON.stringify({ results, ok, total: results.length, hard: false, signaled: "settings" }) + "\n");
  } else {
    for (const result of results) {
      process.stdout.write(result.ok ? `RELOADED ${result.handle}\n` : `FAILED ${result.handle}: ${errorMessage(result.reason ?? "reload failed")}\n`);
    }
    process.stdout.write("SIGNALED settings\n");
  }
  // `process.exitCode`, never `process.exit()`: the JSON above is buffered, so
  // exiting here truncates the very payload a caller reads to find out WHICH
  // target failed (src/commands/index.ts:272 states the same rule).
  if (ok !== results.length) process.exitCode = 1;
}

export async function cmdReload(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("reload", args);
  const json = invocation.flags.has("--json");
  const steal = invocation.flags.has("--steal");
  const self = await whoAmI(services);
  const { targets, all } = await lifecycleTargets(services, self, invocation);
  // `--all` is a valid invocation even with zero live agents: orchd still re-reads its
  // settings (SIGNALED). Only a bare call with neither --all nor a target is a usage error.
  if (!all && !targets.length) throw usageError(invocation);
  const results: ReloadResult[] = [];
  // orchd reloads each agent where it runs, redeploying that harness's stale shims there first.
  for (const target of targets) results.push(await reloadOne(services, self, target, steal));
  await askDaemon(services, "settings-reload", undefined);
  reportReloads(results, json);
}

/** The restart request every target gets: the harness, model and command the caller named. */
function restartRequest(selection: AgentFlags, cmd: string | null, form: FormId | null): Extract<LifecycleRequest, { verb: "restart" }> {
  return { verb: "restart", harness: selection.adapterFlag ?? null, model: selection.modelFlag ?? null, thinking: selection.thinkingFlag ?? null, cmd, form };
}

/** What a restart prints for one agent: the bridge line when a bridge came back, else its form. */
function restartLine(name: string, outcome: LifecycleOutcome): string {
  if (outcome.bridge) return `${name}: bridge live.\n`;
  return outcome.form === null ? `restarted ${name}.\n` : `restarted ${name} in the ${outcome.form} form.\n`;
}

export async function cmdRestart(services: Services, args: string[]): Promise<void> {
  const { invocation, self, targets, json, steal, selection } = await requireLifecycleTargets(services, "restart", args);
  const request = restartRequest(selection, invocation.flags.value("--cmd") ?? null, formFlag(invocation));
  const results: ReloadResult[] = [];
  let ok = 0;
  for (const target of targets) {
    try {
      const { name, outcome } = await relaunch(services, self, target, steal, request);
      if (!json && outcome.command !== null) process.stdout.write(`Restarting ${name} (${outcome.command})...\n`);
      if (outcome.ok) {
        ok++;
        results.push({ handle: target, ok: true });
        if (!json) process.stdout.write(restartLine(name, outcome));
      } else {
        const reason = outcome.reason ?? "restart failed";
        services.logger.error("lifecycle.restart-failed", { target, error: reason });
        results.push({ handle: target, ok: false, reason: "restart failed" });
        process.stdout.write(`${name}: ${reason}\n`);
      }
    } catch (error: unknown) {
      const reason = errorMessage(error);
      results.push({ handle: target, ok: false, reason });
      if (!json) process.stdout.write(`FAILED ${target}: ${reason}\n`);
    }
  }
  if (json) process.stdout.write(JSON.stringify({ results, targets, ok, total: targets.length, hard: true }) + "\n");
  else process.stdout.write(`${ok}/${targets.length} restarted.\n`);
  // `process.exitCode`, never `process.exit()` — same rule as reload above.
  if (ok !== targets.length) process.exitCode = 1;
}
