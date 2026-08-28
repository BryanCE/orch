import { execFileSync } from "node:child_process";
import * as files from "node:fs";
import * as path from "node:path";
import { refreshStaleShims } from "../doctor/runner.ts";
import { buildEntities, recipientFor, recipientLabel, resolvePane, resolveTarget } from "../entities.ts";
import { STATUS_FILE } from "../presence/schema.ts";
import { orchDir, presenceAgentDir, readPresenceStatus, reapSpawnedRecord, spawnedRecords } from "../presence/store.ts";
import { assertNameFree } from "../policy/name.ts";
import { writeSpawnedName, type SpawnedRecord } from "../store/spawned-rows.ts";
import { openStore } from "../store/connection.ts";
import { errorMessage, isRecord, pidAlive } from "../util.ts";
import { processInstanceMatches, processIsAlive } from "../process-identity.ts";
import type { Backend, BackendHandle } from "../backends/backend.ts";
import type { LifecycleVerb } from "../adapters/adapter.ts";
import { getBackend } from "../backends/registry.ts";
import { NO_PANE_FOREGROUND, paneAtShellPrompt, sleepMs, type PaneForeground } from "../backends/pane-ready.ts";

import { loadConfig } from "../config.ts";
import { adapterCommand, launchModel, pickAdapter, pinModels, resolveAdapterOrDie, spawnerIsRepliable, workerPrompt, type AgentFlags } from "./spawn.ts";
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
  const headerContext = { lockedCommands: loadConfig(orchDir()).locked_commands, spawnerRepliable: spawnerIsRepliable() };
  const result = await writeRpc("dispatch", { target: ent.key, text: workerPrompt(prompt, raw, entityAdapter(ent), headerContext) }, gov);
  const recipient = recipientFor(ent.key);
  if (json) process.stdout.write(JSON.stringify({ target: pane, recipient, dispatched: true, ...(isRecord(result) ? result : {}) }) + "\n");
  else process.stdout.write(`Dispatched to ${recipientLabel(recipient)}.\n`);
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
  const records = spawnedRecords();
  return buildEntities()
    .filter((ent) => ent.presence && ownsAgent(records.get(ent.key) ?? {}))
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
  // Check ownership before resolving model configuration: a driving verb must
  // name a live foreign holder even when this caller has no model selected.
  for (const target of targets) {
    const { entity: ent } = resolveLifecycleTarget(target);
    assertAgentOwned(target, ent, force);
  }
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
    // The daemon owns every lifecycle mechanism: a console gets the adapter's
    // text, a detached agent has none and is refused. Neither is the CLI's to choose.
    await writeRpc("lifecycle", { target: ent.key, verb: "reset" });
    if (!awaitIdleAfter(statusPath, beforeUpdated, sentAt)) die(`${pane}: reset did not become ready within 75s.`);
    cleared.push({ key: ent.key, pane, name: ent.name ?? pane });
    results.push({ target: pane, cleared: true, ready: true });
    if (!json) process.stdout.write(`Cleared session on ${pane}; ready.\n`);
  }
  // A reset that could not re-pin its model left the agent on the wrong one, and
  // re-running reset is idempotent — unlike a spawn, nothing duplicates on retry.
  if ((await pinModels(cleared, model)).length) process.exitCode = 1;
  if (json) process.stdout.write(JSON.stringify(results.length === 1 ? results[0] : results) + "\n");
  else process.stdout.write(`Pinned ${cleared.length} reset agent(s) to ${model}.\n`);
}

export function paneForeground(backend: Backend, handle: string): PaneForeground {
  return backend.paneInput?.foreground(handle) ?? NO_PANE_FOREGROUND;
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

/** Apply a lifecycle verb to an agent with no console through the daemon, which owns
 *  every lifecycle mechanism. A detached agent has none, so this reports its refusal. */
async function lifecycleThroughDaemon(verb: LifecycleVerb, key: string, pane: string): Promise<ReloadResult> {
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
    backend.paneInput?.sendKeys(pane, ["Escape"]);
    sleepMs(500);
    if (!backend.paneInput) throw new Error("target environment has no pane input role");
    backend.paneInput.submit(pane, reloadText);
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
  backend.paneInput?.sendKeys(pane, ["Escape"]);
  sleepMs(500);
  if (!backend.paneInput) throw new Error("target environment has no pane input role");
  backend.paneInput.submit(pane, quitText);
  let shellSeen = false;
  for (let i = 0; i < 16; i++) {
    sleepMs(500);
    if (paneAtShellPrompt(paneForeground(backend, pane))) { shellSeen = true; break; }
  }
  if (!shellSeen) {
    process.stderr.write(`${pane}: agent did not exit after ${quitText} - skipping relaunch.\n`);
    return false;
  }
  backend.paneInput.submit(pane, cmd);
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
  // A reload exists to pick up new code, so stale deployments redeploy first.
  await refreshStaleShims(orchDir());
  const results: ReloadResult[] = [];
  for (const target of targets) {
    try {
      const { entity: ent, backend, handle } = resolveLifecycleTarget(target);
      assertAgentOwned(target, ent, force);
      const agentId = ent.agent ?? ent.presence?.status?.agent;
      if (!agentId) throw new Error(`Target "${target}" has no recorded harness - cannot determine its reload mechanism`);
      const adapter = resolveAdapterOrDie(agentId);
      const reloadCmd = adapter.capabilities.lifecycle.includes("reload") ? adapter.lifecycleCmd?.("reload") : undefined;
      if (!reloadCmd) throw new Error(`adapter ${adapter.id} has no reload mechanism`);
      // No console to type `/reload` into leaves only the daemon, which owns
      // every lifecycle mechanism a backend does or does not have.
      results.push(backend.paneInput
        ? reloadPaneAndAwaitBridge(backend, String(handle), ent.key, reloadCmd.text)
        : await lifecycleThroughDaemon("reload", ent.key, String(handle)));
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
    const quitCmd = adapter.capabilities.lifecycle.includes("restart") ? adapter.lifecycleCmd?.("restart") : undefined;
    if (!quitCmd) die(`Target "${target}" uses adapter ${adapter.id}, which has no restart mechanism.`);
    // A pane is quit and relaunched by typing into its shell; a detached agent
    // has no shell, so the daemon rules on what restart means for it.
    if (!backend.paneInput) {
      const restarted = await lifecycleThroughDaemon("restart", ent.key, String(handle));
      if (restarted.ok) { ok++; if (!json) process.stdout.write(`${restarted.pane}: bridge live.\n`); }
      else process.stderr.write(`${restarted.pane}: ${restarted.reason ?? "restart failed"}\n`);
      continue;
    }
    // Restart is a fresh harness launch, so resolve its model exactly like spawn
    // and reset instead of letting the harness fall back to its own default.
    let launch = cmd;
    if (launch === null) {
      const model = launchModel({}, config, adapter);
      const preferredModels = config.models.preferred[adapter.id] ?? [];
      launch = adapterCommand(agentId, config, { model, preferredModels });
    }
    if (!json) process.stdout.write(`Restarting ${String(handle)} (${launch})...\n`);
    if (restartPaneAndAwaitBridge(backend, String(handle), launch, ent.key, quitCmd.text)) { ok++; if (!json) process.stdout.write(`${String(handle)}: bridge live.\n`); }
  }
  if (json) process.stdout.write(JSON.stringify({ targets, ok, total: targets.length, hard: true }) + "\n");
  else process.stdout.write(`${ok}/${targets.length} restarted with fresh bridge.\n`);
  if (ok !== targets.length) process.exit(1);
}

/** Write the new label into orch's registry, then let the backend show it. */
function renameAgent(
  backend: Backend,
  handle: BackendHandle,
  key: string,
  name: string,
  records: ReadonlyMap<string, SpawnedRecord>,
): boolean {
  const record = records.get(key);
  if (!record) {
    process.stderr.write(`orch rename: ${key} is not an orch-spawned agent; use --pane to relabel the pane.\n`);
    return false;
  }
  assertNameFree(name, record.workspace ?? "");
  if (!writeSpawnedName(orchDir(), key, name)) return false;
  const role = backend.agentNaming;
  if (!role) throw new Error("target environment has no agent naming role");
  role.renameAgent(handle, name);
  return true;
}

export function cmdRename(args: string[]) {
  const paneLabel = args.includes("--pane");
  const json = args.includes("--json");
  const force = args.includes("--force");
  const positional = args.filter((arg) => arg !== "--pane" && arg !== "--json" && arg !== "--force");
  const target = positional[0];
  const name = positional[1];
  if (!target || !name) die("usage: orch rename <target> <name> [--pane] [--force]");
  const records = spawnedRecords();
  const { backend, handle, key } = backendTarget(target, "rename", records);
  assertAgentOwned(target, { key }, force, records);
  // Renaming an agent moves a label only: orch's registry owns the name, the
  // identity key never changes, and every session/daemon route survives it.
  // --pane relabels the backend's pane chrome instead and leaves the name alone.
  let renamed: boolean | undefined;
  try {
    if (paneLabel) {
      if (!backend.paneNaming) throw new Error("target environment has no pane naming role");
      backend.paneNaming.renamePane(handle, name);
      renamed = true;
    } else renamed = renameAgent(backend, handle, key, name, records);
  } catch (error: unknown) {
    die(`orch rename: ${errorMessage(error)}`);
  }
  if (!renamed) die(`Could not rename ${handle}.`);
  if (json) process.stdout.write(JSON.stringify({ target: handle, key, name, paneLabel, renamed: true }) + "\n");
  else process.stdout.write(`${handle} -> ${paneLabel ? "pane label" : "named"} "${name}".\n`);
}

interface RecordedProcess {
  pid: number;
  startToken?: string;
}

/** Read the launch identity from the normalized agent process interval. Presence
 * status carries liveness only and can never authorize a signal. */
function recordedProcess(key: string): RecordedProcess | null {
  try {
    const row = openStore(orchDir()).query(
      "SELECT pid, start_token FROM agent_processes WHERE agent_id = ? AND until IS NULL",
    ).get(key) as { pid?: unknown; start_token?: unknown } | null;
    if (!row || typeof row.pid !== "number") return null;
    return { pid: row.pid, ...(typeof row.start_token === "string" ? { startToken: row.start_token } : {}) };
  } catch {
    return null;
  }
}

/** Whether the recorded process instance is still present after a close attempt. */
function recordedProcessRemains(recorded: RecordedProcess): boolean {
  if (typeof recorded.startToken !== "string") return processIsAlive(recorded.pid);
  for (let attempt = 0; attempt < 40 && processInstanceMatches(recorded.pid, recorded.startToken); attempt++) sleepMs(50);
  return processInstanceMatches(recorded.pid, recorded.startToken);
}

export function cmdClose(args: string[]) {
  const usage = "usage: orch close <target>... | --all [--stream] [--json]";
  const { enabled, positional } = splitOptionFlags(args, ["--all", "--stream", "--json"]);
  const all = enabled.has("--all");
  const stream = enabled.has("--stream");
  const json = enabled.has("--json");
  // Reject unknown flags before resolving or closing any preceding target.
  if (positional.some((argument) => argument.startsWith("--"))) die(usage);
  if (!all && !positional.length) die(usage);

  const targets: { backend: Backend | null; handle: BackendHandle; key: string; recorded: RecordedProcess | null; paneKnown: boolean }[] = [];
  if (all) {
    // --all sweeps every orch-managed record, regardless of owner or spawner.
    // Dead and headless records are cleanup targets too.
    //
    // Each row is read directly, never resolved through a target string:
    // resolution is what makes a stale row ambiguous, and one unresolvable row
    // must not abort the sweep. A bulk close that closes nothing leaves every
    // name reserved, which is exactly when respawning is the only way out.
    for (const record of spawnedRecords().values()) {
      // Every registry row is orch-managed, regardless of which session spawned it.
      // Ending is never gated by ownership or provenance; unmanaged panes have no row.
      const backend = getBackend(record.backend ?? "") ?? null;
      if (!backend) process.stderr.write(`skipping ${record.pane}: unknown backend ${JSON.stringify(record.backend)} (reaping the record)\n`);
      targets.push({
        backend,
        handle: record.handle ?? record.pane,
        key: record.pane,
        recorded: recordedProcess(record.pane),
        // A registry handle is not proof of a live pane. Bulk close may still
        // ask the backend to verify because it enumerates every managed row.
        paneKnown: true,
      });
    }
  }
  for (const target of positional) {
    const resolved = resolveLifecycleTarget(target);
    // Close is an unconditional ending operation: ownership and provenance never gate it.
    targets.push({
      backend: resolved.backend,
      handle: resolved.handle,
      key: resolved.record.pane,
      recorded: recordedProcess(resolved.record.pane),
      // A pane-capable backend's stale registry row may outlive its pane. Do
      // not invoke a provider with an opaque identity handle in that case.
      paneKnown: resolved.entity.paneId !== null || resolved.backend.paneInventory === null,
    });
  }

  let ok = 0;
  const closed: string[] = [];
  const seen = new Set<string>();
  for (const target of targets) {
    if (seen.has(target.key)) continue;
    seen.add(target.key);
    let signalled = false;
    let closeFailed = false;
    let closedByBackend = false;
    const recorded = target.recorded;
    const recordedLive = recorded !== null && processIsAlive(recorded.pid);
    const identityProven = recorded !== null
      && recordedLive
      && typeof recorded.startToken === "string"
      && processInstanceMatches(recorded.pid, recorded.startToken);
    const paneHost = target.backend?.paneHost;
    const paneCapable = target.paneKnown
      && ((paneHost !== null && paneHost !== undefined) || target.backend?.capabilities.panes === true);

    if (identityProven && recorded) {
      // Signal only the recorded process instance. Reaping waits until that
      // same (pid,start_token) instance is gone, never merely until kill(2)
      // accepts the request.
      try { process.kill(recorded.pid, "SIGTERM"); signalled = true; } catch { closeFailed = true; }
      if (signalled && recordedProcessRemains(recorded)) closeFailed = true;
    } else if (paneCapable) {
      // A pane host owns closure when process identity is unavailable. Its
      // close throws on failure; the legacy backend boolean is checked too.
      try {
        if (paneHost) {
          paneHost.close(target.handle);
          closedByBackend = true;
        } else if (target.backend?.close(target.handle)) {
          closedByBackend = true;
        } else {
          closeFailed = true;
        }
      } catch {
        closeFailed = true;
      }
    } else if (recordedLive && typeof recorded?.startToken !== "string") {
      // A live process without a launch token cannot be safely signalled or
      // reaped: losing the row would make that process unreachable.
      closeFailed = true;
    }

    // A backend's successful close is not proof when the plexer still lists
    // the handle. Verify after every close attempt, including a process kill.
    if (!closeFailed && paneCapable) {
      try {
        const inventory = target.backend?.paneInventory;
        const list = inventory ? inventory.list() : target.backend?.inventory?.();
        if (list?.some((entry) => entry.handle === target.handle)) closeFailed = true;
      } catch {
        closeFailed = true;
      }
    }

    if (closeFailed) {
      process.stderr.write(`Could not close ${String(target.handle)}; process or pane remains registered.\n`);
      continue;
    }
    reapSpawnedRecord(target.key);
    ok++;
    closed.push(String(target.handle));
    if (!json) process.stdout.write(`Closed ${String(target.handle)}${closedByBackend || signalled ? "." : " (already stopped)."}\n`);
  }
  const targetCount = seen.size;
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
  const target = args.find((arg) => arg !== "--json" && arg !== "--force");
  if (!target) die("usage: orch abort <target> [--force] [--json]");
  // Abort is an unconditional ending operation: resolve from orch's registry so
  // a foreign-workspace target is still reachable, and never apply owner gates.
  const { backend, handle, entity } = resolveLifecycleTarget(target);
  const noPane = (!entity.paneId || !backend.paneInventory) && !backend.canSendKeys;
  if (noPane || (!backend.paneInput && !backend.canSendKeys)) {
    const reason = noPane ? "no-pane" : "no-environment-role";
    const text = noPane ? `${target} has no pane; abort does not apply.` : "this pane environment does not provide abort";
    if (json) process.stdout.write(JSON.stringify({ outcome: "answer", reason, text }) + "\n");
    else process.stdout.write(text + "\n");
    return;
  }
  const input = backend.paneInput;
  const sendKeys = input
    ? (pane: BackendHandle, keys: readonly string[]) => input.sendKeys(pane, keys)
    : (pane: BackendHandle, keys: readonly string[]) => { if (!backend.sendKeys(pane, keys)) throw new Error(`Could not send keys to ${String(pane)}.`); };
  sendKeys(handle, ["Escape"]);
  sleepMs(500);
  sendKeys(handle, ["Escape"]);
  if (json) process.stdout.write(JSON.stringify({ target: handle, aborted: true }) + "\n");
  else process.stdout.write(`Aborted ${String(handle)}.\n`);
}


