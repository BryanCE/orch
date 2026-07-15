import { execFileSync } from "node:child_process";
import * as files from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { deliverToSink, loadSinks, notify, notificationText, type NotifyEvent, type Sink } from "./notify.ts";
import { addTask, cancelTask, listTasks, history as queueHistory, type TaskRec } from "./queue.ts";
import { runDoctor, applyFixes, binaryStatus, checkBins, checkExtensions, isBridgeExtensionStale, type CheckResult } from "./doctor.ts";
import { setupIntro, setupOutro, selectAdapter, selectBackend, chooseInstalls } from "./setup/wizard.ts";
import { renderDoctorResults, pickFixes } from "./setup/doctor-wizard.ts";
import { withSpinner } from "./setup/io.ts";
import { bridgeBundlePath, buildBridgeBundle } from "./bridge-bundle.ts";
import { loadConfig, resolveSetting, writeDefaultEntry, type HostConfig, type OrchConfig } from "./config.ts";
import { bridgeRegistered, defaultModelString, isRecord, loadPresence, orchDir, pidAlive, presenceDir, presenceAgentDir, readJSON, recordSpawned, spawnedRecords, type PresenceEntry, type SpawnedRecord } from "./store.ts";
import { piAdapter, presenceFor } from "./adapters/pi.ts";
import { codexAdapter } from "./adapters/codex.ts";
import { claudeAdapter } from "./adapters/claude.ts";
import type { AgentAdapter } from "./adapters/adapter.ts";
import { blockText, isToolCallContentBlock, parseSession, type SessionData, type SessionEntry, type ToolCallContentBlock } from "./session.ts";
import { buildEntities, collapse, currentWorkspace, entityWorkspace, parseTarget, resolvePane, resolveTarget, scopeEntitiesToWorkspace, selfActor, sortEntities, workspaceOf, type Entity } from "./entities.ts";
import { herdrBestEffort, herdrExec, herdrJSON, herdrNames, herdrPanes, herdrReachable, herdrTabs, type HerdrPane, type HerdrTab, type HerdrWorkspace } from "./backends/herdr/cli.ts";
import { herdrBackend } from "./backends/herdr/index.ts";
import { serializeIdentity, tryParseIdentity } from "./backends/identity.ts";
import { runRemoteAsync, runSSH } from "./remote.ts";
import { headlessBackend, type HeadlessHandle } from "./backends/headless/index.ts";
import type { Backend } from "./backends/backend.ts";
import { allBackends, resolveBackend } from "./backends/registry.ts";
import { renderTable, truncate } from "./table.ts";
import { errorMessage } from "./util.ts";
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
  session: SessionData | null;
}

function deriveView(ent: Entity, spawned: Map<string, SpawnedRecord>): View {
  const pres = ent.presence;
  const isPi = ent.agent === "pi";
  const session = isPi ? parseSession(ent.sessionPath) : null;

  // ---- model ----
  let modelFull = "";
  if (pres?.status?.model && pres.status.model.id) {
    const m = pres.status.model;
    const think = pres.status.thinking ?? "";
    modelFull = `${m.provider ?? ""}/${m.id}${think ? ":" + think : ""}`;
  } else if (session?.exists && session.model) {
    const prov = session.provider ?? "";
    const think = session.thinking ?? "";
    modelFull = `${prov}/${session.model}${think ? ":" + think : ""}`;
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
    // no live bridge → herdr status or session fallback
    state = ent.herdrStatus ?? (session?.exists ? "idle" : "unknown");
    stateFallback = true;
  }

  // ---- cost ----
  let cost = 0;
  if (pres?.status && typeof pres.status.cost === "number") cost = pres.status.cost;
  else if (session?.exists) cost = session.cost;

  // ---- ctx percent ----
  let ctxPercent: number | null = null;
  if (pres?.status?.context && typeof pres.status.context.percent === "number")
    ctxPercent = pres.status.context.percent;

  // ---- task / last ----
  const task = firstNonEmptyText(
    pres?.status?.asking?.question ? `Q: ${pres.status.asking.question}` : undefined,
    pres?.status?.task,
    session?.task,
  );
  const last = firstNonEmptyText(
    pres?.status?.lastText,
    resultText(pres?.result),
    session?.lastAssistant,
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
    session,
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
        : v.entity.presence?.status?.task ?? v.session?.task ?? null,
      lastText:
        v.entity.presence?.status?.lastText ??
        resultText(v.entity.presence?.result) ??
        v.session?.lastAssistant ??
        null,
      herdrStatus: v.entity.herdrStatus,
      sessionPath: v.entity.sessionPath,
      presenceDir: v.entity.presence?.dir ?? null,
      presenceOnly: v.entity.presenceOnly,
      tokens: v.session?.exists ? v.session.tokens : v.entity.presence?.status?.tokens ?? null,
      turns: v.entity.presence?.status?.turns ?? v.session?.turns ?? null,
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
    process.stdout.write("No panes found (herdr down and no agent dirs).\n");
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
  herdrStatus: string | null;
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
        : v.entity.presence?.status?.task ?? v.session?.task ?? null,
      lastText: v.entity.presence?.status?.lastText ?? resultText(v.entity.presence?.result) ?? v.session?.lastAssistant ?? null,
      herdrStatus: v.entity.herdrStatus,
      sessionPath: v.entity.sessionPath,
      presenceDir: v.entity.presence?.dir ?? null,
      presenceOnly: v.entity.presenceOnly,
      tokens: v.session?.exists ? v.session.tokens : v.entity.presence?.status?.tokens ?? null,
      turns: v.entity.presence?.status?.turns ?? v.session?.turns ?? null,
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
    herdrStatus: null, sessionPath: null, presenceDir: null, presenceOnly: false,
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
  const destination = host?.dest ?? host?.ssh;
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
    process.stdout.write("No panes found (herdr down and no agent dirs).\n");
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
        adapter: record.adapter ?? status?.agent ?? "pi",
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
  files.writeFileSync(path.join(ent.presence.dir, "answer.json"), JSON.stringify({ text, ts: new Date().toISOString() }) + "\n");
  if (json) process.stdout.write(JSON.stringify({ target: ent.presence.key, answered: true }) + "\n");
  else process.stdout.write(`Answered ${ent.presence.key}.\n`);
}

// ---- watch ----

function looksLikePaneKey(key: string): boolean {
  return tryParseIdentity(key)?.backend === "herdr";
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
  const herdrAvailable = herdrReachable();
  const sinks = loadSinks(orchDir()).filter((sink) => sink.type !== "herdr" || herdrAvailable);
  if (herdrAvailable && !sinks.some((sink) => sink.type === "herdr")) {
    sinks.push({ type: "herdr", on: ["blocked", "error"] });
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
  if (sink.type === "webhook") return `webhook ${sink.url}`;
  if (sink.type === "command") return `command ${sink.command.join(" ")}`;
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
    const destination = host?.dest ?? host?.ssh;
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
  const entity = resolveTarget(target);
  if (!entity.paneId) {
    if (!entity.presence) die(`Target "${target}" has no agent presence.`);
    const adapter = resolveAdapter(entity.agent ?? entity.presence.status?.agent ?? "pi");
    adapter.steer?.({ key: entity.presence.key, text });
    if (json) process.stdout.write(JSON.stringify({ target: entity.presence.key, steered: true }) + "\n");
    else process.stdout.write(`Steered ${entity.presence.key} → ${truncate(collapse(text), 60)}\n`);
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
      tab: e.tabLabel, agent: e.agent, focused: e.focused, state: e.herdrStatus ?? e.presence?.status?.state ?? null,
      herdrStatus: e.herdrStatus, sessionPath: e.sessionPath, presenceOnly: e.presenceOnly,
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
      e.herdrStatus ?? (e.presence?.status?.state ?? "-"),
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

// Ordered: bun first — pi's installer needs it.
const DEP_INSTALLERS: [string, string][] = [
  ["bun", "curl -fsSL https://bun.sh/install | bash"],
  ["herdr", "curl -fsSL https://herdr.dev/install.sh | bash"],
  ["pi", "bun add -g @earendil-works/pi-coding-agent"],
  ["claude", "curl -fsSL https://claude.ai/install.sh | bash"],
];

/** Read the value following `name` in `args`, or undefined when the flag is absent. */
function readValueFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

/** Validate a provided setup flag value against the supported ids, or exit. */
function validateSetupFlag(kind: string, value: string, supported: readonly string[]): string {
  if (supported.includes(value)) return value;
  die(`Unknown ${kind} "${value}". Supported ${kind}s: ${supported.join(", ")}.`);
}

/** Resolve one setup selection from its flag, the interactive picker, or exit in non-interactive mode. Null on cancel. */
async function resolveSetupSelection(
  kind: string,
  flagName: string,
  flag: string | undefined,
  ids: readonly string[],
  interactive: boolean,
  pick: (options: readonly string[]) => Promise<string | null>,
): Promise<string | null> {
  if (flag !== undefined) return validateSetupFlag(kind, flag, ids);
  if (interactive) return pick(ids);
  die(`orch setup needs ${flagName} <id> in non-interactive mode. Supported ${kind}s: ${ids.join(", ")}.`);
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
async function runInstall(bin: string, cmd: string, interactive: boolean): Promise<void> {
  try {
    if (interactive) {
      await withSpinner(`Installing ${bin}…`, `${bin} installed`, () => execFileSync("bash", ["-c", cmd], { stdio: "ignore" }));
    } else {
      process.stdout.write(`  Installing ${bin}…\n`);
      execFileSync("bash", ["-c", cmd], { stdio: "inherit" });
    }
  } catch {
    process.stderr.write(`  ${bin} install failed — run manually: ${cmd}\n`);
  }
}

function installClaudeHooks(pkgRoot: string): void {
  const claudeDir = path.join(HOME, ".claude");
  const settingsPath = path.join(claudeDir, "settings.json");
  let settings: Record<string, unknown>;
  if (!files.existsSync(settingsPath)) {
    settings = {};
  } else {
    try {
      const parsed: unknown = JSON.parse(files.readFileSync(settingsPath, "utf8"));
      if (!isRecord(parsed)) throw new Error("settings root is not an object");
      settings = parsed;
    } catch (error: unknown) {
      process.stderr.write(`  warning: could not parse ${settingsPath}; Claude hooks not changed (${errorMessage(error)})\n`);
      return;
    }
  }
  const shim = path.join(pkgRoot, "scripts", "claude-hooks.ts");
  const added: string[] = [];
  const hooks = isRecord(settings.hooks) ? settings.hooks : (settings.hooks === undefined ? {} : null);
  if (!hooks) {
    process.stderr.write(`  warning: ${settingsPath} has a non-object hooks value; Claude hooks not changed\n`);
    return;
  }
  settings.hooks = hooks;
  for (const event of ["SessionStart", "Stop", "Notification"] as const) {
    const command = `bun ${shim} ${event}`;
    const entries = hooks[event];
    if (entries !== undefined && !Array.isArray(entries)) {
      process.stderr.write(`  warning: ${settingsPath} has a non-array ${event} hook value; skipped\n`);
      continue;
    }
    const list: unknown[] = Array.isArray(entries) ? entries : [];
    const alreadyPresent = list.some((entry) => isRecord(entry) && Array.isArray(entry.hooks)
      && entry.hooks.some((hook: unknown) => isRecord(hook) && hook.type === "command" && hook.command === command));
    if (alreadyPresent) continue;
    list.push({ hooks: [{ type: "command", command }] });
    hooks[event] = list;
    added.push(event);
  }
  if (added.length) {
    files.mkdirSync(claudeDir, { recursive: true });
    files.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  }
  process.stdout.write(`Claude Code hooks: ${added.length ? `added ${added.join(", ")} in ${settingsPath}` : "already configured"}\n`);
}

async function cmdSetup(args: string[]) {
  const copy = args.includes("--copy");
  const yes = args.includes("--yes") || args.includes("-y");
  const noInstall = args.includes("--no-install");
  const entrypoint = process.argv[1];
  if (!entrypoint) die("Cannot determine orch executable path.");
  const pkgRoot = path.resolve(path.dirname(files.realpathSync(entrypoint)), "..");
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

  const harnessFlag = readValueFlag(args, "--agent") ?? readValueFlag(args, "--adapter");
  const backendFlag = readValueFlag(args, "--backend");
  const adapterIds = adapters.map((adapter) => adapter.id);
  const backendIds = allBackends().map((entry) => entry.id);
  const interactive = process.stdin.isTTY && !yes;
  if (interactive) setupIntro();

  const harness = await resolveSetupSelection("harness", "--agent", harnessFlag, adapterIds, interactive, selectAdapter);
  if (harness === null) return;
  const backend = await resolveSetupSelection("backend", "--backend", backendFlag, backendIds, interactive, selectBackend);
  if (backend === null) return;

  writeDefaultEntry(orchDir(), "adapter", harness);
  writeDefaultEntry(orchDir(), "backend", backend);
  process.stdout.write(`Selection recorded in ${path.join(orchDir(), "config.toml")}:\n  harness (adapter) = ${harness}\n  backend           = ${backend}\n`);

  process.stdout.write("Prerequisites:\n");
  // Keep prerequisite availability in sync with doctor. Claude is a setup-only
  // dependency; bun, herdr, and pi use the shared doctor binary check.
  const bins = binaryStatus();
  await checkBins(bins);
  const missing: string[] = [];
  for (const [bin] of DEP_INSTALLERS) {
    const found = bin === "claude" ? which(bin) : bins[bin];
    const resolved = found ? which(bin) : "";
    if (!found) missing.push(bin);
    process.stdout.write(`  ${found ? "ok      " : "MISSING "}${bin}${resolved ? `  (${resolved})` : ""}\n`);
  }

  const missingWithCmd = missing.map((bin) => ({ bin, cmd: DEP_INSTALLERS.find(([b]) => b === bin)![1] }));
  const toInstall = await resolveInstallTargets(missingWithCmd, interactive, yes, noInstall);
  if (toInstall === null) return;
  for (const bin of toInstall) {
    const cmd = DEP_INSTALLERS.find(([b]) => b === bin)![1];
    await runInstall(bin, cmd, interactive);
    // fresh installs land in ~/.bun/bin or ~/.local/bin before the shell rc picks them up
    process.env.PATH = `${path.join(HOME, ".bun", "bin")}:${path.join(HOME, ".local", "bin")}:${process.env.PATH}`;
    const now = which(bin);
    process.stdout.write(now ? `  ok      ${bin}  (${now})\n` : `  ${bin} still not on PATH — open a new shell and re-run orch setup\n`);
  }

  process.stdout.write("Presence dir:\n");
  files.mkdirSync(presenceDir(), { recursive: true });
  process.stdout.write(`  ${presenceDir()}\n`);

  if (harness === "pi") {
    process.stdout.write("pi extensions:\n");
    const extDir = path.join(HOME, ".pi", "agent", "extensions");
    let bridgeBundle = bridgeBundlePath(pkgRoot);
    if (!files.existsSync(bridgeBundle)) {
      process.stdout.write("  building bridge bundle…\n");
      bridgeBundle = buildBridgeBundle(pkgRoot);
    }
    link(bridgeBundle, path.join(extDir, "orchestrator-bridge.js"));
    for (const f of files.readdirSync(path.join(pkgRoot, "extensions"))) {
      if (f === "orchestrator-bridge.ts") continue;
      link(path.join(pkgRoot, "extensions", f), path.join(extDir, f));
    }
  }

  const skillsSrc = path.join(pkgRoot, "skills", "claude");
  if (files.existsSync(skillsSrc)) {
    process.stdout.write("Claude Code skills:\n");
    for (const s of files.readdirSync(skillsSrc)) {
      const dest = path.join(HOME, ".claude", "skills", s);
      files.mkdirSync(path.dirname(dest), { recursive: true });
      files.rmSync(dest, { recursive: true, force: true });
      files.cpSync(path.join(skillsSrc, s), dest, { recursive: true });
      process.stdout.write(`  ${dest}\n`);
    }
  }
  const agentsSrc = path.join(pkgRoot, "agents");
  if (files.existsSync(agentsSrc)) {
    process.stdout.write("Claude Code agents:\n");
    for (const a of files.readdirSync(agentsSrc)) {
      const dest = path.join(HOME, ".claude", "agents", a);
      files.mkdirSync(path.dirname(dest), { recursive: true });
      files.cpSync(path.join(agentsSrc, a), dest);
      process.stdout.write(`  ${dest}\n`);
    }
  }

  if (harness === "claude") installClaudeHooks(pkgRoot);

  // bins on PATH (repo-clone case; bun add -g already links bins)
  process.stdout.write("bins:\n");
  const binDir = path.join(HOME, ".local", "bin");
  for (const [name, rel] of [
    ["orch", path.join("bin", "orch.ts")],
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
  const doneMessage = "Done. Open a herdr workspace and try: orch spawn 2 --tab Team1";
  if (interactive) setupOutro(doneMessage);
  else process.stdout.write(`${doneMessage}\n`);
}

// ---- spawn / tile (geometry-driven tiler) ----


interface Rect {
  width: number;
  height: number;
  x: number;
  y: number;
}

// Fetch the tab layout that contains `refPane`. Returns {tab_id, panes:[{pane_id,rect}]}.
function paneLayout(refPane: string): { tab_id: string; panes: { pane_id: string; rect: Rect }[] } {
  const r = herdrJSON<{ layout: { tab_id: string; panes: { pane_id: string; rect: Rect }[] } }>(["pane", "layout", "--pane", refPane]);
  const layout = r?.layout;
  if (!layout || !Array.isArray(layout.panes)) throw new Error(`no layout for ${refPane}`);
  return { tab_id: layout.tab_id, panes: layout.panes };
}


// Start `cmd` in `pane` and give the agent `name`. Best-effort; warns on failure.
// Spawn into the ORCHESTRATOR'S workspace, not whichever workspace happens to
// list first — the invoking pane's id carries the right one.
function callerWorkspace(): string | null {
  const paneId = process.env.HERDR_PANE_ID;
  if (!paneId) return null;
  return herdrPanes().find((p) => p.pane_id === paneId)?.workspace_id ?? null;
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

// Launch an agent directly into a pane through herdr's integration. The argv is
// exec'd, never typed into a shell — so nothing echoes into the pane, no launch
// keystroke can be lost, and no resend is ever needed. The agent's name is set
// at start, so there is no separate rename step. `tab` targets an existing tab;
// `split` splits within it (the caller owns tiling direction).
function startAgentPane(opts: { name: string; key: string; cmd: string; cwd: string; workspace?: string; tab?: string; split?: "down" | "right" }): { pane: string; key: string } {
  const argv = opts.cmd.trim().split(/\s+/).filter(Boolean);
  const flags = ["agent", "start", opts.name, "--cwd", opts.cwd, "--no-focus"];
  if (opts.workspace) flags.push("--workspace", opts.workspace);
  if (opts.tab) flags.push("--tab", opts.tab);
  if (opts.split) flags.push("--split", opts.split);
  const result = herdrJSON<{ agent: HerdrPane }>([
    ...flags,
    "--",
    "env",
    `ORCH_AGENT_KEY=${opts.key}`,
    `ORCH_DIR=${orchDir()}`,
    ...argv,
  ]);
  const pane = result?.agent?.pane_id;
  if (!pane) throw new Error(`agent start ${opts.name} returned no pane_id`);
  return { pane, key: opts.key };
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
function printLayout(refPane: string, header: string) {
  let layout: { tab_id: string; panes: { pane_id: string; rect: Rect }[] };
  try {
    layout = paneLayout(refPane);
  } catch {
    return;
  }
  const names = herdrNames();
  process.stdout.write(header + "\n");
  const rows = layout.panes.map((p) => [
    p.pane_id,
    names.get(p.pane_id) ?? "-",
    `${p.rect.width}x${p.rect.height} @${p.rect.x},${p.rect.y}`,
  ]);
  const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
  const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
  for (const r of rows)
    process.stdout.write(`  ${r[0]!.padEnd(w0)}  ${r[1]!.padEnd(w1)}  ${r[2]!}\n`);
}

const adapters: readonly AgentAdapter[] = [piAdapter, codexAdapter, claudeAdapter];

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
  const adapter = adapters.find((candidate) => candidate.id === id);
  if (adapter) return adapter;
  die(`Unknown adapter "${id}". Supported adapters: ${adapters.map((candidate) => candidate.id).join(", ")}.`);
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
  const adapter = resolveSetting({ flag: flags.adapterFlag, env: "ORCH_ADAPTER", config: config.defaults.adapter, fallback: "pi" });
  // Selection flows through the backend factory: explicit flag/env, then config
  // default, then a capability-probed fallback (herdr if inside a session, else
  // headless). No per-backend branch is hard-coded here.
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
  if (settings.commandFlag) die("--cmd requires the herdr backend; headless launches use the selected adapter.");
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
    process.stdout.write(`\nSpawned ${created.length} headless agent(s) (no herdr panes).\n`);
    process.stdout.write("'orch status' shows the fleet.\n");
  }
}

function resolveSpawnWorkspace(requested: string | null): string {
  const workspace = requested ?? callerWorkspace() ?? herdrPanes()[0]?.workspace_id;
  if (!workspace) die("Could not determine workspace id (herdr down?). Pass --workspace <id>.");
  return workspace;
}

function createSpawnRoot(settings: SpawnSettings, workspace: string): SpawnRoot {
  const rootName = `${settings.prefix}-1`;
  const rootCwd = settings.worktree ? createAgentWorktree(settings.cwd, rootName) : settings.cwd;
  if (launchesPi(settings.cmd)) writeTrustEntry(rootCwd);
  let tabId: string, shellRoot: string, tabLabel: string;
  try {
    const result = herdrJSON<{ tab: HerdrTab; root_pane: HerdrPane }>(["tab", "create", "--workspace", workspace, "--cwd", rootCwd, "--label", settings.label, "--no-focus"]);
    tabId = result?.tab?.tab_id;
    shellRoot = result?.root_pane?.pane_id;
    tabLabel = result?.tab?.label ?? settings.label;
    if (!tabId || !shellRoot) throw new Error("tab create returned no tab_id / root_pane");
  } catch (error: unknown) {
    die(`tab create failed: ${errorMessage(error)}`);
  }
  const key = serializeIdentity({ backend: "herdr", workspace, handle: rootName });
  const started = startAgentPane({ name: rootName, key, cmd: settings.cmd, cwd: rootCwd, workspace, tab: tabId });
  // tab create leaves an empty shell pane; the agent runs in its own pane, so drop the shell.
  herdrBestEffort(["pane", "close", shellRoot]);
  return { root: started.pane, key: started.key, workspace, tabId, tabLabel, rootCwd, rootName };
}

function launchAdditionalAgents(settings: SpawnSettings, root: SpawnRoot, created: CreatedAgent[]): void {
  for (let i = 2; i <= settings.n; i++) {
    try {
      const name = `${settings.prefix}-${i}`;
      const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
      let split: "down" | "right" = "down";
      if (i > 2) {
        const layout = paneLayout(root.root);
        const largest = layout.panes.reduce((current, pane) => {
          const currentArea = current.rect.width * current.rect.height;
          const paneArea = pane.rect.width * pane.rect.height;
          return paneArea > currentArea ? pane : current;
        });
        // herdr agent start splits the active/last pane; it cannot select a
        // pane by id. Still derive the direction from the largest cell so
        // wide cells split horizontally and tall cells split vertically.
        split = largest.rect.width >= largest.rect.height ? "right" : "down";
      }
      const key = serializeIdentity({ backend: "herdr", workspace: root.workspace, handle: name });
      const started = startAgentPane({ name, key, cmd: settings.cmd, cwd, workspace: root.workspace, tab: root.tabId, split });
      recordSpawned(key, { adapter: settings.adapter, model: settings.model ?? undefined, backend: "herdr", handle: started.pane, cwd, worktree: settings.worktree ? cwd : undefined, branch: settings.worktree ? `orch/${name}` : undefined, owner: selfActor() ?? undefined });
      created.push({ key: started.key, pane: started.pane, name });
    } catch (error: unknown) {
      process.stderr.write(`warning: could not place agent #${i}: ${errorMessage(error)}\n`);
    }
  }
}

async function reportSpawnResults(settings: SpawnSettings, root: SpawnRoot, created: CreatedAgent[]): Promise<void> {
  if (!settings.json) {
    for (const agent of created) process.stdout.write(`${agent.pane}  ${agent.name}  [${root.tabLabel}]  ${settings.cmd}\n`);
    process.stdout.write(`\nSpawned ${created.length} named agent(s) on tab "${root.tabLabel}" (no focus stolen).\n`);
    printLayout(root.root, "\nFinal tiling:");
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
  const root = createSpawnRoot(settings, workspace);
  const created: CreatedAgent[] = [];
  recordSpawned(root.key, { adapter: settings.adapter, model: settings.model ?? undefined, backend: "herdr", handle: root.root, cwd: root.rootCwd, worktree: settings.worktree ? root.rootCwd : undefined, branch: settings.worktree ? `orch/${root.rootName}` : undefined, owner: selfActor() ?? undefined });
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
  let cmd = "pi";
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
  const { adapter, backend, model } = resolveAgentSettings({ adapterFlag, backendFlag, modelFlag });
  if (backend === headlessBackend.id) die("orch tile requires the herdr backend; headless agents have no panes to tile.");
  resolveAdapter(adapter);
  if (!commandFlag) cmd = adapterCommand(adapter);
  const target = positional[0];
  if (!target) die("usage: orch tile <tab-or-pane> [--name <name>] [--cmd <command>] [--cwd <path>] [--model <provider/model[:thinking]>");

  const tab = resolveTab(target);
  const refPane = herdrPanes().find((item) => item.tab_id === tab.tab_id)?.pane_id;
  if (!refPane) die(`No panes found on tab "${tab.tab_id}".`);

  let layout;
  try {
    layout = paneLayout(refPane);
  } catch (e: unknown) {
    die(`could not read layout for ${refPane}: ${errorMessage(e)}`);
  }
  const autoName = name ?? `tile-${layout.panes.length + 1}`;

  const workspace = herdrPanes().find((item) => item.pane_id === refPane)?.workspace_id;
  if (!workspace) die(`Could not determine workspace for pane ${refPane}.`);
  const key = serializeIdentity({ backend: "herdr", workspace, handle: autoName });
  let started: { pane: string; key: string };
  try {
    started = startAgentPane({ name: autoName, key, cmd, cwd, workspace, tab: tab.tab_id, split: "down" });
  } catch (e: unknown) {
    die(`tile failed: ${errorMessage(e)}`);
  }
  recordSpawned(key, { adapter, model: model ?? undefined, backend: "herdr", handle: started.pane, cwd, owner: selfActor() ?? undefined });
  if (json) process.stdout.write(JSON.stringify({ pane: started.pane, key, name: autoName, tab: layout.tab_id, added: true }) + "\n");
  else {
    process.stdout.write(`Added ${started.pane} (${autoName}) to tab ${layout.tab_id} running "${cmd}".\n`);
    printLayout(refPane, "\nFinal tiling:");
  }
  if (model) await pinModels([{ key, pane: started.pane, name: autoName }], model);
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
  const { pane } = resolvePane(target);
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
  const { pane } = resolvePane(target);
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
  const { pane } = resolvePane(target);
  try {
    herdrExec( ["wait", "agent-status", pane, "--status", status, "--timeout", String(timeout)], {
      timeout: timeout + 5000,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (json) process.stdout.write(JSON.stringify({ target: pane, status, reached: true }) + "\n");
    else process.stdout.write(`${pane} reached "${status}".\n`);
  } catch (e: unknown) {
    die(`wait for ${pane} → "${status}" failed/timed out: ${errorMessage(e)}`);
  }
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
    const { pane } = resolvePane(target);
    const statusPath = path.join(presenceAgentDir(pane), "status.json");
    const before = readJSON<StatusFile>(statusPath);
    const beforeUpdated = Date.parse(typeof before?.updatedAt === "string" ? before.updatedAt : "");
    const sentAt = Date.now();
    if (!herdrBestEffort(["pane", "run", pane, "/new"])) die(`Could not reset ${pane}.`);

    const deadline = sentAt + 15_000;
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
    if (!ready) die(`${pane}: /new did not become ready within 15s.`);
    results.push({ target: pane, cleared: true, ready: true });
    if (!json) process.stdout.write(`Cleared session on ${pane} (/new); ready.\n`);
  }
  if (json) process.stdout.write(JSON.stringify(results.length === 1 ? results[0] : results) + "\n");
}

interface HerdrForegroundProcess {
  name?: string;
}

interface HerdrProcessInfo {
  result?: {
    process_info?: {
      foreground_processes?: HerdrForegroundProcess[];
    };
  };
}

function isHerdrForegroundProcess(value: unknown): value is HerdrForegroundProcess {
  return isRecord(value) && (value.name === undefined || typeof value.name === "string");
}

function isHerdrProcessInfo(value: unknown): value is HerdrProcessInfo {
  if (!isRecord(value)) return false;
  if (value.result === undefined) return true;
  if (!isRecord(value.result)) return false;
  if (value.result.process_info === undefined) return true;
  if (!isRecord(value.result.process_info)) return false;
  const processes = value.result.process_info.foreground_processes;
  return processes === undefined || (Array.isArray(processes) && processes.every(isHerdrForegroundProcess));
}

function paneForeground(pane: string): string[] {
  try {
    const out = herdrExec( ["pane", "process-info", "--pane", pane], {
      timeout: 5000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    }).toString();
    const parsed = JSON.parse(out) as unknown;
    if (!isHerdrProcessInfo(parsed)) return [];
    return parsed.result?.process_info?.foreground_processes?.map((process) => String(process.name)) ?? [];
  } catch {
    return [];
  }
}

// Reload extensions in place. Escape first dismisses any stuck overlay; the
// bridge must refresh status.json while retaining its process pid.
interface ReloadResult {
  pane: string;
  ok: boolean;
  reason?: string;
}

function doReload(pane: string): ReloadResult {
  try {
    const statusPath = path.join(presenceAgentDir(pane), "status.json");
    const old = readJSON<StatusFile>(statusPath);
    const oldUpdatedAt = typeof old?.updatedAt === "string" ? old.updatedAt : "";
    if (typeof old?.pid !== "number") {
      return { pane, ok: false, reason: errorMessage("no bridge status.json pid to verify reload") };
    }
    herdrBestEffort(["pane", "send-keys", pane, "Escape"]);
    sleepMs(500);
    if (!herdrBestEffort(["pane", "run", pane, "/reload"])) {
      return { pane, ok: false, reason: errorMessage("/reload failed") };
    }
    for (let i = 0; i < 16; i++) {
      sleepMs(500);
      const st = readJSON<StatusFile>(statusPath);
      if (typeof st?.pid === "number" && typeof st.updatedAt === "string"
        && pidAlive(st.pid) && Date.parse(st.updatedAt) > Date.parse(oldUpdatedAt)) return { pane, ok: true };
    }
    return { pane, ok: false, reason: errorMessage("bridge status.json did not refresh within 8s after /reload") };
  } catch (error: unknown) {
    return { pane, ok: false, reason: errorMessage(error) };
  }
}

function touchReloadSignal(): void {
  const signalPath = path.join(orchDir(), "reload.signal");
  const fd = files.openSync(signalPath, "a");
  files.closeSync(fd);
}

// Full process restart for pi version upgrades. Escape first, /quit, wait for
// the shell, relaunch, then wait for a fresh bridge pid.
function doHardRestart(pane: string, cmd: string): boolean {
  const statusPath = path.join(presenceAgentDir(pane), "status.json");
  const oldPid = readJSON<StatusFile>(statusPath)?.pid ?? null;
  herdrBestEffort(["pane", "send-keys", pane, "Escape"]);
  sleepMs(500);
  herdrBestEffort(["pane", "run", pane, "/quit"]);
  let shellSeen = false;
  for (let i = 0; i < 16; i++) {
    sleepMs(500);
    const fg = paneForeground(pane);
    if (fg.length && fg.every((n) => /sh$|^bash$|^zsh$|^fish$/.test(n))) { shellSeen = true; break; }
  }
  if (!shellSeen) {
    process.stderr.write(`${pane}: agent did not exit after /quit — skipping relaunch.\n`);
    return false;
  }
  herdrBestEffort(["pane", "run", pane, cmd]);
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
    const entrypoint = process.argv[1];
    if (!entrypoint) throw new Error("Cannot determine orch executable path.");
    const pkgRoot = path.resolve(path.dirname(files.realpathSync(entrypoint)), "..");
    buildBridgeBundle(pkgRoot);
  } catch (error: unknown) {
    process.stderr.write(`warning: could not rebuild bridge bundle: ${errorMessage(error)}\n`);
  }
  const results: ReloadResult[] = [];
  for (const target of targets) {
    try {
      const { pane } = resolvePane(target);
      results.push(doReload(pane));
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
  let cmd = "pi";
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
    const { pane } = resolvePane(target);
    if (!json) process.stdout.write(`Restarting ${pane} (${cmd})...\n`);
    if (doHardRestart(pane, cmd)) { ok++; if (!json) process.stdout.write(`${pane}: bridge live.\n`); }
  }
  if (json) process.stdout.write(JSON.stringify({ targets, ok, total: targets.length, hard: true }) + "\n");
  else process.stdout.write(`${ok}/${targets.length} restarted with fresh bridge.\n`);
  if (ok !== targets.length) process.exit(1);
}

function cmdRename(args: string[]) {
  let paneLabel = false;
  const json = args.includes("--json");
  const positional: string[] = [];
  for (const a of args) {
    if (a === "--pane") paneLabel = true;
    else if (a === "--json") continue;
    else positional.push(a);
  }
  const target = positional[0];
  const name = positional[1];
  if (!target || !name) die("usage: orch rename <target> <name> [--pane]");
  const { pane } = resolvePane(target);
  if (paneLabel) {
    // pane border label, not the agent name
    if (herdrBestEffort(["pane", "rename", pane, name])) {
      if (json) process.stdout.write(JSON.stringify({ target: pane, name, paneLabel: true, renamed: true }) + "\n");
      else process.stdout.write(`${pane} → pane label "${name}".\n`);
    }
    else die(`Could not rename pane ${pane}.`);
    return;
  }
  if (herdrBestEffort(["agent", "rename", pane, name])) {
    if (json) process.stdout.write(JSON.stringify({ target: pane, name, paneLabel: false, renamed: true }) + "\n");
    else process.stdout.write(`${pane} → named "${name}".\n`);
  }
  else die(`Could not rename ${pane}.`);
}

function cmdClose(args: string[]) {
  const { enabled, positional } = splitOptionFlags(args, ["--all", "--stream", "--json"]);
  const all = enabled.has("--all");
  const stream = enabled.has("--stream");
  const json = enabled.has("--json");
  if (!all && !positional.length) die("usage: orch close <target>... | --all [--stream]");

  const herdrTargets: string[] = [];
  const headlessTargets: HeadlessHandle[] = [];
  if (all) {
    // Only panes in orch's spawn registry are eligible; user panes are never touched.
    const self = process.env.HERDR_PANE_ID ?? null;
    const mine = spawnedRecords();
    for (const p of herdrPanes()) {
      if (p.pane_id === self) continue;
      const record = [...mine.values()].find((candidate) => candidate.backend === "herdr" && candidate.handle === p.pane_id);
      if (!record?.handle) continue;
      herdrTargets.push(record.handle);
    }
    // HeadlessBackend.close performs the registry + presence pid/key safety checks.
    for (const handle of headlessBackend.list()) {
      if (handle.alive !== false) headlessTargets.push(handle);
    }
  }
  for (const target of positional) {
    const ent = resolveTarget(target);
    if (ent.paneId) {
      herdrTargets.push(ent.paneId);
      continue;
    }
    const handle = headlessBackend.list().find((candidate) => candidate.key === ent.key);
    if (!handle) die(`Target "${target}" is not an orch-managed headless agent.`);
    headlessTargets.push(handle);
  }

  let ok = 0;
  const closed: string[] = [];
  for (const pane of herdrTargets) {
    if (herdrBackend.close(pane)) { ok++; closed.push(pane); if (!json) process.stdout.write(`Closed ${pane}.\n`); }
    else if (!json) process.stderr.write(`Could not close ${pane}.\n`);
  }
  for (const handle of headlessTargets) {
    if (headlessBackend.close(handle)) { ok++; closed.push(handle.key); if (!json) process.stdout.write(`Closed ${handle.key}.\n`); }
    else if (!all && !json) process.stderr.write(`Could not close ${handle.key}.\n`);
  }
  const targetCount = herdrTargets.length + headlessTargets.length;
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
  const { pane } = resolvePane(target);
  if (!herdrBestEffort(["pane", "send-keys", pane, "Escape"])) die(`Could not abort ${pane}.`);
  sleepMs(500);
  if (!herdrBestEffort(["pane", "send-keys", pane, "Escape"])) die(`Could not abort ${pane}.`);
  if (json) process.stdout.write(JSON.stringify({ target: pane, aborted: true }) + "\n");
  else process.stdout.write(`Aborted ${pane}.\n`);
}

function requireHerdrTarget(target: string, command: string): string {
  const ent = resolveTarget(target);
  if (!ent.paneId) {
    die(`orch ${command} requires the herdr backend; target "${target}" is headless (not a herdr pane).`);
  }
  return ent.paneId;
}

function cmdKeys(args: string[]) {
  const json = args.includes("--json");
  const cleanArgs = args.filter((arg) => arg !== "--json");
  const target = cleanArgs[0];
  const keys = cleanArgs.slice(1);
  if (!target || !keys.length) die("usage: orch keys <target> <key> [key...]");
  const pane = requireHerdrTarget(target, "keys");
  if (herdrBestEffort(["pane", "send-keys", pane, ...keys])) {
    if (json) process.stdout.write(JSON.stringify({ target: pane, keys, sent: true }) + "\n");
    else process.stdout.write(`Sent keys to ${pane}: ${keys.join(" ")}\n`);
  }
  else die(`Could not send keys to ${pane}.`);
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
  const pane = requireHerdrTarget(target, "peek");
  let screen: string;
  try {
    screen = herdrExec( ["pane", "read", pane, "--source", "visible", "--lines", String(n)], {
      timeout: 5000,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e: unknown) {
    die(`Could not read ${pane}: ${errorMessage(e)}`);
  }
  if (json) {
    process.stdout.write(JSON.stringify({ target, pane, screen, lines: n }) + "\n");
    return;
  }
  process.stdout.write("screen (eyeball only — status/result/tail are the truth channel)\n");
  process.stdout.write(screen.endsWith("\n") ? screen : screen + "\n");
}

// ---- tab CRUD ----

function resolveTab(target: string): HerdrTab {
  const r = herdrJSON<{ tabs: HerdrTab[] }>(["tab", "list"]);
  const tabs = Array.isArray(r?.tabs) ? r.tabs : [];
  if (!tabs.length) die("No tabs (herdr down?).");
  if (/:t[0-9a-zA-Z]+$/.test(target)) {
    const tab = tabs.find((item) => item.tab_id === target);
    if (tab) return tab;
    die(`No tab matches "${target}". Run 'orch tabs' to list.`);
  }
  const exact = tabs.filter((item) => (item.label ?? "") === target);
  if (exact.length === 1) return exact[0]!;
  const insensitive = tabs.filter((item) => (item.label ?? "").toLowerCase() === target.toLowerCase());
  if (!exact.length && insensitive.length === 1) return insensitive[0]!;
  const candidates = exact.length > 1 ? exact : insensitive;
  if (candidates.length > 1) {
    process.stderr.write(`Ambiguous tab "${target}". Candidates:\n`);
    for (const tab of candidates) process.stderr.write(`  ${tab.tab_id}  ${tab.label}\n`);
    process.exit(1);
  }
  const ent = resolveTarget(target);
  if (!ent.paneId) die(`Target "${target}" has no herdr pane to resolve a tab.`);
  const pane = herdrPanes().find((item) => item.pane_id === ent.paneId);
  if (!pane?.tab_id) die(`No tab found for pane "${ent.paneId}".`);
  const tab = tabs.find((item) => item.tab_id === pane.tab_id);
  if (!tab) die(`No tab matches "${pane.tab_id}". Run 'orch tabs' to list.`);
  return tab;
}

function cmdTabs(args: string[]) {
  const { enabled } = splitOptionFlags(args, ["--all", "--json"]);
  const all = enabled.has("--all");
  const json = enabled.has("--json");
  const workspace = currentWorkspace();
  const tabs = [...herdrTabs().values()].filter((tab) => all || workspace === null || tab.workspace_id === workspace);
  if (!tabs.length) {
    if (json) process.stdout.write("[]\n");
    else process.stdout.write("No tabs (herdr down?).\n");
    return;
  }
  if (json) {
    process.stdout.write(JSON.stringify(tabs, null, 2) + "\n");
    return;
  }
  const showWorkspace = all && new Set(tabs.map((t) => t.workspace_id ?? "-")).size > 1;
  const headers = showWorkspace ? ["TAB", "LABEL", "NUM", "PANES", "STATUS", "WS"] : ["TAB", "LABEL", "NUM", "PANES", "STATUS"];
  const rows = tabs.map((t) => [
    t.tab_id + (t.focused ? "*" : ""),
    t.label ?? "-",
    String(t.number ?? "-"),
    String(t.pane_count ?? "-"),
    t.agent_status ?? "-",
    ...(showWorkspace ? [t.workspace_id ?? "-"] : []),
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
    workspace ??= herdrPanes()[0]?.workspace_id ?? null;
    if (!workspace) die("Could not determine workspace id (herdr down?). Pass --workspace <id>.");
    const cargs = ["tab", "create", "--workspace", workspace, "--cwd", cwd, "--no-focus"];
    if (label) cargs.push("--label", label);
    try {
      const r = herdrJSON<{ tab: HerdrTab; root_pane: HerdrPane }>(cargs);
      if (json) process.stdout.write(JSON.stringify(r) + "\n");
      else process.stdout.write(
        `Created tab ${r?.tab?.tab_id} "${r?.tab?.label}" — root pane ${r?.root_pane?.pane_id}\n`
      );
    } catch (e: unknown) {
      die(`tab new failed: ${errorMessage(e)}`);
    }
  } else if (sub === "rename") {
    const [t, label] = rest;
    if (!t || !label) die("usage: orch tab rename <tab_id|label> <new-label>");
    const tab = resolveTab(t);
    if (herdrBestEffort(["tab", "rename", tab.tab_id, label])) {
      if (json) process.stdout.write(JSON.stringify({ tab: tab.tab_id, label, renamed: true }) + "\n");
      else process.stdout.write(`${tab.tab_id}: "${tab.label}" → "${label}"\n`);
    }
    else die(`Could not rename tab ${tab.tab_id}.`);
  } else if (sub === "close") {
    const t = rest[0];
    if (!t) die("usage: orch tab close <tab_id|label>");
    const tab = resolveTab(t);
    if (herdrBestEffort(["tab", "close", tab.tab_id])) {
      if (json) process.stdout.write(JSON.stringify({ tab: tab.tab_id, closed: true }) + "\n");
      else process.stdout.write(`Closed tab ${tab.tab_id} "${tab.label}".\n`);
    }
    else die(`Could not close tab ${tab.tab_id}.`);
  } else if (sub === "focus") {
    const t = rest[0];
    if (!t) die("usage: orch tab focus <tab_id|label>");
    const tab = resolveTab(t);
    if (herdrBestEffort(["tab", "focus", tab.tab_id])) {
      if (json) process.stdout.write(JSON.stringify({ tab: tab.tab_id, focused: true }) + "\n");
      else process.stdout.write(`Focused tab ${tab.tab_id} "${tab.label}".\n`);
    }
    else die(`Could not focus tab ${tab.tab_id}.`);
  } else {
    die("usage: orch tab new|rename|close|focus …  (orch tabs to list)");
  }
}

// ---- pane focus / zoom / move ----

function cmdFocus(args: string[]) {
  const json = args.includes("--json");
  const target = args.find((arg) => arg !== "--json");
  if (!target) die("usage: orch focus <target> [--json]");
  const pane = requireHerdrTarget(target, "focus");
  // herdr agent focus accepts pane ids and jumps the view (tab + pane).
  if (herdrBestEffort(["agent", "focus", pane])) {
    if (json) process.stdout.write(JSON.stringify({ target: pane, focused: true }) + "\n");
    else process.stdout.write(`Focused ${pane}.\n`);
  }
  else die(`Could not focus ${pane}.`);
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
  const pane = requireHerdrTarget(target, "zoom");
  if (herdrBestEffort(["pane", "zoom", pane, mode])) {
    if (json) process.stdout.write(JSON.stringify({ target: pane, mode: mode.replace("--", ""), zoomed: true }) + "\n");
    else process.stdout.write(`Zoom ${mode.replace("--", "")} on ${pane}.\n`);
  }
  else die(`Could not zoom ${pane}.`);
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
  const pane = requireHerdrTarget(target, "move");
  let margs: string[];
  if (newTab) {
    margs = ["pane", "move", pane, "--new-tab", "--no-focus"];
    if (label) margs.push("--label", label);
  } else {
    const t = resolveTab(tab!);
    margs = ["pane", "move", pane, "--tab", t.tab_id, "--split", split, "--no-focus"];
  }
  try {
    herdrJSON<unknown>(margs);
    if (json) process.stdout.write(JSON.stringify({ target: pane, moved: true, newTab, tab: newTab ? null : resolveTab(tab!).tab_id }) + "\n");
    else process.stdout.write(`Moved ${pane} ${newTab ? "to a new tab" : `to tab ${resolveTab(tab!).tab_id}`}.\n`);
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
    if (herdrBestEffort(["workspace", "focus", id])) {
      if (json) process.stdout.write(JSON.stringify({ workspace: id, focused: true }) + "\n");
      else process.stdout.write(`Focused workspace ${id}.\n`);
    }
    else die(`Could not focus workspace ${id}.`);
    return;
  }
  if (sub && sub !== "list") die("usage: orch ws [list|focus <workspace_id>] [--json]");
  let r: { workspaces: HerdrWorkspace[] };
  try {
    r = herdrJSON<{ workspaces: HerdrWorkspace[] }>(["workspace", "list"]);
  } catch (e: unknown) {
    die(`workspace list failed: ${errorMessage(e)}`);
  }
  const wss = r?.workspaces ?? [];
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
    w.workspace_id + (w.focused ? "*" : ""),
    w.label ?? "-",
    String(w.number ?? "-"),
    String(w.tab_count ?? "-"),
    String(w.pane_count ?? "-"),
    w.agent_status ?? "-",
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

function resolveDispatchSettings(flags: DispatchFlags): DispatchSettings {
  const target = flags.positional[0];
  const prompt = flags.positional.slice(1).join(" ");
  if (!target || !prompt) die('usage: orch dispatch <target> "<prompt>" [--raw] [--model provider/id:think] [--agent adapter] [--wait] [--then <dst> ["note"]]');
  const { ent, pane } = resolvePane(target);
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
  const settings = resolveDispatchSettings(flags);
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
  return path.join(import.meta.dir, "daemon", "orchd.ts");
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
    await withSpinner(
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
    `orch — the single controller for pi agents in herdr panes.
The orchestrator never needs raw herdr for the normal loop.

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
                                 Set the herdr agent name (NAME column); --pane sets the pane
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
  orch setup [--agent <id>] [--backend <id>] [--yes] [--no-install] [--copy]
                                 Onboarding wizard: pick a harness (--agent) and backend,
                                 record them to ~/.orch/config.toml, install missing deps
                                 (bun/herdr/pi/claude), and wire the chosen harness. Prompts
                                 interactively when a selection is omitted on a TTY; --yes
                                 auto-installs deps, --no-install just reports, --copy copies
                                 instead of symlinking.
  orch help                      This message.

RECOVER
  orch abort <target>            Escape twice, 500ms apart, to dismiss and cancel a turn.
  orch keys <target> <key> [key...]
                                 Send raw keys to a pane.
  orch peek <target> [-n N]      Read visible pane screen (default 25 lines).

Target: agent name, agent-dir key (w6:p3, session-1234), herdr pane_id, or unique suffix (p3).
Tabs resolve by tab_id or unique label.
`
  );
}

function readOrchVersion(): string {
  try {
    const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const parsed: unknown = JSON.parse(files.readFileSync(path.join(repoDir, "package.json"), "utf8"));
    return isRecord(parsed) && typeof parsed.version === "string" ? parsed.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const VERSION = readOrchVersion();

export function runCommand(argv: string[]): void {
  const cmd = argv[0];
  const rest = argv.slice(1);
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
    case "setup": void cmdSetup(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "--version": case "-V": case "version": process.stdout.write(`orch ${VERSION}\n`); break;
    case "help": case "-h": case "--help": usage(); break;
    default:
      if (cmd.startsWith("--")) void cmdStatus(argv).catch((error: unknown) => die(errorMessage(error)));
      else { process.stderr.write(`Unknown command: ${cmd}\n\n`); usage(); process.exit(1); }
  }
}
