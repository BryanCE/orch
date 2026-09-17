import type { OrchDir } from "../types/core.ts";
import { asc, eq } from "drizzle-orm";
import { orm, queueWrite } from "./connection.ts";
import { agentStatus } from "../db/schema.ts";
import type { StatusPatch } from "../types/presence.ts";

export type AgentStatusRow = typeof agentStatus.$inferSelect;

export function selectAgentStatus(orchDir: OrchDir, agentId: string): AgentStatusRow | undefined {
  return orm(orchDir).select().from(agentStatus).where(eq(agentStatus.agentId, agentId)).get();
}

export function selectAgentStatuses(orchDir: OrchDir): AgentStatusRow[] {
  return orm(orchDir).select().from(agentStatus).orderBy(asc(agentStatus.agentId)).all();
}

function keepOrNull<T>(value: T | null | undefined, previous: T | null | undefined): T | null {
  if (value !== undefined) return value;
  return previous === undefined ? null : previous;
}

export function mergeAgentStatus(
  orchDir: OrchDir,
  agentId: string,
  previous: AgentStatusRow | undefined,
  patch: StatusPatch,
  now: number,
): AgentStatusRow {
  const state = patch.state ?? previous?.state ?? "idle";

  const modelProvider = patch.model === undefined
    ? previous?.modelProvider ?? null
    : patch.model === null ? null : patch.model.provider;
  const modelId = patch.model === undefined
    ? previous?.modelId ?? null
    : patch.model === null ? null : patch.model.id;

  const tokensIn = patch.tokens === undefined
    ? previous?.tokensIn ?? null
    : patch.tokens === null ? null : patch.tokens.input;
  const tokensOut = patch.tokens === undefined
    ? previous?.tokensOut ?? null
    : patch.tokens === null ? null : patch.tokens.output;
  const cacheRead = patch.tokens === undefined
    ? previous?.cacheRead ?? null
    : patch.tokens === null ? null : patch.tokens.cacheRead;
  const cacheWrite = patch.tokens === undefined
    ? previous?.cacheWrite ?? null
    : patch.tokens === null ? null : patch.tokens.cacheWrite;

  const contextTokens = patch.context === undefined
    ? previous?.contextTokens ?? null
    : patch.context === null ? null : patch.context.tokens;
  const contextPercent = patch.context === undefined
    ? previous?.contextPercent ?? null
    : patch.context === null
      ? null
      : patch.context.percent === undefined ? previous?.contextPercent ?? null : patch.context.percent;

  const filesTouched = patch.filesTouched === undefined
    ? previous?.filesTouched ?? null
    : patch.filesTouched === null ? null : JSON.stringify(patch.filesTouched);

  const values: AgentStatusRow = {
    agentId,
    state,
    lastError: keepOrNull(patch.lastError, previous?.lastError),
    modelProvider,
    modelId,
    thinking: keepOrNull(patch.thinking, previous?.thinking),
    task: keepOrNull(patch.task, previous?.task),
    dispatchId: keepOrNull(patch.dispatchId, previous?.dispatchId),
    lastText: keepOrNull(patch.lastText, previous?.lastText),
    currentFile: keepOrNull(patch.currentFile, previous?.currentFile),
    filesTouched,
    tokensIn,
    tokensOut,
    cacheRead,
    cacheWrite,
    cost: keepOrNull(patch.cost, previous?.cost),
    contextTokens,
    contextPercent,
    turns: keepOrNull(patch.turns, previous?.turns),
    sessionPath: keepOrNull(patch.sessionPath, previous?.sessionPath),
    sessionId: keepOrNull(patch.sessionId, previous?.sessionId),
    project: keepOrNull(patch.project, previous?.project),
    extensionHash: keepOrNull(patch.extensionHash, previous?.extensionHash),
    startedAt: keepOrNull(patch.startedAt, previous?.startedAt),
    finishedAt: keepOrNull(patch.finishedAt, previous?.finishedAt),
    updatedAt: now,
    blockedMessage: keepOrNull(patch.blockedMessage, previous?.blockedMessage),
  };
  queueWrite(orchDir, (db) => {
    db.insert(agentStatus).values(values).onConflictDoUpdate({ target: agentStatus.agentId, set: values }).run();
  });
  return values;
}

export function deleteAgentStatus(orchDir: OrchDir, agentId: string): void {
  queueWrite(orchDir, (db) => {
    db.delete(agentStatus).where(eq(agentStatus.agentId, agentId)).run();
  });
}

export function filesTouchedOf(row: AgentStatusRow): string[] {
  if (row.filesTouched === null) return [];
  try {
    const parsed: unknown = JSON.parse(row.filesTouched);
    if (!Array.isArray(parsed)) return [];
    const files: string[] = [];
    for (const value of parsed) {
      if (typeof value !== "string") return [];
      files.push(value);
    }
    return files;
  } catch {
    return [];
  }
}
