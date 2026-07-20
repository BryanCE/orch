import * as path from "node:path";
import { loadConfig } from "../config.ts";
import { collapse, buildEntities, resolveTarget, scopeEntitiesToWorkspace, workspaceOf } from "../entities.ts";
import { loadPresence, orchDir, readJSON, type PresenceEntry } from "../store.ts";
import { isRecord, truncate } from "../util.ts";
import { renderTable } from "../table.ts";
import { runRemoteAsync, runSSH } from "../remote.ts";
import { parseSession, type SessionEntry, type ToolCallContentBlock, blockText, isToolCallContentBlock } from "../session.ts";
import { die, remoteCommandArgs, resultText, splitOptionFlags, targetHost } from "./target.ts";
import { entityAdapter } from "./status.ts";

interface QuestionRow { key: string; name: string | null; age: string; question: string; workspace?: string; host?: string; warning?: string }

interface QuestionPayload { ts?: unknown; question: string }


export function cmdResult(args: string[]) {
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
  // fallback: adapter-extracted final text from the native session tail
  const adapter = entityAdapter(ent);
  const extractInput = { key: ent.key, sessionPath: ent.sessionPath ?? undefined };
  const text = adapter?.extractResult(extractInput);
  if (text) {
    process.stderr.write("(no result.json — falling back to adapter-extracted session text)\n");
    if (json) {
      const sview = adapter?.caps.sessionTail
        ? adapter.readSessionView?.({ sessionPath: ent.sessionPath ?? undefined })
        : undefined;
      process.stdout.write(
        JSON.stringify(
          {
            text,
            task: sview?.task ?? null,
            model: sview?.model ?? null,
            thinking: sview?.thinking ?? null,
            tokens: sview?.tokens ?? null,
            cost: sview?.cost ?? null,
            turns: sview?.turns ?? null,
            sessionPath: ent.sessionPath,
          },
          null,
          2
        ) + "\n"
      );
    } else process.stdout.write(text + "\n");
    return;
  }
  die(`No result available for "${target}" (no result.json and no adapter-extractable session text).`);
}

export async function cmdQuestions(args: string[]): Promise<void> {
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

export function formatAge(ts: unknown): string {
  const when = new Date(typeof ts === "string" ? ts : JSON.stringify(ts) ?? "").getTime();
  if (!Number.isFinite(when)) return "?";
  const seconds = Math.max(0, Math.floor((Date.now() - when) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function isQuestionPayload(value: unknown): value is QuestionPayload {
  return isRecord(value) && typeof value.question === "string";
}

export function questionText(value: unknown): string {
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

export function cmdTail(args: string[]) {
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

export function cmdSession(args: string[]) {
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

