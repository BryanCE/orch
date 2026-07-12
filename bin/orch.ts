#!/usr/bin/env bun
// orch — unified controller for pi agents running in herdr panes.
// Plain TS, node built-ins only. Merges herdr CLI + pi presence dir + pi session .jsonl.

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const HOME = os.homedir();
const ORCH_DIR = process.env.ORCH_DIR || path.join(HOME, ".orch");
const PRESENCE_DIR = path.join(ORCH_DIR, "agents");
const SPAWNED_PATH = path.join(ORCH_DIR, "spawned.jsonl");

// Registry of panes orch itself created. `close --all` may ONLY touch these —
// any pane/tab orch didn't create belongs to the user and is untouchable.
function recordSpawned(pane: string) {
  try {
    fs.mkdirSync(ORCH_DIR, { recursive: true });
    fs.appendFileSync(SPAWNED_PATH, JSON.stringify({ pane, ts: new Date().toISOString() }) + "\n");
  } catch {}
}
function spawnedPanes(): Set<string> {
  const s = new Set<string>();
  try {
    for (const line of fs.readFileSync(SPAWNED_PATH, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line);
        if (e.pane) s.add(e.pane);
      } catch {}
    }
  } catch {}
  return s;
}
const SETTINGS_PATH = path.join(HOME, ".pi", "agent", "settings.json");

const isTTY = process.stdout.isTTY;
const dim = (s: string) => (isTTY ? `\x1b[2m${s}\x1b[0m` : s);

// ---------- generic helpers ----------

function readJSON(p: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function collapse(s: string): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function truncate(s: string, n: number): string {
  s = String(s ?? "");
  if (s.length <= n) return s;
  return s.slice(0, Math.max(0, n - 1)) + "…";
}

function pidAlive(pid: number | undefined): boolean {
  if (!pid || !Number.isFinite(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    // EPERM means it exists but we can't signal it → alive.
    return e && e.code === "EPERM";
  }
}

// ---------- herdr ----------

function herdr(args: string[]): any | null {
  try {
    const out = execFileSync("herdr", args, {
      timeout: 3000,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const obj = JSON.parse(out);
    return obj && obj.result !== undefined ? obj.result : obj;
  } catch {
    return null;
  }
}

function herdrPanes(): any[] {
  const r = herdr(["pane", "list"]);
  return r && Array.isArray(r.panes) ? r.panes : [];
}

// `herdr pane list` omits agent names; `herdr agent list` carries them. Map pane_id → name.
function herdrNames(): Map<string, string> {
  const r = herdr(["agent", "list"]);
  const m = new Map<string, string>();
  if (r && Array.isArray(r.agents))
    for (const a of r.agents) if (a.pane_id && a.name) m.set(a.pane_id, a.name);
  return m;
}

function herdrTabs(): Map<string, any> {
  const r = herdr(["tab", "list"]);
  const m = new Map<string, any>();
  if (r && Array.isArray(r.tabs)) for (const t of r.tabs) m.set(t.tab_id, t);
  return m;
}

// ---------- settings / default model ----------

let _settings: any | undefined;
function settings(): any {
  if (_settings === undefined) _settings = readJSON(SETTINGS_PATH) || {};
  return _settings;
}

function defaultModelString(): string {
  const s = settings();
  const provider = s.defaultProvider || "openai-codex";
  const id = s.defaultModel || "unknown";
  const think = s.defaultThinkingLevel || "medium";
  return `${provider}/${id}:${think}`;
}

// ---------- presence ----------

interface PresenceEntry {
  key: string;
  dir: string;
  status: any | null;
  result: any | null;
  alive: boolean;
}

function loadPresence(): Map<string, PresenceEntry> {
  const m = new Map<string, PresenceEntry>();
  let keys: string[];
  try {
    keys = fs.readdirSync(PRESENCE_DIR);
  } catch {
    return m;
  }
  for (const key of keys) {
    const dir = path.join(PRESENCE_DIR, key);
    let st: fs.Stats;
    try {
      st = fs.statSync(dir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    const status = readJSON(path.join(dir, "status.json"));
    const result = readJSON(path.join(dir, "result.json"));
    const alive = pidAlive(status?.pid);
    m.set(key, { key, dir, status, result, alive });
  }
  return m;
}

// ---------- session .jsonl ----------

interface SessionData {
  exists: boolean;
  path: string;
  model: string | null; // id
  provider: string | null;
  thinking: string | null;
  task: string | null; // last user text
  lastAssistant: string | null; // last assistant text
  cost: number;
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
  turns: number;
  entries: any[];
}

function blockText(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b && typeof b === "object" && b.type === "text")
      .map((b) => b.text || "")
      .join("\n");
  }
  return "";
}

function parseSession(sessionPath: string | null): SessionData {
  const empty: SessionData = {
    exists: false,
    path: sessionPath || "",
    model: null,
    provider: null,
    thinking: null,
    task: null,
    lastAssistant: null,
    cost: 0,
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    turns: 0,
    entries: [],
  };
  if (!sessionPath) return empty;
  let raw: string;
  try {
    raw = fs.readFileSync(sessionPath, "utf8");
  } catch {
    return empty; // ENOENT etc — tolerate
  }
  const d: SessionData = { ...empty, exists: true, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, entries: [] };
  let lastModelChange: string | null = null;
  let lastThinkChange: string | null = null;
  let lastAsstModel: string | null = null;
  let lastAsstProvider: string | null = null;
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let e: any;
    try {
      e = JSON.parse(t);
    } catch {
      continue; // mid-write line
    }
    d.entries.push(e);
    if (e.type === "model_change") {
      lastModelChange = e.modelId || lastModelChange;
      if (e.provider) lastAsstProvider = e.provider;
      continue;
    }
    if (e.type === "thinking_level_change") {
      lastThinkChange = e.thinkingLevel || lastThinkChange;
      continue;
    }
    if (e.type === "message" && e.message) {
      const msg = e.message;
      if (msg.role === "user") {
        const txt = blockText(msg.content);
        if (txt.trim()) d.task = txt;
      } else if (msg.role === "assistant") {
        d.turns++;
        if (msg.model) lastAsstModel = msg.model;
        if (msg.provider) lastAsstProvider = msg.provider;
        const txt = blockText(msg.content);
        if (txt.trim()) d.lastAssistant = txt;
        const u = msg.usage;
        if (u) {
          d.tokens.input += u.input || 0;
          d.tokens.output += u.output || 0;
          d.tokens.cacheRead += u.cacheRead || 0;
          d.tokens.cacheWrite += u.cacheWrite || 0;
          const c = u.cost && typeof u.cost === "object" ? u.cost.total : u.cost;
          if (typeof c === "number") d.cost += c;
        }
      }
    }
  }
  d.model = lastModelChange || lastAsstModel;
  d.provider = lastAsstProvider;
  d.thinking = lastThinkChange;
  return d;
}

// ---------- merged entities ----------

interface Entity {
  key: string; // canonical key: pane_id for herdr panes, presence key otherwise
  paneId: string | null;
  name: string | null; // herdr agent name (from `herdr agent list`)
  tabLabel: string | null;
  agent: string | null; // pi | claude | null
  focused: boolean;
  herdrStatus: string | null;
  presence: PresenceEntry | null;
  sessionPath: string | null;
  presenceOnly: boolean;
}

function paneSessionPath(pane: any): string | null {
  const s = pane?.agent_session;
  if (s && s.kind === "path" && typeof s.value === "string") return s.value;
  return null;
}

function naturalPaneOrder(id: string): [string, number] {
  // "w6:p3" → ["w6", 3]
  const m = /^(.*?):p?(\d+)$/.exec(id);
  if (m) return [m[1], parseInt(m[2], 10)];
  return [id, 0];
}

function buildEntities(): Entity[] {
  const panes = herdrPanes();
  const tabs = herdrTabs();
  const names = herdrNames();
  const presence = loadPresence();
  const usedPresence = new Set<string>();

  const entities: Entity[] = [];

  for (const p of panes) {
    const paneId: string = p.pane_id;
    // Find matching presence entry: by key === pane_id or status.paneId === pane_id
    let pres: PresenceEntry | null = presence.get(paneId) || null;
    if (!pres) {
      for (const e of presence.values()) {
        if (e.status && e.status.paneId === paneId) {
          pres = e;
          break;
        }
      }
    }
    if (pres) usedPresence.add(pres.key);
    const tab = p.tab_id ? tabs.get(p.tab_id) : null;
    entities.push({
      key: paneId,
      paneId,
      name: names.get(paneId) || p.name || null,
      tabLabel: tab ? tab.label : null,
      agent: p.agent || null,
      focused: !!p.focused,
      herdrStatus: p.agent_status || null,
      presence: pres,
      sessionPath: paneSessionPath(p) || pres?.status?.sessionPath || null,
      presenceOnly: false,
    });
  }

  // presence-only entries (e.g. session-<pid> bare pi runs) not matched to a pane
  for (const e of presence.values()) {
    if (usedPresence.has(e.key)) continue;
    entities.push({
      key: e.key,
      paneId: e.status?.paneId || null,
      name: (e.status?.paneId && names.get(e.status.paneId)) || null,
      tabLabel: null,
      agent: "pi",
      focused: false,
      herdrStatus: null,
      presence: e,
      sessionPath: e.status?.sessionPath || null,
      presenceOnly: true,
    });
  }

  return entities;
}

// ---------- per-entity derived view ----------

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
  cost: number;
  ctxPercent: number | null;
  task: string;
  last: string;
  exited: boolean;
  session: SessionData | null;
}

function deriveView(ent: Entity): View {
  const pres = ent.presence;
  const isPi = ent.agent === "pi";
  const session = isPi ? parseSession(ent.sessionPath) : null;

  // ---- model ----
  let modelFull = "";
  if (pres?.status?.model && pres.status.model.id) {
    const m = pres.status.model;
    const think = pres.status.thinking || "";
    modelFull = `${m.provider || ""}/${m.id}${think ? ":" + think : ""}`;
  } else if (session && session.exists && session.model) {
    const prov = session.provider || "";
    const think = session.thinking || "";
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
      state = pres.status.asking ? "asking" : pres.status.state || "unknown";
    }
    // presence = live bridge → no fallback marker
  } else {
    // no live bridge → herdr status or session fallback
    state = ent.herdrStatus || (session && session.exists ? "idle" : "unknown");
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
  let task = "";
  if (pres?.status?.asking?.question) task = `Q: ${pres.status.asking.question}`;
  else if (pres?.status?.task) task = pres.status.task;
  else if (session?.task) task = session.task;

  let last = "";
  if (pres?.status?.lastText) last = pres.status.lastText;
  else if (pres?.result?.text) last = pres.result.text;
  else if (session?.lastAssistant) last = session.lastAssistant;

  const paneLabel = (ent.paneId || ent.key) + (ent.focused ? "*" : "");
  return {
    entity: ent,
    paneLabel,
    name: ent.name || "",
    tab: ent.tabLabel || "-",
    agent: ent.agent || "-",
    model,
    modelFull,
    state,
    stateFallback,
    cost,
    ctxPercent,
    task: collapse(task),
    last: collapse(last),
    exited,
    session,
  };
}

function sortEntities(entities: Entity[]): Entity[] {
  const herdr = entities.filter((e) => !e.presenceOnly);
  const only = entities.filter((e) => e.presenceOnly);
  herdr.sort((a, b) => {
    const [aw, an] = naturalPaneOrder(a.paneId || a.key);
    const [bw, bn] = naturalPaneOrder(b.paneId || b.key);
    if (aw !== bw) return aw < bw ? -1 : 1;
    return an - bn;
  });
  only.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return [...herdr, ...only];
}

// ---------- table rendering ----------

function renderTable(headers: string[], rows: string[][], caps: number[]): string {
  const widths = headers.map((h, i) => {
    let w = h.length;
    for (const r of rows) w = Math.max(w, (r[i] || "").length);
    return Math.min(w, caps[i] ?? Infinity);
  });
  const fmtRow = (cells: string[], raw?: string[]) =>
    cells
      .map((c, i) => {
        const cell = truncate(c, widths[i]);
        return cell.padEnd(widths[i]);
      })
      .join("  ")
      .replace(/\s+$/, "");
  const lines: string[] = [];
  lines.push(fmtRow(headers));
  lines.push(widths.map((w) => "─".repeat(w)).join("  ").replace(/\s+$/, ""));
  for (const r of rows) lines.push(fmtRow(r));
  return lines.join("\n");
}

// ---------- commands ----------

function cmdStatus(args: string[]) {
  const json = args.includes("--json");
  const all = args.includes("--all");
  const entities = sortEntities(buildEntities());
  const views = entities.map(deriveView);

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
  for (const v of visible) {
    rows.push([
      v.paneLabel,
      v.name,
      v.tab,
      v.agent,
      v.model,
      v.state + (v.stateFallback ? "†" : ""),
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

function cmdQuestions() {
  const names = new Map<string, string>();
  for (const ent of buildEntities()) {
    if (ent.name) {
      names.set(ent.key, ent.name);
      if (ent.paneId) names.set(ent.paneId, ent.name);
      if (ent.presence) names.set(ent.presence.key, ent.name);
    }
  }
  const pending = [...loadPresence().values()]
    .map((pres) => ({ pres, question: readJSON(path.join(pres.dir, "question.json")) }))
    .filter(({ question }) => question && typeof question.question === "string");
  if (!pending.length) {
    process.stdout.write("No pending questions.\n");
    return;
  }
  pending.sort((a, b) => a.pres.key.localeCompare(b.pres.key));
  process.stdout.write(
    pending
      .map(({ pres, question }) => `${pres.key}  ${names.get(pres.key) || "-"}  ${formatAge(question.ts)}\n${question.question}`)
      .join("\n\n") + "\n"
  );
}

function cmdAnswer(args: string[]) {
  const force = args.includes("--force");
  const positional = args.filter((arg) => arg !== "--force");
  const target = positional[0];
  const text = positional.slice(1).join(" ");
  if (!target || !text) die('usage: orch answer <target> "<text>" [--force]');
  const ent = resolveTarget(target);
  const questionPath = ent.presence ? path.join(ent.presence.dir, "question.json") : null;
  if (!force && (!questionPath || !fs.existsSync(questionPath)))
    die(`Target "${target}" requires a pending question. Use --force to answer anyway.`);
  if (!ent.presence) die(`Target "${target}" has no agent dir.`);
  fs.writeFileSync(path.join(ent.presence.dir, "answer.json"), JSON.stringify({ text, ts: new Date().toISOString() }) + "\n");
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
  pid: number | undefined;
}

function cmdEvents(args: string[]) {
  let statusFilter: Set<string> | null = null;
  let all = false;
  const targets: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--status") {
      statusFilter = new Set(
        args[++i]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    } else if (args[i] === "--all") all = true;
    else targets.push(args[i]);
  }
  if (!targets.length) all = true;

  const names = new Map<string, string>();
  for (const ent of buildEntities()) {
    if (ent.name) {
      names.set(ent.key, ent.name);
      if (ent.paneId) names.set(ent.paneId, ent.name);
      if (ent.presence) names.set(ent.presence.key, ent.name);
    }
  }

  const items = new Map<string, WatchItem>();
  const lastStates = new Map<string, string>();
  const watchers = new Map<string, fs.FSWatcher>();
  let safety: ReturnType<typeof setInterval> | undefined;

  function emit(item: WatchItem, state: string, st: any) {
    if (statusFilter && !statusFilter.has(state)) return;
    const name = item.name || "-";
    const cost =
      typeof st?.cost === "number" ? ` $${Number(st.cost).toFixed(2)}` : "";
    let detail = "";
    if (state === "error" || state === "aborted") {
      const err = truncate(collapse(String(st?.lastError ?? "")), 80);
      if (err) detail = ` ${err}`;
    } else {
      const task = truncate(collapse(st?.task || ""), 60);
      if (task) detail = ` ${task}`;
    }
    process.stdout.write(`${item.key} ${name} ${state}${cost}${detail}\n`);
  }

  function check(item: WatchItem) {
    const st = readJSON(path.join(item.dir, "status.json"));
    const pid = st?.pid ?? item.pid;
    let state: string | null = null;
    if (st?.state) state = String(st.state);
    if (!pidAlive(pid)) state = "exited";
    if (!state) return;
    const prev = lastStates.get(item.key);
    if (prev === state) return;
    lastStates.set(item.key, state);
    // Seed map on first observation without emitting historical noise.
    if (prev === undefined) return;
    emit(item, state, st);
  }

  function attach(item: WatchItem) {
    if (watchers.has(item.key)) return;
    const watcher = fs.watch(item.dir, (_event, filename) => {
      if (!filename || filename === "status.json") check(item);
    });
    watcher.on("error", () => {});
    watchers.set(item.key, watcher);
    check(item);
  }

  function scan() {
    // Refresh names for panes that appear mid-stream.
    for (const ent of buildEntities()) {
      if (ent.name) {
        names.set(ent.key, ent.name);
        if (ent.paneId) names.set(ent.paneId, ent.name);
        if (ent.presence) names.set(ent.presence.key, ent.name);
      }
    }
    if (all) {
      for (const pres of loadPresence().values()) {
        if (pres.alive && looksLikePaneKey(pres.key) && !items.has(pres.key)) {
          items.set(pres.key, {
            key: pres.key,
            dir: pres.dir,
            name: names.get(pres.key) || null,
            pid: pres.status?.pid,
          });
        }
      }
    }
    for (const item of items.values()) {
      if (!item.name) item.name = names.get(item.key) || null;
      attach(item);
      check(item);
    }
  }

  if (all) {
    for (const pres of loadPresence().values()) {
      if (pres.alive && looksLikePaneKey(pres.key)) {
        items.set(pres.key, {
          key: pres.key,
          dir: pres.dir,
          name: names.get(pres.key) || null,
          pid: pres.status?.pid,
        });
      }
    }
  }
  for (const target of targets) {
    const ent = resolveTarget(target);
    if (!ent.presence) die(`Target "${target}" has no agent dir to watch.`);
    items.set(ent.presence.key, {
      key: ent.presence.key,
      dir: ent.presence.dir,
      name: ent.name || names.get(ent.presence.key) || null,
      pid: ent.presence.status?.pid,
    });
  }
  if (!items.size && !all) die("No live pane agent dirs to stream.");

  function cleanup() {
    if (safety) clearInterval(safety);
    for (const watcher of watchers.values()) {
      try {
        watcher.close();
      } catch {}
    }
  }

  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });

  for (const item of items.values()) attach(item);
  safety = setInterval(scan, 5000);
  safety.unref?.();
}

// ---- target resolution ----

function resolveTarget(target: string): Entity {
  const entities = buildEntities();
  const exact = entities.filter(
    (e) => e.key === target || e.paneId === target || e.name === target
  );
  if (dedupeEntities(exact).length === 1) return dedupeEntities(exact)[0];
  if (dedupeEntities(exact).length > 1) ambiguous(target, dedupeEntities(exact));

  // suffix match on pane_id / key (e.g. "p3" → "w6:p3")
  const suffix = entities.filter((e) => {
    const ids = [e.key, e.paneId].filter(Boolean) as string[];
    return ids.some((id) => {
      const suffix = id.slice(id.lastIndexOf(":") + 1);
      return id === target || id.endsWith(":" + target) || suffix.startsWith(target) || id.endsWith(target);
    });
  });
  const uniq = dedupeEntities(suffix);
  if (uniq.length === 1) return uniq[0];
  if (uniq.length > 1) ambiguous(target, uniq);

  // agent-name match
  const byAgent = entities.filter((e) => e.agent === target);
  const uniqA = dedupeEntities(byAgent);
  if (uniqA.length === 1) return uniqA[0];
  if (uniqA.length > 1) ambiguous(target, uniqA);

  die(`No target matches "${target}". Run 'orch panes' to list.`);
  throw new Error("unreachable");
}

function dedupeEntities(list: Entity[]): Entity[] {
  const seen = new Set<string>();
  const out: Entity[] = [];
  for (const e of list) {
    if (seen.has(e.key)) continue;
    seen.add(e.key);
    out.push(e);
  }
  return out;
}

function ambiguous(target: string, list: Entity[]): never {
  process.stderr.write(`Ambiguous target "${target}". Candidates:\n`);
  for (const e of list)
    process.stderr.write(`  ${e.key}${e.tabLabel ? "  (" + e.tabLabel + ")" : ""}${e.agent ? "  " + e.agent : ""}\n`);
  process.exit(1);
}

// ---- result ----

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
      fs.mkdirSync(ent.presence.dir, { recursive: true });
    } catch {}
    const line = JSON.stringify({ text, ts: new Date().toISOString() }) + "\n";
    fs.appendFileSync(inbox, line);
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
    execFileSync("herdr", ["agent", "send", pane, text], { timeout: 3000, stdio: ["ignore", "pipe", "pipe"] });
    execFileSync("herdr", ["pane", "send-keys", pane, "Enter"], { timeout: 3000, stdio: ["ignore", "pipe", "pipe"] });
    process.stdout.write(`Sent to ${pane} via herdr.\n`);
  } catch (e: any) {
    die(`herdr send failed: ${e?.message || e}`);
  }
}

function requirePresenceTarget(target: string): Entity {
  const ent = resolveTarget(target);
  if (!ent.presence) die(`Target "${target}" has no agent dir.`);
  return ent;
}

function appendPresenceInbox(pres: PresenceEntry, entry: any) {
  fs.appendFileSync(path.join(pres.dir, "inbox.jsonl"), JSON.stringify(entry) + "\n");
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
  const name = block.name || "tool";
  const a = block.arguments || {};
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
  const ts = entry.timestamp || entry.message?.timestamp;
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
  if (!session.exists) die(`No session file for "${target}" (${ent.sessionPath || "unknown path"}).`);

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
      const tool = msg.toolName || "tool";
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

function cmdPanes() {
  const entities = sortEntities(buildEntities());
  for (const e of entities) {
    const parts = [
      e.paneId || e.key,
      e.name || "-",
      e.tabLabel || "-",
      e.agent || "-",
      e.herdrStatus || (e.presence?.status?.state ?? "-"),
      e.sessionPath || "-",
    ];
    process.stdout.write(parts.join("\t") + "\n");
  }
}

// ---- clean ----

function cmdClean() {
  const presence = loadPresence();
  const removed: string[] = [];
  for (const e of presence.values()) {
    if (!e.alive) {
      try {
        fs.rmSync(e.dir, { recursive: true, force: true });
        removed.push(`${e.key} (pid ${e.status?.pid ?? "?"})`);
      } catch (err: any) {
        process.stderr.write(`failed to remove ${e.dir}: ${err?.message || err}\n`);
      }
    }
  }
  if (removed.length) process.stdout.write("Removed dead agent dirs:\n" + removed.map((r) => "  " + r).join("\n") + "\n");
  else process.stdout.write("Nothing to clean — all agent dirs have live pids (or none exist).\n");
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
  const pkgRoot = path.resolve(path.dirname(fs.realpathSync(process.argv[1])), "..");
  const link = (src: string, dest: string) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.rmSync(dest, { recursive: true, force: true });
    if (copy) fs.cpSync(src, dest, { recursive: true });
    else fs.symlinkSync(src, dest);
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
  fs.mkdirSync(PRESENCE_DIR, { recursive: true });
  process.stdout.write(`  ${PRESENCE_DIR}\n`);

  process.stdout.write("pi extensions:\n");
  const extDir = path.join(HOME, ".pi", "agent", "extensions");
  for (const f of fs.readdirSync(path.join(pkgRoot, "extensions")))
    link(path.join(pkgRoot, "extensions", f), path.join(extDir, f));

  const skillsSrc = path.join(pkgRoot, "skills", "claude");
  if (fs.existsSync(skillsSrc)) {
    process.stdout.write("Claude Code skills:\n");
    for (const s of fs.readdirSync(skillsSrc)) {
      const dest = path.join(HOME, ".claude", "skills", s);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(path.join(skillsSrc, s), dest, { recursive: true });
      process.stdout.write(`  ${dest}\n`);
    }
  }
  const agentsSrc = path.join(pkgRoot, "agents");
  if (fs.existsSync(agentsSrc)) {
    process.stdout.write("Claude Code agents:\n");
    for (const a of fs.readdirSync(agentsSrc)) {
      const dest = path.join(HOME, ".claude", "agents", a);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.cpSync(path.join(agentsSrc, a), dest);
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
    if (resolved) {
      process.stdout.write(`  ok      ${name}  (${resolved})\n`);
      continue;
    }
    link(path.join(pkgRoot, rel), path.join(binDir, name));
  }

  process.stdout.write("Done. Open a herdr workspace and try: orch spawn 2 --tab Team1\n");
}

// ---- spawn / tile (geometry-driven tiler) ----

function herdrJSON(args: string[]): any {
  let out: string;
  try {
    out = execFileSync("herdr", args, {
      timeout: 5000,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e: any) {
    const detail = (e?.stderr || e?.stdout || e?.message || "").toString().trim();
    throw new Error(`herdr ${args.join(" ")} failed: ${detail}`);
  }
  let obj: any;
  try {
    obj = JSON.parse(out);
  } catch {
    throw new Error(`herdr ${args.join(" ")} returned non-JSON: ${out.slice(0, 200)}`);
  }
  return obj && obj.result !== undefined ? obj.result : obj;
}

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
function runAndName(pane: string, cmd: string, name: string) {
  try {
    execFileSync("herdr", ["pane", "run", pane, cmd], { timeout: 5000, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e: any) {
    process.stderr.write(`warning: run failed in ${pane}: ${(e?.stderr || e?.message || e).toString().trim()}\n`);
  }
  try {
    execFileSync("herdr", ["agent", "rename", pane, name], { timeout: 5000, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e: any) {
    process.stderr.write(`warning: rename ${pane}→${name} failed: ${(e?.stderr || e?.message || e).toString().trim()}\n`);
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
    names.get(p.pane_id) || "-",
    `${p.rect.width}x${p.rect.height} @${p.rect.x},${p.rect.y}`,
  ]);
  const w0 = Math.max(...rows.map((r) => r[0].length), 4);
  const w1 = Math.max(...rows.map((r) => r[1].length), 4);
  for (const r of rows)
    process.stdout.write(`  ${r[0].padEnd(w0)}  ${r[1].padEnd(w1)}  ${r[2]}\n`);
}

function cmdSpawn(args: string[]) {
  let label = "work";
  let cwd = process.cwd();
  let cmd = "pi";
  let workspace: string | null = null;
  let namePrefix: string | null = null;
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--tab") label = args[++i];
    else if (a === "--cwd") cwd = args[++i];
    else if (a === "--cmd") cmd = args[++i];
    else if (a === "--name") namePrefix = args[++i];
    else if (a === "--workspace") workspace = args[++i];
    else positional.push(a);
  }
  const n = parseInt(positional[0], 10);
  if (!Number.isFinite(n) || n < 1)
    die("usage: orch spawn <N> [--tab <label>] [--cwd <path>] [--cmd <command>] [--name <prefix>]");
  if (n > 8) die(`Refusing to spawn ${n} panes — cap is 8.`);
  const prefix = namePrefix || label;

  if (!workspace) workspace = herdrPanes()[0]?.workspace_id || null;
  if (!workspace) die("Could not determine workspace id (herdr down?). Pass --workspace <id>.");

  // 1. fresh tab, no focus — its root pane is agent #1.
  let root: string, tabLabel: string;
  try {
    const r = herdrJSON(["tab", "create", "--workspace", workspace, "--cwd", cwd, "--label", label, "--no-focus"]);
    root = r?.root_pane?.pane_id;
    tabLabel = r?.tab?.label || label;
    if (!root) throw new Error("no root_pane.pane_id");
  } catch (e: any) {
    die(`tab create failed: ${e?.message || e}`);
  }

  const created: { pane: string; name: string }[] = [];
  // agent #1 on the root pane
  runAndName(root!, cmd, `${prefix}-1`);
  recordSpawned(root!);
  created.push({ pane: root!, name: `${prefix}-1` });

  // agents #2..N: geometry-driven placement, one at a time (layout re-fetched each time).
  for (let i = 2; i <= n; i++) {
    try {
      const pane = placeOnePane(root!, cwd);
      runAndName(pane, cmd, `${prefix}-${i}`);
      recordSpawned(pane);
      created.push({ pane, name: `${prefix}-${i}` });
    } catch (e: any) {
      process.stderr.write(`warning: could not place agent #${i}: ${e?.message || e}\n`);
    }
  }

  for (const c of created) process.stdout.write(`${c.pane}  ${c.name}  [${tabLabel!}]  ${cmd}\n`);
  process.stdout.write(
    `\nSpawned ${created.length} named agent(s) on tab "${tabLabel!}" (no focus stolen).\n`
  );
  printLayout(root!, "\nFinal tiling:");
  process.stdout.write(`\nGive them a few seconds to boot, then 'orch status' will show them.\n`);
}

function cmdTile(args: string[]) {
  let cwd = process.cwd();
  let cmd = "pi";
  let name: string | null = null;
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--cwd") cwd = args[++i];
    else if (a === "--cmd") cmd = args[++i];
    else if (a === "--name") name = args[++i];
    else positional.push(a);
  }
  const target = positional[0];
  if (!target) die("usage: orch tile <tab-or-pane> [--name <name>] [--cmd <command>] [--cwd <path>]");

  // Resolve target to any pane on the intended tab.
  let refPane: string;
  if (/:t[0-9a-zA-Z]+$/.test(target)) {
    // a tab id (herdr numbers tabs base-36: t1..t9, tA, tB, …) → find a pane on it
    const p = herdrPanes().find((x) => x.tab_id === target);
    if (!p) die(`No panes found on tab "${target}".`);
    refPane = p.pane_id;
  } else {
    const ent = resolveTarget(target);
    if (!ent.paneId) die(`Target "${target}" has no herdr pane to tile onto.`);
    refPane = ent.paneId;
  }

  let layout;
  try {
    layout = paneLayout(refPane);
  } catch (e: any) {
    die(`could not read layout for ${refPane}: ${e?.message || e}`);
  }
  const autoName = name || `tile-${layout.panes.length + 1}`;

  let newPane: string;
  try {
    newPane = placeOnePane(refPane, cwd);
  } catch (e: any) {
    die(`tile failed: ${e?.message || e}`);
  }
  runAndName(newPane, cmd, autoName);
  recordSpawned(newPane);
  process.stdout.write(`Added ${newPane} (${autoName}) to tab ${layout.tab_id} running "${cmd}".\n`);
  printLayout(refPane, "\nFinal tiling:");
}

// ---- unified pane control: run / model / wait / new / close / dispatch ----

function sleepMs(ms: number) {
  try {
    execFileSync("sleep", [String(ms / 1000)], { stdio: "ignore" });
  } catch {}
}

function resolvePane(target: string): { ent: Entity; pane: string } {
  const ent = resolveTarget(target);
  if (!ent.paneId) die(`Target "${target}" has no herdr pane.`);
  return { ent, pane: ent.paneId };
}

function paneStatus(pane: string): string | null {
  const p = herdrPanes().find((x) => x.pane_id === pane);
  return p ? p.agent_status || null : null;
}

function readPaneModel(pane: string): string | null {
  const st = readJSON(path.join(PRESENCE_DIR, pane, "status.json"));
  if (st && st.model && st.model.id) {
    const th = st.thinking ? ":" + st.thinking : "";
    return `${st.model.provider || ""}/${st.model.id}${th}`;
  }
  return null;
}

function herdrBestEffort(args: string[]): boolean {
  try {
    execFileSync("herdr", args, { timeout: 8000, stdio: ["ignore", "pipe", "pipe"] });
    return true;
  } catch (e: any) {
    process.stderr.write(`warning: herdr ${args.join(" ")} failed: ${(e?.stderr || e?.message || e).toString().trim()}\n`);
    return false;
  }
}

const WORKER_PROMPT_HEADER = "[orch worker] No human watches this pane. For any decision you cannot make yourself, call orch_ask and wait for the orchestrator. NEVER use ask-user/question tools.";

function workerPrompt(prompt: string, raw: boolean): string {
  return raw ? prompt : `${WORKER_PROMPT_HEADER}\n\n${prompt}`;
}

// Dispatch a prompt to a pane's pi; nudge Enter if the composer didn't submit. Returns final status.
function doRun(pane: string, prompt: string): string | null {
  herdrBestEffort(["pane", "run", pane, prompt]);
  // give it up to ~3s to go working
  try {
    execFileSync("herdr", ["wait", "agent-status", pane, "--status", "working", "--timeout", "3000"], {
      timeout: 4000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {}
  let st = paneStatus(pane);
  if (st === "idle") {
    // TUI composer race — nudge Enter once and re-check
    herdrBestEffort(["pane", "send-keys", pane, "Enter"]);
    try {
      execFileSync("herdr", ["wait", "agent-status", pane, "--status", "working", "--timeout", "3000"], {
        timeout: 4000,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch {}
    st = paneStatus(pane);
  }
  return st;
}

function cmdRun(args: string[]) {
  const raw = args.includes("--raw");
  const positional = args.filter((arg) => arg !== "--raw");
  const target = positional[0];
  const prompt = positional.slice(1).join(" ");
  if (!target || !prompt) die('usage: orch run <target> "<prompt>" [--raw]');
  const { pane } = resolvePane(target);
  const st = doRun(pane, workerPrompt(prompt, raw));
  process.stdout.write(`Dispatched to ${pane} → status: ${st || "unknown"}\n`);
}

// Set a pane's model via the bridge inbox (pi.setModel/pi.setThinkingLevel),
// then verify via presence status.json. Never types /model into the TUI: a
// non-matching search string opens pi's model-selector overlay and wedges the pane.
function doModel(pane: string, modelArg: string): { old: string | null; now: string | null } {
  const old = readPaneModel(pane);
  const dir = path.join(PRESENCE_DIR, pane);
  if (!fs.existsSync(path.join(dir, "status.json"))) {
    die(`${pane}: no orchestrator-bridge agent dir — restart pi in that pane, then retry.`);
  }
  const colon = modelArg.lastIndexOf(":");
  const slash = modelArg.indexOf("/");
  const hasThinking = colon > slash && colon !== -1;
  const model = hasThinking ? modelArg.slice(0, colon) : modelArg;
  const thinking = hasThinking ? modelArg.slice(colon + 1) : null;
  const inbox = path.join(dir, "inbox.jsonl");
  let lines = JSON.stringify({ cmd: "model", model, ts: new Date().toISOString() }) + "\n";
  if (thinking) lines += JSON.stringify({ cmd: "thinking", level: thinking, ts: new Date().toISOString() }) + "\n";
  fs.appendFileSync(inbox, lines);
  sleepMs(2500);
  const now = readPaneModel(pane);
  return { old, now };
}

function cmdModel(args: string[]) {
  const target = args[0];
  const modelArg = args[1];
  if (!target || !modelArg) die("usage: orch model <target> <provider/model[:thinking]>");
  const { pane } = resolvePane(target);
  const { old, now } = doModel(pane, modelArg);
  if (now) {
    const changed = old !== now;
    process.stdout.write(`${pane}: ${old || "(unknown)"} → ${now}${changed ? "" : "  (unchanged — bridge may lag or model rejected)"}\n`);
  } else {
    process.stdout.write(
      `${pane}: sent "/model ${modelArg}". Could not verify via agent dir (no bridge/status.json yet).\n`
    );
  }
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
    execFileSync("herdr", ["wait", "agent-status", pane, "--status", status, "--timeout", String(timeout)], {
      timeout: timeout + 5000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    process.stdout.write(`${pane} reached "${status}".\n`);
  } catch (e: any) {
    die(`wait for ${pane} → "${status}" failed/timed out: ${(e?.stderr || e?.message || e).toString().trim()}`);
  }
}

function cmdNew(args: string[]) {
  const target = args[0];
  if (!target) die("usage: orch new <target>");
  const { pane } = resolvePane(target);
  herdrBestEffort(["pane", "run", pane, "/new"]);
  process.stdout.write(`Cleared session on ${pane} (/new).\n`);
}

function paneForeground(pane: string): string[] {
  try {
    const out = execFileSync("herdr", ["pane", "process-info", "--pane", pane], {
      timeout: 5000, stdio: ["ignore", "pipe", "pipe"],
    }).toString();
    const info = JSON.parse(out);
    return (info?.result?.process_info?.foreground_processes || []).map((x: any) => String(x.name));
  } catch {
    return [];
  }
}

// Reload extensions in place. Escape first dismisses any stuck overlay; the
// bridge must refresh status.json while retaining its process pid.
function doReload(pane: string): boolean {
  const statusPath = path.join(PRESENCE_DIR, pane, "status.json");
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
  const statusPath = path.join(PRESENCE_DIR, pane, "status.json");
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
  const all = args.includes("--all");
  const stream = args.includes("--stream");
  const positional = args.filter((a) => a !== "--all" && a !== "--stream");
  if (!all && !positional.length) die("usage: orch close <target>... | --all [--stream]");
  const targets: string[] = [];
  if (all) {
    // ONLY panes orch itself created (spawned.jsonl). Panes/tabs the user opened
    // are never touched, no matter what.
    const self = process.env.HERDR_PANE_ID || null;
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
    screen = execFileSync("herdr", ["pane", "read", pane, "--source", "visible", "--lines", String(n)], {
      timeout: 5000,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e: any) {
    die(`Could not read ${pane}: ${(e?.stderr || e?.message || e).toString().trim()}`);
  }
  process.stdout.write("screen (eyeball only — status/result/tail are the truth channel)\n");
  process.stdout.write(screen.endsWith("\n") ? screen : screen + "\n");
}

// ---- tab CRUD ----

function resolveTab(idOrLabel: string): any {
  const tabs = [...herdrTabs().values()];
  if (!tabs.length) die("No tabs (herdr down?).");
  const byId = tabs.filter((t) => t.tab_id === idOrLabel);
  if (byId.length === 1) return byId[0];
  const byLabel = tabs.filter((t) => (t.label || "") === idOrLabel);
  if (byLabel.length === 1) return byLabel[0];
  const byLabelCI = tabs.filter((t) => (t.label || "").toLowerCase() === idOrLabel.toLowerCase());
  if (byLabelCI.length === 1) return byLabelCI[0];
  if (byLabel.length > 1 || byLabelCI.length > 1) {
    process.stderr.write(`Ambiguous tab "${idOrLabel}". Candidates:\n`);
    for (const t of byLabel.length > 1 ? byLabel : byLabelCI)
      process.stderr.write(`  ${t.tab_id}  ${t.label}\n`);
    process.exit(1);
  }
  die(`No tab matches "${idOrLabel}". Run 'orch tabs' to list.`);
}

function cmdTabs() {
  const tabs = [...herdrTabs().values()];
  if (!tabs.length) {
    process.stdout.write("No tabs (herdr down?).\n");
    return;
  }
  const headers = ["TAB", "LABEL", "NUM", "PANES", "STATUS"];
  const rows = tabs.map((t) => [
    t.tab_id + (t.focused ? "*" : ""),
    t.label || "-",
    String(t.number ?? "-"),
    String(t.pane_count ?? "-"),
    t.agent_status || "-",
  ]);
  process.stdout.write(renderTable(headers, rows, [12, 20, 4, 5, 10]) + "\n");
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
    if (!workspace) workspace = herdrPanes()[0]?.workspace_id || null;
    if (!workspace) die("Could not determine workspace id (herdr down?). Pass --workspace <id>.");
    const cargs = ["tab", "create", "--workspace", workspace, "--cwd", cwd, "--no-focus"];
    if (label) cargs.push("--label", label);
    try {
      const r = herdrJSON(cargs);
      process.stdout.write(
        `Created tab ${r?.tab?.tab_id} "${r?.tab?.label}" — root pane ${r?.root_pane?.pane_id}\n`
      );
    } catch (e: any) {
      die(`tab new failed: ${e?.message || e}`);
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
    die(`move failed: ${e?.message || e}`);
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
    die(`workspace list failed: ${e?.message || e}`);
  }
  const wss = r?.workspaces || [];
  if (!wss.length) {
    process.stdout.write("No workspaces.\n");
    return;
  }
  const headers = ["WS", "LABEL", "NUM", "TABS", "PANES", "STATUS"];
  const rows = wss.map((w: any) => [
    w.workspace_id + (w.focused ? "*" : ""),
    w.label || "-",
    String(w.number ?? "-"),
    String(w.tab_count ?? "-"),
    String(w.pane_count ?? "-"),
    w.agent_status || "-",
  ]);
  process.stdout.write(renderTable(headers, rows, [8, 24, 4, 5, 6, 10]) + "\n");
}

function cmdDispatch(args: string[]) {
  const raw = args.includes("--raw");
  const commandArgs = args.filter((arg) => arg !== "--raw");
  let model: string | null = null;
  let doWait = false;
  let thenTarget: string | null = null;
  let thenNote = "";
  const positional: string[] = [];
  for (let i = 0; i < commandArgs.length; i++) {
    if (commandArgs[i] === "--model") model = commandArgs[++i];
    else if (commandArgs[i] === "--wait") doWait = true;
    else if (commandArgs[i] === "--then") {
      thenTarget = commandArgs[++i] || null;
      thenNote = commandArgs.slice(i + 1).join(" ");
      break;
    } else positional.push(commandArgs[i]);
  }
  const target = positional[0];
  const prompt = positional.slice(1).join(" ");
  if (!target || !prompt) die('usage: orch dispatch <target> "<prompt>" [--raw] [--model provider/id:think] [--wait] [--then <dst> ["note"]]');
  const { ent, pane } = resolvePane(target);
  const destination = thenTarget ? requirePresenceTarget(thenTarget) : null;
  if (thenTarget && !ent.presence) die(`Target "${target}" has no agent dir for --then.`);

  if (model) {
    const { old, now } = doModel(pane, model);
    process.stdout.write(`model: ${old || "(unknown)"} → ${now || "(sent, unverified)"}\n`);
  }
  const st = doRun(pane, workerPrompt(prompt, raw));
  process.stdout.write(`Dispatched to ${pane} → status: ${st || "unknown"}\n`);
  if (destination) {
    appendPresenceInbox(ent.presence!, {
      cmd: "on_done",
      target: destination.presence!.key,
      note: thenNote,
      ts: new Date().toISOString(),
    });
  }

  if (doWait) {
    try {
      execFileSync("herdr", ["wait", "agent-status", pane, "--status", "done", "--timeout", "300000"], {
        timeout: 305000,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (e: any) {
      process.stderr.write(`warning: wait done failed: ${(e?.stderr || e?.message || e).toString().trim()}\n`);
    }
    process.stdout.write(`\n--- result ---\n`);
    cmdResult([pane]);
  }
}

// ---- help ----

function usage() {
  process.stdout.write(
    `orch — the single controller for pi agents in herdr panes.
The orchestrator never needs raw herdr for the normal loop.

OBSERVE
  orch status [--json] [--all]   Glanceable table of every pane (default command).
  orch questions                 List pending agent questions.
  orch events [--all] [target ...] [--status s[,s…]]
                                 Continuous stream of pane state transitions (forever).

DISPATCH WORK
  orch run <target> "<prompt>" [--raw]
                                 Send a prompt with the worker header (or exact prompt with --raw).
  orch dispatch <target> "<prompt>" [--raw] [--model provider/id:think] [--wait] [--then <dst> ["note"]]
                                 One-shot: optional model set, run, wait, or forward its result on done.
  orch answer <target> "<text>" [--force]
                                 Answer a pending question (--force permits a missing question.json).
  orch pipe <src> <dst> ["instruction"]
                                 Send a completed result to another agent's inbox.
  orch broadcast "<text>" [target ...|--all]
                                 Steer named targets, or every live pane agent by default.
  orch model <target> <provider/model[:thinking]>
                                 Switch a pane's model via the bridge inbox; prints old → new.
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
  orch spawn <N> [--tab L] [--cwd P] [--cmd C] [--name PREFIX]
                                 Fresh tab with N balanced-tiled named agents (2=side-by-side,
                                 3=2+1, 4=2x2, …; cap 8). Names <prefix>-1..N.
  orch tile <tab|pane> [--name X] [--cmd C] [--cwd P]
                                 Add ONE pane to an existing tab, split into its largest cell.
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
  orch clean                     Delete agent dirs whose pid is dead.
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

// ---------- errors ----------

function die(msg: string): never {
  process.stderr.write(msg + "\n");
  process.exit(1);
}

// ---------- main ----------

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const rest = argv.slice(1);
  switch (cmd) {
    case undefined:
    case "status":
      cmdStatus(cmd === undefined ? argv : rest);
      break;
    case "events":
      cmdEvents(rest);
      break;
    case "questions":
      cmdQuestions();
      break;
    case "answer":
      cmdAnswer(rest);
      break;
    case "result":
      cmdResult(rest);
      break;
    case "steer":
      cmdSteer(rest);
      break;
    case "pipe":
      cmdPipe(rest);
      break;
    case "broadcast":
      cmdBroadcast(rest);
      break;
    case "tail":
      cmdTail(rest);
      break;
    case "session":
      cmdSession(rest);
      break;
    case "panes":
      cmdPanes();
      break;
    case "spawn":
      cmdSpawn(rest);
      break;
    case "tile":
      cmdTile(rest);
      break;
    case "run":
      cmdRun(rest);
      break;
    case "model":
      cmdModel(rest);
      break;
    case "wait":
      cmdWait(rest);
      break;
    case "dispatch":
      cmdDispatch(rest);
      break;
    case "new":
      cmdNew(rest);
      break;
    case "restart":
      cmdRestart(rest);
      break;
    case "rename":
      cmdRename(rest);
      break;
    case "close":
    case "kill":
      cmdClose(rest);
      break;
    case "abort":
      cmdAbort(rest);
      break;
    case "keys":
      cmdKeys(rest);
      break;
    case "peek":
      cmdPeek(rest);
      break;
    case "tabs":
      cmdTabs();
      break;
    case "tab":
      cmdTab(rest);
      break;
    case "focus":
      cmdFocus(rest);
      break;
    case "zoom":
      cmdZoom(rest);
      break;
    case "move":
      cmdMove(rest);
      break;
    case "ws":
      cmdWs(rest);
      break;
    case "clean":
      cmdClean();
      break;
    case "setup":
      void cmdSetup(rest).catch((e) => die(String(e?.message || e)));
      break;
    case "help":
    case "-h":
    case "--help":
      usage();
      break;
    default:
      // maybe they meant `status --flag`? treat unknown leading flag as status
      if (cmd.startsWith("--")) {
        cmdStatus(argv);
      } else {
        process.stderr.write(`Unknown command: ${cmd}\n\n`);
        usage();
        process.exit(1);
      }
  }
}

main();
