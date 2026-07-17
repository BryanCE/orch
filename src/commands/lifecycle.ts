import { execFileSync } from "node:child_process";
import * as files from "node:fs";
import * as path from "node:path";
import { buildExtensionBundle, PI_EXTENSION_NAMES } from "../bridge-bundle.ts";
import { buildEntities, resolvePane } from "../entities.ts";
import { isRecord, orchDir, pidAlive, presenceAgentDir, readJSON, spawnedRecords } from "../store.ts";
import { errorMessage, packageRoot } from "../util.ts";
import type { Backend, BackendHandle } from "../backends/backend.ts";

import { allBackends } from "../backends/registry.ts";
import { adapterCommand, resolveAdapter, workerPrompt } from "./spawn.ts";
import { entityAdapter } from "./status.ts";
import { parseGovernance, writeRpc } from "./daemon.ts";
import { splitOptionFlags, die, backendTarget, parseTargetPrompt } from "./target.ts";

interface StatusFile {
  pid?: number;
  updatedAt?: string;
  state?: string;
}
/** Dispatch a prompt and retry once when the pane never enters working state. */
export async function cmdRun(args: string[]): Promise<void> {
  const raw = args.includes("--raw");
  const json = args.includes("--json");
  const { gov, rest } = parseGovernance(args.filter((arg) => arg !== "--json"));
  const { target, prompt } = parseTargetPrompt(rest, "--raw", 'usage: orch run <target> "<prompt>" [--raw] [--steal] [--cross-workspace] [--json]');
  const { ent, pane } = resolvePane(target, { crossWorkspace: gov.crossWorkspace });
  const result = await writeRpc("dispatch", { target: pane, text: workerPrompt(prompt, raw, entityAdapter(ent)) }, gov);
  if (json) process.stdout.write(JSON.stringify({ target: pane, dispatched: true, ...(isRecord(result) ? result : {}) }) + "\n");
  else process.stdout.write(`Dispatched to ${pane}.\n`);
}

export function cmdWait(args: string[]) {
  let status = "done";
  let timeout = 300000;
  const json = args.includes("--json");
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--status") status = args[++i]!;
    else if (args[i] === "--timeout") timeout = parseInt(args[++i]!, 10) || 300000;
    else if (args[i] === "--json") continue;
    else positional.push(args[i]!);
  }
  const target = positional[0];
  if (!target) die("usage: orch wait <target> [--status done|idle|working|blocked] [--timeout ms]");
  const { backend, handle } = backendTarget(target, "wait");
  if (!backend.waitAgentStatus) die(`backend ${backend.id} lacks agent status waiting.`);
  if (!backend.waitAgentStatus(handle, status, timeout)) die(`wait for ${handle} → "${status}" failed/timed out.`);
  if (json) process.stdout.write(JSON.stringify({ target: handle, status, reached: true }) + "\n");
  else process.stdout.write(`${handle} reached "${status}".\n`);
}

export function cmdNew(args: string[]) {
  const json = args.includes("--json");
  const targets: string[] = [];
  for (const arg of args) {
    if (arg === "--json") continue;
    if (arg === "--all") {
      for (const ent of buildEntities()) if (ent.paneId && ent.presence) targets.push(ent.paneId);
    } else targets.push(arg);
  }
  if (!targets.length) die("usage: orch reset <target>... | --all [--json]");
  const results: { target: string; cleared: true; ready: true }[] = [];
  for (const target of targets) {
    const { ent } = resolvePane(target);
    const { backend, handle } = backendTarget(target, "reset");
    const adapter = resolveAdapter(ent.agent ?? ent.presence?.status?.agent ?? "pi");
    const resetCmd = adapter.caps.lifecycle.includes("reset") ? adapter.lifecycleCmd?.("reset") : undefined;
    if (!resetCmd) die(`${handle}: adapter ${adapter.id} has no reset mechanism.`);
    const statusPath = path.join(presenceAgentDir(ent.key), "status.json");
    const before = readJSON<StatusFile>(statusPath);
    const beforeUpdated = Date.parse(typeof before?.updatedAt === "string" ? before.updatedAt : "");
    const sentAt = Date.now();
    if (!backend.deliver(handle, { kind: "run", text: resetCmd.text })) die(`Could not reset ${handle}.`);

    const deadline = sentAt + 75_000;
    let ready = false;
    while (Date.now() < deadline) {
      const status = readJSON<StatusFile>(statusPath);
      const updated = Date.parse(typeof status?.updatedAt === "string" ? status.updatedAt : "");
      const advanced = Number.isFinite(updated)
        && (!Number.isFinite(beforeUpdated) || updated > beforeUpdated)
        && updated >= sentAt - 1000;
      if (advanced && status?.state === "idle") { ready = true; break; }
      sleepMs(250);
    }
    if (!ready) die(`${handle}: ${adapter.id} reset (${resetCmd.text}) did not become ready within 75s.`);
    results.push({ target: handle, cleared: true, ready: true });
    if (!json) process.stdout.write(`Cleared session on ${handle} (${resetCmd.text}); ready.\n`);
  }
  if (json) process.stdout.write(JSON.stringify(results.length === 1 ? results[0] : results) + "\n");
}

export function paneForeground(backend: Backend, handle: string): string[] {
  return backend.foregroundProcesses?.(handle) ?? [];
}

interface ReloadResult {
  pane: string;
  ok: boolean;
  reason?: string;
}

export function doReload(backend: Backend, pane: string, presenceKey: string, reloadText: string): ReloadResult {
  try {
    const statusPath = path.join(presenceAgentDir(presenceKey), "status.json");
    const old = readJSON<StatusFile>(statusPath);
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
      const st = readJSON<StatusFile>(statusPath);
      if (typeof st?.pid === "number" && typeof st.updatedAt === "string"
        && pidAlive(st.pid) && Date.parse(st.updatedAt) > Date.parse(oldUpdatedAt)) return { pane, ok: true };
    }
    return { pane, ok: false, reason: errorMessage(`bridge status.json did not refresh within 30s after ${reloadText}`) };
  } catch (error: unknown) {
    return { pane, ok: false, reason: errorMessage(error) };
  }
}

export function touchReloadSignal(): void {
  const signalPath = path.join(orchDir(), "reload.signal");
  const fd = files.openSync(signalPath, "a");
  files.closeSync(fd);
}

export function doHardRestart(backend: Backend, pane: string, cmd: string, presenceKey: string, quitText: string): boolean {
  const statusPath = path.join(presenceAgentDir(presenceKey), "status.json");
  const oldPid = readJSON<StatusFile>(statusPath)?.pid ?? null;
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
    process.stderr.write(`${pane}: agent did not exit after ${quitText} — skipping relaunch.\n`);
    return false;
  }
  backend.deliver(pane, { kind: "run", text: cmd });
  for (let i = 0; i < 40; i++) {
    sleepMs(500);
    const st = readJSON<StatusFile>(statusPath);
    if (typeof st?.pid === "number" && st.pid !== oldPid && pidAlive(st.pid)) return true;
  }
  process.stderr.write(`${pane}: relaunched but bridge status.json did not refresh within 20s.\n`);
  return false;
}

export function cmdReload(args: string[]) {
  const json = args.includes("--json");
  const all = args.includes("--all");
  const targets: string[] = [];
  for (const arg of args) {
    if (arg === "--json") continue;
    if (arg === "--all") {
      for (const ent of buildEntities()) if (ent.paneId && ent.presence) targets.push(ent.paneId);
    } else targets.push(arg);
  }
  // `--all` is a valid invocation even with zero live panes: it still touches
  // reload.signal (SIGNALED) for config/extension watchers. Only a bare call
  // with neither --all nor a target is a usage error.
  if (!all && !targets.length) die("usage: orch reload <target>... | --all [--json]");
  try {
    for (const name of PI_EXTENSION_NAMES) buildExtensionBundle(packageRoot(), name);
  } catch (error: unknown) {
    process.stderr.write(`warning: could not rebuild extension bundles: ${errorMessage(error)}\n`);
  }
  const results: ReloadResult[] = [];
  for (const target of targets) {
    try {
      const { ent } = resolvePane(target);
      const { backend, handle } = backendTarget(target, "reload");
      const adapter = resolveAdapter(ent.agent ?? ent.presence?.status?.agent ?? "pi");
      const reloadCmd = adapter.caps.lifecycle.includes("reload") ? adapter.lifecycleCmd?.("reload") : undefined;
      if (!reloadCmd) throw new Error(`adapter ${adapter.id} has no reload mechanism`);
      results.push(doReload(backend, handle, ent.key, reloadCmd.text));
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

export function cmdRestart(args: string[]) {
  let cmd: string | null = null;
  const json = args.includes("--json");
  const targets: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--cmd") cmd = args[++i]!;
    else if (args[i] === "--hard" || args[i] === "--json") continue;
    else if (args[i] === "--all") {
      for (const ent of buildEntities()) if (ent.paneId && ent.presence) targets.push(ent.paneId);
    } else targets.push(args[i]!);
  }
  if (!targets.length) die("usage: orch restart <target>... | --all [--cmd pi] [--json]");
  let ok = 0;
  for (const target of targets) {
    const { ent } = resolvePane(target);
    const agentId = ent.agent ?? ent.presence?.status?.agent;
    if (!agentId) die(`Target "${target}" has no recorded harness — cannot determine its restart mechanism.`);
    const adapter = resolveAdapter(agentId);
    const quitCmd = adapter.caps.lifecycle.includes("restart") ? adapter.lifecycleCmd?.("restart") : undefined;
    if (!quitCmd) die(`Target "${target}" uses adapter ${adapter.id}, which has no restart mechanism.`);
    const launch = cmd ?? adapterCommand(agentId);
    const { backend, handle } = backendTarget(target, "restart");
    if (!json) process.stdout.write(`Restarting ${handle} (${launch})...\n`);
    if (doHardRestart(backend, handle, launch, ent.key, quitCmd.text)) { ok++; if (!json) process.stdout.write(`${handle}: bridge live.\n`); }
  }
  if (json) process.stdout.write(JSON.stringify({ targets, ok, total: targets.length, hard: true }) + "\n");
  else process.stdout.write(`${ok}/${targets.length} restarted with fresh bridge.\n`);
  if (ok !== targets.length) process.exit(1);
}

export function cmdRename(args: string[]) {
  const paneLabel = args.includes("--pane");
  const json = args.includes("--json");
  const positional = args.filter((arg) => arg !== "--pane" && arg !== "--json");
  const target = positional[0];
  const name = positional[1];
  if (!target || !name) die("usage: orch rename <target> <name> [--pane]");
  const { backend, handle } = backendTarget(target, "rename");
  const renamed = paneLabel ? backend.renamePane?.(handle, name) : backend.renameAgent?.(handle, name);
  if (!renamed) die(`Could not rename ${handle}.`);
  if (json) process.stdout.write(JSON.stringify({ target: handle, name, paneLabel, renamed: true }) + "\n");
  else process.stdout.write(`${handle} → ${paneLabel ? "pane label" : "named"} "${name}".\n`);
}

export function cmdClose(args: string[]) {
  const { enabled, positional } = splitOptionFlags(args, ["--all", "--stream", "--json"]);
  const all = enabled.has("--all");
  const stream = enabled.has("--stream");
  const json = enabled.has("--json");
  if (!all && !positional.length) die("usage: orch close <target>... | --all [--stream]");

  const targets: { backend: Backend; handle: BackendHandle }[] = [];
  if (all) {
    const selfByBackend = new Map(allBackends().map((backend) => [backend.id, backend.currentIdentity?.()?.handle ?? null]));
    const mine = spawnedRecords();
    for (const backend of allBackends()) {
      const inventory = backend.inventory?.() ?? [];
      for (const item of inventory) {
        if (item.handle === selfByBackend.get(backend.id)) continue;
        const record = [...mine.values()].find((candidate) => candidate.backend === backend.id && candidate.handle === String(item.handle));
        if (record) targets.push({ backend, handle: item.handle });
      }
    }
  }
  for (const target of positional) {
    const { backend, handle } = backendTarget(target, "close");
    targets.push({ backend, handle });
  }

  let ok = 0;
  const closed: string[] = [];
  for (const target of targets) {
    if (target.backend.close(target.handle)) { ok++; closed.push(String(target.handle)); if (!json) process.stdout.write(`Closed ${String(target.handle)}.\n`); }
    else if (!json) process.stderr.write(`Could not close ${String(target.handle)}.\n`);
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

