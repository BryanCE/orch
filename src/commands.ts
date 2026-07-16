import { execFileSync } from "node:child_process";
import * as files from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { randomUUID } from "node:crypto";
import { deliverToSink, loadSinks, notify, notificationText, type NotifyEvent, type Sink } from "./notify.ts";
import { addTask, cancelTask, listTasks, history as queueHistory, type TaskRec } from "./queue.ts";
import { runDoctor, applyFixes, binaryStatus, checkExtensions, isBridgeExtensionStale, type CheckResult } from "./doctor.ts";
import { setupIntro, setupOutro, selectAdapters, selectDefaultAdapter, selectBackends, selectDefaultBackend, selectNotifiers, chooseInstalls } from "./setup/wizard.ts";
import { renderDoctorResults, pickFixes } from "./setup/doctor-wizard.ts";
import { withSpinner, promptText } from "./setup/io.ts";
import { probeNotifiers, buildSelectedNotifyEntries } from "./setup/notifiers.ts";
import { buildExtensionBundle, PI_EXTENSION_NAMES } from "./bridge-bundle.ts";
import { loadConfig, resolveSetting, resolveWithSource, settingsPath, writeSettingsDefault, writeSettingsInstalled, writeSettingsNotify, type HostConfig, type OrchConfig } from "./config.ts";
import { bridgeRegistered, defaultModelString, isRecord, loadPresence, orchDir, pidAlive, presenceDir, presenceAgentDir, readJSON, recordSpawned, spawnedRecords, type PresenceEntry, type SpawnedRecord } from "./store.ts";
import { presenceFor } from "./adapters/pi.ts";
import { allAdapters, getAdapter, resolveAdapter as resolveRegisteredAdapter } from "./adapters/registry.ts";
import type { AgentAdapter, SessionView } from "./adapters/adapter.ts";
import { blockText, isToolCallContentBlock, parseSession, type SessionEntry, type ToolCallContentBlock } from "./session.ts";
import { buildEntities, collapse, currentWorkspace, entityWorkspace, parseTarget, resolvePane, resolveTarget, scopeEntitiesToWorkspace, selfActor, sortEntities, workspaceOf, type Entity } from "./entities.ts";
import { serializeIdentity, parseIdentity, tryParseIdentity } from "./backends/identity.ts";
import { runRemoteAsync, runSSH } from "./remote.ts";
import { headlessBackend, type HeadlessHandle } from "./backends/headless/index.ts";
import type { Backend, BackendGroup, BackendGroupLayout, BackendHandle } from "./backends/backend.ts";
import { allBackends, getBackend, resolveBackend } from "./backends/registry.ts";
import { renderTable, truncate } from "./table.ts";
import { errorMessage, packageRoot } from "./util.ts";
import { daemonize, runForeground } from "./daemon/lifecycle.ts";
import { DaemonAbsentError, rpcCall } from "./daemon/rpc.ts";
import { derivePresenceTransition, startPreferredEvents, startPresenceWatch, type PresenceMetadata, type PresenceWatch } from "./daemon/events.ts";
import { scopeToWorkspace, workspaceName } from "./policy/workspace.ts";
import {
  createAgentWorktree,
  listAgentWorktrees,
  mergeReviewBranch,
  removeMergedWorktree,
  removeDiscardedWorktree,
  repositoryBranch,
  repositoryCommonRoot,
  worktreeBranch,
  worktreeHasChanges,
  worktreeHasCommitsAheadOf,
  worktreeReviewSummary,
} from "./worktree.ts";

const HOME = os.homedir();
const isTTY = process.stdout.isTTY;
const dim = (text: string) => (isTTY ? `\x1b[2m${text}\x1b[0m` : text);

function formatWorkspace(id: string | null | undefined, name: string | null | undefined): string {
  if (!id) return "-";
  return name && name !== id ? `${name} (${id})` : name ?? id;
}

function displayWorkspace(id: string | null | undefined, resolver: OrchConfig["workspaces"]): string {
  return formatWorkspace(id, workspaceName(id, resolver));
}

function die(msg: string): never {
  process.stderr.write(msg + "\n");
  process.exit(1);
}

function firstNonEmptyText(...values: (string | null | undefined)[]): string {
  return values.find((value) => Boolean(value)) ?? "";
}

function resultText(value: unknown): string | undefined {
  return isRecord(value) && typeof value.text === "string" ? value.text : undefined;
}

function splitOptionFlags(args: string[], names: readonly string[]): { enabled: Set<string>; positional: string[] } {
  const known = new Set(names);
  const enabled = new Set<string>();
  const positional: string[] = [];
  for (const argument of args) {
    if (known.has(argument)) enabled.add(argument);
    else positional.push(argument);
  }
  return { enabled, positional };
}

function parseTargetPrompt(args: string[], ignoredFlag: string, usage: string): { target: string; prompt: string } {
  const positional = args.filter((argument) => argument !== ignoredFlag);
  const target = positional[0];
  const prompt = positional.slice(1).join(" ");
  if (!target || !prompt) die(usage);
  return { target, prompt };
}

interface View {
  entity: Entity;
  paneLabel: string;
  name: string;
  tab: string;
  agent: string;
  model: string; // display, provider stripped
  modelFull: string;
  state: string;
  stateFallback: boolean; // true → append †
  staleExtension: boolean; // true → append (stale)
  cost: number;
  ctxPercent: number | null;
  task: string;
  last: string;
  exited: boolean;
  sview: SessionView | null;
}

function deriveView(ent: Entity, spawned: Map<string, SpawnedRecord>): View {
  const pres = ent.presence;
  const isPi = ent.agent === "pi";
  const adapter = getAdapter(spawned.get(ent.key)?.adapter ?? pres?.status?.agent ?? ent.agent ?? "");
  const sview = (adapter?.caps.sessionTail && ent.sessionPath ? adapter.readSessionView?.({ sessionPath: ent.sessionPath }) : undefined) ?? null;

  // ---- model ----
  let modelFull = "";
  if (pres?.status?.model && pres.status.model.id) {
    const m = pres.status.model;
    const think = pres.status.thinking ?? "";
    modelFull = `${m.provider ?? ""}/${m.id}${think ? ":" + think : ""}`;
  } else if (sview?.model) {
    const prov = sview.provider ?? "";
    const think = sview.thinking ?? "";
    modelFull = `${prov}/${sview.model}${think ? ":" + think : ""}`;
  } else if (isPi) {
    modelFull = defaultModelString() + " (default)";
  } else {
    modelFull = "-";
  }
  const model = modelFull.replace(/^openai-codex\//, "");

  // ---- state ----
  let state: string;
  let stateFallback = false;
  let exited = false;
  if (pres?.status) {
    if (!pres.alive) {
      state = "exited";
      exited = true;
    } else {
      state = pres.status.asking ? "asking" : pres.status.state ?? "unknown";
    }
    // presence = live bridge → no fallback marker
  } else {
    // no live bridge → backend status or session fallback
    state = ent.backendStatus ?? sview?.state ?? (sview ? "idle" : "unknown");
    stateFallback = true;
  }

  // ---- cost ----
  let cost = 0;
  if (pres?.status && typeof pres.status.cost === "number") cost = pres.status.cost;
  else if (typeof sview?.cost === "number") cost = sview.cost;

  // ---- ctx percent ----
  let ctxPercent: number | null = null;
  if (pres?.status?.context && typeof pres.status.context.percent === "number")
    ctxPercent = pres.status.context.percent;

  // ---- task / last ----
  const task = firstNonEmptyText(
    pres?.status?.asking?.question ? `Q: ${pres.status.asking.question}` : undefined,
    pres?.status?.task,
    sview?.task,
  );
  const last = firstNonEmptyText(
    pres?.status?.lastText,
    resultText(pres?.result),
    sview?.lastText,
  );

  const paneLabel = (ent.paneId ?? ent.key) + (ent.focused ? "*" : "");
  return {
    entity: ent,
    paneLabel,
    name: ent.name ?? "",
    tab: ent.tabLabel ?? "-",
    agent: pres?.status?.agent ?? (spawned.get(ent.key)?.adapter) ?? ent.agent ?? "-",
    model,
    modelFull,
    state,
    stateFallback,
    staleExtension: isBridgeExtensionStale(pres?.status?.extensionHash),
    cost,
    ctxPercent,
    task: collapse(task),
    last: collapse(last),
    exited,
    sview,
  };
}


function cmdStatusLocal(args: string[]) {
  const { enabled } = splitOptionFlags(args, ["--json", "--all", "--local"]);
  const json = enabled.has("--json");
  const all = enabled.has("--all");
  const entities = scopeEntitiesToWorkspace(sortEntities(buildEntities()), { all });
  const workspaces = loadConfig(orchDir()).workspaces;
  const spawned = spawnedRecords();
  const views = entities.map((entity) => deriveView(entity, spawned));

  // Hide exited presence entries with no matching live pane, unless --all
  const visible = views.filter((v) => {
    if (all) return true;
    if (v.exited && v.entity.presenceOnly) return false;
    // presence-only with dead pid
    if (v.entity.presenceOnly && v.entity.presence && !v.entity.presence.alive) return false;
    return true;
  });

  if (json) {
    // full merged objects, untruncated
    const out = visible.map((v) => ({
      key: v.entity.key,
      paneId: v.entity.paneId,
      name: v.entity.name,
      tab: v.entity.tabLabel,
      agent: v.entity.agent,
      focused: v.entity.focused,
      model: v.modelFull,
      modelShort: v.model,
      state: v.state,
      stateFallback: v.stateFallback,
      exited: v.exited,
      cost: v.cost,
      ctxPercent: v.ctxPercent,
      task: v.entity.presence?.status?.asking?.question
        ? `Q: ${v.entity.presence.status.asking.question}`
        : v.entity.presence?.status?.task ?? v.sview?.task ?? null,
      lastText:
        v.entity.presence?.status?.lastText ??
        resultText(v.entity.presence?.result) ??
        v.sview?.lastText ??
        null,
      backendStatus: v.entity.backendStatus,
      sessionPath: v.entity.sessionPath,
      presenceDir: v.entity.presence?.dir ?? null,
      presenceOnly: v.entity.presenceOnly,
      tokens: v.sview?.tokens ?? v.entity.presence?.status?.tokens ?? null,
      turns: v.entity.presence?.status?.turns ?? v.sview?.turns ?? null,
      workspace: entityWorkspace(v.entity),
      workspaceName: workspaceName(entityWorkspace(v.entity), workspaces),
      staleExtension: v.staleExtension,
    }));
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    return;
  }

  const headers = ["PANE", "NAME", "TAB", "AGENT", "MODEL", "STATE", "COST", "CTX", "TASK", "LAST"];
  const caps = [12, 14, 10, 6, 30, 12, 8, 5, 40, 50];
  const rows: string[][] = [];
  const rawExited: boolean[] = [];
  const showWorkspace = all && new Set(visible.map((v) => entityWorkspace(v.entity) ?? "-")).size > 1;
  for (const v of visible) {
    rows.push([
      v.paneLabel,
      showWorkspace ? `${displayWorkspace(entityWorkspace(v.entity), workspaces)} / ${v.name}` : v.name,
      v.tab,
      v.agent,
      v.model,
      v.state + (v.stateFallback ? "†" : "") + (v.staleExtension ? " (stale)" : ""),
      v.cost > 0 ? "$" + v.cost.toFixed(2) : "",
      v.ctxPercent != null ? `${Math.round(v.ctxPercent)}%` : "",
      truncate(v.task, 40),
      truncate(v.last, 50),
    ]);
    rawExited.push(v.exited);
  }
  if (rows.length === 0) {
    process.stdout.write("No panes found (backend down and no agent dirs).\n");
    return;
  }
  // render with dim for exited rows
  const table = renderTable(headers, rows, caps);
  const lines = table.split("\n");
  const out: string[] = [lines[0] ?? "", lines[1] ?? ""];
  for (let i = 0; i < rows.length; i++) {
    const line = lines[i + 2] ?? "";
    out.push(rawExited[i] ? dim(line) : line);
  }
  process.stdout.write(out.join("\n") + "\n");
}

interface StatusRow {
  key: string;
  paneId: string | null;
  name: string | null;
  tab: string | null;
  agent: string | null;
  focused: boolean;
  model: string;
  modelShort: string;
  state: string;
  stateFallback: boolean;
  staleExtension?: boolean;
  exited: boolean;
  cost: number;
  ctxPercent: number | null;
  task: string | null;
  lastText: string | null;
  backendStatus: string | null;
  sessionPath: string | null;
  presenceDir: string | null;
  presenceOnly: boolean;
  tokens: unknown;
  turns: unknown;
  workspace?: string | null;
  workspaceName?: string | null;
  host?: string;
  warning?: string;
}

function localStatusRows(args: string[]): StatusRow[] {
  const { enabled } = splitOptionFlags(args, ["--json", "--all", "--local"]);
  const all = enabled.has("--all");
  const entities = scopeEntitiesToWorkspace(sortEntities(buildEntities()), { all });
  const workspaces = loadConfig(orchDir()).workspaces;
  const spawned = spawnedRecords();
  const views = entities.map((entity) => deriveView(entity, spawned));
  return views.filter((v) => all || (!v.exited || !v.entity.presenceOnly) && !(v.entity.presenceOnly && v.entity.presence && !v.entity.presence.alive))
    .map((v) => ({
      key: v.entity.key,
      paneId: v.entity.paneId,
      name: v.entity.name,
      tab: v.entity.tabLabel,
      agent: v.entity.agent,
      focused: v.entity.focused,
      model: v.modelFull,
      modelShort: v.model,
      state: v.state,
      stateFallback: v.stateFallback,
      exited: v.exited,
      cost: v.cost,
      ctxPercent: v.ctxPercent,
      task: v.entity.presence?.status?.asking?.question
        ? `Q: ${v.entity.presence.status.asking.question}`
        : v.entity.presence?.status?.task ?? v.sview?.task ?? null,
      lastText: v.entity.presence?.status?.lastText ?? resultText(v.entity.presence?.result) ?? v.sview?.lastText ?? null,
      backendStatus: v.entity.backendStatus,
      sessionPath: v.entity.sessionPath,
      presenceDir: v.entity.presence?.dir ?? null,
      presenceOnly: v.entity.presenceOnly,
      tokens: v.sview?.tokens ?? v.entity.presence?.status?.tokens ?? null,
      turns: v.entity.presence?.status?.turns ?? v.sview?.turns ?? null,
      workspace: entityWorkspace(v.entity),
      workspaceName: workspaceName(entityWorkspace(v.entity), workspaces),
      staleExtension: v.staleExtension,
      host: "local",
    }));
}

function warningStatusRow(host: string, warning: string): StatusRow {
  return {
    key: `warning:${host}`, paneId: null, name: "WARNING", tab: null, agent: null,
    focused: false, model: "", modelShort: "", state: "warning", stateFallback: false, staleExtension: false,
    exited: false, cost: 0, ctxPercent: null, task: warning, lastText: null,
    backendStatus: null, sessionPath: null, presenceDir: null, presenceOnly: false,
    tokens: null, turns: null, host, warning,
  };
}

function remoteCommandArgs(host: HostConfig, command: string, args: readonly string[]): string {
  const quote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;
  const prefix = host.orch_dir ? `env ORCH_DIR=${quote(host.orch_dir)} ` : "";
  return `${prefix}orch ${[command, ...args].map(quote).join(" ")}`;
}

function remoteWrite(hostName: string, command: string, args: readonly string[]): void {
  const host = loadConfig(orchDir()).hosts[hostName];
  const destination = host?.dest;
  if (!host || !destination) die(`Host "${hostName}" has no SSH destination.`);
  const result = runSSH(destination, remoteCommandArgs(host, command, args), { timeoutMs: host.timeout_ms });
  if (!result.ok) die(`Host "${hostName}" is unreachable: ${result.stderr.trim() || "ssh failed"}`);
  if (result.stdout) process.stdout.write(result.stdout.endsWith("\n") ? result.stdout : result.stdout + "\n");
}

function targetHost(target: string): { host: string; target: string } | null {
  try {
    const ref = parseTarget(target, loadConfig(orchDir()).hosts);
    return ref.host ? { host: ref.host, target: ref.target } : null;
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

async function cmdStatus(args: string[]): Promise<void> {
  const { enabled } = splitOptionFlags(args, ["--json", "--all", "--local", "--offline"]);
  const offline = enabled.has("--offline");
  if (!offline) await ensureDaemon(orchDir());
  const json = enabled.has("--json");
  const all = enabled.has("--all");
  const localOnly = enabled.has("--local");
  const hosts = loadConfig(orchDir()).hosts;
  if (localOnly || Object.keys(hosts).length === 0) {
    cmdStatusLocal(args);
    return;
  }
  const local = localStatusRows(args);
  const remoteResults = await Promise.all(Object.entries(hosts).map(async ([name, host]) => ({
    name,
    result: await runRemoteAsync(name, host, ["status", ...(offline ? ["--offline"] : [])], { timeoutMs: host.timeout_ms }),
  })));
  const rows: StatusRow[] = [...local];
  for (const { name, result } of remoteResults) {
    if (!result.ok) {
      rows.push(warningStatusRow(name, result.failure.message));
      continue;
    }
    if (!Array.isArray(result.value)) {
      rows.push(warningStatusRow(name, `Host "${name}" returned an invalid status payload.`));
      continue;
    }
    for (const value of result.value) if (value && typeof value === "object") rows.push({ ...(value as StatusRow), host: name });
  }
  if (json) {
    process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
    return;
  }
  const showWorkspace = all && new Set(rows.map((row) => row.workspace ?? "-")).size > 1;
  const headers = ["HOST", "PANE", ...(showWorkspace ? ["WORKSPACE"] : []), "NAME", "TAB", "AGENT", "MODEL", "STATE", "COST", "CTX", "TASK", "LAST"];
  const tableRows = rows.map((row) => [
    row.host ?? "local", row.warning ? "-" : row.paneId ?? row.key,
    ...(showWorkspace ? [formatWorkspace(row.workspace, row.workspaceName)] : []),
    row.name ?? (row.warning ? "WARNING" : ""), row.tab ?? "-", row.agent ?? "-", row.modelShort || row.model || "-", row.state + (row.staleExtension ? " (stale)" : ""),
    row.cost > 0 ? "$" + row.cost.toFixed(2) : "", row.ctxPercent != null ? `${Math.round(row.ctxPercent)}%` : "",
    truncate(row.task ?? "", 40), truncate(row.lastText ?? "", 50),
  ]);
  if (!tableRows.length) {
    process.stdout.write("No panes found (backend down and no agent dirs).\n");
    return;
  }
  process.stdout.write(renderTable(headers, tableRows,
    showWorkspace ? [10, 14, 20, 14, 10, 8, 30, 12, 8, 5, 40, 50] : [10, 14, 14, 10, 8, 30, 12, 8, 5, 40, 50]) + "\n");
}

interface ReviewItem {
  target: string;
  pane: string;
  branch: string;
  worktree: string;
  base: string;
  state: string;
  task: string;
  summary: string;
  diff: string;
  commitsAhead: number;
  adapter: string;
  repoRoot: string;
}

function reviewTarget(record: SpawnedRecord): string {
  const branch = record.branch ?? "";
  return branch.startsWith("orch/") ? branch.slice("orch/".length) : branch || record.pane;
}

function reviewItems(): ReviewItem[] {
  const records = spawnedRecords();
  const presence = loadPresence();
  const items: ReviewItem[] = [];
  for (const record of records.values()) {
    if (!record.worktree || !record.branch) continue;
    if (presence.get(record.pane)?.status?.state !== "done") continue;
    try {
      const baseRoot = repositoryCommonRoot(record.worktree);
      const base = repositoryBranch(baseRoot);
      const details = worktreeReviewSummary(record.worktree, base, record.branch);
      if (details.commitsAhead === 0) continue;
      const entry = presence.get(record.pane);
      const status = entry?.status;
      const adapter = record.adapter ?? status?.agent;
      if (!adapter) continue;
      const resultSummary = resultText(entry?.result) ? collapse(resultText(entry?.result)!) : "";
      items.push({
        target: reviewTarget(record),
        pane: record.pane,
        branch: record.branch,
        worktree: record.worktree,
        base,
        state: "done",
        task: status?.task ?? "",
        summary: resultSummary || details.summary,
        diff: details.diff,
        commitsAhead: details.commitsAhead,
        adapter,
        repoRoot: baseRoot,
      });
    } catch {
      // Stale or removed worktrees are not reviewable.
    }
  }
  return items;
}

function findReviewItem(target: string): ReviewItem {
  const item = reviewItems().find((candidate) => [candidate.target, candidate.pane, candidate.branch, candidate.worktree].includes(target));
  if (!item) die(`No reviewable worktree matches "${target}". Run 'orch review list'.`);
  return item;
}

async function cmdReviewInteractive(): Promise<void> {
  const items = reviewItems();
  if (!items.length) {
    process.stdout.write("No worktree reviews pending.\n");
    return;
  }

  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (const item of items) {
      process.stdout.write(`\n=== ${item.target}: ${item.branch} vs ${item.base} ===\n`);
      if (item.task) process.stdout.write(`Task: ${item.task}\n`);
      if (item.summary) process.stdout.write(`Summary: ${item.summary}\n`);
      process.stdout.write("\n" + (item.diff || "(no diff)\n") + (item.diff?.endsWith("\n") ? "" : "\n"));

      let action = "";
      while (action !== "a" && action !== "r" && action !== "s") {
        action = (await rl.question("Action [a]pprove/[r]eject/[s]kip: ")).trim().toLowerCase();
      }
      if (action === "s") continue;
      if (action === "a") {
        await cmdReview(["approve", item.target]);
        continue;
      }

      let feedback = "";
      while (!feedback.trim()) feedback = await rl.question("Feedback: ");
      await cmdReview(["reject", item.target, "-m", feedback]);
    }
  } finally {
    rl.close();
  }
}

async function cmdReview(args: string[]): Promise<void> {
  const subcommand = args[0];
  if (!subcommand || !["list", "approve", "reject"].includes(subcommand)) {
    die('usage: orch review list [--json] | approve <target> | reject <target> -m "feedback"');
  }
  if (subcommand === "list") {
    const json = args.slice(1).includes("--json");
    if (args.slice(1).some((arg) => arg !== "--json")) die("usage: orch review list [--json]");
    const items = reviewItems();
    if (json) {
      process.stdout.write(JSON.stringify(items.map(({ repoRoot: _repoRoot, ...item }) => item), null, 2) + "\n");
      return;
    }
    if (!items.length) {
      process.stdout.write("No worktree reviews pending.\n");
      return;
    }
    const rows = items.map((item) => [item.target, item.branch, String(item.commitsAhead), item.task, item.summary]);
    process.stdout.write(renderTable(["TARGET", "BRANCH", "AHEAD", "TASK", "SUMMARY"], rows, [20, 24, 5, 40, 60]) + "\n");
    return;
  }
  const json = args.includes("--json");
  const target = args.find((arg, index) => index > 0 && arg !== "--json");
  if (!target) die(`usage: orch review ${subcommand === "approve" ? "approve <target> [--json]" : 'reject <target> -m "feedback" [--json]'}`);
  const item = findReviewItem(target);
  if (subcommand === "approve") {
    if (args.some((arg) => arg !== "approve" && arg !== target && arg !== "--json")) die("usage: orch review approve <target> [--json]");
    try {
      const strategy = mergeReviewBranch(item.repoRoot, item.branch);
      removeMergedWorktree(item.repoRoot, item.worktree, item.branch);
      if (json) process.stdout.write(JSON.stringify({ target: item.target, approved: true, strategy }) + "\n");
      else process.stdout.write(`Approved ${item.target}: merged (${strategy}) and removed worktree.\n`);
    } catch (error: unknown) {
      die(errorMessage(error));
    }
    return;
  }
  if (subcommand === "reject") {
    const messageIndex = args.indexOf("-m");
    const feedback = messageIndex >= 0 ? args[messageIndex + 1] : undefined;
    const allowedReject = new Set(["reject", target, "-m", feedback, "--json"]);
    if (messageIndex < 0 || !feedback || args.some((arg) => !allowedReject.has(arg))) die('usage: orch review reject <target> -m "feedback" [--json]');
    if (!presenceFor(item.pane)) die(`Cannot reject ${item.target}: agent presence is missing.`);
    await writeRpc("steer", { target: item.pane, text: feedback });
    if (json) process.stdout.write(JSON.stringify({ target: item.target, rejected: true }) + "\n");
    else process.stdout.write(`Rejected ${item.target}; feedback re-dispatched in the same worktree.\n`);
    return;
  }
  die('usage: orch review list [--json] | approve <target> | reject <target> -m "feedback"');
}

function renderQueueTasks(tasks: TaskRec[]): void {
  if (tasks.length === 0) {
    process.stdout.write("No queue tasks.\n");
    return;
  }
  const headers = ["ID", "STATE", "RETRIES", "AGENT", "TASK", "ERROR"];
  const caps = [36, 10, 7, 16, 60, 40];
  const rows = tasks.map((task) => [
    task.id,
    task.state,
    String(task.retries),
    task.agentKey ?? "-",
    task.text,
    task.lastError ?? "",
  ]);
  process.stdout.write(renderTable(headers, rows, caps) + "\n");
}

function writeQueueTask(task: TaskRec, json: boolean, plainText: string): void {
  if (json) process.stdout.write(JSON.stringify(task, null, 2) + "\n");
  else process.stdout.write(plainText + "\n");
}

function cmdQueue(args: string[]) {
  const subcommand = args[0];
  const hostIndex = args.indexOf("--host");
  let hostName: string | null = null;
  let queueArgs = args;
  if (hostIndex >= 0) {
    hostName = args[hostIndex + 1] ?? null;
    if (!hostName) die('usage: orch queue add --host <host> "<task text>" [--worktree] [--json]');
    queueArgs = args.slice(0, hostIndex).concat(args.slice(hostIndex + 2));
  }
  const { enabled, positional } = splitOptionFlags(queueArgs.slice(1), ["--json", "--worktree"]);
  const json = enabled.has("--json");
  if (hostName && subcommand !== "add") die("--host is only supported for orch queue add");
  const worktree = enabled.has("--worktree");

  switch (subcommand) {
    case "add": {
      const text = positional.join(" ");
      if (!text) die('usage: orch queue add "<task text>" [--worktree] [--json]');
      if (hostName) {
        remoteWrite(hostName, "queue", ["add", ...queueArgs.slice(1)]);
        return;
      }
      let options = {};
      if (worktree) {
        const name = `queue-${randomUUID()}`;
        const worktreePath = createAgentWorktree(process.cwd(), name);
        options = { worktree: true, cwd: worktreePath, branch: `orch/${name}` };
      }
      const task = addTask(orchDir(), text, options);
      writeQueueTask(task, json, task.id);
      return;
    }
    case "list":
    case "history": {
      if (positional.length > 0 || worktree) die(`usage: orch queue ${subcommand} [--json]`);
      const tasks = subcommand === "history" ? queueHistory(orchDir()) : listTasks(orchDir());
      if (json) {
        process.stdout.write(JSON.stringify(tasks, null, 2) + "\n");
        return;
      }
      renderQueueTasks(tasks);
      return;
    }
    case "cancel": {
      const id = positional[0];
      if (!id || positional.length !== 1 || worktree) die("usage: orch queue cancel <id> [--json]");
      let task;
      try {
        task = cancelTask(orchDir(), id);
      } catch (error: unknown) {
        die(errorMessage(error));
      }
      if (task.error) die(task.error);
      writeQueueTask(task, json, `Cancelled ${task.id}`);
      return;
    }
    default:
      die("usage: orch queue <add|list|history|cancel> ...");
  }
}

// ---- questions / answers ----

function formatAge(ts: unknown): string {
  const when = new Date(typeof ts === "string" ? ts : JSON.stringify(ts) ?? "").getTime();
  if (!Number.isFinite(when)) return "?";
  const seconds = Math.max(0, Math.floor((Date.now() - when) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function cmdQuestionsLocal(args: string[]) {
  const { enabled } = splitOptionFlags(args, ["--all", "--json", "--local"]);
  const all = enabled.has("--all");
  const scopedEntities = scopeEntitiesToWorkspace(buildEntities(), { all });
  const names = new Map<string, string>();
  const scopedKeys = new Set<string>();
  for (const ent of scopedEntities) {
    scopedKeys.add(ent.key);
    if (ent.presence) scopedKeys.add(ent.presence.key);

    if (ent.name) {
      names.set(ent.key, ent.name);
      if (ent.paneId) names.set(ent.paneId, ent.name);
      if (ent.presence) names.set(ent.presence.key, ent.name);
    }
  }
  const pending = [...loadPresence().values()]
    .filter((pres) => scopedKeys.has(pres.key) || all)
    .map((pres) => ({ pres, question: readJSON<unknown>(path.join(pres.dir, "question.json")) }))
    .filter((entry): entry is { pres: PresenceEntry; question: QuestionPayload } => isQuestionPayload(entry.question));
  if (!pending.length) {
    if (enabled.has("--json")) process.stdout.write("[]\n");
    else process.stdout.write("No pending questions.\n");
    return;
  }
  pending.sort((a, b) => a.pres.key.localeCompare(b.pres.key));
  if (enabled.has("--json")) {
    process.stdout.write(JSON.stringify(pending.map(({ pres, question }) => ({
      key: pres.key,
      name: names.get(pres.key) ?? null,
      age: formatAge(question.ts),
      question: questionText(question),
      workspace: workspaceOf(pres.key) ?? "-",
      host: "local",
    })), null, 2) + "\n");
    return;
  }
  const workspaces = pending.map(({ pres }) => workspaceOf(pres.key) ?? "-");
  const showWorkspace = all && new Set(workspaces).size > 1;
  process.stdout.write(
    pending
      .map(({ pres, question }) => {
        const label = names.get(pres.key) ?? "-";
        const workspaceLabel = workspaceOf(pres.key) ?? "-";
        const name = showWorkspace ? `${workspaceLabel} / ${label}` : label;
        return `${pres.key}  ${name}  ${formatAge(question.ts)}\n${question.question}`;
      })
      .join("\n\n") + "\n"
  );
}

interface QuestionRow { key: string; name: string | null; age: string; question: string; workspace?: string; host?: string; warning?: string }

interface QuestionPayload { ts?: unknown; question: string }

function isQuestionPayload(value: unknown): value is QuestionPayload {
  return isRecord(value) && typeof value.question === "string";
}

function questionText(value: unknown): string {
  return isRecord(value) && typeof value.question === "string" ? value.question : "";
}

function localQuestionRows(args: string[]): QuestionRow[] {
  const { enabled } = splitOptionFlags(args, ["--all", "--json", "--local"]);
  const all = enabled.has("--all");
  const scopedEntities = scopeEntitiesToWorkspace(buildEntities(), { all });
  const names = new Map<string, string>();
  const scopedKeys = new Set<string>();
  for (const ent of scopedEntities) {
    scopedKeys.add(ent.key);
    if (ent.presence) scopedKeys.add(ent.presence.key);
    if (ent.name) {
      names.set(ent.key, ent.name);
      if (ent.paneId) names.set(ent.paneId, ent.name);
      if (ent.presence) names.set(ent.presence.key, ent.name);
    }
  }
  return [...loadPresence().values()]
    .filter((pres) => scopedKeys.has(pres.key) || all)
    .map((pres) => ({ pres, question: readJSON<unknown>(path.join(pres.dir, "question.json")) }))
    .filter((entry): entry is { pres: PresenceEntry; question: QuestionPayload } => isQuestionPayload(entry.question))
    .map(({ pres, question }) => ({
      key: pres.key, name: names.get(pres.key) ?? null, age: formatAge(question.ts),
      question: questionText(question), workspace: workspaceOf(pres.key) ?? "-", host: "local",
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function warningQuestionRow(host: string, warning: string): QuestionRow {
  return { key: `warning:${host}`, name: "WARNING", age: "-", question: warning, host, warning };
}

async function cmdQuestions(args: string[]): Promise<void> {
  const { enabled } = splitOptionFlags(args, ["--all", "--json", "--local"]);
  const json = enabled.has("--json");
  const localOnly = enabled.has("--local");
  const hosts = loadConfig(orchDir()).hosts;
  if (localOnly || Object.keys(hosts).length === 0) {
    cmdQuestionsLocal(args);
    return;
  }
  const rows: QuestionRow[] = [...localQuestionRows(args)];
  const remoteResults = await Promise.all(Object.entries(hosts).map(async ([name, host]) => ({
    name,
    result: await runRemoteAsync(name, host, ["questions"], { timeoutMs: host.timeout_ms }),
  })));
  for (const { name, result } of remoteResults) {
    if (!result.ok) {
      rows.push(warningQuestionRow(name, result.failure.message));
      continue;
    }
    if (!Array.isArray(result.value)) {
      rows.push(warningQuestionRow(name, `Host "${name}" returned an invalid questions payload.`));
      continue;
    }
    for (const value of result.value) if (value && typeof value === "object") rows.push({ ...(value as QuestionRow), host: name });
  }
  if (json) {
    process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
    return;
  }
  if (!rows.length) {
    process.stdout.write("No pending questions.\n");
    return;
  }
  const tableRows = rows.map((row) => [row.host ?? "local", row.key, row.name ?? "-", row.age, row.question]);
  process.stdout.write(renderTable(["HOST", "PANE", "NAME", "AGE", "QUESTION"], tableRows, [10, 24, 20, 8, 100]) + "\n");
}

function cmdAnswer(args: string[]) {
  const force = args.includes("--force");
  const json = args.includes("--json");
  const cleanArgs = args.filter((arg) => arg !== "--json");
  const { target, prompt: text } = parseTargetPrompt(cleanArgs, "--force", 'usage: orch answer <target> "<text>" [--force] [--json]');
  const remote = targetHost(target);
  if (remote) {
    remoteWrite(remote.host, "answer", [remote.target, text, ...(force ? ["--force"] : []), ...(json ? ["--json"] : [])]);
    return;
  }
  const ent = resolveTarget(target);
  const questionPath = ent.presence ? path.join(ent.presence.dir, "question.json") : null;
  if (!force && (!questionPath || !files.existsSync(questionPath)))
    die(`Target "${target}" requires a pending question. Use --force to answer anyway.`);
  if (!ent.presence) die(`Target "${target}" has no agent dir.`);
  const answerAdapter = resolveAdapter(ent.agent ?? ent.presence.status?.agent ?? "pi");
  if (!answerAdapter.caps.ask) die(`Adapter ${answerAdapter.id} cannot answer blocking questions (caps.ask false).`);
  answerAdapter.answer({ key: ent.presence.key, text });
  if (json) process.stdout.write(JSON.stringify({ target: ent.presence.key, answered: true }) + "\n");
  else process.stdout.write(`Answered ${ent.presence.key}.\n`);
}

// ---- watch ----

function looksLikePaneKey(key: string): boolean {
  return tryParseIdentity(key) !== null;
}

interface WatchItem {
  key: string;
  dir: string;
  name: string | null;
  tab: string | null;
  pid: number | undefined;
}

function isNotifyEvent(value: unknown): value is NotifyEvent {
  return isRecord(value)
    && typeof value.key === "string"
    && typeof value.oldState === "string"
    && typeof value.newState === "string"
    && typeof value.ts === "string";
}

interface EventsOptions {
  statusFilter: Set<string> | null;
  all: boolean;
  notifications: boolean;
  json: boolean;
  offline: boolean;
  targets: string[];
}

interface EventsContext {
  options: EventsOptions;
  items: Map<string, WatchItem>;
  states: Map<string, string>;
  sinks: Sink[];
  metadata: (key: string) => PresenceMetadata;
  accepts: (key: string) => boolean;
  emit: (event: NotifyEvent) => void;
}

function parseEventsOptions(args: string[]): EventsOptions {
  let statusFilter: Set<string> | null = null;
  let all = false;
  let notifications = false;
  let json = false;
  let offline = false;
  const targets: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    if (argument === "--status") statusFilter = new Set((args[++index] ?? "").split(",").map((state) => state.trim()).filter(Boolean));
    else if (argument === "--all") all = true;
    else if (argument === "--notify") notifications = true;
    else if (argument === "--json") json = true;
    else if (argument === "--offline") offline = true;
    else targets.push(argument);
  }
  return { statusFilter, all, notifications, json, offline, targets };
}

function eventsSinks(enabled: boolean): Sink[] {
  if (!enabled) return [];
  const backend = resolveBackend({ configured: loadConfig(orchDir()).defaults.backend ?? null });
  const available = backend.isAvailable() && backend.isInsideSession();
  const sinks = loadSinks(orchDir()).filter((sink) => sink.type !== backend.id || available);
  if (available && !sinks.some((sink) => sink.type === backend.id)) {
    sinks.push({ type: backend.id, on: ["blocked", "error"] });
  }
  if (!sinks.length) process.stderr.write("notify: no sinks configured\n");
  return sinks;
}

function presenceMetadata(key: string): PresenceMetadata {
  const entity = buildEntities().find((candidate) => candidate.presence?.key === key || candidate.key === key);
  return { name: entity?.name ?? null, tab: entity?.tabLabel ?? null, pid: entity?.presence?.status?.pid };
}

function eventsItems(options: EventsOptions): Map<string, WatchItem> {
  const items = new Map<string, WatchItem>();
  if (!options.targets.length) {
    const presences = scopeToWorkspace(
      [...loadPresence().values()].filter((presence) => presence.alive && looksLikePaneKey(presence.key)),
      (presence) => presence.key,
      currentWorkspace(),
      { all: options.all },
    );
    for (const presence of presences) {
      const metadata = presenceMetadata(presence.key);
      items.set(presence.key, {
        key: presence.key,
        dir: presence.dir,
        name: metadata.name,
        tab: metadata.tab,
        pid: metadata.pid,
      });
    }
  }
  for (const target of options.targets) {
    const entity = resolveTarget(target, { all: options.all });
    if (!entity.presence) die(`Target "${target}" has no agent dir to watch.`);
    items.set(entity.presence.key, {
      key: entity.presence.key,
      dir: entity.presence.dir,
      name: entity.name,
      tab: entity.tabLabel,
      pid: entity.presence.status?.pid,
    });
  }
  if (!items.size && !options.all) die("No live pane agent dirs to stream.");
  return items;
}

function eventWriter(options: EventsOptions, resolver: OrchConfig["workspaces"]): (event: NotifyEvent) => void {
  return (event): void => {
    if (options.statusFilter && !options.statusFilter.has(event.newState)) return;
    const id = event.workspace ?? workspaceOf(event.key);
    const label = workspaceName(id, resolver);
    if (options.json) {
      process.stdout.write(`${JSON.stringify({ ...event, workspaceName: label })}\n`);
      return;
    }
    const rawTitle = notificationText(event, { colorize: true }).title;
    const title = label && id && label !== id ? rawTitle.replace(`[${id}]`, `[${label} (${id})]`) : rawTitle;
    const transition = `  ${event.oldState}→${event.newState}`;
    const cost = typeof event.cost === "number" ? `  $${event.cost.toFixed(2)}` : "";
    process.stdout.write(`${title}${transition}${cost}\n`);
  };
}

function seedEventStates(context: EventsContext): void {
  for (const presence of loadPresence().values()) {
    if (!context.accepts(presence.key)) continue;
    derivePresenceTransition(presence.key, presence.status, context.metadata(presence.key), context.states);
  }
}

async function startEventsTransport(context: EventsContext): Promise<() => void> {
  let fileWatch: PresenceWatch | undefined;
  const startFiles = (): void => {
    if (fileWatch) return;
    const keys = context.options.all
      ? undefined
      : new Map([...context.items].map(([key, item]) => [key, { name: item.name, tab: item.tab, pid: item.pid }]));
    fileWatch = startPresenceWatch({
      orchDir: orchDir(),
      initialStates: context.states,
      keys,
      acceptKey: context.accepts,
      metadataFor: context.metadata,
      onEvent: (event) => {
        if (context.options.notifications) notify(context.sinks, event);
        context.emit(event);
      },
    });
  };
  if (context.options.offline) {
    startFiles();
    return () => fileWatch?.stop();
  }
  const preferred = await startPreferredEvents({
    orchDir: orchDir(),
    onEvent: (value) => {
      if (!isNotifyEvent(value) || !context.accepts(value.key)) return;
      context.states.set(value.key, value.newState);
      context.emit(value);
    },
    onDisconnect: () => process.stderr.write("orch events: daemon disconnected; use --offline for file diagnostics\n"),
    onFallback: () => die("orch events: daemon unavailable; use --offline for read-only file diagnostics."),
  });
  return () => {
    preferred.stop();
    fileWatch?.stop();
  };
}

async function cmdEvents(args: string[]) {
  const options = parseEventsOptions(args);
  if (!options.offline) await ensureDaemon(orchDir());
  const items = eventsItems(options);
  const accepts = (key: string): boolean => {
    if (options.targets.length) return items.has(key);
    if (!looksLikePaneKey(key)) return false;
    return scopeToWorkspace([key], (item) => item, currentWorkspace(), { all: options.all }).length > 0;
  };
  const context: EventsContext = {
    options,
    items,
    states: new Map<string, string>(),
    sinks: eventsSinks(options.notifications),
    metadata: presenceMetadata,
    accepts,
    emit: eventWriter(options, loadConfig(orchDir()).workspaces),
  };
  seedEventStates(context);
  const cleanup = await startEventsTransport(context);
  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });
}

async function cmdNotify(args: string[]) {
  const json = args.includes("--json");
  const cleanArgs = args.filter((arg) => arg !== "--json");
  if (cleanArgs[0] !== "test") die("usage: orch notify test [--state <state>] [--json]");
  let state = "blocked";
  for (let i = 1; i < cleanArgs.length; i++) {
    if (cleanArgs[i] === "--state") state = cleanArgs[++i] ?? "";
    else die("usage: orch notify test [--state <state>] [--json]");
  }
  if (!state) die("usage: orch notify test [--state <state>] [--json]");
  const event: NotifyEvent = {
    key: "test:notify",
    agent: "notify-test",
    tab: "notify",
    model: "test:medium",
    oldState: "working",
    newState: state,
    task: "orch notify test",
    ts: new Date().toISOString(),
  };
  const sinks = loadSinks(orchDir());
  if (!sinks.length) {
    process.stderr.write("notify test: no sinks configured\n");
    process.exitCode = 1;
    return;
  }
  const results = await Promise.all(sinks.map(async (sink) => ({ sink, ok: await deliverToSink(sink, event) })));
  if (json) process.stdout.write(JSON.stringify(results.map(({ sink, ok }) => ({ sink: sinkLabel(sink), ok }))) + "\n");
  else for (const { sink, ok } of results) process.stdout.write(`notify ${sinkLabel(sink)}: ${ok ? "ok" : "fail"}\n`);
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}

function sinkLabel(sink: Sink): string {
  if (sink.type === "webhook") {
    const url = sink.url;
    return `webhook ${typeof url === "string" ? url : ""}`;
  }
  if (sink.type === "command") {
    const command = sink.command;
    return `command ${Array.isArray(command) ? command.map((part) => String(part)).join(" ") : ""}`;
  }
  return sink.type;
}

// ---- target resolution ----


function cmdResult(args: string[]) {
  const json = args.includes("--json");
  const rest = args.filter((a) => !a.startsWith("--"));
  const target = rest[0];
  if (!target) die("usage: orch result <target> [--json]");
  const remote = targetHost(target);
  if (remote) {
    const host = loadConfig(orchDir()).hosts[remote.host];
    const destination = host?.dest;
    if (!host || !destination) die(`Host "${remote.host}" has no SSH destination.`);
    const result = runSSH(destination, remoteCommandArgs(host, "result", [remote.target, ...(json ? ["--json"] : [])]), { timeoutMs: host.timeout_ms });
    if (!result.ok) die(`Host "${remote.host}" is unreachable: ${result.stderr.trim() || "ssh failed"}`);
    process.stdout.write(result.stdout.endsWith("\n") ? result.stdout : result.stdout + "\n");
    return;
  }
  const ent = resolveTarget(target);
  const pres = ent.presence;
  if (pres?.result) {
    if (json) process.stdout.write(JSON.stringify(pres.result, null, 2) + "\n");
    else process.stdout.write((resultText(pres.result) ?? "") + "\n");
    return;
  }
  // fallback: last assistant text from session
  const session = parseSession(ent.sessionPath);
  if (session.exists && session.lastAssistant) {
    process.stderr.write("(no result.json — falling back to last assistant text from session)\n");
    if (json)
      process.stdout.write(
        JSON.stringify(
          {
            text: session.lastAssistant,
            task: session.task,
            model: session.model,
            thinking: session.thinking,
            tokens: session.tokens,
            cost: session.cost,
            turns: session.turns,
            sessionPath: ent.sessionPath,
          },
          null,
          2
        ) + "\n"
      );
    else process.stdout.write(session.lastAssistant + "\n");
    return;
  }
  die(`No result available for "${target}" (no result.json and no assistant text in session).`);
}

// ---- steer ----

async function cmdSteer(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const { gov, rest: cleanArgs } = parseGovernance(args.filter((arg) => arg !== "--json"));
  const target = cleanArgs[0];
  const text = cleanArgs.slice(1).join(" ");
  if (!target || !text) die('usage: orch steer <target> <text...> [--steal] [--cross-workspace] [--json]');
  const remote = targetHost(target);
  if (remote) {
    remoteWrite(remote.host, "steer", [remote.target, text, ...(json ? ["--json"] : [])]);
    return;
  }
  const entity = resolveTarget(target, { crossWorkspace: gov.crossWorkspace });
  if (!entity.paneId) {
    if (!entity.presence) die(`Target "${target}" has no agent presence.`);
    // The daemon's control dispatcher applies the effect; the CLI never steers directly.
    const key = entity.presence.key;
    const result = await writeRpc("steer", { target: key, text }, gov);
    if (json) process.stdout.write(JSON.stringify({ target: key, steered: true, ...(isRecord(result) ? result : {}) }) + "\n");
    else process.stdout.write(`Steered ${key} → ${truncate(collapse(text), 60)}\n`);
    return;
  }
  const pane = entity.paneId;
  const result = await writeRpc("steer", { target: pane, text }, gov);
  if (json) process.stdout.write(JSON.stringify({ target: pane, steered: true, ...(isRecord(result) ? result : {}) }) + "\n");
  else process.stdout.write(`Steered ${pane} → ${truncate(collapse(text), 60)}\n`);
}

function requirePresenceTarget(target: string): Entity {
  const ent = resolveTarget(target);
  if (!ent.presence) die(`Target "${target}" has no agent dir.`);
  return ent;
}

function livePanePresenceEntries(): PresenceEntry[] {
  return [...loadPresence().values()].filter((pres) => pres.alive && looksLikePaneKey(pres.key));
}

async function cmdPipe(args: string[]) {
  const json = args.includes("--json");
  const cleanArgs = args.filter((arg) => arg !== "--json");
  const src = cleanArgs[0];
  const dst = cleanArgs[1];
  const instruction = cleanArgs.slice(2).join(" ");
  if (!src || !dst) die('usage: orch pipe <src> <dst> ["instruction"] [--json]');
  const source = requirePresenceTarget(src);
  const result = readJSON(path.join(source.presence!.dir, "result.json"));
  const resultTextValue = resultText(result);
  if (!resultTextValue) die(`No result.json text available for "${src}".`);
  const destination = requirePresenceTarget(dst);
  const text = `[piped from ${source.presence!.key}] ${instruction ? instruction + "\n" : ""}${resultTextValue}`;
  await writeRpc("steer", { target: destination.presence!.key, text });
  if (json) process.stdout.write(JSON.stringify({ source: source.presence!.key, destination: destination.presence!.key, piped: true }) + "\n");
  else process.stdout.write(`Piped ${source.presence!.key} → ${destination.presence!.key}.\n`);
}

async function cmdBroadcast(args: string[]) {
  let all = false;
  const json = args.includes("--json");
  const positional: string[] = [];
  for (const arg of args) {
    if (arg === "--all") all = true;
    else if (arg === "--json") continue;
    else positional.push(arg);
  }
  const text = positional[0];
  const targets = positional.slice(1);
  if (!text) die('usage: orch broadcast "<text>" [target ...|--all]');
  if (!targets.length) all = true;
  const destinations = new Map<string, PresenceEntry>();
  if (all) {
    for (const pres of livePanePresenceEntries()) destinations.set(pres.key, pres);
  }
  for (const target of targets) {
    const ent = requirePresenceTarget(target);
    destinations.set(ent.presence!.key, ent.presence!);
  }
  if (!destinations.size) die("No live pane agent dirs to broadcast to.");
  await Promise.all([...destinations.values()].map((pres) => writeRpc("steer", { target: pres.key, text })));
  if (json) process.stdout.write(JSON.stringify({ count: destinations.size, broadcast: true }) + "\n");
  else process.stdout.write(`Broadcast to ${destinations.size} agent(s).\n`);
}

// ---- tail ----

function toolCallSummary(block: ToolCallContentBlock): string {
  const name = block.name ?? "tool";
  const a = block.arguments ?? {};
  let arg = "";
  for (const k of ["command", "path", "file", "filePath", "subject", "query", "pattern", "action"]) {
    if (a[k] != null) {
      arg = typeof a[k] === "string" ? a[k] : JSON.stringify(a[k]) ?? "";
      break;
    }
  }
  if (!arg) {
    const keys = Object.keys(a);
    const firstKey = keys[0];
    if (firstKey !== undefined) arg = `${firstKey}=${String(a[firstKey])}`;
  }
  return `${name}(${collapse(truncate(arg, 60))})`;
}

function hms(entry: SessionEntry): string {
  const ts = entry.timestamp ?? entry.message?.timestamp;
  const d = ts ? new Date(ts) : null;
  if (!d || isNaN(d.getTime())) return "        ";
  return d.toTimeString().slice(0, 8);
}

function cmdTail(args: string[]) {
  let n = 20;
  let json = false;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg === "-n") {
      const value = args[++i];
      n = parseInt(value ?? "", 10) || 20;
    } else if (arg === "--json") json = true;
    else rest.push(arg);
  }
  const target = rest[0];
  if (!target) die("usage: orch tail <target> [-n N] [--json]");
  const ent = resolveTarget(target);
  const session = parseSession(ent.sessionPath);
  if (!session.exists) die(`No session file for "${target}" (${ent.sessionPath ?? "unknown path"}).`);

  const modelStr = session.model
    ? `${session.provider ? session.provider + "/" : ""}${session.model}${session.thinking ? ":" + session.thinking : ""}`
    : "-";
  process.stdout.write(
    `session: ${ent.sessionPath}\nmodel: ${modelStr}   cost: $${session.cost.toFixed(4)}   turns: ${session.turns}\n\n`
  );

  const rendered: string[] = [];
  for (const e of session.entries) {
    if (e.type !== "message" || !e.message) continue;
    const msg = e.message;
    const role = msg.role;
    const time = hms(e);
    if (role === "user") {
      const txt = collapse(blockText(msg.content));
      if (txt) rendered.push(`${time} user      │ ${truncate(txt, 200)}`);
    } else if (role === "assistant") {
      const content = Array.isArray(msg.content) ? msg.content : [];
      const txt = collapse(blockText(msg.content));
      if (txt) {
        rendered.push(`${time} assistant │ ${truncate(txt, 200)}`);
      } else {
        const calls = content.filter(isToolCallContentBlock);
        if (calls.length) {
          rendered.push(`${time} assistant │ ⚙ ${calls.map(toolCallSummary).join(", ")}`);
        }
        // pure thinking → skip
      }
    } else if (role === "toolResult") {
      const tool = msg.toolName ?? "tool";
      const txt = collapse(blockText(msg.content));
      const mark = msg.isError ? " [err]" : "";
      rendered.push(`${time} tool      │ ${tool}${mark} → ${truncate(txt, 120)}`);
    }
  }
  const tail = rendered.slice(-n);
  if (json) {
    process.stdout.write(JSON.stringify({ target, sessionPath: ent.sessionPath, model: session.model, provider: session.provider,
      thinking: session.thinking, cost: session.cost, turns: session.turns, tokens: session.tokens, entries: session.entries.slice(-n) }, null, 2) + "\n");
    return;
  }
  process.stdout.write(tail.join("\n") + (tail.length ? "\n" : "(no entries)\n"));
}

// ---- session ----

function cmdSession(args: string[]) {
  const json = args.includes("--json");
  const target = args.find((arg) => arg !== "--json");
  if (!target) die("usage: orch session <target> [--json]");
  const ent = resolveTarget(target);
  if (!ent.sessionPath) die(`No session path known for "${target}".`);
  const s = parseSession(ent.sessionPath);
  const modelStr = s.model
    ? `${s.provider ? s.provider + "/" : ""}${s.model}${s.thinking ? ":" + s.thinking : ""}`
    : "(none)";
  if (json) {
    process.stdout.write(JSON.stringify({ path: ent.sessionPath, exists: s.exists, entries: s.entries.length,
      turns: s.turns, cost: s.cost, tokens: s.tokens, model: s.model, provider: s.provider, thinking: s.thinking }, null, 2) + "\n");
    return;
  }
  process.stdout.write(
    [
      `path:    ${ent.sessionPath}`,
      `exists:  ${s.exists}`,
      `entries: ${s.entries.length}`,
      `turns:   ${s.turns}`,
      `cost:    $${s.cost.toFixed(4)}`,
      `tokens:  in ${s.tokens.input} / out ${s.tokens.output} / cacheR ${s.tokens.cacheRead} / cacheW ${s.tokens.cacheWrite}`,
      `model:   ${modelStr}`,
    ].join("\n") + "\n"
  );
}

// ---- panes ----

function cmdPanes(args: string[]) {
  const { enabled } = splitOptionFlags(args, ["--all", "--json"]);
  const all = enabled.has("--all");
  const json = enabled.has("--json");
  const entities = scopeEntitiesToWorkspace(sortEntities(buildEntities()), { all });
  const workspaces = loadConfig(orchDir()).workspaces;
  if (json) {
    process.stdout.write(JSON.stringify(entities.map((e) => ({ key: e.key, paneId: e.paneId, name: e.name,
      tab: e.tabLabel, agent: e.agent, focused: e.focused, state: e.backendStatus ?? e.presence?.status?.state ?? null,
      backendStatus: e.backendStatus, sessionPath: e.sessionPath, presenceOnly: e.presenceOnly,
      workspace: entityWorkspace(e), workspaceName: workspaceName(entityWorkspace(e), workspaces) })), null, 2) + "\n");
    return;
  }
  const showWorkspace = all && new Set(entities.map((e) => entityWorkspace(e) ?? "-")).size > 1;
  for (const e of entities) {
    const parts = [
      e.paneId ?? e.key,
      showWorkspace ? `${displayWorkspace(entityWorkspace(e), workspaces)} / ${e.name ?? "-"}` : (e.name ?? "-"),
      e.tabLabel ?? "-",
      e.agent ?? "-",
      e.backendStatus ?? (e.presence?.status?.state ?? "-"),
      e.sessionPath ?? "-",
    ];
    process.stdout.write(parts.join("\t") + "\n");
  }
}

// ---- clean ----

function liveWorktreeOwner(worktreePath: string, records: Map<string, SpawnedRecord>, presence: Map<string, PresenceEntry>): boolean {
  const owner = [...records.values()].find((record) =>
    record.worktree && path.resolve(record.worktree) === path.resolve(worktreePath));
  return Boolean(owner && presence.get(owner.pane)?.alive);
}

function cleanOneWorktree(repoRoot: string, baseBranch: string, worktreePath: string, force: boolean, json = false): boolean {
  try {
    const branch = worktreeBranch(worktreePath);
    const hasCommitsAhead = worktreeHasCommitsAheadOf(repoRoot, worktreePath, baseBranch);
    const hasChanges = worktreeHasChanges(worktreePath);
    const discardReason = [hasCommitsAhead ? "unmerged commits" : "", hasChanges ? "uncommitted changes" : ""]
      .filter(Boolean).join(" and ");
    if (!hasCommitsAhead && !hasChanges) {
      removeMergedWorktree(repoRoot, worktreePath, branch);
      if (!json) process.stdout.write(`Removed orphan worktree ${worktreePath} (${branch}; empty or merged).\n`);
    } else if (!force) {
      if (!json) process.stdout.write(`Kept orphan worktree ${worktreePath} (${branch}; ${discardReason}). Re-run with --force to discard it.\n`);
    } else {
      removeDiscardedWorktree(repoRoot, worktreePath, branch);
      if (!json) process.stdout.write(`Removed orphan worktree ${worktreePath} (${branch}); discarded ${discardReason}.\n`);
    }
  } catch (error: unknown) {
    process.stderr.write(`failed to clean worktree ${worktreePath}: ${errorMessage(error)}\n`);
  }
  return true;
}

function cleanWorktrees(force: boolean, json = false): number {
  let repoRoot: string;
  try {
    repoRoot = repositoryCommonRoot(process.cwd());
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  const baseBranch = repositoryBranch(repoRoot);
  const records = spawnedRecords();
  const presence = loadPresence();
  const worktrees = listAgentWorktrees(repoRoot);
  let reported = false;
  for (const worktreePath of worktrees) {
    if (liveWorktreeOwner(worktreePath, records, presence)) continue;
    reported = cleanOneWorktree(repoRoot, baseBranch, worktreePath, force, json) || reported;
  }
  if (!reported && !json) process.stdout.write("No orphan worktrees to clean.\n");
  return worktrees.length;
}

function validateCleanArgs(args: string[]): { worktrees: boolean; force: boolean } {
  const worktrees = args.includes("--worktrees");
  const force = args.includes("--force");
  if (args.some((arg) => arg !== "--worktrees" && arg !== "--force") || (force && !worktrees))
    die("usage: orch clean [--worktrees [--force]]");
  return { worktrees, force };
}

function removeDeadAgentDirs(json = false): string[] {
  const removed: string[] = [];
  for (const e of loadPresence().values()) {
    if (!e.alive) {
      try {
        files.rmSync(e.dir, { recursive: true, force: true });
        removed.push(`${e.key} (pid ${e.status?.pid ?? "?"})`);
      } catch (err: unknown) {
        process.stderr.write(`failed to remove ${e.dir}: ${errorMessage(err)}\n`);
      }
    }
  }
  if (!json) {
    if (removed.length) process.stdout.write("Removed dead agent dirs:\n" + removed.map((r) => "  " + r).join("\n") + "\n");
    else process.stdout.write("Nothing to clean — all agent dirs have live pids (or none exist).\n");
  }
  return removed;
}

function cmdClean(args: string[]) {
  const json = args.includes("--json");
  const options = validateCleanArgs(args.filter((arg) => arg !== "--json"));
  const removed = removeDeadAgentDirs(json);
  const worktrees = options.worktrees ? cleanWorktrees(options.force, json) : 0;
  if (json) process.stdout.write(JSON.stringify({ removed, worktrees }) + "\n");
}

// ---- setup (bootstrap a fresh machine) ----

/** The install action for one provider id: exactly one of a real install command or a
 * documentation URL, plus an optional ordered list of prerequisite provider ids installed
 * first. Keyed by real provider id, so an installer can never drift from its provider. */
interface InstallerEntry {
  install?: string;
  docsUrl?: string;
  needs?: readonly string[];
}

const INSTALLERS: Record<string, InstallerEntry> = {
  // bun is never probed on its own — it surfaces only as pi's declared dependency.
  pi: { install: "bun add -g @earendil-works/pi-coding-agent", needs: ["bun"] },
  claude: { install: "curl -fsSL https://claude.ai/install.sh | bash" },
  codex: { docsUrl: "https://github.com/openai/codex" },
  bun: { install: "curl -fsSL https://bun.sh/install | bash" },
  tmux: { docsUrl: "https://github.com/tmux/tmux/wiki/Installing" },
  herdr: { docsUrl: "https://github.com/BryanCE/orch#readme" },
};

/** Read the value following `name` in `args`, or undefined when the flag is absent. */
function readValueFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

/** Read a flag written as `--name value` or `--name=value`. */
function readAssignFlag(args: string[], name: string): string | undefined {
  const assigned = args.find((arg) => arg.startsWith(`${name}=`));
  if (assigned !== undefined) return assigned.slice(name.length + 1);
  return readValueFlag(args, name);
}

/** Validate a provided setup flag value against the supported ids, or exit. */
function validateSetupFlag(kind: string, value: string, supported: readonly string[]): string {
  if (supported.includes(value)) return value;
  die(`Unknown ${kind} "${value}". Supported ${kind}s: ${supported.join(", ")}.`);
}

/** Resolve the setup harness set from a comma-separated flag, the multi-select wizard, or exit. Null on cancel. */
async function resolveProviderSet(
  kind: string,
  flagName: string,
  flag: string | undefined,
  ids: readonly string[],
  interactive: boolean,
  pick: (options: readonly string[]) => Promise<string[] | null>,
): Promise<string[] | null> {
  if (flag !== undefined) {
    const list = [...new Set(flag.split(",").map((id) => id.trim()).filter(Boolean))];
    if (!list.length) die(`${flagName} needs at least one ${kind} id.`);
    for (const id of list) validateSetupFlag(kind, id, ids);
    return list;
  }
  if (interactive) {
    const picked = await pick(ids);
    if (picked === null) return null;
    if (!picked.length) die(`Select at least one ${kind}.`);
    return picked;
  }
  die(`orch setup needs ${flagName} <id[,id...]> in non-interactive mode. Supported ${kind}s: ${ids.join(", ")}.`);
}

/** Pick the active default from a selected set: the sole member, the flag/non-interactive first entry, or a prompt. Null on cancel. */
async function resolveActiveDefault(
  selected: readonly string[],
  flagProvided: boolean,
  interactive: boolean,
  pick: (options: readonly string[]) => Promise<string | null>,
): Promise<string | null> {
  if (selected.length === 1 || flagProvided || !interactive) return selected[0]!;
  return pick(selected);
}

/** Print the manual install commands for each missing prerequisite. */
function printInstallHints(missing: readonly { bin: string; cmd: string }[]): void {
  for (const { bin, cmd } of missing) process.stdout.write(`  install ${bin}: ${cmd}\n`);
}

/** Decide which missing prerequisites to install: multiselect when interactive, all with -y, none otherwise. Null on cancel. */
async function resolveInstallTargets(
  missing: readonly { bin: string; cmd: string }[],
  interactive: boolean,
  yes: boolean,
  noInstall: boolean,
): Promise<string[] | null> {
  if (!missing.length || noInstall) {
    printInstallHints(missing);
    return [];
  }
  if (interactive) {
    const picked = await chooseInstalls(missing);
    if (picked === null) return null;
    for (const { bin, cmd } of missing)
      if (!picked.includes(bin)) process.stdout.write(`  skipped ${bin} — install later with: ${cmd}\n`);
    return picked;
  }
  if (yes) return missing.map(({ bin }) => bin);
  printInstallHints(missing);
  return [];
}

/** Install one prerequisite: silent under a spinner when interactive, streamed otherwise. */
function runInstall(bin: string, cmd: string, interactive: boolean): void {
  try {
    if (interactive) {
      withSpinner(`Installing ${bin}…`, `${bin} installed`, () => execFileSync("bash", ["-c", cmd], { stdio: "ignore" }));
    } else {
      process.stdout.write(`  Installing ${bin}…\n`);
      execFileSync("bash", ["-c", cmd], { stdio: "inherit" });
    }
  } catch {
    process.stderr.write(`  ${bin} install failed — run manually: ${cmd}\n`);
  }
}

/** True for a settings hook entry whose command runs the orch claude-hooks shim (any path, any form). */
async function cmdSetup(args: string[]) {
  const copy = args.includes("--copy");
  const yes = args.includes("--yes") || args.includes("-y");
  const noInstall = args.includes("--no-install");
  const pkgRoot = packageRoot();
  const link = (src: string, dest: string) => {
    files.mkdirSync(path.dirname(dest), { recursive: true });
    files.rmSync(dest, { recursive: true, force: true });
    if (copy) files.cpSync(src, dest, { recursive: true });
    else files.symlinkSync(src, dest);
    process.stdout.write(`  ${dest} ${copy ? "(copy)" : "→ " + src}\n`);
  };
  const which = (bin: string): string => {
    try {
      return execFileSync("sh", ["-c", `command -v ${bin}`]).toString().trim();
    } catch {
      return "";
    }
  };

  const adapterFlag = readAssignFlag(args, "--agent") ?? readAssignFlag(args, "--adapter") ?? readAssignFlag(args, "--harness");
  const backendFlag = readAssignFlag(args, "--backend") ?? readAssignFlag(args, "--plexer");
  const adapterIds = allAdapters().map((adapter) => adapter.id);
  const backendIds = allBackends().map((entry) => entry.id);
  const interactive = process.stdin.isTTY && !yes;
  if (interactive) setupIntro();

  const adapters = await resolveProviderSet("adapter", "--agent", adapterFlag, adapterIds, interactive, selectAdapters);
  if (adapters === null) return;
  const defaultAdapter = await resolveActiveDefault(adapters, adapterFlag !== undefined, interactive, selectDefaultAdapter);
  if (defaultAdapter === null) return;
  const backends = await resolveProviderSet("backend", "--backend", backendFlag, backendIds, interactive, selectBackends);
  if (backends === null) return;
  const defaultBackend = await resolveActiveDefault(backends, backendFlag !== undefined, interactive, selectDefaultBackend);
  if (defaultBackend === null) return;

  // Write the installed sets FIRST — writeSettingsDefault validates the default against them.
  writeSettingsInstalled(orchDir(), { adapters, backends });
  writeSettingsDefault(orchDir(), "adapter", defaultAdapter);
  writeSettingsDefault(orchDir(), "backend", defaultBackend);
  process.stdout.write(
    `Selection recorded in ${settingsPath(orchDir())}:\n` +
    `  adapters          = ${adapters.join(", ")}\n` +
    `  default adapter   = ${defaultAdapter}\n` +
    `  backends          = ${backends.join(", ")}\n` +
    `  default backend   = ${defaultBackend}\n`,
  );

  // Prerequisites are scoped to the selected providers only. Each adapter is probed by its
  // id (the id-is-binary invariant); each backend by its own availability check (headless
  // needs no binary). A prerequisite required solely by an install path (bun for pi) is
  // surfaced as that provider's declared dependency, never as an unconditional requirement.
  process.stdout.write("Prerequisites:\n");
  const missing: { bin: string; cmd: string }[] = [];
  const manual: { id: string; url: string }[] = [];
  const queueInstall = (id: string): void => {
    const entry = INSTALLERS[id];
    if (entry?.install) {
      for (const need of entry.needs ?? []) {
        if (which(need)) continue;
        const needCmd = INSTALLERS[need]?.install;
        if (needCmd && !missing.some((candidate) => candidate.bin === need)) missing.push({ bin: need, cmd: needCmd });
      }
      if (!missing.some((candidate) => candidate.bin === id)) missing.push({ bin: id, cmd: entry.install });
    } else if (entry?.docsUrl) {
      manual.push({ id, url: entry.docsUrl });
    } else {
      manual.push({ id, url: "(no installer known — install manually)" });
    }
  };
  for (const id of adapters) {
    const resolved = which(id);
    process.stdout.write(`  ${resolved ? "ok      " : "MISSING "}${id}${resolved ? `  (${resolved})` : ""}\n`);
    if (!resolved) queueInstall(id);
  }
  for (const id of backends) {
    const available = getBackend(id)!.isAvailable();
    const resolved = available ? which(id) : "";
    process.stdout.write(`  ${available ? "ok      " : "MISSING "}${id}${resolved ? `  (${resolved})` : ""}\n`);
    if (!available) queueInstall(id);
  }
  for (const { id, url } of manual) process.stdout.write(`  install ${id} manually: ${url}\n`);

  const toInstall = await resolveInstallTargets(missing, interactive, yes, noInstall);
  if (toInstall === null) return;
  // Install in the queued order so a provider's `needs` (e.g. bun before pi) land first.
  for (const { bin, cmd } of missing.filter((candidate) => toInstall.includes(candidate.bin))) {
    runInstall(bin, cmd, interactive);
    // fresh installs land in ~/.bun/bin or ~/.local/bin before the shell rc picks them up
    process.env.PATH = `${path.join(HOME, ".bun", "bin")}:${path.join(HOME, ".local", "bin")}:${process.env.PATH}`;
    const now = which(bin);
    process.stdout.write(now ? `  ok      ${bin}  (${now})\n` : `  ${bin} still not on PATH — open a new shell and re-run orch setup\n`);
  }

  process.stdout.write("Presence dir:\n");
  files.mkdirSync(presenceDir(), { recursive: true });
  process.stdout.write(`  ${presenceDir()}\n`);

  // Each selected adapter installs its own integration (L4 Builder — no identity branch).
  // An adapter with no installShim is a loud, recorded gap (D10): its integration is
  // expected but unbuildable, never silently skipped.
  const gaps: string[] = [];
  for (const id of adapters) {
    const adapter = resolveAdapter(id);
    if (adapter.installShim) {
      try {
        await adapter.installShim({ copy });
      } catch (error: unknown) {
        const gap = `${id}: integration install failed — ${errorMessage(error)}`;
        process.stderr.write(`  WARNING ${gap}\n`);
        gaps.push(gap);
      }
    } else {
      const gap = `${id}: no integration installer available yet — ${id} agents will lack presence reporting`;
      process.stderr.write(`  WARNING ${gap}\n`);
      gaps.push(gap);
    }
  }

  // Notifier configuration is an interactive-only step; --yes / non-interactive adds nothing.
  if (interactive) await configureNotifiers();


  // bins on PATH (repo-clone case; bun add -g already links bins)
  process.stdout.write("bins:\n");
  const binDir = path.join(HOME, ".local", "bin");
  for (const [name, rel] of [
    ["orch", path.join("dist", "bin", "orch.js")],
    ["pif", path.join("bin", "pif")],
  ] as const) {
    const resolved = which(name);
    const packageBin = path.join(pkgRoot, rel);
    if (resolved) {
      let realResolved = "";
      try {
        realResolved = files.realpathSync(resolved);
      } catch {
        // A missing or unreadable target is stale; replace it below.
      }
      const relative = realResolved ? path.relative(pkgRoot, realResolved) : "";
      const belongsToPackage =
        !!realResolved && !path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`);
      if (belongsToPackage) {
        process.stdout.write(`  ok      ${name}  (${resolved})\n`);
        continue;
      }
      link(packageBin, resolved);
      process.stdout.write(`  replaced stale bin ${name}  (${resolved})\n`);
      continue;
    }
    link(packageBin, path.join(binDir, name));
  }

  // Validate the links using the same check doctor uses before the full report.
  await checkExtensions(binaryStatus());
  process.stdout.write("Running doctor checks...\n");
  const doctorResults = await runDoctor(orchDir());
  process.stdout.write(`Doctor: ${doctorResults.filter((result) => result.status === "ok" || result.status === "skip").length}/${doctorResults.length} checks passed\n`);
  if (gaps.length) {
    process.stdout.write("Setup incomplete:\n" + gaps.map((gap) => `  - ${gap}`).join("\n") + "\n");
    process.exitCode = 1;
    return;
  }
  const doneMessage = "Done. Open a backend workspace and try: orch spawn 2 --tab Team1";
  if (interactive) setupOutro(doneMessage);
  else process.stdout.write(`${doneMessage}\n`);
}

/** Interactive notifier onboarding: probe available notifiers, pick a set, collect each one's
 * declared fields, and persist them as settings.json `notify` entries. A cancel skips the step. */
async function configureNotifiers(): Promise<void> {
  const available = (await probeNotifiers()).filter((notifier) => notifier.available);
  if (!available.length) return;
  const picked = await selectNotifiers(available.map((notifier) => notifier.id));
  if (picked === null || !picked.length) return;
  const selections: { id: string; config: Record<string, unknown> }[] = [];
  for (const id of picked) {
    const choice = available.find((notifier) => notifier.id === id)!;
    const config: Record<string, unknown> = {};
    for (const field of choice.requiredFields) {
      const answer = await promptText(`${id}: ${field.label ?? field.name}`);
      if (answer === null) return; // cancel skips the whole notifier step
      // A "command" field is a shell string orch runs via `sh -c`.
      config[field.name] = field.name === "command" ? ["sh", "-c", answer] : answer;
    }
    selections.push({ id, config });
  }
  const result = await buildSelectedNotifyEntries(selections);
  for (const error of result.errors) {
    process.stderr.write(`  notifier ${error.id}: missing required fields — ${error.missing.join(", ")}\n`);
  }
  if (result.entries.length) {
    writeSettingsNotify(orchDir(), result.entries);
    process.stdout.write(`  recorded ${result.entries.length} notifier(s): ${result.entries.map((entry) => entry.id).join(", ")}\n`);
  }
}

// ---- settings (inspect effective settings + provenance, switch active defaults) ----

/** The raw `queue.max_retries` set in settings.json, or undefined when the file omits it —
 * so its provenance reads honestly rather than the value loadConfig defaults it to. */
function rawMaxRetries(orchDirPath: string): number | undefined {
  try {
    const parsed: unknown = JSON.parse(files.readFileSync(settingsPath(orchDirPath), "utf8"));
    if (isRecord(parsed) && isRecord(parsed.queue) && typeof parsed.queue.max_retries === "number") return parsed.queue.max_retries;
  } catch {
    // Absent or invalid — loadConfig already surfaced any real error before this ran.
  }
  return undefined;
}

/** Switch the active default adapter/backend; writeSettingsDefault throws when the id is not installed. */
function switchDefault(key: "adapter" | "backend", value: string): void {
  try {
    writeSettingsDefault(orchDir(), key, value);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  process.stdout.write(`default ${key} = ${value}\n`);
}

/** Print each resolvable setting with its winning source, or switch the active default via --harness/--plexer. */
function cmdSettings(args: string[]): void {
  const harness = readAssignFlag(args, "--harness") ?? readAssignFlag(args, "--agent");
  const plexer = readAssignFlag(args, "--plexer") ?? readAssignFlag(args, "--backend");
  const json = args.includes("--json");

  // A load error (invalid settings, legacy config.toml) surfaces loudly with no partial table.
  let config: OrchConfig;
  try {
    config = loadConfig(orchDir());
  } catch (error: unknown) {
    die(errorMessage(error));
  }

  if (harness !== undefined) switchDefault("adapter", harness);
  if (plexer !== undefined) switchDefault("backend", plexer);
  if (harness !== undefined || plexer !== undefined) return;

  const provenance = [
    { key: "adapter", ...resolveWithSource<string>({ env: "ORCH_ADAPTER", config: config.defaults.adapter, fallback: "(none)" }) },
    { key: "backend", ...resolveWithSource<string>({ env: "ORCH_BACKEND", config: config.defaults.backend, fallback: "(auto)" }) },
    { key: "model", ...resolveWithSource<string>({ env: "ORCH_MODEL", config: config.defaults.model, fallback: "(none)" }) },
    { key: "spawn_cap", ...resolveWithSource<number>({ env: "ORCH_SPAWN_CAP", config: config.defaults.spawn_cap, fallback: 8 }) },
    { key: "worktree", ...resolveWithSource<boolean>({ env: "ORCH_WORKTREE", config: config.defaults.worktree, fallback: false }) },
    { key: "worker_peer_tools", ...resolveWithSource<boolean>({ config: config.defaults.worker_peer_tools, fallback: false }) },
    { key: "queue.max_retries", ...resolveWithSource<number>({ config: rawMaxRetries(orchDir()), fallback: 1 }) },
  ];

  const installedSet = config.installed.adapters.length > 0 || config.installed.backends.length > 0;
  if (json) {
    const out: Record<string, unknown> = {};
    for (const { key, value, source } of provenance) out[key] = { value, source };
    out.installed = { value: config.installed, source: installedSet ? "settings.json" : "default" };
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    return;
  }

  const width = Math.max(...provenance.map((row) => row.key.length));
  const valueWidth = Math.max(...provenance.map((row) => String(row.value).length));
  process.stdout.write(`settings  ${settingsPath(orchDir())}\n\n`);
  for (const { key, value, source } of provenance) {
    process.stdout.write(`  ${key.padEnd(width)}  ${String(value).padEnd(valueWidth)}  ${source}\n`);
  }
  process.stdout.write("\n");
  process.stdout.write(`  installed.adapters  ${config.installed.adapters.join(", ") || "(none)"}\n`);
  process.stdout.write(`  installed.backends  ${config.installed.backends.join(", ") || "(none)"}\n`);
  process.stdout.write(`  hosts               ${Object.keys(config.hosts).length}\n`);
  process.stdout.write(`  workspaces          ${Object.keys(config.workspaces).length}\n`);
  process.stdout.write(`  notify              ${config.notify.length}\n`);
}

// ---- spawn / tile (geometry-driven tiler) ----


// Fetch the group layout that contains `refPane`.
function paneLayout(refPane: BackendHandle, backend: Backend): BackendGroupLayout {
  if (!backend.layoutOf) throw new Error(`backend ${backend.id} does not provide layout`);
  return backend.layoutOf(refPane);
}

function callerWorkspace(): string | null {
  const backend = resolveBackend({ configured: loadConfig(orchDir()).defaults.backend ?? null });
  return backend.currentIdentity?.()?.workspace ?? null;
}

function backendTarget(target: string, command: string): { backend: Backend; handle: string } {
  const ent = resolveTarget(target);
  const id = parseIdentity(ent.key);
  const backend = getBackend(id.backend);
  if (!backend) die(`orch ${command}: backend ${JSON.stringify(id.backend)} is not registered.`);
  return { backend, handle: id.handle };
}

const TRUST_FILE = path.join(HOME, ".pi", "agent", "trust.json");

function launchesPi(cmd: string): boolean {
  const bin = cmd.trim().split(/\s+/)[0];
  return bin === "pi" || bin === "pif";
}

// pi blocks its first launch in an untrusted cwd on a "trust this folder?"
// dialog no one is watching in a spawned pane; seed trust.json ahead of launch.
function writeTrustEntry(cwd: string) {
  const resolved = path.resolve(cwd);
  const map = readJSON<Record<string, unknown>>(TRUST_FILE) ?? {};
  if (map[resolved] === true) return;
  map[resolved] = true;
  files.mkdirSync(path.dirname(TRUST_FILE), { recursive: true });
  files.writeFileSync(TRUST_FILE, JSON.stringify(map, null, 2) + "\n");
  process.stdout.write(`Pre-trusted ${resolved} in ~/.pi/agent/trust.json\n`);
}



// A worker is ready once its bridge presence dir appears. `agent start` cannot
// drop a launch keystroke, so this only waits — it never re-launches.
async function awaitBridgeRegistration(created: { key: string; pane: string; name: string }[], json = false) {
  const pending = new Map(created.map((c) => [c.key, c]));
  const deadline = Date.now() + 60_000;
  if (!json) process.stdout.write("\nWaiting for agents to register:\n");
  while (pending.size && Date.now() < deadline) {
    for (const [key, agent] of [...pending]) {
      if (bridgeRegistered(key)) {
        pending.delete(key);
        if (!json) process.stdout.write(`  ok      ${agent.pane}  ${agent.name}\n`);
      }
    }
    await delay(500);
  }
  for (const agent of pending.values())
    process.stderr.write(`  STALLED ${agent.pane}  ${agent.name} — no bridge dir; try: orch restart ${agent.name}\n`);
}

// Print the final layout of the tab containing refPane, with names.
function printLayout(refPane: BackendHandle, backend: Backend, header: string) {
  let layout: BackendGroupLayout;
  try {
    layout = paneLayout(refPane, backend);
  } catch {
    return;
  }
  const names = new Map((backend.inventory?.() ?? []).map((target) => [String(target.handle), target.name ?? "-"]));
  process.stdout.write(header + "\n");
  const rows = layout.panes.map((p) => [
    String(p.handle),
    names.get(String(p.handle)) ?? "-", 
    `${p.rect.width}x${p.rect.height} @${p.rect.x},${p.rect.y}`,
  ]);
  const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
  const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
  for (const r of rows)
    process.stdout.write(`  ${r[0]!.padEnd(w0)}  ${r[1]!.padEnd(w1)}  ${r[2]!}\n`);
}


const WORKER_BASE_TOOLS = ["read", "write", "edit", "bash", "orch_ask"] as const;
const WORKER_PEER_TOOLS = ["orch_agents", "orch_send", "orch_read"] as const;

/** Build the explicit tool allowlist granted to spawned workers. */
export function workerTools(config: OrchConfig): string {
  const tools: string[] = [...WORKER_BASE_TOOLS];
  const peerTools = config.defaults.worker_peer_tools ?? false;
  if (peerTools) tools.push(...WORKER_PEER_TOOLS);
  return tools.join(",");
}

function resolveAdapter(id: string): AgentAdapter {
  try {
    return resolveRegisteredAdapter(id);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

function adapterCommand(adapter: string, config = loadConfig(orchDir())): string {
  const resolved = resolveAdapter(adapter);
  return resolved.restrictedInteractiveCmd?.({ tools: workerTools(config) }) ?? resolved.interactiveCmd({});
}

interface AgentFlags {
  adapterFlag?: string;
  backendFlag?: string;
  modelFlag?: string;
}

interface AgentSettings {
  adapter: string;
  backend: string;
  model: string | null;
}

function resolveAgentSettings(flags: AgentFlags, config = loadConfig(orchDir())): AgentSettings {
  const adapter = resolveSetting({ flag: flags.adapterFlag, env: "ORCH_ADAPTER", config: config.defaults.adapter, fallback: "" });
  if (!adapter) die("no harness selected — pass --agent <id> or run `orch setup` to pick one");
  // Selection flows through the backend factory: explicit flag/env, then config
  // default, then a capability-probed fallback. No per-backend branch is hard-coded here.
  let backend: Backend;
  try {
    backend = resolveBackend({
      explicit: flags.backendFlag ?? process.env.ORCH_BACKEND ?? null,
      configured: config.defaults.backend ?? null,
    });
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  const selectedModel = resolveSetting({ flag: flags.modelFlag, env: "ORCH_MODEL", config: config.defaults.model, fallback: "" });
  return { adapter, backend: backend.id, model: selectedModel || null };
}

type SpawnFlags = AgentFlags & {
  json: boolean;
  label: string;
  cwd: string;
  cmd: string;
  commandFlag: boolean;
  workspace: string | null;
  namePrefix: string | null;
  spawnCapFlag?: number;
  worktreeFlag?: boolean;
  positional: string[];
};

function readSpawnFlag(flags: SpawnFlags, args: string[], index: number): number {
  const argument = args[index];
  switch (argument) {
    case "--tab": flags.label = args[index + 1]!; return 1;
    case "--cwd": flags.cwd = args[index + 1]!; return 1;
    case "--cmd": flags.cmd = args[index + 1]!; flags.commandFlag = true; return 1;
    case "--name": flags.namePrefix = args[index + 1]!; return 1;
    case "--workspace": flags.workspace = args[index + 1]!; return 1;
    case "--model": flags.modelFlag = args[index + 1]!; return 1;
    case "--agent":
    case "--adapter": flags.adapterFlag = args[index + 1]!; return 1;
    case "--backend": flags.backendFlag = args[index + 1]!; return 1;
    case "--spawn-cap":
    case "--cap": flags.spawnCapFlag = Number(args[index + 1]); return 1;
    default: return -1;
  }
}

function parseSpawnFlags(args: string[]): SpawnFlags {
  const flags: SpawnFlags = {
    json: args.includes("--json"),
    label: "work", cwd: process.cwd(), cmd: "pi", commandFlag: false,
    workspace: null, namePrefix: null, positional: [],
  };
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--worktree" || args[index] === "--json") { if (args[index] === "--worktree") flags.worktreeFlag = true; continue; }
    const consumed = readSpawnFlag(flags, args, index);
    if (consumed >= 0) { index += consumed; continue; }
    flags.positional.push(args[index]!);
  }
  return flags;
}

type SpawnSettings = AgentSettings & {
  tools: string;
  json: boolean;
  label: string;
  cwd: string;
  cmd: string;
  commandFlag: boolean;
  workspace: string | null;
  prefix: string;
  n: number;
  worktree: boolean;
};

function resolveSpawnSettings(flags: SpawnFlags): SpawnSettings {
  const config = loadConfig(orchDir());
  const settings = resolveAgentSettings(flags, config);
  const spawnCap = resolveSetting({ flag: flags.spawnCapFlag, env: "ORCH_SPAWN_CAP", config: config.defaults.spawn_cap, fallback: 8 });
  const worktree = resolveSetting({ flag: flags.worktreeFlag, env: "ORCH_WORKTREE", config: config.defaults.worktree, fallback: false });
  if (!Number.isInteger(spawnCap) || spawnCap < 1) die(`Invalid spawn cap ${spawnCap}; expected a positive integer.`);
  const n = parseInt(flags.positional[0]!, 10);
  if (!Number.isFinite(n) || n < 1)
    die("usage: orch spawn <N> [--tab <label>] [--cwd <path>] [--cmd <command>] [--name <prefix>] [--model <provider/model[:thinking]>] [--agent <adapter>] [--backend <backend>] [--spawn-cap <N>] [--worktree]");
  if (n > spawnCap) die(`Refusing to spawn ${n} panes — cap is ${spawnCap}.`);
  resolveAdapter(settings.adapter);
  const tools = workerTools(config);
  const cmd = flags.commandFlag ? flags.cmd : adapterCommand(settings.adapter, config);
  return { ...settings, tools, json: flags.json, label: flags.namePrefix ?? flags.label, cwd: flags.cwd, cmd, commandFlag: flags.commandFlag, workspace: flags.workspace, prefix: flags.namePrefix ?? flags.label, n, worktree };
}

interface SpawnRoot { root: string; key: string; workspace: string; tabId: string; tabLabel: string; rootCwd: string; rootName: string }

interface CreatedAgent { key: string; pane: string; name: string }

function executeHeadlessSpawn(settings: SpawnSettings): void {
  if (settings.commandFlag) die("--cmd requires a pane backend; detached launches use the selected adapter.");
  const adapter = resolveAdapter(settings.adapter);
  const created: HeadlessHandle[] = [];
  for (let index = 1; index <= settings.n; index++) {
    const name = `${settings.prefix}-${index}`;
    const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
    if (launchesPi(settings.cmd)) writeTrustEntry(cwd);
    try {
      // Headless pi identifies itself as session-<pid>; omitting key keeps the
      // registry handle aligned with the presence protocol's actual key.
      const handle = headlessBackend.spawn(adapter, {
        cwd,
        model: settings.model ?? undefined,
        orchDir: orchDir(),
        tools: settings.tools,
      });
      created.push(handle);
      recordSpawned(handle.key, {
        adapter: settings.adapter,
        model: settings.model ?? undefined,
        backend: settings.backend,
        worktree: settings.worktree ? cwd : undefined,
        branch: settings.worktree ? `orch/${name}` : undefined,
        owner: selfActor() ?? undefined,
      });
      if (!settings.json) process.stdout.write(`${handle.key}  ${name}  [headless]\n`);
    } catch (error: unknown) {
      die(`headless spawn failed for ${name}: ${errorMessage(error)}`);
    }
  }
  if (settings.json) process.stdout.write(JSON.stringify({ backend: "headless", agents: created }) + "\n");
  else {
    process.stdout.write(`\nSpawned ${created.length} headless agent(s) (no panes).\n`);
    process.stdout.write("'orch status' shows the fleet.\n");
  }
}

function resolveSpawnWorkspace(requested: string | null): string {
  const workspace = requested ?? callerWorkspace();
  if (!workspace) die("Could not determine workspace id. Pass --workspace <id>.");
  return workspace;
}

function createSpawnRoot(settings: SpawnSettings, workspace: string, backend: Backend, adapter: AgentAdapter): SpawnRoot {
  const rootName = `${settings.prefix}-1`;
  const rootCwd = settings.worktree ? createAgentWorktree(settings.cwd, rootName) : settings.cwd;
  if (launchesPi(settings.cmd)) writeTrustEntry(rootCwd);
  if (!backend.createGroup) die(`backend ${backend.id} lacks group creation.`);
  let group: BackendGroup;
  let shellRoot: BackendHandle;
  try {
    const created = backend.createGroup({ workspace, cwd: rootCwd, label: settings.label });
    group = created.group;
    shellRoot = created.rootHandle;
  } catch (error: unknown) {
    die(`group create failed: ${errorMessage(error)}`);
  }
  const handle = backend.spawn(adapter, { key: serializeIdentity({ backend: backend.id, workspace, handle: rootName }), cwd: rootCwd, name: rootName, workspace, group: group.id, orchDir: orchDir(), model: settings.model ?? undefined, tools: settings.tools });
  backend.close(shellRoot);
  const key = serializeIdentity(backend.mintIdentity(handle));
  return { root: String(handle), key, workspace, tabId: group.id, tabLabel: group.label ?? settings.label, rootCwd, rootName };
}

function launchAdditionalAgents(settings: SpawnSettings, root: SpawnRoot, created: CreatedAgent[]): void {
  for (let i = 2; i <= settings.n; i++) {
    try {
      const name = `${settings.prefix}-${i}`;
      const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
      let split: "down" | "right" = "down";
      if (i > 2) {
        const layout = paneLayout(root.root, resolveBackend({ configured: settings.backend }));
        const largest = layout.panes.reduce((current, pane) => {
          const currentArea = current.rect.width * current.rect.height;
          const paneArea = pane.rect.width * pane.rect.height;
          return paneArea > currentArea ? pane : current;
        });
        split = largest.rect.width >= largest.rect.height ? "right" : "down";
      }
      const backend = resolveBackend({ configured: settings.backend });
      const adapter = resolveAdapter(settings.adapter);
      const key = serializeIdentity({ backend: backend.id, workspace: root.workspace, handle: name });
      const handle = backend.spawn(adapter, { key, cwd, name, workspace: root.workspace, group: root.tabId, split, orchDir: orchDir(), model: settings.model ?? undefined, tools: settings.tools });
      const identityKey = serializeIdentity(backend.mintIdentity(handle));
      recordSpawned(identityKey, { adapter: settings.adapter, model: settings.model ?? undefined, backend: backend.id, handle: String(handle), cwd, worktree: settings.worktree ? cwd : undefined, branch: settings.worktree ? `orch/${name}` : undefined, owner: selfActor() ?? undefined });
      created.push({ key: identityKey, pane: String(handle), name });
    } catch (error: unknown) {
      process.stderr.write(`warning: could not place agent #${i}: ${errorMessage(error)}\n`);
    }
  }
}

async function reportSpawnResults(settings: SpawnSettings, root: SpawnRoot, created: CreatedAgent[]): Promise<void> {
  if (!settings.json) {
    for (const agent of created) process.stdout.write(`${agent.pane}  ${agent.name}  [${root.tabLabel}]  ${settings.cmd}\n`);
    process.stdout.write(`\nSpawned ${created.length} named agent(s) on tab "${root.tabLabel}" (no focus stolen).\n`);
    printLayout(root.root, resolveBackend({ configured: settings.backend }), "\nFinal tiling:");
  }
  if (launchesPi(settings.cmd)) await awaitBridgeRegistration(created, settings.json);
  if (settings.model) await pinModels(created, settings.model);
  if (settings.json) process.stdout.write(JSON.stringify({ backend: settings.backend, tab: root.tabLabel, agents: created }) + "\n");
  else process.stdout.write(`\n'orch status' shows the fleet.\n`);
}

async function executeSpawn(settings: SpawnSettings): Promise<void> {
  if (settings.backend === headlessBackend.id) {
    executeHeadlessSpawn(settings);
    return;
  }
  const workspace = resolveSpawnWorkspace(settings.workspace);
  const backend = resolveBackend({ configured: settings.backend });
  const adapter = resolveAdapter(settings.adapter);
  const root = createSpawnRoot(settings, workspace, backend, adapter);
  const created: CreatedAgent[] = [];
  recordSpawned(root.key, { adapter: settings.adapter, model: settings.model ?? undefined, backend: backend.id, handle: root.root, cwd: root.rootCwd, worktree: settings.worktree ? root.rootCwd : undefined, branch: settings.worktree ? `orch/${root.rootName}` : undefined, owner: selfActor() ?? undefined });
  created.push({ key: root.key, pane: root.root, name: root.rootName });
  launchAdditionalAgents(settings, root, created);
  await reportSpawnResults(settings, root, created);
}

async function cmdSpawn(args: string[]) {
  await executeSpawn(resolveSpawnSettings(parseSpawnFlags(args)));
}

async function cmdTile(args: string[]) {
  const json = args.includes("--json");
  let cwd = process.cwd();
  let cmd = "";
  let commandFlag = false;
  let name: string | null = null;
  let modelFlag: string | undefined;
  let adapterFlag: string | undefined;
  let backendFlag: string | undefined;
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--cwd") cwd = args[++i]!;
    else if (a === "--cmd") { cmd = args[++i]!; commandFlag = true; }
    else if (a === "--name") name = args[++i]!;
    else if (a === "--model") modelFlag = args[++i]!;
    else if (a === "--agent" || a === "--adapter") adapterFlag = args[++i]!;
    else if (a === "--backend") backendFlag = args[++i]!;
    else if (a === "--json") continue;
    else positional.push(a!);
  }
  const { adapter, model } = resolveAgentSettings({ adapterFlag, backendFlag, modelFlag });
  const selectedBackend = resolveBackend({ explicit: backendFlag ?? null, configured: loadConfig(orchDir()).defaults.backend ?? null });
  if (!selectedBackend.panes) die(`orch tile requires a pane-capable backend; ${selectedBackend.id} has no panes to tile.`);
  resolveAdapter(adapter);
  if (!commandFlag) cmd = adapterCommand(adapter);
  const target = positional[0];
  if (!target) die("usage: orch tile <tab-or-pane> [--name <name>] [--cmd <command>] [--cwd <path>] [--model <provider/model[:thinking]>");

  const tab = resolveTab(target);
  const refPane = selectedBackend.inventory?.().find((item) => item.group === tab.id)?.handle;
  if (refPane === undefined) die(`No panes found on group "${tab.id}".`);

  let layout;
  try {
    layout = paneLayout(refPane, selectedBackend);
  } catch (e: unknown) {
    die(`could not read layout for ${JSON.stringify(refPane)}: ${errorMessage(e)}`);
  }
  const autoName = name ?? `tile-${layout.panes.length + 1}`;

  const workspace = selectedBackend.inventory?.().find((item) => item.handle === refPane)?.workspace;
  if (!workspace) die(`Could not determine workspace for pane ${JSON.stringify(refPane)}.`);
  const key = serializeIdentity({ backend: selectedBackend.id, workspace, handle: autoName });
  const selectedAdapter = resolveAdapter(adapter);
  let handle: BackendHandle;
  try {
    handle = selectedBackend.spawn(selectedAdapter, { key, cwd, name: autoName, workspace, group: tab.id, split: "down", orchDir: orchDir(), model: model ?? undefined });
  } catch (e: unknown) {
    die(`tile failed: ${errorMessage(e)}`);
  }
  const identityKey = serializeIdentity(selectedBackend.mintIdentity(handle));
  recordSpawned(identityKey, { adapter, model: model ?? undefined, backend: selectedBackend.id, handle: String(handle), cwd, owner: selfActor() ?? undefined });
  if (json) process.stdout.write(JSON.stringify({ pane: String(handle), key: identityKey, name: autoName, tab: layout.group, added: true }) + "\n");
  else {
    process.stdout.write(`Added ${String(handle)} (${autoName}) to group ${layout.group} running "${cmd}".\n`);
    printLayout(refPane, selectedBackend, "\nFinal tiling:");
  }
  if (model) await pinModels([{ key: identityKey, pane: String(handle), name: autoName }], model);
}

// ---- unified pane control: run / model / wait / new / close / dispatch ----

function sleepMs(ms: number) {
  try {
    execFileSync("sleep", [String(ms / 1000)], { stdio: "ignore" });
  } catch {}
}


const WORKER_PROMPT_HEADER = "[orch worker] No human watches this pane. For any decision you cannot make yourself, call orch_ask and wait for the orchestrator. NEVER use ask-user/question tools.";

function workerPrompt(prompt: string, raw: boolean): string {
  return raw ? prompt : `${WORKER_PROMPT_HEADER}\n\n${prompt}`;
}

interface StatusFile {
  pid?: number;
  updatedAt?: string;
  state?: string;
}

interface LockFile {
  pid?: number;
}

// Dispatch a prompt and retry once when the pane never enters working state.
async function cmdRun(args: string[]): Promise<void> {
  const raw = args.includes("--raw");
  const json = args.includes("--json");
  const { gov, rest } = parseGovernance(args.filter((arg) => arg !== "--json"));
  const { target, prompt } = parseTargetPrompt(rest, "--raw", 'usage: orch run <target> "<prompt>" [--raw] [--steal] [--cross-workspace] [--json]');
  const { pane } = resolvePane(target, { crossWorkspace: gov.crossWorkspace });
  const result = await writeRpc("dispatch", { target: pane, text: workerPrompt(prompt, raw) }, gov);
  if (json) process.stdout.write(JSON.stringify({ target: pane, dispatched: true, ...(isRecord(result) ? result : {}) }) + "\n");
  else process.stdout.write(`Dispatched to ${pane}.\n`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function setAgentModel(agentKey: string, modelArg: string, gov: WriteGovernance = {}): Promise<{ old: string | null; now: string; confirmed: true; unchanged: boolean }> {
  const old = readJSON<{ model?: unknown }>(path.join(presenceAgentDir(agentKey), "status.json"));
  const previous = typeof old?.model === "string" ? old.model : null;
  await writeRpc("set-model", { target: agentKey, model: modelArg }, gov);
  return { old: previous, now: modelArg, confirmed: true, unchanged: previous === modelArg };
}

async function cmdModel(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const { gov, rest } = parseGovernance(args.filter((arg) => arg !== "--no-wait" && arg !== "--json"));
  const target = rest[0];
  const modelArg = rest[1];
  if (!target || !modelArg) die("usage: orch model <target> <provider/model[:thinking]> [--steal] [--cross-workspace] [--no-wait]");
  const { pane } = resolvePane(target, { crossWorkspace: gov.crossWorkspace });
  const result = await setAgentModel(pane, modelArg, gov);
  if (json) process.stdout.write(JSON.stringify({ target: pane, requested: modelArg, ...result }) + "\n");
  else if (result.unchanged) process.stdout.write(`${pane}: already ${modelArg} (no-op)\n`);
  else process.stdout.write(`${pane}: ${result.old ?? "(unknown)"} → ${result.now} (accepted)\n`);
}

async function pinModels(created: { key: string; pane: string; name: string }[], model: string): Promise<void> {
  const results = await Promise.all(created.map(async ({ key, pane, name }) => {
    try {
      const result = await setAgentModel(key, model);
      return { pane, name, ok: result.confirmed };
    } catch {
      return { pane, name, ok: false };
    }
  }));
  for (const result of results) {
    if (!result.ok) process.stderr.write(`warning: could not pin ${result.name} (${result.pane}) to ${model}.\n`);
  }
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}

function cmdWait(args: string[]) {
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

function cmdNew(args: string[]) {
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

function paneForeground(backend: Backend, handle: string): string[] {
  return backend.foregroundProcesses?.(handle) ?? [];
}

// Reload extensions in place. Escape first dismisses any stuck overlay; the
// bridge must refresh status.json while retaining its process pid.
interface ReloadResult {
  pane: string;
  ok: boolean;
  reason?: string;
}

function doReload(backend: Backend, pane: string, presenceKey: string, reloadText: string): ReloadResult {
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

function touchReloadSignal(): void {
  const signalPath = path.join(orchDir(), "reload.signal");
  const fd = files.openSync(signalPath, "a");
  files.closeSync(fd);
}

// Full process restart for pi version upgrades. Escape first, the adapter's
// quit mechanism, wait for the shell, relaunch, then wait for a fresh bridge pid.
function doHardRestart(backend: Backend, pane: string, cmd: string, presenceKey: string, quitText: string): boolean {
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

function cmdReload(args: string[]) {
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

function cmdRestart(args: string[]) {
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

function cmdRename(args: string[]) {
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

function cmdClose(args: string[]) {
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

// ---- recovery / escape hatches ----

function cmdAbort(args: string[]) {
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

function requirePaneTarget(target: string, command: string): { backend: Backend; handle: string } {
  const resolved = backendTarget(target, command);
  if (!resolved.backend.panes) die(`orch ${command}: backend ${resolved.backend.id} lacks pane control.`);
  return resolved;
}

function cmdKeys(args: string[]) {
  const json = args.includes("--json");
  const cleanArgs = args.filter((arg) => arg !== "--json");
  const target = cleanArgs[0];
  const keys = cleanArgs.slice(1);
  if (!target || !keys.length) die("usage: orch keys <target> <key> [key...]");
  const { backend, handle } = requirePaneTarget(target, "keys");
  if (!backend.canSendKeys) die(`backend ${backend.id} cannot send keys.`);
  if (backend.sendKeys(handle, keys)) {
    if (json) process.stdout.write(JSON.stringify({ target: handle, keys, sent: true }) + "\n");
    else process.stdout.write(`Sent keys to ${handle}: ${keys.join(" ")}\n`);
  }
  else die(`Could not send keys to ${handle}.`);
}

function cmdPeek(args: string[]) {
  let n = 25;
  let json = false;
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-n") n = parseInt(args[++i]!, 10) || 25;
    else if (args[i] === "--json") json = true;
    else positional.push(args[i]!);
  }
  const target = positional[0];
  if (!target) die("usage: orch peek <target> [-n N] [--json]");
  const { backend, handle } = requirePaneTarget(target, "peek");
  if (!backend.read) die(`backend ${backend.id} lacks screen reading.`);
  let screen: string;
  try {
    screen = backend.read(handle, n);
  } catch (e: unknown) {
    die(`Could not read ${handle}: ${errorMessage(e)}`);
  }
  if (json) {
    process.stdout.write(JSON.stringify({ target, pane: handle, screen, lines: n }) + "\n");
    return;
  }
  process.stdout.write("screen (eyeball only — status/result/tail are the truth channel)\n");
  process.stdout.write(screen.endsWith("\n") ? screen : screen + "\n");
}

// ---- tab CRUD ----

function selectedGroups(): { backend: Backend; groups: BackendGroup[] } {
  const backend = resolveBackend({ configured: loadConfig(orchDir()).defaults.backend ?? null });
  return { backend, groups: backend.groups?.() ?? [] };
}

function resolveTab(target: string): BackendGroup {
  const { backend, groups } = selectedGroups();
  if (!groups.length) die("No groups available.");
  const exact = groups.filter((group) => group.id === target || group.label === target);
  const insensitive = groups.filter((group) => (group.label ?? "").toLowerCase() === target.toLowerCase());
  const candidates = exact.length ? exact : insensitive;
  if (candidates.length === 1) return candidates[0]!;
  if (candidates.length > 1) {
    process.stderr.write(`Ambiguous group "${target}". Candidates:\n`);
    for (const group of candidates) process.stderr.write(`  ${group.id}  ${group.label}\n`);
    process.exit(1);
  }
  const ent = resolveTarget(target);
  const id = parseIdentity(ent.key);
  if (id.backend !== backend.id) die(`Target "${target}" belongs to backend ${id.backend}.`);
  const found = groups.find((group) => group.id === (backend.inventory?.().find((item) => String(item.handle) === id.handle)?.group ?? null));
  if (!found) die(`No group found for target "${target}".`);
  return found;
}

function cmdTabs(args: string[]) {
  const { enabled } = splitOptionFlags(args, ["--all", "--json"]);
  const all = enabled.has("--all");
  const json = enabled.has("--json");
  const { backend, groups } = selectedGroups();
  const workspace = backend.currentIdentity?.()?.workspace ?? null;
  const tabs = groups.filter((tab) => all || workspace === null || tab.workspace === workspace);
  if (!tabs.length) {
    if (json) process.stdout.write("[]\n");
    else process.stdout.write("No groups available.\n");
    return;
  }
  if (json) {
    process.stdout.write(JSON.stringify(tabs, null, 2) + "\n");
    return;
  }
  const showWorkspace = all && new Set(tabs.map((t) => t.workspace ?? "-")).size > 1;
  const headers = showWorkspace ? ["TAB", "LABEL", "NUM", "PANES", "STATUS", "WS"] : ["TAB", "LABEL", "NUM", "PANES", "STATUS"];
  const rows = tabs.map((t) => [
    t.id + (t.focused ? "*" : ""),
    t.label ?? "-",
    String(t.number ?? "-"),
    String(t.paneCount ?? "-"),
    t.status ?? "-",
    ...(showWorkspace ? [t.workspace ?? "-"] : []),
  ]);
  process.stdout.write(renderTable(headers, rows, showWorkspace ? [12, 20, 4, 5, 10, 12] : [12, 20, 4, 5, 10]) + "\n");
}

function cmdTab(args: string[]) {
  const json = args.includes("--json");
  const cleanArgs = args.filter((arg) => arg !== "--json");
  const sub = cleanArgs[0];
  const rest = cleanArgs.slice(1);
  if (sub === "new") {
    let label: string | null = null;
    let workspace: string | null = null;
    let cwd = process.cwd();
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === "--label") label = rest[++i]!;
      else if (rest[i] === "--workspace") workspace = rest[++i]!;
      else if (rest[i] === "--cwd") cwd = rest[++i]!;
    }
    const { backend } = selectedGroups();
    workspace ??= backend.currentIdentity?.()?.workspace ?? null;
    if (!workspace) die("Could not determine workspace id. Pass --workspace <id>.");
    if (!backend.createGroup) die(`backend ${backend.id} lacks group creation.`);
    try {
      const r = backend.createGroup({ workspace, cwd, label });
      if (json) process.stdout.write(JSON.stringify(r) + "\n");
      else process.stdout.write(`Created group ${r.group.id} "${r.group.label}" — root handle ${String(r.rootHandle)}\n`);
      backend.close(r.rootHandle);
    } catch (e: unknown) {
      die(`group new failed: ${errorMessage(e)}`);
    }
  } else if (sub === "rename") {
    const [t, label] = rest;
    if (!t || !label) die("usage: orch tab rename <tab_id|label> <new-label>");
    const tab = resolveTab(t);
    const { backend } = selectedGroups();
    if (backend.renameGroup?.(tab.id, label)) {
      if (json) process.stdout.write(JSON.stringify({ tab: tab.id, label, renamed: true }) + "\n");
      else process.stdout.write(`${tab.id}: "${tab.label}" → "${label}"\n`);
    } else die(`Could not rename group ${tab.id}.`);
  } else if (sub === "close") {
    const t = rest[0];
    if (!t) die("usage: orch tab close <tab_id|label>");
    const tab = resolveTab(t);
    const { backend } = selectedGroups();
    if (backend.closeGroup?.(tab.id)) {
      if (json) process.stdout.write(JSON.stringify({ tab: tab.id, closed: true }) + "\n");
      else process.stdout.write(`Closed group ${tab.id} "${tab.label}".\n`);
    } else die(`Could not close group ${tab.id}.`);
  } else if (sub === "focus") {
    const t = rest[0];
    if (!t) die("usage: orch tab focus <tab_id|label>");
    const tab = resolveTab(t);
    const { backend } = selectedGroups();
    if (backend.focusGroup?.(tab.id)) {
      if (json) process.stdout.write(JSON.stringify({ tab: tab.id, focused: true }) + "\n");
      else process.stdout.write(`Focused group ${tab.id} "${tab.label}".\n`);
    } else die(`Could not focus group ${tab.id}.`);
  } else {
    die("usage: orch tab new|rename|close|focus …  (orch tabs to list)");
  }
}

// ---- pane focus / zoom / move ----

function cmdFocus(args: string[]) {
  const json = args.includes("--json");
  const target = args.find((arg) => arg !== "--json");
  if (!target) die("usage: orch focus <target> [--json]");
  const { backend, handle } = requirePaneTarget(target, "focus");
  if (backend.focus(handle)) {
    if (json) process.stdout.write(JSON.stringify({ target: handle, focused: true }) + "\n");
    else process.stdout.write(`Focused ${handle}.\n`);
  } else die(`Could not focus ${handle}.`);
}

function cmdZoom(args: string[]) {
  let mode = "--toggle";
  const json = args.includes("--json");
  const positional: string[] = [];
  for (const a of args) {
    if (a === "--off") mode = "--off";
    else if (a === "--on") mode = "--on";
    else if (a === "--json") continue;
    else positional.push(a);
  }
  const target = positional[0];
  if (!target) die("usage: orch zoom <target> [--on|--off]  (default: toggle)");
  const { backend, handle } = requirePaneTarget(target, "zoom");
  if (!backend.zoom) die(`backend ${backend.id} lacks zoom.`);
  const zoomMode = mode === "--on" ? "on" : mode === "--off" ? "off" : "toggle";
  if (backend.zoom(handle, zoomMode)) {
    if (json) process.stdout.write(JSON.stringify({ target: handle, mode: zoomMode, zoomed: true }) + "\n");
    else process.stdout.write(`Zoom ${zoomMode} on ${handle}.\n`);
  } else die(`Could not zoom ${handle}.`);
}

function cmdMove(args: string[]) {
  let tab: string | null = null;
  let split = "right";
  const json = args.includes("--json");
  let newTab = false;
  let label: string | null = null;
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tab") tab = args[++i]!;
    else if (args[i] === "--split") split = args[++i]!;
    else if (args[i] === "--new-tab") newTab = true;
    else if (args[i] === "--label") label = args[++i]!;
    else if (args[i] === "--json") continue;
    else positional.push(args[i]!);
  }
  const target = positional[0];
  if (!target || (!tab && !newTab))
    die("usage: orch move <target> --tab <tab_id|label> [--split right|down] | --new-tab [--label X]");
  const { backend, handle } = requirePaneTarget(target, "move");
  try {
    const moved = newTab ? backend.moveToNewGroup?.(handle, label) : backend.moveToGroup?.(handle, resolveTab(tab!).id, split as "down" | "right");
    if (!moved) die(`move failed: backend ${backend.id} rejected the move.`);
    const group = newTab ? null : resolveTab(tab!).id;
    if (json) process.stdout.write(JSON.stringify({ target: handle, moved: true, newTab, tab: group }) + "\n");
    else process.stdout.write(`Moved ${handle} ${newTab ? "to a new group" : `to group ${group}`}.\n`);
  } catch (e: unknown) {
    die(`move failed: ${errorMessage(e)}`);
  }
}

// ---- workspaces ----

function cmdWs(args: string[]) {
  const json = args.includes("--json");
  const positional = args.filter((arg) => arg !== "--json");
  const sub = positional[0];
  if (sub === "focus") {
    const id = positional[1];
    if (!id) die("usage: orch ws focus <workspace_id> [--json]");
    const { backend } = selectedGroups();
    if (!backend.focusWorkspace?.(id)) die(`Could not focus workspace ${id}.`);
    if (json) process.stdout.write(JSON.stringify({ workspace: id, focused: true }) + "\n");
    else process.stdout.write(`Focused workspace ${id}.\n`);
    return;
  }
  if (sub && sub !== "list") die("usage: orch ws [list|focus <workspace_id>] [--json]");
  const { backend } = selectedGroups();
  let wss;
  try {
    wss = backend.workspaces?.() ?? [];
  } catch (e: unknown) {
    die(`workspace list failed: ${errorMessage(e)}`);
  }
  if (!wss.length) {
    if (json) process.stdout.write("[]\n");
    else process.stdout.write("No workspaces.\n");
    return;
  }
  if (json) {
    process.stdout.write(JSON.stringify(wss, null, 2) + "\n");
    return;
  }
  const headers = ["WS", "LABEL", "NUM", "TABS", "PANES", "STATUS"];
  const rows = wss.map((w) => [
    w.id + (w.focused ? "*" : ""),
    w.label ?? "-",
    String(w.number ?? "-"),
    String(w.tabCount ?? "-"),
    String(w.paneCount ?? "-"),
    w.status ?? "-",
  ]);
  process.stdout.write(renderTable(headers, rows, [8, 24, 4, 5, 6, 10]) + "\n");
}

type DispatchFlags = AgentFlags & {
  raw: boolean;
  json: boolean;
  doWait: boolean;
  thenTarget: string | null;
  thenNote: string;
  positional: string[];
};

function parseDispatchFlags(args: string[]): DispatchFlags {
  const commandArgs = args.filter((argument) => argument !== "--raw" && argument !== "--json");
  const flags: DispatchFlags = { raw: args.includes("--raw"), json: args.includes("--json"), doWait: false, thenTarget: null, thenNote: "", positional: [] };
  for (let i = 0; i < commandArgs.length; i++) {
    const argument = commandArgs[i];
    if (argument === "--model") flags.modelFlag = commandArgs[++i];
    else if (argument === "--agent" || argument === "--adapter") flags.adapterFlag = commandArgs[++i];
    else if (argument === "--wait") flags.doWait = true;
    else if (argument === "--then") {
      flags.thenTarget = commandArgs[++i] ?? null;
      flags.thenNote = commandArgs.slice(i + 1).join(" ");
      break;
    } else flags.positional.push(argument!);
  }
  return flags;
}

type DispatchSettings = AgentSettings & {
  raw: boolean;
  json: boolean;
  doWait: boolean;
  thenNote: string;
  ent: Entity;
  pane: string;
  prompt: string;
  destination: Entity | null;
};

function resolveDispatchSettings(flags: DispatchFlags, gov: WriteGovernance = {}): DispatchSettings {
  const target = flags.positional[0];
  const prompt = flags.positional.slice(1).join(" ");
  if (!target || !prompt) die('usage: orch dispatch <target> "<prompt>" [--raw] [--model provider/id:think] [--agent adapter] [--wait] [--then <dst> ["note"]]');
  const { ent, pane } = resolvePane(target, { crossWorkspace: gov.crossWorkspace });
  const settings = resolveAgentSettings(flags);
  resolveAdapter(settings.adapter);
  const destination = flags.thenTarget ? requirePresenceTarget(flags.thenTarget) : null;
  if (flags.thenTarget && !ent.presence) die(`Target "${target}" has no agent dir for --then.`);
  return { ...settings, raw: flags.raw, json: flags.json, doWait: flags.doWait, thenNote: flags.thenNote, ent, pane, prompt, destination };
}

async function cmdDispatch(args: string[]) {
  const { gov, rest } = parseGovernance(args);
  const flags = parseDispatchFlags(rest);
  if (flags.doWait || flags.thenTarget) die('usage: orch dispatch <target> "<prompt>" [--raw] [--model provider/id:think] [--agent adapter] [--steal] [--cross-workspace]');
  const target = flags.positional[0];
  if (target) {
    const remote = targetHost(target);
    if (remote) {
      const remoteArgs = [...args];
      const index = remoteArgs.indexOf(target);
      if (index >= 0) remoteArgs[index] = remote.target;
      remoteWrite(remote.host, "dispatch", remoteArgs);
      return;
    }
  }
  const settings = resolveDispatchSettings(flags, gov);
  if (settings.model) await setAgentModel(settings.pane, settings.model, gov);
  const result = await writeRpc("dispatch", { target: settings.pane, text: workerPrompt(settings.prompt, settings.raw) }, gov);
  recordSpawned(settings.pane, { adapter: settings.adapter, model: settings.model ?? undefined, owner: selfActor() ?? undefined });
  if (settings.json) process.stdout.write(JSON.stringify({ target: settings.pane, dispatched: true, ...(isRecord(result) ? result : {}) }) + "\n");
  else process.stdout.write(`Dispatched to ${settings.pane}.\n`);
}

interface DaemonStatus {
  pid: number;
  startedAt: string;
  uptimeSec: number;
  codeHash: string;
  socket: string;
}

function daemonEntrypoint(): string {
  return process.env.ORCHD_ENTRYPOINT ?? path.join(packageRoot(), "dist", "daemon", "orchd.js");
}

function daemonLockPid(directory = orchDir()): number | undefined {
  const lock = readJSON<LockFile>(path.join(directory, "orchd.lock"));
  return lock && typeof lock.pid === "number" && Number.isInteger(lock.pid) && lock.pid > 0 ? lock.pid : undefined;
}

function validDaemonStatus(value: unknown): value is DaemonStatus {
  return isRecord(value)
    && typeof value.pid === "number"
    && typeof value.startedAt === "string"
    && typeof value.uptimeSec === "number"
    && typeof value.codeHash === "string"
    && typeof value.socket === "string";
}

async function fetchDaemonStatus(timeoutMs = 5000): Promise<DaemonStatus> {
  const result = await rpcCall(orchDir(), "daemon-status", undefined, timeoutMs);
  if (!validDaemonStatus(result)) throw new Error("orchd returned an invalid status");
  return result;
}

async function waitForDaemon(previousStartedAt?: string): Promise<DaemonStatus> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const status = await fetchDaemonStatus(300);
      if (!previousStartedAt || status.startedAt !== previousStartedAt) return status;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("timed out waiting for orchd");
}

async function ensureDaemon(directory: string): Promise<void> {
  try {
    await rpcCall(directory, "daemon-status", undefined, 200);
    return;
  } catch {
    // A live daemon can be between lock acquisition and socket listen.
  }
  const existingPid = daemonLockPid(directory);
  if (!existingPid || !pidAlive(existingPid)) daemonize(daemonEntrypoint(), [], directory);
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      await rpcCall(directory, "daemon-status", undefined, 300);
      return;
    } catch {
      await delay(50);
    }
  }
  throw new DaemonAbsentError(directory);
}

interface WriteGovernance {
  steal?: boolean;
  crossWorkspace?: boolean;
}

/** Extract governance flags and strip them from the positional args. */
function parseGovernance(args: string[]): { gov: WriteGovernance; rest: string[] } {
  const gov: WriteGovernance = {};
  const rest: string[] = [];
  for (const arg of args) {
    if (arg === "--steal") gov.steal = true;
    else if (arg === "--cross-workspace") gov.crossWorkspace = true;
    else rest.push(arg);
  }
  return { gov, rest };
}

async function writeRpc(method: string, params: Record<string, unknown>, gov: WriteGovernance = {}): Promise<unknown> {
  const directory = orchDir();
  const actor = selfActor();
  const enriched: Record<string, unknown> = { ...params };
  if (actor !== null) enriched.actor = actor;
  if (gov.steal) enriched.steal = true;
  if (gov.crossWorkspace) enriched.crossWorkspace = true;
  try {
    await ensureDaemon(directory);
    return await rpcCall(directory, method, enriched);
  } catch (error: unknown) {
    if (error instanceof DaemonAbsentError) die(`orch daemon unavailable; run 'orch daemon start': ${errorMessage(error)}`);
    throw error;
  }
}

async function startDaemon(foreground: boolean, json = false): Promise<void> {
  const existingPid = daemonLockPid();
  if (existingPid && pidAlive(existingPid)) {
    if (json) process.stdout.write(JSON.stringify({ running: true, pid: existingPid, started: false }) + "\n");
    else process.stdout.write(`already running (pid ${existingPid})\n`);
    return;
  }
  const entrypoint = daemonEntrypoint();
  if (foreground) {
    runForeground(entrypoint);
    return;
  }
  daemonize(entrypoint, [], orchDir());
  const status = await waitForDaemon();
  if (json) process.stdout.write(JSON.stringify({ running: true, pid: status.pid, started: true }) + "\n");
  else process.stdout.write(`started (pid ${status.pid})\n`);
}

async function stopDaemon(json = false): Promise<void> {
  const pid = daemonLockPid();
  if (!pid || !pidAlive(pid)) {
    if (json) process.stdout.write(JSON.stringify({ running: false, stopped: false }) + "\n");
    else process.stdout.write("not running\n");
    return;
  }
  process.kill(pid, "SIGTERM");
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && pidAlive(pid)) await new Promise((resolve) => setTimeout(resolve, 50));
  if (pidAlive(pid)) throw new Error(`timed out stopping orchd (pid ${pid})`);
  if (json) process.stdout.write(JSON.stringify({ running: false, stopped: true, pid }) + "\n");
  else process.stdout.write(`stopped (pid ${pid})\n`);
}

async function statusDaemon(json: boolean): Promise<void> {
  try {
    const status = await fetchDaemonStatus();
    if (json) process.stdout.write(`${JSON.stringify(status)}\n`);
    else process.stdout.write(`running (pid ${status.pid}, uptime ${status.uptimeSec}s, hash ${status.codeHash}, ${status.socket})\n`);
  } catch (error) {
    if (!(error instanceof DaemonAbsentError)) throw error;
    process.stdout.write("not running\n");
    process.exitCode = 1;
  }
}

async function reloadDaemon(json = false): Promise<void> {
  const before = await fetchDaemonStatus();
  await rpcCall(orchDir(), "reload");
  const after = await waitForDaemon(before.startedAt);
  if (json) process.stdout.write(JSON.stringify({ reloaded: true, pid: after.pid, codeHash: after.codeHash }) + "\n");
  else process.stdout.write(`reloaded (pid ${after.pid}, hash ${after.codeHash})\n`);
}

async function cmdDaemon(args: string[]): Promise<void> {
  const action = args[0];
  const json = args.includes("--json");
  if (action === "start") return startDaemon(args.includes("--fg"), json);
  if (action === "stop") return stopDaemon(json);
  if (action === "status") return statusDaemon(json);
  if (action === "reload") return reloadDaemon(json);
  die("usage: orch daemon start [--fg] | stop | status [--json] | reload [--json]");
}

/** Interactive doctor: render results, multiselect the fixable findings, apply the chosen ones with a spinner. */
async function runInteractiveDoctor(initial: CheckResult[]): Promise<void> {
  let results = initial;
  renderDoctorResults(results);
  const fixable = results.filter((r) => r.fix).map((r) => ({ id: r.id, label: r.label, description: r.fix!.description, destructive: r.fix!.destructive }));
  const selected = await pickFixes(fixable);
  if (selected === null) return;
  if (selected.length) {
    const chosen = new Set(selected);
    const toApply = results.filter((r) => r.fix && chosen.has(r.id));
    withSpinner(
      `Applying ${toApply.length} fix${toApply.length === 1 ? "" : "es"}…`,
      "fixes applied",
      () => { for (const r of toApply) r.fix!.apply(); },
    );
    results = await runDoctor(orchDir());
    renderDoctorResults(results);
  }
  if (results.some((r) => r.status === "fail" || r.status === "warn")) process.exitCode = 1;
}

async function cmdDoctor(args: string[]) {
  const json = args.includes("--json");
  const yes = args.includes("-y") || args.includes("--yes");
  const fix = args.includes("--fix") || yes;
  let results = await runDoctor(orchDir());
  // A TTY session that did not demand json or an unattended -y apply gets the
  // interactive fix menu (bare `doctor` and `doctor --fix` both land here).
  if (!json && !yes && process.stdin.isTTY) return runInteractiveDoctor(results);
  // Unattended: -y (or --fix with no TTY to prompt on) applies every fix.
  const changes = fix ? applyFixes(results).applied : [];
  if (fix && changes.length) results = await runDoctor(orchDir());
  if (json) {
    process.stdout.write(JSON.stringify({ results, changes }, null, 2) + "\n");
  } else {
    const rows = results.map((r) => [r.status.toUpperCase(), r.label, r.detail]);
    process.stdout.write(renderTable(["STATUS", "CHECK", "DETAIL"], rows, [8, 24, 80]) + "\n");
    if (changes.length) process.stdout.write("Changes made:\n" + changes.map((c) => `  - ${c}`).join("\n") + "\n");
  }
  if (results.some((r) => r.status === "fail" || r.status === "warn")) process.exitCode = 1;
}

async function cmdWork(args: string[]) {
  const json = args.includes("--json");
  const once = args.includes("--once");
  if (args.some((arg) => arg !== "--once" && arg !== "--json")) die("usage: orch work [--once] [--json]");
  await ensureDaemon(orchDir());
  if (json) process.stdout.write(JSON.stringify({ once, accepted: true, daemon: "orchd" }) + "\n");
  else process.stdout.write("orchd is processing the queue.\n");
}

// ---- help ----

function usage() {
  process.stdout.write(
    `orch — the single controller for agents in backend targets.
The orchestrator routes control through the backend port.

OBSERVE
  orch status [--json] [--all] [--offline]
                                 Glanceable table of every pane (default command); --offline reads agent files only.
  orch questions                 List pending agent questions.
  orch events [--all] [target ...] [--status s[,s…]] [--notify] [--json] [--offline]
                                 Continuous stream of pane state transitions; --offline uses read-only agent files.

QUEUE
  orch queue add "<task text>" [--worktree] [--json]
                                 Add a task and print its id.
  orch queue list [--json]       List queued, claimed, and settled tasks.
  orch queue history [--json]    List completed, failed, and cancelled tasks.
  orch queue cancel <id> [--json]
                                 Cancel an unclaimed task.
  orch work [--once]             Assign queued tasks to idle agents.

REVIEW
  orch review                     Interactively review done worktree agents.
  orch review list [--json]      List done worktree agents with commits ahead.
  orch review approve <target>    Merge and remove an approved worktree.
  orch review reject <target> -m "feedback"
                                 Re-dispatch feedback in the same worktree.

DISPATCH WORK
  orch run <target> "<prompt>" [--raw]
                                 Queue a prompt through orchd with the worker header (or exact prompt with --raw).
  orch dispatch <target> "<prompt>" [--raw] [--model provider/id:think] [--agent adapter]
                                 Durably accept a prompt through orchd.
  orch answer <target> "<text>" [--force]
                                 Answer a pending question (--force permits a missing question.json).
  orch pipe <src> <dst> ["instruction"]
                                 Send a completed result through orchd.
  orch broadcast "<text>" [target ...|--all]
                                 Steer named targets through orchd.
  orch model <target> <provider/model[:thinking]>
                                 Durably accept a model change through orchd.
  orch notify test [--state <state>]
                                 Send a synthetic transition to each configured notification sink.
  orch steer <target> <text…>    Durably accept a mid-run steer through orchd.
  orch wait <target> [--status done|idle|working|blocked] [--timeout ms]
                                 Block until the pane reaches a status (default done, 300000ms).
  orch result <target> [--json]  Print a target's result (result.json or session fallback).
  orch tail <target> [-n N]      Last N session entries (default 20), human-readable.
  orch session <target>          Resolved session path + quick stats.
  orch reload <target>… | --all   Reload panes, signal watchers via reload.signal, and report each outcome.
  orch reset  <target>… | --all   Start a fresh session/context, keep model. (alias: new)
  orch restart <target>… | --all [--cmd pi]
                                 Fully close the harness process and relaunch it.

PANES (create / arrange / lifecycle — never steals focus except 'focus')
  orch spawn <N> [--tab L] [--cwd P] [--cmd C] [--name PREFIX] [--model M]
                   [--agent A] [--backend B] [--spawn-cap N] [--worktree]
                                 Fresh tab with N balanced-tiled named agents (2=side-by-side,
                                 3=2+1, 4=2x2, …; cap 8). Names <prefix>-1..N.
  orch tile <tab|pane> [--name X] [--cmd C] [--cwd P] [--model M] [--agent A] [--backend B]
                                 Add ONE pane to an existing tab, split into its largest cell and pin M.
  orch rename <target> <name> [--pane]
                                 Set the agent name (NAME column); --pane sets the pane
                                 border label instead.
  orch focus <target>            Jump the user's view to that pane (this one DOES steal focus).
  orch zoom <target> [--on|--off]
                                 Zoom the pane full-tab (default: toggle).
  orch move <target> --tab <tab_id|label> [--split right|down] | --new-tab [--label X]
                                 Move a pane to another tab or a fresh one (no focus steal).
  orch close <target>... | --all [--stream]
                                 Close pane(s) ('orch kill' is an alias). --all closes only
                                 panes orch spawned (never the user's); --stream also kills orch events.
  orch panes                     Raw merged pane list (tab-separated, for scripting).

TABS
  orch tabs                      List tabs: id, label, number, pane count, status.
  orch tab new [--label X] [--workspace ID] [--cwd P]
                                 Create a tab (no focus steal); prints root pane id.
  orch tab rename <tab_id|label> <new-label>
  orch tab close <tab_id|label>
  orch tab focus <tab_id|label>  Jump the user's view to that tab.

WORKSPACES
  orch ws [list]                 List workspaces: id, label, tab/pane counts, status.
  orch ws focus <workspace_id>   Jump the user's view to that workspace.

MAINTENANCE
  orch daemon start [--fg] | stop | status [--json] | reload
                                 Manage the resident orch daemon.
  orch doctor [--fix] [-y|--yes] [--json]
                                 Check the install. On a TTY, doctor and 'doctor --fix'
                                 open a menu to pick fixes; -y/--yes applies every fix
                                 unattended (also how CI/non-TTY repairs run).
  orch clean [--worktrees [--force]]
                                 Delete dead agent dirs; clean orphaned worktrees (use --force to discard unmerged work).
  orch setup [--agent <id[,id...]>] [--backend <id[,id...]>] [--yes] [--no-install] [--copy]
                                 Onboarding wizard: multi-select the adapters and backends
                                 you use (--agent pi,claude / --backend herdr,headless — the
                                 first of each is the active default), record the installed
                                 sets to ~/.orch/settings.json, install missing deps, and wire
                                 every selected adapter's shim. Prompts interactively when a
                                 selection is omitted on a TTY; --yes auto-installs deps,
                                 --no-install just reports, --copy copies instead of symlinking.
  orch settings [--json] [--harness=<id>] [--plexer=<id>]
                                 Print each effective setting with its source (flag > env >
                                 settings.json > default), or switch the active default
                                 adapter/plexer among the installed set.
  orch help                      This message.

RECOVER
  orch abort <target>            Escape twice, 500ms apart, to dismiss and cancel a turn.
  orch keys <target> <key> [key...]
                                 Send raw keys to a pane.
  orch peek <target> [-n N]      Read visible pane screen (default 25 lines).

Target: agent name, identity key, or unique handle suffix.
Groups resolve by id or unique label.
`
  );
}

function readOrchVersion(): string {
  try {
    const parsed: unknown = JSON.parse(files.readFileSync(path.join(packageRoot(), "package.json"), "utf8"));
    return isRecord(parsed) && typeof parsed.version === "string" ? parsed.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const VERSION = readOrchVersion();

/** True while setup has never recorded a harness selection. */
function compositionUnrecorded(): boolean {
  return !loadConfig(orchDir()).defaults.adapter;
}

/** True on a clean slate: no selections recorded yet, a TTY to prompt on, and a command that needs them. */
function needsFirstRunSetup(cmd: string | undefined): boolean {
  if (cmd === "setup" || cmd === "help" || cmd === "-h" || cmd === "--help" || cmd === "version" || cmd === "-V" || cmd === "--version") return false;
  if (!process.stdin.isTTY) return false;
  return compositionUnrecorded();
}

/** Walk the first run through the setup wizard, then dispatch the original command. */
async function runFirstTimeSetup(argv: string[]): Promise<void> {
  process.stdout.write("First run — no harness/backend recorded yet, walking through setup.\n\n");
  await cmdSetup([]);
  // A cancelled wizard records nothing; exit instead of looping back into the gate.
  if (compositionUnrecorded()) process.exit(1);
  runCommand(argv);
}

export function runCommand(argv: string[]): void {
  const cmd = argv[0];
  const rest = argv.slice(1);
  if (needsFirstRunSetup(cmd)) {
    void runFirstTimeSetup(argv).catch((error: unknown) => die(errorMessage(error)));
    return;
  }
  switch (cmd) {
    case undefined: case "status": void cmdStatus(cmd === undefined ? argv : rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "events": void cmdEvents(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "notify": void cmdNotify(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "questions": void cmdQuestions(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "queue": cmdQueue(rest); break;
    case "daemon": void cmdDaemon(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "doctor": void cmdDoctor(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "work": void cmdWork(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "review":
      if (rest.length === 0) void cmdReviewInteractive().catch((error: unknown) => die(errorMessage(error)));
      else void cmdReview(rest).catch((error: unknown) => die(errorMessage(error)));
      break;
    case "answer": cmdAnswer(rest); break;
    case "result": cmdResult(rest); break;
    case "steer": void cmdSteer(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "pipe": void cmdPipe(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "broadcast": void cmdBroadcast(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "tail": cmdTail(rest); break;
    case "session": cmdSession(rest); break;
    case "panes": cmdPanes(rest); break;
    case "spawn": void cmdSpawn(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "tile": void cmdTile(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "run": void cmdRun(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "model": void cmdModel(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "wait": cmdWait(rest); break;
    case "dispatch": void cmdDispatch(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "reload": cmdReload(rest); break;
    case "reset": case "new": cmdNew(rest); break;
    case "restart": cmdRestart(rest); break;
    case "rename": cmdRename(rest); break;
    case "close": case "kill": cmdClose(rest); break;
    case "abort": cmdAbort(rest); break;
    case "keys": cmdKeys(rest); break;
    case "peek": cmdPeek(rest); break;
    case "tabs": cmdTabs(rest); break;
    case "tab": cmdTab(rest); break;
    case "focus": cmdFocus(rest); break;
    case "zoom": cmdZoom(rest); break;
    case "move": cmdMove(rest); break;
    case "ws": cmdWs(rest); break;
    case "clean": cmdClean(rest); break;
    case "settings": cmdSettings(rest); break;
    case "setup": void cmdSetup(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "--version": case "-V": case "version": process.stdout.write(`orch ${VERSION}\n`); break;
    case "help": case "-h": case "--help": usage(); break;
    default:
      if (cmd.startsWith("--")) void cmdStatus(argv).catch((error: unknown) => die(errorMessage(error)));
      else { process.stderr.write(`Unknown command: ${cmd}\n\n`); usage(); process.exit(1); }
  }
}
