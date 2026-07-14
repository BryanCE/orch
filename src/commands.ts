import { execFileSync } from "node:child_process";
import * as files from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { randomUUID } from "node:crypto";
import { deliverToSink, loadSinks, notify, notificationText, type NotifyEvent, type Sink } from "./notify.ts";
import { addTask, cancelTask, listTasks, history as queueHistory, type TaskRec } from "./queue.ts";
import { runWorkLoop } from "./work.ts";
import { runDoctor, applyFixes, isBridgeExtensionStale, type CheckResult } from "./doctor.ts";
import { loadConfig, resolveSetting } from "./config.ts";
import { appendPresenceInbox, bridgeRegistered, defaultModelString, isRecord, loadPresence, orchDir, pidAlive, presenceDir, readJSON, readPaneModel, recordSpawned, spawnedPanes, spawnedRecords, type PresenceEntry, type SpawnedRecord } from "./store.ts";
import { piAdapter, presenceFor } from "./adapters/pi.ts";
import type { AgentAdapter } from "./adapters/adapter.ts";
import { blockText, parseSession, type SessionData } from "./session.ts";
import { buildEntities, collapse, currentWorkspace, entityWorkspace, resolvePane, resolveTarget, scopeEntitiesToWorkspace, sortEntities, workspaceOf, type Entity } from "./entities.ts";
import { herdrBestEffort, herdrExec, herdrJSON, herdrNames, herdrPanes, herdrReachable, herdrTabs, paneStatus } from "./herdr.ts";
import { renderTable, truncate } from "./table.ts";
import { daemonize, runForeground } from "./daemon/lifecycle.ts";
import { DaemonAbsentError, rpcCall } from "./daemon/rpc.ts";
import { derivePresenceTransition, startPreferredEvents, startPresenceWatch, type PresenceMetadata, type PresenceWatch } from "./daemon/events.ts";
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

function die(msg: string): never {
  process.stderr.write(msg + "\n");
  process.exit(1);
}

function firstNonEmptyText(...values: (string | null | undefined)[]): string {
  return values.find((value) => Boolean(value)) ?? "";
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
  staleExtension: boolean; // true → append ‡
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
  } else if (session && session.exists && session.model) {
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
  if (pres && pres.status) {
    if (!pres.alive) {
      state = "exited";
      exited = true;
    } else {
      state = pres.status.asking ? "asking" : pres.status.state ?? "unknown";
    }
    // presence = live bridge → no fallback marker
  } else {
    // no live bridge → herdr status or session fallback
    state = ent.herdrStatus ?? (session && session.exists ? "idle" : "unknown");
    stateFallback = true;
  }

  // ---- cost ----
  let cost = 0;
  if (pres?.status && typeof pres.status.cost === "number") cost = pres.status.cost;
  else if (session && session.exists) cost = session.cost;

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
  const last = firstNonEmptyText(pres?.status?.lastText, pres?.result?.text, session?.lastAssistant);

  const paneLabel = (ent.paneId ?? ent.key) + (ent.focused ? "*" : "");
  return {
    entity: ent,
    paneLabel,
    name: ent.name ?? "",
    tab: ent.tabLabel ?? "-",
    agent: pres?.status?.agent ?? (ent.paneId ? spawned.get(ent.paneId)?.adapter : undefined) ?? ent.agent ?? "-",
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


function cmdStatus(args: string[]) {
  const { enabled } = splitOptionFlags(args, ["--json", "--all"]);
  const json = enabled.has("--json");
  const all = enabled.has("--all");
  const entities = scopeEntitiesToWorkspace(sortEntities(buildEntities()), { all });
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
        v.entity.presence?.result?.text ??
        v.session?.lastAssistant ??
        null,
      herdrStatus: v.entity.herdrStatus,
      sessionPath: v.entity.sessionPath,
      presenceDir: v.entity.presence?.dir ?? null,
      presenceOnly: v.entity.presenceOnly,
      tokens: v.session?.exists ? v.session.tokens : v.entity.presence?.status?.tokens ?? null,
      turns: v.entity.presence?.status?.turns ?? v.session?.turns ?? null,
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
      showWorkspace ? `${entityWorkspace(v.entity) ?? "-"} / ${v.name}` : v.name,
      v.tab,
      v.agent,
      v.model,
      v.state + (v.stateFallback ? "†" : "") + (v.staleExtension ? "‡" : ""),
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
  const out: string[] = [lines[0], lines[1]];
  for (let i = 0; i < rows.length; i++) {
    const line = lines[i + 2];
    out.push(rawExited[i] ? dim(line) : line);
  }
  process.stdout.write(out.join("\n") + "\n");
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
      const resultSummary = typeof entry?.result?.text === "string" ? collapse(entry.result.text) : "";
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

function cmdReview(args: string[]) {
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
  const target = args[1];
  if (!target) die(`usage: orch review ${subcommand === "approve" ? "approve <target>" : 'reject <target> -m "feedback"'}`);
  const item = findReviewItem(target);
  if (subcommand === "approve") {
    if (args.length !== 2) die("usage: orch review approve <target>");
    try {
      const strategy = mergeReviewBranch(item.repoRoot, item.branch);
      removeMergedWorktree(item.repoRoot, item.worktree, item.branch);
      process.stdout.write(`Approved ${item.target}: merged (${strategy}) and removed worktree.\n`);
    } catch (error: any) {
      die(error?.message ?? String(error));
    }
    return;
  }
  if (subcommand === "reject") {
    if (args[2] !== "-m" || !args[3] || args.length !== 4) die('usage: orch review reject <target> -m "feedback"');
    const adapter = resolveAdapter(item.adapter);
    if (!presenceFor(item.pane)) die(`Cannot reject ${item.target}: agent presence is missing.`);
    adapter.steer({ key: item.pane, text: args[3] });
    process.stdout.write(`Rejected ${item.target}; feedback re-dispatched in the same worktree.\n`);
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
  const { enabled, positional } = splitOptionFlags(args.slice(1), ["--json", "--worktree"]);
  const json = enabled.has("--json");
  const worktree = enabled.has("--worktree");

  switch (subcommand) {
    case "add": {
      const text = positional.join(" ");
      if (!text) die('usage: orch queue add "<task text>" [--worktree] [--json]');
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
      } catch (error: any) {
        die(error?.message ?? `Unable to cancel task ${id}`);
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
  const when = new Date(String(ts ?? "")).getTime();
  if (!Number.isFinite(when)) return "?";
  const seconds = Math.max(0, Math.floor((Date.now() - when) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function cmdQuestions(args: string[]) {
  const { enabled } = splitOptionFlags(args, ["--all"]);
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
    .map((pres) => ({ pres, question: readJSON(path.join(pres.dir, "question.json")) }))
    .filter(({ question }) => question && typeof question.question === "string");
  if (!pending.length) {
    process.stdout.write("No pending questions.\n");
    return;
  }
  pending.sort((a, b) => a.pres.key.localeCompare(b.pres.key));
  const workspaces = pending.map(({ pres }) => workspaceOf(pres.status?.paneId ?? pres.key) ?? "-");
  const showWorkspace = all && new Set(workspaces).size > 1;
  process.stdout.write(
    pending
      .map(({ pres, question }) => {
        const label = names.get(pres.key) ?? "-";
        const workspaceLabel = workspaceOf(pres.status?.paneId ?? pres.key) ?? "-";
        const name = showWorkspace ? `${workspaceLabel} / ${label}` : label;
        return `${pres.key}  ${name}  ${formatAge(question.ts)}\n${question.question}`;
      })
      .join("\n\n") + "\n"
  );
}

function cmdAnswer(args: string[]) {
  const force = args.includes("--force");
  const { target, prompt: text } = parseTargetPrompt(args, "--force", 'usage: orch answer <target> "<text>" [--force]');
  const ent = resolveTarget(target);
  const questionPath = ent.presence ? path.join(ent.presence.dir, "question.json") : null;
  if (!force && (!questionPath || !files.existsSync(questionPath)))
    die(`Target "${target}" requires a pending question. Use --force to answer anyway.`);
  if (!ent.presence) die(`Target "${target}" has no agent dir.`);
  files.writeFileSync(path.join(ent.presence.dir, "answer.json"), JSON.stringify({ text, ts: new Date().toISOString() }) + "\n");
  process.stdout.write(`Answered ${ent.presence!.key}.\n`);
}

// ---- watch ----

function looksLikePaneKey(key: string): boolean {
  return /:p[0-9a-zA-Z]+$/.test(key);
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

type EventsOptions = {
  statusFilter: Set<string> | null;
  all: boolean;
  notifications: boolean;
  json: boolean;
  targets: string[];
};

type EventsContext = {
  options: EventsOptions;
  items: Map<string, WatchItem>;
  states: Map<string, string>;
  sinks: Sink[];
  metadata: (key: string) => PresenceMetadata;
  accepts: (key: string) => boolean;
  emit: (event: NotifyEvent) => void;
};

function parseEventsOptions(args: string[]): EventsOptions {
  let statusFilter: Set<string> | null = null;
  let all = false;
  let notifications = false;
  let json = false;
  const targets: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--status") statusFilter = new Set(args[++index].split(",").map((state) => state.trim()).filter(Boolean));
    else if (argument === "--all") all = true;
    else if (argument === "--notify") notifications = true;
    else if (argument === "--json") json = true;
    else targets.push(argument);
  }
  return { statusFilter, all: all || targets.length === 0, notifications, json, targets };
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
  if (options.all) {
    for (const presence of loadPresence().values()) {
      if (presence.alive && looksLikePaneKey(presence.key)) {
        items.set(presence.key, { key: presence.key, dir: presence.dir, ...presenceMetadata(presence.key) });
      }
    }
  }
  for (const target of options.targets) {
    const entity = resolveTarget(target);
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

function eventWriter(options: EventsOptions): (event: NotifyEvent) => void {
  return (event): void => {
    if (options.statusFilter && !options.statusFilter.has(event.newState)) return;
    if (options.json) {
      process.stdout.write(`${JSON.stringify(event)}\n`);
      return;
    }
    const title = notificationText(event, { colorize: true }).title;
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
  const preferred = await startPreferredEvents({
    orchDir: orchDir(),
    onEvent: (value) => {
      if (!isNotifyEvent(value) || !context.accepts(value.key)) return;
      context.states.set(value.key, value.newState);
      context.emit(value);
    },
    onDisconnect: () => process.stderr.write("orch events: daemon disconnected; falling back to file watch\n"),
    onFallback: startFiles,
  });
  return () => {
    preferred.stop();
    fileWatch?.stop();
  };
}

async function cmdEvents(args: string[]) {
  const options = parseEventsOptions(args);
  const items = eventsItems(options);
  const accepts = (key: string): boolean => options.all ? looksLikePaneKey(key) : items.has(key);
  const context: EventsContext = {
    options,
    items,
    states: new Map<string, string>(),
    sinks: eventsSinks(options.notifications),
    metadata: presenceMetadata,
    accepts,
    emit: eventWriter(options),
  };
  seedEventStates(context);
  const cleanup = await startEventsTransport(context);
  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });
}

async function cmdNotify(args: string[]) {
  if (args[0] !== "test") die("usage: orch notify test [--state <state>]");
  let state = "blocked";
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--state") state = args[++i] ?? "";
    else die("usage: orch notify test [--state <state>]");
  }
  if (!state) die("usage: orch notify test [--state <state>]");
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
  for (const { sink, ok } of results) process.stdout.write(`notify ${sinkLabel(sink)}: ${ok ? "ok" : "fail"}\n`);
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
  const ent = resolveTarget(target);
  const pres = ent.presence;
  if (pres && pres.result) {
    if (json) process.stdout.write(JSON.stringify(pres.result, null, 2) + "\n");
    else process.stdout.write((pres.result.text ?? "") + "\n");
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

function cmdSteer(args: string[]) {
  const target = args[0];
  const text = args.slice(1).join(" ");
  if (!target || !text) die('usage: orch steer <target> <text...>');
  const ent = resolveTarget(target);
  if (ent.presence) {
    const inbox = path.join(ent.presence.dir, "inbox.jsonl");
    try {
      files.mkdirSync(ent.presence.dir, { recursive: true });
    } catch {}
    const line = JSON.stringify({ text, ts: new Date().toISOString() }) + "\n";
    files.appendFileSync(inbox, line);
    process.stdout.write(`Steered ${ent.key} → ${truncate(collapse(text), 60)}\n`);
    return;
  }
  // No presence bridge → fall back to herdr send-keys
  const pane = ent.paneId;
  if (!pane) die(`Cannot steer "${target}": no agent dir and no herdr pane.`);
  process.stderr.write(
    `warning: pane ${pane} has no orchestrator-bridge (restart pi to load it); using herdr agent send.\n`
  );
  try {
    herdrExec( ["agent", "send", pane, text], { timeout: 3000, stdio: ["ignore", "pipe", "pipe"] });
    herdrExec( ["pane", "send-keys", pane, "Enter"], { timeout: 3000, stdio: ["ignore", "pipe", "pipe"] });
    process.stdout.write(`Sent to ${pane} via herdr.\n`);
  } catch (e: any) {
    die(`herdr send failed: ${e?.message ?? e}`);
  }
}

function requirePresenceTarget(target: string): Entity {
  const ent = resolveTarget(target);
  if (!ent.presence) die(`Target "${target}" has no agent dir.`);
  return ent;
}

function livePanePresenceEntries(): PresenceEntry[] {
  return [...loadPresence().values()].filter((pres) => pres.alive && looksLikePaneKey(pres.key));
}

function cmdPipe(args: string[]) {
  const src = args[0];
  const dst = args[1];
  const instruction = args.slice(2).join(" ");
  if (!src || !dst) die('usage: orch pipe <src> <dst> ["instruction"]');
  const source = requirePresenceTarget(src);
  const result = readJSON(path.join(source.presence!.dir, "result.json"));
  if (!result?.text) die(`No result.json text available for "${src}".`);
  const destination = requirePresenceTarget(dst);
  const text = `[piped from ${source.presence!.key}] ${instruction ? instruction + "\n" : ""}${result.text}`;
  appendPresenceInbox(destination.presence!, { text, ts: new Date().toISOString() });
  process.stdout.write(`Piped ${source.presence!.key} → ${destination.presence!.key}.\n`);
}

function cmdBroadcast(args: string[]) {
  let all = false;
  const positional: string[] = [];
  for (const arg of args) {
    if (arg === "--all") all = true;
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
  const ts = new Date().toISOString();
  for (const pres of destinations.values()) appendPresenceInbox(pres, { text, ts });
  process.stdout.write(`Broadcast to ${destinations.size} agent(s).\n`);
}

// ---- tail ----

function toolCallSummary(block: any): string {
  const name = block.name ?? "tool";
  const a = block.arguments ?? {};
  let arg = "";
  for (const k of ["command", "path", "file", "filePath", "subject", "query", "pattern", "action"]) {
    if (a[k] != null) {
      arg = String(a[k]);
      break;
    }
  }
  if (!arg) {
    const keys = Object.keys(a);
    if (keys.length) arg = `${keys[0]}=${String(a[keys[0]])}`;
  }
  return `${name}(${collapse(truncate(arg, 60))})`;
}

function hms(entry: any): string {
  const ts = entry.timestamp ?? entry.message?.timestamp;
  const d = ts ? new Date(ts) : null;
  if (!d || isNaN(d.getTime())) return "        ";
  return d.toTimeString().slice(0, 8);
}

function cmdTail(args: string[]) {
  let n = 20;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-n") {
      n = parseInt(args[++i], 10) || 20;
    } else rest.push(args[i]);
  }
  const target = rest[0];
  if (!target) die("usage: orch tail <target> [-n N]");
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
        const calls = content.filter((b: any) => b && b.type === "toolCall");
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
  process.stdout.write(tail.join("\n") + (tail.length ? "\n" : "(no entries)\n"));
}

// ---- session ----

function cmdSession(args: string[]) {
  const target = args[0];
  if (!target) die("usage: orch session <target>");
  const ent = resolveTarget(target);
  if (!ent.sessionPath) die(`No session path known for "${target}".`);
  const s = parseSession(ent.sessionPath);
  const modelStr = s.model
    ? `${s.provider ? s.provider + "/" : ""}${s.model}${s.thinking ? ":" + s.thinking : ""}`
    : "(none)";
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
  const { enabled } = splitOptionFlags(args, ["--all"]);
  const all = enabled.has("--all");
  const entities = scopeEntitiesToWorkspace(sortEntities(buildEntities()), { all });
  const showWorkspace = all && new Set(entities.map((e) => entityWorkspace(e) ?? "-")).size > 1;
  for (const e of entities) {
    const parts = [
      e.paneId ?? e.key,
      showWorkspace ? `${entityWorkspace(e) ?? "-"} / ${e.name ?? "-"}` : (e.name ?? "-"),
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

function cleanOneWorktree(repoRoot: string, baseBranch: string, worktreePath: string, force: boolean): boolean {
  try {
    const branch = worktreeBranch(worktreePath);
    const hasCommitsAhead = worktreeHasCommitsAheadOf(repoRoot, worktreePath, baseBranch);
    const hasChanges = worktreeHasChanges(worktreePath);
    const discardReason = [hasCommitsAhead ? "unmerged commits" : "", hasChanges ? "uncommitted changes" : ""]
      .filter(Boolean).join(" and ");
    if (!hasCommitsAhead && !hasChanges) {
      removeMergedWorktree(repoRoot, worktreePath, branch);
      process.stdout.write(`Removed orphan worktree ${worktreePath} (${branch}; empty or merged).\n`);
    } else if (!force) {
      process.stdout.write(`Kept orphan worktree ${worktreePath} (${branch}; ${discardReason}). Re-run with --force to discard it.\n`);
    } else {
      removeDiscardedWorktree(repoRoot, worktreePath, branch);
      process.stdout.write(`Removed orphan worktree ${worktreePath} (${branch}); discarded ${discardReason}.\n`);
    }
  } catch (error) {
    process.stderr.write(`failed to clean worktree ${worktreePath}: ${error instanceof Error ? error.message : String(error)}\n`);
  }
  return true;
}

function cleanWorktrees(force: boolean): void {
  let repoRoot: string;
  try {
    repoRoot = repositoryCommonRoot(process.cwd());
  } catch (error) {
    die(error instanceof Error ? error.message : String(error));
  }
  const baseBranch = repositoryBranch(repoRoot);
  const records = spawnedRecords();
  const presence = loadPresence();
  const worktrees = listAgentWorktrees(repoRoot);
  let reported = false;
  for (const worktreePath of worktrees) {
    if (liveWorktreeOwner(worktreePath, records, presence)) continue;
    reported = cleanOneWorktree(repoRoot, baseBranch, worktreePath, force) || reported;
  }
  if (!reported) process.stdout.write("No orphan worktrees to clean.\n");
}

function validateCleanArgs(args: string[]): { worktrees: boolean; force: boolean } {
  const worktrees = args.includes("--worktrees");
  const force = args.includes("--force");
  if (args.some((arg) => arg !== "--worktrees" && arg !== "--force") || (force && !worktrees))
    die("usage: orch clean [--worktrees [--force]]");
  return { worktrees, force };
}

function removeDeadAgentDirs(): void {
  const removed: string[] = [];
  for (const e of loadPresence().values()) {
    if (!e.alive) {
      try {
        files.rmSync(e.dir, { recursive: true, force: true });
        removed.push(`${e.key} (pid ${e.status?.pid ?? "?"})`);
      } catch (err: any) {
        process.stderr.write(`failed to remove ${e.dir}: ${err?.message ?? err}\n`);
      }
    }
  }
  if (removed.length) process.stdout.write("Removed dead agent dirs:\n" + removed.map((r) => "  " + r).join("\n") + "\n");
  else process.stdout.write("Nothing to clean — all agent dirs have live pids (or none exist).\n");
}

function cmdClean(args: string[]) {
  const options = validateCleanArgs(args);
  removeDeadAgentDirs();
  if (options.worktrees) cleanWorktrees(options.force);
}

// ---- setup (bootstrap a fresh machine) ----

// Ordered: bun first — pi's installer needs it.
const DEP_INSTALLERS: [string, string][] = [
  ["bun", "curl -fsSL https://bun.sh/install | bash"],
  ["herdr", "curl -fsSL https://herdr.dev/install.sh | bash"],
  ["pi", "bun add -g @earendil-works/pi-coding-agent"],
  ["claude", "curl -fsSL https://claude.ai/install.sh | bash"],
];

async function askYesNo(q: string): Promise<boolean> {
  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const a = (await rl.question(q)).trim().toLowerCase();
  rl.close();
  return a === "" || a === "y" || a === "yes";
}

async function cmdSetup(args: string[]) {
  const copy = args.includes("--copy");
  const yes = args.includes("--yes") || args.includes("-y");
  const noInstall = args.includes("--no-install");
  const pkgRoot = path.resolve(path.dirname(files.realpathSync(process.argv[1])), "..");
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

  process.stdout.write("Prerequisites:\n");
  const missing: string[] = [];
  for (const [bin] of DEP_INSTALLERS) {
    const found = which(bin);
    if (!found) missing.push(bin);
    process.stdout.write(`  ${found ? "ok      " : "MISSING "}${bin}${found ? `  (${found})` : ""}\n`);
  }

  if (missing.length && !noInstall) {
    for (const bin of missing) {
      const cmd = DEP_INSTALLERS.find(([b]) => b === bin)![1];
      let go = yes;
      if (!go && process.stdin.isTTY) go = await askYesNo(`  Install ${bin} now? (${cmd}) [Y/n] `);
      if (!go) {
        process.stdout.write(`  skipped ${bin} — install later with: ${cmd}\n`);
        continue;
      }
      process.stdout.write(`  Installing ${bin}…\n`);
      try {
        execFileSync("bash", ["-c", cmd], { stdio: "inherit" });
      } catch {
        process.stderr.write(`  ${bin} install failed — run manually: ${cmd}\n`);
      }
      // fresh installs land in ~/.bun/bin or ~/.local/bin before the shell rc picks them up
      process.env.PATH = `${path.join(HOME, ".bun", "bin")}:${path.join(HOME, ".local", "bin")}:${process.env.PATH}`;
      const now = which(bin);
      process.stdout.write(now ? `  ok      ${bin}  (${now})\n` : `  ${bin} still not on PATH — open a new shell and re-run orch setup\n`);
    }
  } else if (missing.length) {
    for (const bin of missing)
      process.stdout.write(`  install ${bin}: ${DEP_INSTALLERS.find(([b]) => b === bin)![1]}\n`);
  }

  process.stdout.write("Presence dir:\n");
  files.mkdirSync(presenceDir(), { recursive: true });
  process.stdout.write(`  ${presenceDir()}\n`);

  process.stdout.write("pi extensions:\n");
  const extDir = path.join(HOME, ".pi", "agent", "extensions");
  for (const f of files.readdirSync(path.join(pkgRoot, "extensions")))
    link(path.join(pkgRoot, "extensions", f), path.join(extDir, f));

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

  process.stdout.write("Running doctor checks...\n");
  const doctorResults = await runDoctor(orchDir());
  process.stdout.write(`Doctor: ${doctorResults.filter((result) => result.status === "ok" || result.status === "skip").length}/${doctorResults.length} checks passed\n`);
  process.stdout.write("Done. Open a herdr workspace and try: orch spawn 2 --tab Team1\n");
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
  const r = herdrJSON(["pane", "layout", "--pane", refPane]);
  const layout = r?.layout;
  if (!layout || !Array.isArray(layout.panes)) throw new Error(`no layout for ${refPane}`);
  return { tab_id: layout.tab_id, panes: layout.panes };
}

// Terminal cells are ~2x taller than wide, so weight height by 2 for a visual measure.
function visualArea(rect: Rect): number {
  return rect.width * (rect.height * 2);
}
function longerVisualAxis(rect: Rect): "right" | "down" {
  // Longer visual axis: split horizontally (right) if visually wider than tall, else vertically (down).
  return rect.width > rect.height * 2 ? "right" : "down";
}

// Place ONE new pane on the tab containing refPane: pick the largest-visual-area pane and
// split it along its longer visual axis. Returns the new pane_id. Geometry-driven → balanced grid.
function placeOnePane(refPane: string, cwd: string): string {
  const { panes } = paneLayout(refPane);
  if (!panes.length) throw new Error(`empty layout for ${refPane}`);
  let best = panes[0];
  for (const p of panes) if (visualArea(p.rect) > visualArea(best.rect)) best = p;
  const dir = longerVisualAxis(best.rect);
  const r = herdrJSON(["pane", "split", best.pane_id, "--direction", dir, "--cwd", cwd, "--no-focus"]);
  const id = r?.pane?.pane_id;
  if (!id) throw new Error(`split of ${best.pane_id} returned no pane_id`);
  return id;
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
  const map = readJSON(TRUST_FILE) ?? {};
  if (map[resolved] === true) return;
  map[resolved] = true;
  files.mkdirSync(path.dirname(TRUST_FILE), { recursive: true });
  files.writeFileSync(TRUST_FILE, JSON.stringify(map, null, 2) + "\n");
  process.stdout.write(`Pre-trusted ${resolved} in ~/.pi/agent/trust.json\n`);
}

function paneForegroundMatches(pane: string, cmd: string): boolean {
  const bin = cmd.trim().split(/\s+/)[0];
  try {
    const info = herdrJSON(["pane", "process-info", "--pane", pane]);
    const procs = info?.process_info?.foreground_processes ?? [];
    return procs.some((p: any) => p?.name === bin);
  } catch {
    return true; // can't tell — never re-send keystrokes blind
  }
}

// A launch keystroke sent before the pane's shell is ready gets eaten and the
// pane sits at a prompt forever. The bridge agent dir is the boot signal; a
// pane whose foreground is still the shell after the grace period gets the
// command re-sent once.
async function awaitBridgeRegistration(created: { pane: string; name: string }[], cmd: string) {
  const pending = new Map(created.map((c) => [c.pane, c.name]));
  const resent = new Set<string>();
  const resendAt = Date.now() + 20_000;
  const deadline = Date.now() + 60_000;
  process.stdout.write("\nWaiting for agents to register:\n");
  while (pending.size && Date.now() < deadline) {
    for (const [pane, name] of [...pending]) {
      if (!bridgeRegistered(pane)) continue;
      pending.delete(pane);
      process.stdout.write(`  ok      ${pane}  ${name}\n`);
    }
    if (pending.size && Date.now() >= resendAt) {
      for (const [pane, name] of pending) {
        if (resent.has(pane) || paneForegroundMatches(pane, cmd)) continue;
        resent.add(pane);
        herdrBestEffort(["pane", "run", pane, cmd]);
        process.stdout.write(`  resent  ${pane}  ${name} (launch keystroke lost)\n`);
      }
    }
    await delay(500);
  }
  for (const [pane, name] of pending)
    process.stderr.write(`  STALLED ${pane}  ${name} — no bridge dir; try: orch restart ${name} --hard\n`);
}

function runAndName(pane: string, cmd: string, name: string) {
  try {
    herdrExec( ["pane", "run", pane, cmd], { timeout: 5000, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e: any) {
    process.stderr.write(`warning: run failed in ${pane}: ${(e?.stderr ?? e?.message ?? e).toString().trim()}\n`);
  }
  try {
    herdrExec( ["agent", "rename", pane, name], { timeout: 5000, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e: any) {
    process.stderr.write(`warning: rename ${pane}→${name} failed: ${(e?.stderr ?? e?.message ?? e).toString().trim()}\n`);
  }
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
  const w0 = Math.max(...rows.map((r) => r[0].length), 4);
  const w1 = Math.max(...rows.map((r) => r[1].length), 4);
  for (const r of rows)
    process.stdout.write(`  ${r[0].padEnd(w0)}  ${r[1].padEnd(w1)}  ${r[2]}\n`);
}

const adapters: readonly AgentAdapter[] = [piAdapter];

function resolveAdapter(id: string): AgentAdapter {
  const adapter = adapters.find((candidate) => candidate.id === id);
  if (adapter) return adapter;
  die(`Unknown adapter "${id}". Supported adapters: ${adapters.map((candidate) => candidate.id).join(", ")}.`);
}

function adapterCommand(adapter: string): string {
  return resolveAdapter(adapter).interactiveCmd({});
}

type AgentFlags = {
  adapterFlag?: string;
  backendFlag?: string;
  modelFlag?: string;
};

type AgentSettings = {
  adapter: string;
  backend: string;
  model: string | null;
};

function resolveAgentSettings(flags: AgentFlags, config = loadConfig(orchDir())): AgentSettings {
  const adapter = resolveSetting({ flag: flags.adapterFlag, env: "ORCH_ADAPTER", config: config.defaults.adapter, fallback: "pi" });
  const backend = resolveSetting({ flag: flags.backendFlag, env: "ORCH_BACKEND", config: config.defaults.backend, fallback: "herdr" });
  const selectedModel = resolveSetting({ flag: flags.modelFlag, env: "ORCH_MODEL", config: config.defaults.model, fallback: "" });
  return { adapter, backend, model: selectedModel || null };
}

type SpawnFlags = AgentFlags & {
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
    case "--tab": flags.label = args[index + 1]; return 1;
    case "--cwd": flags.cwd = args[index + 1]; return 1;
    case "--cmd": flags.cmd = args[index + 1]; flags.commandFlag = true; return 1;
    case "--name": flags.namePrefix = args[index + 1]; return 1;
    case "--workspace": flags.workspace = args[index + 1]; return 1;
    case "--model": flags.modelFlag = args[index + 1]; return 1;
    case "--agent":
    case "--adapter": flags.adapterFlag = args[index + 1]; return 1;
    case "--backend": flags.backendFlag = args[index + 1]; return 1;
    case "--spawn-cap":
    case "--cap": flags.spawnCapFlag = Number(args[index + 1]); return 1;
    default: return -1;
  }
}

function parseSpawnFlags(args: string[]): SpawnFlags {
  const flags: SpawnFlags = {
    label: "work", cwd: process.cwd(), cmd: "pi", commandFlag: false,
    workspace: null, namePrefix: null, positional: [],
  };
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--worktree") { flags.worktreeFlag = true; continue; }
    const consumed = readSpawnFlag(flags, args, index);
    if (consumed >= 0) { index += consumed; continue; }
    flags.positional.push(args[index]);
  }
  return flags;
}

type SpawnSettings = AgentSettings & {
  label: string;
  cwd: string;
  cmd: string;
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
  const n = parseInt(flags.positional[0], 10);
  if (!Number.isFinite(n) || n < 1)
    die("usage: orch spawn <N> [--tab <label>] [--cwd <path>] [--cmd <command>] [--name <prefix>] [--model <provider/model[:thinking]>] [--agent <adapter>] [--backend <backend>] [--spawn-cap <N>] [--worktree]");
  if (n > spawnCap) die(`Refusing to spawn ${n} panes — cap is ${spawnCap}.`);
  resolveAdapter(settings.adapter);
  const cmd = flags.commandFlag ? flags.cmd : adapterCommand(settings.adapter);
  return { ...settings, label: flags.label, cwd: flags.cwd, cmd, workspace: flags.workspace, prefix: flags.namePrefix ?? flags.label, n, worktree };
}

type SpawnRoot = { root: string; tabLabel: string; rootCwd: string; rootName: string };

type CreatedAgent = { pane: string; name: string };

function resolveSpawnWorkspace(requested: string | null): string {
  const workspace = requested ?? callerWorkspace() ?? herdrPanes()[0]?.workspace_id;
  if (!workspace) die("Could not determine workspace id (herdr down?). Pass --workspace <id>.");
  return workspace;
}

function createSpawnRoot(settings: SpawnSettings, workspace: string): SpawnRoot {
  const rootName = `${settings.prefix}-1`;
  const rootCwd = settings.worktree ? createAgentWorktree(settings.cwd, rootName) : settings.cwd;
  if (launchesPi(settings.cmd)) writeTrustEntry(rootCwd);
  try {
    const result = herdrJSON(["tab", "create", "--workspace", workspace, "--cwd", rootCwd, "--label", settings.label, "--no-focus"]);
    const root = result?.root_pane?.pane_id;
    const tabLabel = result?.tab?.label ?? settings.label;
    if (!root) throw new Error("no root_pane.pane_id");
    return { root, tabLabel, rootCwd, rootName };
  } catch (error: any) {
    die(`tab create failed: ${error?.message ?? error}`);
  }
}

function launchAdditionalAgents(settings: SpawnSettings, root: string, created: CreatedAgent[]): void {
  for (let i = 2; i <= settings.n; i++) {
    try {
      const name = `${settings.prefix}-${i}`;
      const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
      const pane = placeOnePane(root, cwd);
      runAndName(pane, settings.cmd, name);
      recordSpawned(pane, { adapter: settings.adapter, model: settings.model ?? undefined, backend: settings.backend, worktree: settings.worktree ? cwd : undefined, branch: settings.worktree ? `orch/${name}` : undefined });
      created.push({ pane, name });
    } catch (error: any) {
      process.stderr.write(`warning: could not place agent #${i}: ${error?.message ?? error}\n`);
    }
  }
}

async function reportSpawnResults(settings: SpawnSettings, root: SpawnRoot, created: CreatedAgent[]): Promise<void> {
  for (const agent of created) process.stdout.write(`${agent.pane}  ${agent.name}  [${root.tabLabel}]  ${settings.cmd}\n`);
  process.stdout.write(`\nSpawned ${created.length} named agent(s) on tab "${root.tabLabel}" (no focus stolen).\n`);
  printLayout(root.root, "\nFinal tiling:");
  if (launchesPi(settings.cmd)) await awaitBridgeRegistration(created, settings.cmd);
  if (settings.model) await pinModels(created, settings.model);
  process.stdout.write(`\n'orch status' shows the fleet.\n`);
}

async function executeSpawn(settings: SpawnSettings): Promise<void> {
  const workspace = resolveSpawnWorkspace(settings.workspace);
  const root = createSpawnRoot(settings, workspace);
  const created: CreatedAgent[] = [];
  runAndName(root.root, settings.cmd, root.rootName);
  recordSpawned(root.root, { adapter: settings.adapter, model: settings.model ?? undefined, backend: settings.backend, worktree: settings.worktree ? root.rootCwd : undefined, branch: settings.worktree ? `orch/${root.rootName}` : undefined });
  created.push({ pane: root.root, name: root.rootName });
  launchAdditionalAgents(settings, root.root, created);
  await reportSpawnResults(settings, root, created);
}

async function cmdSpawn(args: string[]) {
  await executeSpawn(resolveSpawnSettings(parseSpawnFlags(args)));
}

async function cmdTile(args: string[]) {
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
    if (a === "--cwd") cwd = args[++i];
    else if (a === "--cmd") { cmd = args[++i]; commandFlag = true; }
    else if (a === "--name") name = args[++i];
    else if (a === "--model") modelFlag = args[++i];
    else if (a === "--agent" || a === "--adapter") adapterFlag = args[++i];
    else if (a === "--backend") backendFlag = args[++i];
    else positional.push(a);
  }
  const { adapter, backend, model } = resolveAgentSettings({ adapterFlag, backendFlag, modelFlag });
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
  } catch (e: any) {
    die(`could not read layout for ${refPane}: ${e?.message ?? e}`);
  }
  const autoName = name ?? `tile-${layout.panes.length + 1}`;

  let newPane: string;
  try {
    newPane = placeOnePane(refPane, cwd);
  } catch (e: any) {
    die(`tile failed: ${e?.message ?? e}`);
  }
  runAndName(newPane, cmd, autoName);
  recordSpawned(newPane, { adapter, model: model ?? undefined, backend });
  process.stdout.write(`Added ${newPane} (${autoName}) to tab ${layout.tab_id} running "${cmd}".\n`);
  printLayout(refPane, "\nFinal tiling:");
  if (model) await pinModels([{ pane: newPane, name: autoName }], model);
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

type RunResult = { status: string | null; retried: boolean };

function paneAgentState(pane: string): string | null {
  const status = readJSON(path.join(presenceDir(), pane, "status.json"));
  if (typeof status?.state === "string") return status.state;
  return paneStatus(pane);
}

function waitForWorking(pane: string, timeoutMs: number): string | null {
  const deadline = Date.now() + timeoutMs;
  let state: string | null = null;
  do {
    state = paneAgentState(pane);
    if (state === "working") return state;
    if (Date.now() >= deadline) return state;
    sleepMs(250);
  } while (true);
}

// Dispatch a prompt and retry once when the pane never enters working state.
function doRun(pane: string, prompt: string): RunResult {
  herdrBestEffort(["pane", "run", pane, prompt]);
  let status = waitForWorking(pane, 10_000);
  if (status === "working") return { status, retried: false };

  herdrBestEffort(["pane", "run", pane, prompt]);
  status = waitForWorking(pane, 10_000);
  return { status: status ?? paneStatus(pane), retried: true };
}

function cmdRun(args: string[]) {
  const raw = args.includes("--raw");
  const { target, prompt } = parseTargetPrompt(args, "--raw", 'usage: orch run <target> "<prompt>" [--raw]');
  const { pane } = resolvePane(target);
  const result = doRun(pane, workerPrompt(prompt, raw));
  process.stdout.write(`Dispatched to ${pane} → status: ${result.status ?? "unknown"}${result.retried ? " (retried)" : ""}\n`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForBridge(paneKey: string, timeoutMs = 10_000): Promise<string> {
  const dir = path.join(presenceDir(), paneKey);
  const deadline = Date.now() + timeoutMs;
  do {
    if (files.existsSync(dir) && readJSON(path.join(dir, "status.json")) !== null) return dir;
    if (Date.now() >= deadline) break;
    await delay(250);
  } while (true);
  const waited = timeoutMs > 0 ? ` after waiting ${timeoutMs}ms` : "";
  throw new Error(`${paneKey}: no orchestrator-bridge agent dir${waited} — restart pi in that pane, then retry.`);
}

function normalizedModel(modelArg: string): { requested: string; model: string; thinking: string | null } {
  const colon = modelArg.lastIndexOf(":");
  const slash = modelArg.indexOf("/");
  const hasThinking = colon > slash && colon !== -1;
  const model = hasThinking ? modelArg.slice(0, colon) : modelArg;
  const thinking = hasThinking ? modelArg.slice(colon + 1) : null;
  return { requested: modelArg, model, thinking };
}

// Set a pane's model via the bridge inbox, then poll status.json for reflection.
async function doModel(pane: string, modelArg: string, wait = true): Promise<{ old: string | null; now: string | null; confirmed: boolean; unchanged: boolean }> {
  const dir = await waitForBridge(pane, wait ? 10_000 : 0);
  const { requested, model, thinking } = normalizedModel(modelArg);
  const old = readPaneModel(pane);
  if (old === requested) return { old, now: old, confirmed: true, unchanged: true };
  let lines = JSON.stringify({ cmd: "model", model, ts: new Date().toISOString() }) + "\n";
  if (thinking) lines += JSON.stringify({ cmd: "thinking", level: thinking, ts: new Date().toISOString() }) + "\n";
  files.appendFileSync(path.join(dir, "inbox.jsonl"), lines);
  let now = old;
  const deadline = Date.now() + 2500;
  do {
    now = readPaneModel(pane);
    if (now === requested) return { old, now, confirmed: true, unchanged: false };
    if (Date.now() >= deadline) break;
    await delay(250);
  } while (true);
  return { old, now, confirmed: false, unchanged: false };
}

async function cmdModel(args: string[]) {
  const noWait = args.includes("--no-wait");
  const positional = args.filter((arg) => arg !== "--no-wait");
  const target = positional[0];
  const modelArg = positional[1];
  if (!target || !modelArg) die("usage: orch model <target> <provider/model[:thinking]> [--no-wait]");
  const { pane } = resolvePane(target);
  let result;
  try {
    result = await doModel(pane, modelArg, !noWait);
  } catch (error: any) {
    die(error?.message ?? String(error));
  }
  if (result.unchanged) {
    process.stdout.write(`${pane}: already ${modelArg} (no-op)\n`);
  } else if (result.confirmed) {
    process.stdout.write(`${pane}: ${result.old ?? "(unknown)"} → ${result.now}\n`);
  } else {
    process.stderr.write(`${pane}: requested ${modelArg}; still ${result.now ?? "(unknown)"}.\n`);
    process.exitCode = 1;
  }
}

async function pinModels(created: { pane: string; name: string }[], model: string): Promise<void> {
  const results = await Promise.all(created.map(async ({ pane, name }) => {
    try {
      const result = await doModel(pane, model);
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
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--status") status = args[++i];
    else if (args[i] === "--timeout") timeout = parseInt(args[++i], 10) || 300000;
    else positional.push(args[i]);
  }
  const target = positional[0];
  if (!target) die("usage: orch wait <target> [--status done|idle|working|blocked] [--timeout ms]");
  const { pane } = resolvePane(target);
  try {
    herdrExec( ["wait", "agent-status", pane, "--status", status, "--timeout", String(timeout)], {
      timeout: timeout + 5000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    process.stdout.write(`${pane} reached "${status}".\n`);
  } catch (e: any) {
    die(`wait for ${pane} → "${status}" failed/timed out: ${(e?.stderr ?? e?.message ?? e).toString().trim()}`);
  }
}

function cmdNew(args: string[]) {
  const target = args[0];
  if (!target) die("usage: orch new <target>");
  const { pane } = resolvePane(target);
  const statusPath = path.join(presenceDir(), pane, "status.json");
  const before = readJSON(statusPath);
  const beforeUpdated = Date.parse(String(before?.updatedAt ?? ""));
  const sentAt = Date.now();
  if (!herdrBestEffort(["pane", "run", pane, "/new"])) die(`Could not reset ${pane}.`);

  const deadline = sentAt + 15_000;
  while (Date.now() < deadline) {
    const status = readJSON(statusPath);
    const updated = Date.parse(String(status?.updatedAt ?? ""));
    const advanced = Number.isFinite(updated)
      && (!Number.isFinite(beforeUpdated) || updated > beforeUpdated)
      && updated >= sentAt - 1000;
    if (advanced && status?.state === "idle") {
      process.stdout.write(`Cleared session on ${pane} (/new); ready.\n`);
      return;
    }
    sleepMs(250);
  }
  die(`${pane}: /new did not become ready within 15s.`);
}

function paneForeground(pane: string): string[] {
  try {
    const out = herdrExec( ["pane", "process-info", "--pane", pane], {
      timeout: 5000, stdio: ["ignore", "pipe", "pipe"],
    }).toString();
    const info = JSON.parse(out);
    return (info?.result?.process_info?.foreground_processes ?? []).map((x: any) => String(x.name));
  } catch {
    return [];
  }
}

// Reload extensions in place. Escape first dismisses any stuck overlay; the
// bridge must refresh status.json while retaining its process pid.
function doReload(pane: string): boolean {
  const statusPath = path.join(presenceDir(), pane, "status.json");
  const old = readJSON(statusPath);
  if (!old?.pid) {
    process.stderr.write(`${pane}: no bridge status.json pid to verify reload.\n`);
    return false;
  }
  herdrBestEffort(["pane", "send-keys", pane, "Escape"]);
  sleepMs(500);
  if (!herdrBestEffort(["pane", "run", pane, "/reload"])) return false;
  for (let i = 0; i < 16; i++) {
    sleepMs(500);
    const st = readJSON(statusPath);
    if (st?.pid === old.pid && pidAlive(st.pid) && Date.parse(st.updatedAt) > Date.parse(old.updatedAt)) return true;
  }
  process.stderr.write(`${pane}: bridge status.json did not refresh within 8s after /reload.\n`);
  return false;
}

// Full process restart for pi version upgrades. Escape first, /quit, wait for
// the shell, relaunch, then wait for a fresh bridge pid.
function doHardRestart(pane: string, cmd: string): boolean {
  const statusPath = path.join(presenceDir(), pane, "status.json");
  const oldPid = readJSON(statusPath)?.pid ?? null;
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
    const st = readJSON(statusPath);
    if (st && st.pid && st.pid !== oldPid && pidAlive(st.pid)) return true;
  }
  process.stderr.write(`${pane}: relaunched but bridge status.json did not refresh within 20s.\n`);
  return false;
}

function cmdRestart(args: string[]) {
  let cmd = "pi";
  let hard = false;
  const targets: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--cmd") cmd = args[++i];
    else if (args[i] === "--hard") hard = true;
    else if (args[i] === "--all") {
      for (const ent of buildEntities()) {
        if (ent.paneId && ent.agent === "pi") targets.push(ent.paneId);
      }
    } else targets.push(args[i]);
  }
  if (!targets.length) die("usage: orch restart <target>... | --all [--hard] [--cmd pi]");
  let ok = 0;
  for (const t of targets) {
    const { pane } = resolvePane(t);
    process.stdout.write(`${hard ? "Restarting" : "Reloading"} ${pane}${hard ? ` (${cmd})` : ""}...\n`);
    if ((hard ? doHardRestart(pane, cmd) : doReload(pane))) { ok++; process.stdout.write(`${pane}: bridge live.\n`); }
  }
  process.stdout.write(`${ok}/${targets.length} ${hard ? "restarted" : "reloaded"} with fresh bridge.\n`);
  if (ok !== targets.length) process.exit(1);
}

function cmdRename(args: string[]) {
  let paneLabel = false;
  const positional: string[] = [];
  for (const a of args) {
    if (a === "--pane") paneLabel = true;
    else positional.push(a);
  }
  const target = positional[0];
  const name = positional[1];
  if (!target || !name) die("usage: orch rename <target> <name> [--pane]");
  const { pane } = resolvePane(target);
  if (paneLabel) {
    // pane border label, not the agent name
    if (herdrBestEffort(["pane", "rename", pane, name]))
      process.stdout.write(`${pane} → pane label "${name}".\n`);
    else die(`Could not rename pane ${pane}.`);
    return;
  }
  if (herdrBestEffort(["agent", "rename", pane, name])) process.stdout.write(`${pane} → named "${name}".\n`);
  else die(`Could not rename ${pane}.`);
}

function cmdClose(args: string[]) {
  const { enabled, positional } = splitOptionFlags(args, ["--all", "--stream"]);
  const all = enabled.has("--all");
  const stream = enabled.has("--stream");
  if (!all && !positional.length) die("usage: orch close <target>... | --all [--stream]");
  const targets: string[] = [];
  if (all) {
    // ONLY panes orch itself created (spawned.jsonl). Panes/tabs the user opened
    // are never touched, no matter what.
    const self = process.env.HERDR_PANE_ID ?? null;
    const mine = spawnedPanes();
    for (const p of herdrPanes()) {
      if (p.pane_id === self) continue;
      if (!mine.has(p.pane_id)) continue;
      targets.push(p.pane_id);
    }
  }
  for (const t of positional) targets.push(resolvePane(t).pane);
  let ok = 0;
  for (const pane of targets) {
    if (herdrBestEffort(["pane", "close", pane])) { ok++; process.stdout.write(`Closed ${pane}.\n`); }
    else process.stderr.write(`Could not close ${pane}.\n`);
  }
  if (all && !targets.length) process.stdout.write("No fleet panes to close.\n");
  if (stream) {
    let pids: number[] = [];
    try {
      pids = execFileSync("pgrep", ["-f", "orch events"]).toString().trim().split("\n").filter(Boolean).map(Number);
    } catch {}
    const skip = new Set([process.pid, process.ppid]);
    const kill = pids.filter((p) => !skip.has(p));
    for (const p of kill) { try { process.kill(p, "SIGTERM"); } catch {} }
    process.stdout.write(kill.length ? `Killed ${kill.length} orch events process(es).\n` : "No orch events stream running.\n");
  }
  if (targets.length && ok !== targets.length) process.exit(1);
}

// ---- recovery / escape hatches ----

function cmdAbort(args: string[]) {
  const target = args[0];
  if (!target) die("usage: orch abort <target>");
  const { pane } = resolvePane(target);
  if (!herdrBestEffort(["pane", "send-keys", pane, "Escape"])) die(`Could not abort ${pane}.`);
  sleepMs(500);
  if (!herdrBestEffort(["pane", "send-keys", pane, "Escape"])) die(`Could not abort ${pane}.`);
  process.stdout.write(`Aborted ${pane}.\n`);
}

function cmdKeys(args: string[]) {
  const target = args[0];
  const keys = args.slice(1);
  if (!target || !keys.length) die("usage: orch keys <target> <key> [key...]");
  const { pane } = resolvePane(target);
  if (herdrBestEffort(["pane", "send-keys", pane, ...keys]))
    process.stdout.write(`Sent keys to ${pane}: ${keys.join(" ")}\n`);
  else die(`Could not send keys to ${pane}.`);
}

function cmdPeek(args: string[]) {
  let n = 25;
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-n") n = parseInt(args[++i], 10) || 25;
    else positional.push(args[i]);
  }
  const target = positional[0];
  if (!target) die("usage: orch peek <target> [-n N]");
  const { pane } = resolvePane(target);
  let screen: string;
  try {
    screen = herdrExec( ["pane", "read", pane, "--source", "visible", "--lines", String(n)], {
      timeout: 5000,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e: any) {
    die(`Could not read ${pane}: ${(e?.stderr ?? e?.message ?? e).toString().trim()}`);
  }
  process.stdout.write("screen (eyeball only — status/result/tail are the truth channel)\n");
  process.stdout.write(screen.endsWith("\n") ? screen : screen + "\n");
}

// ---- tab CRUD ----

function resolveTab(target: string): any {
  const r = herdrJSON(["tab", "list"]);
  const tabs = Array.isArray(r?.tabs) ? r.tabs : [];
  if (!tabs.length) die("No tabs (herdr down?).");
  if (/:t[0-9a-zA-Z]+$/.test(target)) {
    const tab = tabs.find((item: any) => item.tab_id === target);
    if (tab) return tab;
    die(`No tab matches "${target}". Run 'orch tabs' to list.`);
  }
  const exact = tabs.filter((item: any) => (item.label ?? "") === target);
  if (exact.length === 1) return exact[0];
  const insensitive = tabs.filter((item: any) => (item.label ?? "").toLowerCase() === target.toLowerCase());
  if (!exact.length && insensitive.length === 1) return insensitive[0];
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
  const tab = tabs.find((item: any) => item.tab_id === pane.tab_id);
  if (!tab) die(`No tab matches "${pane.tab_id}". Run 'orch tabs' to list.`);
  return tab;
}

function cmdTabs(args: string[]) {
  const { enabled } = splitOptionFlags(args, ["--all"]);
  const all = enabled.has("--all");
  const workspace = currentWorkspace();
  const tabs = [...herdrTabs().values()].filter((tab) => all || workspace === null || tab.workspace_id === workspace);
  if (!tabs.length) {
    process.stdout.write("No tabs (herdr down?).\n");
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
  const sub = args[0];
  const rest = args.slice(1);
  if (sub === "new") {
    let label: string | null = null;
    let workspace: string | null = null;
    let cwd = process.cwd();
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === "--label") label = rest[++i];
      else if (rest[i] === "--workspace") workspace = rest[++i];
      else if (rest[i] === "--cwd") cwd = rest[++i];
    }
    if (!workspace) workspace = herdrPanes()[0]?.workspace_id ?? null;
    if (!workspace) die("Could not determine workspace id (herdr down?). Pass --workspace <id>.");
    const cargs = ["tab", "create", "--workspace", workspace, "--cwd", cwd, "--no-focus"];
    if (label) cargs.push("--label", label);
    try {
      const r = herdrJSON(cargs);
      process.stdout.write(
        `Created tab ${r?.tab?.tab_id} "${r?.tab?.label}" — root pane ${r?.root_pane?.pane_id}\n`
      );
    } catch (e: any) {
      die(`tab new failed: ${e?.message ?? e}`);
    }
  } else if (sub === "rename") {
    const [t, label] = rest;
    if (!t || !label) die("usage: orch tab rename <tab_id|label> <new-label>");
    const tab = resolveTab(t);
    if (herdrBestEffort(["tab", "rename", tab.tab_id, label]))
      process.stdout.write(`${tab.tab_id}: "${tab.label}" → "${label}"\n`);
    else die(`Could not rename tab ${tab.tab_id}.`);
  } else if (sub === "close") {
    const t = rest[0];
    if (!t) die("usage: orch tab close <tab_id|label>");
    const tab = resolveTab(t);
    if (herdrBestEffort(["tab", "close", tab.tab_id]))
      process.stdout.write(`Closed tab ${tab.tab_id} "${tab.label}".\n`);
    else die(`Could not close tab ${tab.tab_id}.`);
  } else if (sub === "focus") {
    const t = rest[0];
    if (!t) die("usage: orch tab focus <tab_id|label>");
    const tab = resolveTab(t);
    if (herdrBestEffort(["tab", "focus", tab.tab_id]))
      process.stdout.write(`Focused tab ${tab.tab_id} "${tab.label}".\n`);
    else die(`Could not focus tab ${tab.tab_id}.`);
  } else {
    die("usage: orch tab new|rename|close|focus …  (orch tabs to list)");
  }
}

// ---- pane focus / zoom / move ----

function cmdFocus(args: string[]) {
  const target = args[0];
  if (!target) die("usage: orch focus <target>");
  const { pane } = resolvePane(target);
  // herdr agent focus accepts pane ids and jumps the view (tab + pane).
  if (herdrBestEffort(["agent", "focus", pane])) process.stdout.write(`Focused ${pane}.\n`);
  else die(`Could not focus ${pane}.`);
}

function cmdZoom(args: string[]) {
  let mode = "--toggle";
  const positional: string[] = [];
  for (const a of args) {
    if (a === "--off") mode = "--off";
    else if (a === "--on") mode = "--on";
    else positional.push(a);
  }
  const target = positional[0];
  if (!target) die("usage: orch zoom <target> [--on|--off]  (default: toggle)");
  const { pane } = resolvePane(target);
  if (herdrBestEffort(["pane", "zoom", pane, mode]))
    process.stdout.write(`Zoom ${mode.replace("--", "")} on ${pane}.\n`);
  else die(`Could not zoom ${pane}.`);
}

function cmdMove(args: string[]) {
  let tab: string | null = null;
  let split = "right";
  let newTab = false;
  let label: string | null = null;
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tab") tab = args[++i];
    else if (args[i] === "--split") split = args[++i];
    else if (args[i] === "--new-tab") newTab = true;
    else if (args[i] === "--label") label = args[++i];
    else positional.push(args[i]);
  }
  const target = positional[0];
  if (!target || (!tab && !newTab))
    die("usage: orch move <target> --tab <tab_id|label> [--split right|down] | --new-tab [--label X]");
  const { pane } = resolvePane(target);
  let margs: string[];
  if (newTab) {
    margs = ["pane", "move", pane, "--new-tab", "--no-focus"];
    if (label) margs.push("--label", label);
  } else {
    const t = resolveTab(tab!);
    margs = ["pane", "move", pane, "--tab", t.tab_id, "--split", split, "--no-focus"];
  }
  try {
    herdrJSON(margs);
    process.stdout.write(`Moved ${pane} ${newTab ? "to a new tab" : `to tab ${resolveTab(tab!).tab_id}`}.\n`);
  } catch (e: any) {
    die(`move failed: ${e?.message ?? e}`);
  }
}

// ---- workspaces ----

function cmdWs(args: string[]) {
  const sub = args[0];
  if (sub === "focus") {
    const id = args[1];
    if (!id) die("usage: orch ws focus <workspace_id>");
    if (herdrBestEffort(["workspace", "focus", id])) process.stdout.write(`Focused workspace ${id}.\n`);
    else die(`Could not focus workspace ${id}.`);
    return;
  }
  if (sub && sub !== "list") die("usage: orch ws [list|focus <workspace_id>]");
  let r: any;
  try {
    r = herdrJSON(["workspace", "list"]);
  } catch (e: any) {
    die(`workspace list failed: ${e?.message ?? e}`);
  }
  const wss = r?.workspaces ?? [];
  if (!wss.length) {
    process.stdout.write("No workspaces.\n");
    return;
  }
  const headers = ["WS", "LABEL", "NUM", "TABS", "PANES", "STATUS"];
  const rows = wss.map((w: any) => [
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
  doWait: boolean;
  thenTarget: string | null;
  thenNote: string;
  positional: string[];
};

function parseDispatchFlags(args: string[]): DispatchFlags {
  const commandArgs = args.filter((argument) => argument !== "--raw");
  const flags: DispatchFlags = { raw: args.includes("--raw"), doWait: false, thenTarget: null, thenNote: "", positional: [] };
  for (let i = 0; i < commandArgs.length; i++) {
    const argument = commandArgs[i];
    if (argument === "--model") flags.modelFlag = commandArgs[++i];
    else if (argument === "--agent" || argument === "--adapter") flags.adapterFlag = commandArgs[++i];
    else if (argument === "--wait") flags.doWait = true;
    else if (argument === "--then") {
      flags.thenTarget = commandArgs[++i] ?? null;
      flags.thenNote = commandArgs.slice(i + 1).join(" ");
      break;
    } else flags.positional.push(argument);
  }
  return flags;
}

type DispatchSettings = AgentSettings & {
  raw: boolean;
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
  return { ...settings, raw: flags.raw, doWait: flags.doWait, thenNote: flags.thenNote, ent, pane, prompt, destination };
}

async function waitForDispatchCompletion(pane: string): Promise<void> {
  try {
    herdrExec(["wait", "agent-status", pane, "--status", "done", "--timeout", "300000"], {
      timeout: 305000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error: any) {
    process.stderr.write(`warning: wait done failed: ${(error?.stderr ?? error?.message ?? error).toString().trim()}\n`);
  }
  process.stdout.write(`\n--- result ---\n`);
  cmdResult([pane]);
}

async function executeDispatch(settings: DispatchSettings): Promise<void> {
  if (settings.model) {
    const { old, now } = await doModel(settings.pane, settings.model);
    process.stdout.write(`model: ${old ?? "(unknown)"} → ${now ?? "(sent, unverified)"}\n`);
  }
  const result = doRun(settings.pane, workerPrompt(settings.prompt, settings.raw));
  recordSpawned(settings.pane, { adapter: settings.adapter, model: settings.model ?? undefined });
  process.stdout.write(`Dispatched to ${settings.pane} → status: ${result.status ?? "unknown"}${result.retried ? " (retried)" : ""}\n`);
  if (settings.destination) {
    appendPresenceInbox(settings.ent.presence!, {
      cmd: "on_done",
      target: settings.destination.presence!.key,
      note: settings.thenNote,
      ts: new Date().toISOString(),
    });
  }
  if (settings.doWait) await waitForDispatchCompletion(settings.pane);
}

async function cmdDispatch(args: string[]) {
  await executeDispatch(resolveDispatchSettings(parseDispatchFlags(args)));
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

function daemonLockPid(): number | undefined {
  const lock = readJSON(path.join(orchDir(), "orchd.lock"));
  return Number.isInteger(lock?.pid) && lock.pid > 0 ? lock.pid : undefined;
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

async function startDaemon(foreground: boolean): Promise<void> {
  const existingPid = daemonLockPid();
  if (existingPid && pidAlive(existingPid)) {
    process.stdout.write(`already running (pid ${existingPid})\n`);
    return;
  }
  const entrypoint = daemonEntrypoint();
  if (foreground) {
    runForeground(entrypoint);
    return;
  }
  daemonize(entrypoint, [], orchDir());
  const status = await waitForDaemon();
  process.stdout.write(`started (pid ${status.pid})\n`);
}

async function stopDaemon(): Promise<void> {
  const pid = daemonLockPid();
  if (!pid || !pidAlive(pid)) {
    process.stdout.write("not running\n");
    return;
  }
  process.kill(pid, "SIGTERM");
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && pidAlive(pid)) await new Promise((resolve) => setTimeout(resolve, 50));
  if (pidAlive(pid)) throw new Error(`timed out stopping orchd (pid ${pid})`);
  process.stdout.write(`stopped (pid ${pid})\n`);
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

async function reloadDaemon(): Promise<void> {
  const before = await fetchDaemonStatus();
  await rpcCall(orchDir(), "reload");
  const after = await waitForDaemon(before.startedAt);
  process.stdout.write(`reloaded (pid ${after.pid}, hash ${after.codeHash})\n`);
}

async function cmdDaemon(args: string[]): Promise<void> {
  const action = args[0];
  if (action === "start") return startDaemon(args.includes("--fg"));
  if (action === "stop") return stopDaemon();
  if (action === "status") return statusDaemon(args.includes("--json"));
  if (action === "reload") return reloadDaemon();
  die("usage: orch daemon start [--fg] | stop | status [--json] | reload");
}

async function cmdDoctor(args: string[]) {
  const json = args.includes("--json");
  const fix = args.includes("--fix");
  let results = await runDoctor(orchDir());
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
  const config = loadConfig(orchDir());
  await runWorkLoop({
    orchDir: orchDir(),
    pollIntervalMs: 500,
    once: args.includes("--once"),
    maxRetries: config.queue.max_retries ?? 1,
  });
}

// ---- help ----

function usage() {
  process.stdout.write(
    `orch — the single controller for pi agents in herdr panes.
The orchestrator never needs raw herdr for the normal loop.

OBSERVE
  orch status [--json] [--all]   Glanceable table of every pane (default command).
  orch questions                 List pending agent questions.
  orch events [--all] [target ...] [--status s[,s…]] [--notify] [--json]
                                 Continuous stream of pane state transitions (forever).

QUEUE
  orch queue add "<task text>" [--worktree] [--json]
                                 Add a task and print its id.
  orch queue list [--json]       List queued, claimed, and settled tasks.
  orch queue history [--json]    List completed, failed, and cancelled tasks.
  orch queue cancel <id> [--json]
                                 Cancel an unclaimed task.
  orch work [--once]             Assign queued tasks to idle agents.

REVIEW
  orch review list [--json]      List done worktree agents with commits ahead.
  orch review approve <target>    Merge and remove an approved worktree.
  orch review reject <target> -m "feedback"
                                 Re-dispatch feedback in the same worktree.

DISPATCH WORK
  orch run <target> "<prompt>" [--raw]
                                 Send a prompt with the worker header (or exact prompt with --raw).
  orch dispatch <target> "<prompt>" [--raw] [--model provider/id:think] [--agent adapter] [--wait] [--then <dst> ["note"]]
                                 One-shot: optional model set, run, wait, or forward its result on done.
  orch answer <target> "<text>" [--force]
                                 Answer a pending question (--force permits a missing question.json).
  orch pipe <src> <dst> ["instruction"]
                                 Send a completed result to another agent's inbox.
  orch broadcast "<text>" [target ...|--all]
                                 Steer named targets, or every live pane agent by default.
  orch model <target> <provider/model[:thinking]> [--no-wait]
                                 Switch a pane's model via the bridge inbox; waits up to 10s by default.
  orch notify test [--state <state>]
                                 Send a synthetic transition to each configured notification sink.
  orch steer <target> <text…>    Append a mid-run steer to the agent's inbox.
  orch wait <target> [--status done|idle|working|blocked] [--timeout ms]
                                 Block until the pane reaches a status (default done, 300000ms).
  orch result <target> [--json]  Print a target's result (result.json or session fallback).
  orch tail <target> [-n N]      Last N session entries (default 20), human-readable.
  orch session <target>          Resolved session path + quick stats.
  orch new <target>              Clear the pane's session (/new).
  orch restart <target>… | --all [--hard] [--cmd pi]
                                 Reload extensions in place; --hard fully restarts pi for version upgrades.

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
  orch doctor [--fix] [--json]   Check and optionally repair the installation.
  orch clean [--worktrees [--force]]
                                 Delete dead agent dirs; clean orphaned worktrees (use --force to discard unmerged work).
  orch setup [--yes] [--no-install] [--copy]
                                 Bootstrap this machine: offer to install missing deps
                                 (bun/herdr/pi/claude), link pi extensions, install Claude
                                 skills/agents, link bins. --yes auto-installs, --no-install
                                 just reports, --copy copies instead of symlinking.
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

export function runCommand(argv: string[]): void {
  const cmd = argv[0];
  const rest = argv.slice(1);
  switch (cmd) {
    case undefined: case "status": cmdStatus(cmd === undefined ? argv : rest); break;
    case "events": void cmdEvents(rest).catch((error) => die(error?.message ?? String(error))); break;
    case "notify": void cmdNotify(rest).catch((error) => die(error?.message ?? String(error))); break;
    case "questions": cmdQuestions(rest); break;
    case "queue": cmdQueue(rest); break;
    case "daemon": void cmdDaemon(rest).catch((error) => die(error?.message ?? String(error))); break;
    case "doctor": void cmdDoctor(rest).catch((error) => die(error?.message ?? String(error))); break;
    case "work": void cmdWork(rest).catch((error) => die(error?.message ?? String(error))); break;
    case "review": cmdReview(rest); break;
    case "answer": cmdAnswer(rest); break;
    case "result": cmdResult(rest); break;
    case "steer": cmdSteer(rest); break;
    case "pipe": cmdPipe(rest); break;
    case "broadcast": cmdBroadcast(rest); break;
    case "tail": cmdTail(rest); break;
    case "session": cmdSession(rest); break;
    case "panes": cmdPanes(rest); break;
    case "spawn": void cmdSpawn(rest).catch((error) => die(error?.message ?? String(error))); break;
    case "tile": void cmdTile(rest).catch((error) => die(error?.message ?? String(error))); break;
    case "run": cmdRun(rest); break;
    case "model": void cmdModel(rest).catch((error) => die(error?.message ?? String(error))); break;
    case "wait": cmdWait(rest); break;
    case "dispatch": void cmdDispatch(rest).catch((error) => die(error?.message ?? String(error))); break;
    case "new": cmdNew(rest); break;
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
    case "setup": void cmdSetup(rest).catch((error) => die(String(error?.message ?? error))); break;
    case "help": case "-h": case "--help": usage(); break;
    default:
      if (cmd.startsWith("--")) cmdStatus(argv);
      else { process.stderr.write(`Unknown command: ${cmd}\n\n`); usage(); process.exit(1); }
  }
}
