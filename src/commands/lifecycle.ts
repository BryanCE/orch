import { execFileSync } from "node:child_process";
import * as files from "node:fs";
import * as path from "node:path";
import { buildExtensionBundle, EXTENSION_NAMES } from "../bridge-bundle.ts";
import { buildEntities, resolvePane } from "../entities.ts";
import { STATUS_FILE } from "../presence/schema.ts";
import { loadPresence, orchDir, presenceAgentDir, readPresenceStatus, reapSpawnedRecord, spawnedRecords } from "../presence/store.ts";
import { assertNameFree } from "../policy/name.ts";
import { writeSpawnedName } from "../store/sqlite.ts";
import { errorMessage, isRecord, packageRoot, pidAlive } from "../util.ts";
import type { Backend, BackendHandle } from "../backends/backend.ts";
import type { LifecycleVerb } from "../adapters/adapter.ts";
import { getBackend } from "../backends/registry.ts";

import { loadConfig } from "../config.ts";
import { adapterCommand, launchModel, pickAdapter, pinModels, resolveAdapterOrDie, workerPrompt, type AgentFlags } from "./spawn.ts";
import { entityAdapter } from "./status.ts";
import { parseGovernance, writeRpc } from "./daemon.ts";
import { assertAgentOwned, ownsAgent, requireCallerOwnerToken, splitOptionFlags, die, backendTarget, parseTargetPrompt, resolveLifecycleTarget } from "./target.ts";

/** Dispatch a prompt and retry once when the pane never enters working state. */
export async function cmdRun(args: string[]): Promise<void> {
  const raw = args.includes("--raw");
  const json = args.includes("--json");
  const { gov, rest } = parseGovernance(args.filter((arg) => arg !== "--json"));
  const { target, prompt } = parseTargetPrompt(rest, "--raw", 'usage: orch run <target> "<prompt>" [--raw] [--steal] [--cross-workspace] [--json]');
  const { ent, pane } = resolvePane(target, { crossWorkspace: gov.crossWorkspace });
  const result = await writeRpc("dispatch", { target: ent.key, text: workerPrompt(prompt, raw, entityAdapter(ent), loadConfig(orchDir()).locked_commands) }, gov);
  if (json) process.stdout.write(JSON.stringify({ target: pane, dispatched: true, ...(isRecord(result) ? result : {}) }) + "\n");
  else process.stdout.write(`Dispatched to ${pane}.\n`);
}

export function cmdWait(args: string[]) {
  let status = "done";
  const defaultTimeout = loadConfig(orchDir()).timeouts.wait_ms;
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
  if (!backend.waitAgentStatus) die(`backend ${backend.id} lacks agent status waiting.`);
  if (!backend.waitAgentStatus(handle, status, timeout)) die(`wait for ${handle} -> "${status}" failed/timed out.`);
  if (json) process.stdout.write(JSON.stringify({ target: handle, status, reached: true }) + "\n");
  else process.stdout.write(`${handle} reached "${status}".\n`);
}

/** Block until the agent's own presence status reports idle from a write newer than
 *  the one we replaced. A stale idle is the pre-reset session answering for the new one. */
function awaitIdleAfter(statusPath: string, beforeUpdated: number, sentAt: number): boolean {
  const deadline = sentAt + 75_000;
  while (Date.now() < deadline) {
    const status = readPresenceStatus(statusPath);
    const updated = Date.parse(typeof status?.updatedAt === "string" ? status.updatedAt : "");
    const advanced = Number.isFinite(updated)
      && (!Number.isFinite(beforeUpdated) || updated > beforeUpdated)
      && updated >= sentAt - 1000;
    if (advanced && status?.state === "idle") return true;
    sleepMs(250);
  }
  return false;
}

/** Every orch-owned live agent, addressed by identity key. Keying on paneId instead
 *  silently skipped the entire detached fleet — a headless agent never has a pane. */
export function ownedAgentKeys(): string[] {
  return buildEntities()
    .filter((ent) => ent.presence && ownsAgent(spawnedRecords().get(ent.key) ?? {}))
    .map((ent) => ent.key);
}

/** Split `orch reset` args into its --model flag and the targets to clear. */
function parseResetArgs(args: string[]): { targets: string[]; flags: AgentFlags } {
  const targets: string[] = [];
  const flags: AgentFlags = {};
  if (args.includes("--all")) requireCallerOwnerToken();
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (arg === "--json" || arg === "--force") continue;
    if (arg === "--model") { flags.modelFlag = args[++index]; continue; }
    if (arg === "--all") targets.push(...ownedAgentKeys());
    else targets.push(arg);
  }
  return { targets, flags };
}

export async function cmdNew(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const force = args.includes("--force");
  const { targets, flags } = parseResetArgs(args);
  if (!targets.length) die("usage: orch reset <target>... | --all [--model <model[:thinking]>] [--json]");
  // A cleared session drops back to the harness's own default, so reset re-pins on
  // exactly the terms a spawn does: the model named here, else the configured default.
  const model = launchModel(flags, loadConfig(orchDir()), resolveAdapterOrDie(pickAdapter(flags, loadConfig(orchDir()))));
  const cleared: { key: string; pane: string; name: string }[] = [];
  const results: { target: string; cleared: true; ready: true }[] = [];
  for (const target of targets) {
    // A detached agent has no pane, so it resolves through the lifecycle target
    // resolver; resolvePane would reject the whole headless fleet outright.
    const { entity: ent, handle } = resolveLifecycleTarget(target);
    const pane = String(handle);
    assertAgentOwned(target, ent, force);
    const statusPath = path.join(presenceAgentDir(ent.key), STATUS_FILE);
    const before = readPresenceStatus(statusPath);
    const beforeUpdated = Date.parse(typeof before?.updatedAt === "string" ? before.updatedAt : "");
    const sentAt = Date.now();
    // The daemon owns every lifecycle mechanism: a console gets the adapter's text,
    // a detached process gets relaunched. Neither is the CLI's to choose.
    await writeRpc("lifecycle", { target: ent.key, verb: "reset" });
    if (!awaitIdleAfter(statusPath, beforeUpdated, sentAt)) die(`${pane}: reset did not become ready within 75s.`);
    cleared.push({ key: ent.key, pane, name: ent.name ?? pane });
    results.push({ target: pane, cleared: true, ready: true });
    if (!json) process.stdout.write(`Cleared session on ${pane}; ready.\n`);
  }
  await pinModels(cleared, model);
  if (json) process.stdout.write(JSON.stringify(results.length === 1 ? results[0] : results) + "\n");
  else process.stdout.write(`Pinned ${cleared.length} reset agent(s) to ${model}.\n`);
}

export function paneForeground(backend: Backend, handle: string): string[] {
  return backend.foregroundProcesses?.(handle) ?? [];
}

interface ReloadResult {
  pane: string;
  ok: boolean;
  reason?: string;
}

/** Block until the agent's bridge republishes status.json under a live pid, proving
 *  the harness came back. Backend-agnostic: it reads only the presence protocol. */
function awaitBridgeRefresh(statusPath: string, wasUpdatedAt: string, tries: number): boolean {
  for (let attempt = 0; attempt < tries; attempt++) {
    sleepMs(500);
    const status = readPresenceStatus(statusPath);
    if (typeof status?.pid === "number" && typeof status.updatedAt === "string"
      && pidAlive(status.pid) && Date.parse(status.updatedAt) > Date.parse(wasUpdatedAt)) return true;
  }
  return false;
}

/** Apply a lifecycle verb to an agent with no console, through the daemon: it holds
 *  the relaunched process's stdin, so only it can carry out the verb. */
async function relaunchThroughDaemon(verb: LifecycleVerb, key: string, pane: string): Promise<ReloadResult> {
  const statusPath = path.join(presenceAgentDir(key), STATUS_FILE);
  const wasUpdatedAt = readPresenceStatus(statusPath)?.updatedAt;
  if (typeof wasUpdatedAt !== "string") return { pane, ok: false, reason: "no bridge status.json to verify against" };
  try {
    await writeRpc("lifecycle", { target: key, verb });
  } catch (error: unknown) {
    return { pane, ok: false, reason: errorMessage(error) };
  }
  return awaitBridgeRefresh(statusPath, wasUpdatedAt, 60)
    ? { pane, ok: true }
    : { pane, ok: false, reason: `bridge status.json did not refresh within 30s after ${verb}` };
}

export function reloadPaneAndAwaitBridge(backend: Backend, pane: string, presenceKey: string, reloadText: string): ReloadResult {
  try {
    const statusPath = path.join(presenceAgentDir(presenceKey), STATUS_FILE);
    const old = readPresenceStatus(statusPath);
    const oldUpdatedAt = typeof old?.updatedAt === "string" ? old.updatedAt : "";
    if (typeof old?.pid !== "number") {
      return { pane, ok: false, reason: errorMessage("no bridge status.json pid to verify reload") };
    }
    if (!backend.sendKeys(pane, ["Escape"])) return { pane, ok: false, reason: errorMessage("escape failed") };
    sleepMs(500);
    if (!backend.deliver(pane, { kind: "run", text: reloadText })) {
      return { pane, ok: false, reason: errorMessage(`${reloadText} failed`) };
    }
    for (let i = 0; i < 60; i++) {
      sleepMs(500);
      const st = readPresenceStatus(statusPath);
      if (typeof st?.pid === "number" && typeof st.updatedAt === "string"
        && pidAlive(st.pid) && Date.parse(st.updatedAt) > Date.parse(oldUpdatedAt)) return { pane, ok: true };
    }
    return { pane, ok: false, reason: errorMessage(`bridge status.json did not refresh within 30s after ${reloadText}`) };
  } catch (error: unknown) {
    return { pane, ok: false, reason: errorMessage(error) };
  }
}

function touchReloadSignal(): void {
  const signalPath = path.join(orchDir(), "reload.signal");
  const fd = files.openSync(signalPath, "a");
  files.closeSync(fd);
}

function restartPaneAndAwaitBridge(backend: Backend, pane: string, cmd: string, presenceKey: string, quitText: string): boolean {
  const statusPath = path.join(presenceAgentDir(presenceKey), STATUS_FILE);
  const oldPid = readPresenceStatus(statusPath)?.pid ?? null;
  backend.sendKeys(pane, ["Escape"]);
  sleepMs(500);
  backend.deliver(pane, { kind: "run", text: quitText });
  let shellSeen = false;
  for (let i = 0; i < 16; i++) {
    sleepMs(500);
    const fg = paneForeground(backend, pane);
    if (fg.length && fg.every((n) => /sh$|^bash$|^zsh$|^fish$/.test(n))) { shellSeen = true; break; }
  }
  if (!shellSeen) {
    process.stderr.write(`${pane}: agent did not exit after ${quitText} - skipping relaunch.\n`);
    return false;
  }
  backend.deliver(pane, { kind: "run", text: cmd });
  for (let i = 0; i < 40; i++) {
    sleepMs(500);
    const st = readPresenceStatus(statusPath);
    if (typeof st?.pid === "number" && st.pid !== oldPid && pidAlive(st.pid)) return true;
  }
  process.stderr.write(`${pane}: relaunched but bridge status.json did not refresh within 20s.\n`);
  return false;
}

export async function cmdReload(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const all = args.includes("--all");
  const force = args.includes("--force");
  const targets: string[] = [];
  if (all) requireCallerOwnerToken();
  for (const arg of args) {
    if (arg === "--json" || arg === "--force") continue;
    if (arg === "--all") targets.push(...ownedAgentKeys());
    else targets.push(arg);
  }
  // `--all` is a valid invocation even with zero live panes: it still touches
  // reload.signal (SIGNALED) for config/extension watchers. Only a bare call
  // with neither --all nor a target is a usage error.
  if (!all && !targets.length) die("usage: orch reload <target>... | --all [--json]");
  try {
    for (const name of EXTENSION_NAMES) buildExtensionBundle(packageRoot(), name);
  } catch (error: unknown) {
    process.stderr.write(`warning: could not rebuild extension bundles: ${errorMessage(error)}\n`);
  }
  const results: ReloadResult[] = [];
  for (const target of targets) {
    try {
      const { entity: ent, backend, handle } = resolveLifecycleTarget(target);
      assertAgentOwned(target, ent, force);
      const agentId = ent.agent ?? ent.presence?.status?.agent;
      if (!agentId) throw new Error(`Target "${target}" has no recorded harness - cannot determine its reload mechanism`);
      const adapter = resolveAdapterOrDie(agentId);
      const reloadCmd = adapter.caps.lifecycle.includes("reload") ? adapter.lifecycleCmd?.("reload") : undefined;
      if (!reloadCmd) throw new Error(`adapter ${adapter.id} has no reload mechanism`);
      // No console to type `/reload` into means the process itself is relaunched,
      // and only the daemon can do that — it owns the new process's stdin.
      results.push(backend.canSendKeys
        ? reloadPaneAndAwaitBridge(backend, String(handle), ent.key, reloadCmd.text)
        : await relaunchThroughDaemon("reload", ent.key, String(handle)));
    } catch (error: unknown) {
      results.push({ pane: target, ok: false, reason: errorMessage(error) });
    }
  }
  try {
    touchReloadSignal();
  } catch (error: unknown) {
    die(`Failed reload.signal: ${errorMessage(error)}`);
  }
  const ok = results.filter((result) => result.ok).length;
  if (json) {
    process.stdout.write(JSON.stringify({ results, ok, total: results.length, hard: false, signaled: "reload.signal" }) + "\n");
  } else {
    for (const result of results) {
      process.stdout.write(result.ok ? `RELOADED ${result.pane}\n` : `FAILED ${result.pane}: ${errorMessage(result.reason ?? "reload failed")}\n`);
    }
    process.stdout.write("SIGNALED reload.signal\n");
  }
  if (ok !== results.length) process.exit(1);
}

export async function cmdRestart(args: string[]): Promise<void> {
  let cmd: string | null = null;
  const json = args.includes("--json");
  const force = args.includes("--force");
  const targets: string[] = [];
  if (args.includes("--all")) requireCallerOwnerToken();
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--cmd") cmd = args[++i]!;
    else if (args[i] === "--hard" || args[i] === "--json" || args[i] === "--force") continue;
    else if (args[i] === "--all") targets.push(...ownedAgentKeys());
    else targets.push(args[i]!);
  }
  if (!targets.length) die("usage: orch restart <target>... | --all [--cmd pi] [--json]");
  const config = loadConfig(orchDir());
  let ok = 0;
  for (const target of targets) {
    const { entity: ent, backend, handle } = resolveLifecycleTarget(target);
    assertAgentOwned(target, ent, force);
    const agentId = ent.agent ?? ent.presence?.status?.agent;
    if (!agentId) die(`Target "${target}" has no recorded harness - cannot determine its restart mechanism.`);
    const adapter = resolveAdapterOrDie(agentId);
    const quitCmd = adapter.caps.lifecycle.includes("restart") ? adapter.lifecycleCmd?.("restart") : undefined;
    if (!quitCmd) die(`Target "${target}" uses adapter ${adapter.id}, which has no restart mechanism.`);
    // A pane is quit and relaunched by typing into its shell; a detached agent has
    // no shell, so the daemon that owns its stdin replaces the process instead.
    if (!backend.canSendKeys) {
      const relaunched = await relaunchThroughDaemon("restart", ent.key, String(handle));
      if (relaunched.ok) { ok++; if (!json) process.stdout.write(`${relaunched.pane}: bridge live.\n`); }
      else process.stderr.write(`${relaunched.pane}: ${relaunched.reason ?? "restart failed"}\n`);
      continue;
    }
    const launch = cmd ?? adapterCommand(agentId, config);
    if (!json) process.stdout.write(`Restarting ${String(handle)} (${launch})...\n`);
    if (restartPaneAndAwaitBridge(backend, String(handle), launch, ent.key, quitCmd.text)) { ok++; if (!json) process.stdout.write(`${String(handle)}: bridge live.\n`); }
  }
  if (json) process.stdout.write(JSON.stringify({ targets, ok, total: targets.length, hard: true }) + "\n");
  else process.stdout.write(`${ok}/${targets.length} restarted with fresh bridge.\n`);
  if (ok !== targets.length) process.exit(1);
}

/** Write the new label into orch's registry, then let the backend show it. */
function renameAgent(backend: Backend, handle: BackendHandle, key: string, name: string): boolean {
  const record = spawnedRecords().get(key);
  if (!record) {
    process.stderr.write(`orch rename: ${key} is not an orch-spawned agent; use --pane to relabel the pane.\n`);
    return false;
  }
  assertNameFree(name, record.workspace ?? "");
  if (!writeSpawnedName(orchDir(), key, name)) return false;
  backend.renameAgent?.(handle, name);
  return true;
}

export function cmdRename(args: string[]) {
  const paneLabel = args.includes("--pane");
  const json = args.includes("--json");
  const positional = args.filter((arg) => arg !== "--pane" && arg !== "--json");
  const target = positional[0];
  const name = positional[1];
  if (!target || !name) die("usage: orch rename <target> <name> [--pane]");
  const { backend, handle, key } = backendTarget(target, "rename");
  // Renaming an agent moves a label only: orch's registry owns the name, the
  // identity key never changes, and every session/daemon route survives it.
  // --pane relabels the backend's pane chrome instead and leaves the name alone.
  let renamed: boolean | undefined;
  try {
    renamed = paneLabel ? backend.renamePane?.(handle, name) : renameAgent(backend, handle, key, name);
  } catch (error: unknown) {
    die(`orch rename: ${errorMessage(error)}`);
  }
  if (!renamed) die(`Could not rename ${handle}.`);
  if (json) process.stdout.write(JSON.stringify({ target: handle, key, name, paneLabel, renamed: true }) + "\n");
  else process.stdout.write(`${handle} -> ${paneLabel ? "pane label" : "named"} "${name}".\n`);
}

export function cmdClose(args: string[]) {
  const { enabled, positional } = splitOptionFlags(args, ["--all", "--stream", "--json", "--force"]);
  const all = enabled.has("--all");
  const stream = enabled.has("--stream");
  const json = enabled.has("--json");
  const force = enabled.has("--force");
  if (!all && !positional.length) die("usage: orch close <target>... | --all [--stream]");

  const targets: { backend: Backend | null; handle: BackendHandle; key: string; pid?: number }[] = [];
  if (all) {
    // --all is deliberately owner-scoped, but not workspace-scoped. Dead and
    // headless records are cleanup targets too.
    //
    // Each row is read directly, never resolved through a target string:
    // resolution is what makes a stale row ambiguous, and one unresolvable row
    // must not abort the sweep. A bulk close that closes nothing leaves every
    // name reserved, which is exactly when respawning is the only way out.
    requireCallerOwnerToken();
    for (const record of spawnedRecords().values()) {
      if (!ownsAgent(record)) continue;
      const backend = getBackend(record.backend ?? "") ?? null;
      if (!backend) process.stderr.write(`skipping ${record.pane}: unknown backend ${JSON.stringify(record.backend)} (reaping the record)\n`);
      const presence = loadPresence().get(record.pane);
      targets.push({ backend, handle: record.handle ?? record.pane, key: record.pane, pid: presence?.status?.pid });
    }
  }
  for (const target of positional) {
    const resolved = resolveLifecycleTarget(target);
    assertAgentOwned(target, resolved.entity, force);
    if (resolved.record.owner && !ownsAgent(resolved.record) && !force) {
      die(`Target "${target}" is owned by ${resolved.record.owner}. Use --force to override.`);
    }
    const pid = resolved.entity.presence?.status?.pid;
    targets.push({ backend: resolved.backend, handle: resolved.handle, key: resolved.record.pane, pid });
  }

  let ok = 0;
  const closed: string[] = [];
  const seen = new Set<string>();
  for (const target of targets) {
    if (seen.has(target.key)) continue;
    seen.add(target.key);
    let closedByBackend = false;
    try { closedByBackend = target.backend?.close(target.handle) ?? false; } catch {}
    let signalled = false;
    if (!closedByBackend && target.pid !== undefined && pidAlive(target.pid)) {
      try { process.kill(target.pid, "SIGTERM"); signalled = true; } catch {}
    }
    // A missing pane is already clean. Always reap the orch-owned record and
    // presence directory once ownership has been checked.
    reapSpawnedRecord(target.key);
    ok++;
    closed.push(String(target.handle));
    if (!json) process.stdout.write(`Closed ${String(target.handle)}${closedByBackend || signalled ? "." : " (already stopped)."}\n`);
  }
  const targetCount = targets.length;
  if (all && !targetCount && !json) process.stdout.write("No fleet agents to close.\n");
  if (stream) {
    let pids: number[] = [];
    try {
      pids = execFileSync("pgrep", ["-f", "orch events"]).toString().trim().split("\n").filter(Boolean).map(Number);
    } catch {}
    const skip = new Set([process.pid, process.ppid]);
    const kill = pids.filter((p) => !skip.has(p));
    for (const p of kill) { try { process.kill(p, "SIGTERM"); } catch {} }
    if (!json) process.stdout.write(kill.length ? `Killed ${kill.length} orch events process(es).\n` : "No orch events stream running.\n");
  }
  if (json) process.stdout.write(JSON.stringify({ closed, requested: targetCount, ok, stream }) + "\n");
  if (targetCount && ok !== targetCount) process.exit(1);
}

export function cmdAbort(args: string[]) {
  const json = args.includes("--json");
  const target = args.find((arg) => arg !== "--json");
  if (!target) die("usage: orch abort <target> [--json]");
  const { backend, handle } = backendTarget(target, "abort");
  if (!backend.canSendKeys) die(`backend ${backend.id} cannot send keys.`);
  if (!backend.sendKeys(handle, ["Escape"])) die(`Could not abort ${handle}.`);
  sleepMs(500);
  if (!backend.sendKeys(handle, ["Escape"])) die(`Could not abort ${handle}.`);
  if (json) process.stdout.write(JSON.stringify({ target: handle, aborted: true }) + "\n");
  else process.stdout.write(`Aborted ${handle}.\n`);
}

function sleepMs(ms: number) {
  try {
    execFileSync("sleep", [String(ms / 1000)], { stdio: "ignore" });
  } catch {}
}

