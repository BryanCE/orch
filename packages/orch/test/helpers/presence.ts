import type { OrchDir } from "../../src/types/core.ts";
import { isAgentState } from "../../src/agent-state.ts";
import { isAdapterId } from "../../src/adapters/adapter.ts";
import { agentById } from "../../src/store/agent-rows.ts";
import { mergeAgentStatus } from "../../src/store/status-rows.ts";
import type { AgentStatusRow } from "../../src/store/status-rows.ts";
import { isRecord } from "../../src/util.ts";
import { seedAgent } from "./agent.ts";
import type { PresenceEntry, StatusPatch } from "../../src/types/presence.ts";

function stringField(status: Record<string, unknown>, name: string): string | null | undefined {
  const value = status[name];
  return value === null || typeof value === "string" ? value : undefined;
}

function numberField(status: Record<string, unknown>, name: string): number | null | undefined {
  const value = status[name];
  return value === null || typeof value === "number" ? value : undefined;
}

function instantField(status: Record<string, unknown>, name: string): number | null | undefined {
  const value = status[name];
  if (value === null || typeof value === "number") return value;
  if (typeof value !== "string") return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function modelField(status: Record<string, unknown>): StatusPatch["model"] {
  const value = status.model;
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const provider = value.provider;
  const id = value.id;
  return typeof provider === "string" && typeof id === "string" ? { provider, id } : undefined;
}

function tokensField(status: Record<string, unknown>): StatusPatch["tokens"] {
  const value = status.tokens;
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const input = value.input;
  const output = value.output;
  const cacheRead = value.cacheRead;
  const cacheWrite = value.cacheWrite;
  return typeof input === "number" && typeof output === "number" && typeof cacheRead === "number" && typeof cacheWrite === "number"
    ? { input, output, cacheRead, cacheWrite }
    : undefined;
}

function contextField(status: Record<string, unknown>): StatusPatch["context"] {
  const value = status.context;
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const tokens = value.tokens;
  const percent = value.percent;
  if (typeof tokens === "number" && (percent === undefined || percent === null || typeof percent === "number")) {
    return { tokens, percent };
  }
  return typeof percent === "number" ? { tokens: 0, percent } : undefined;
}

function filesTouchedField(status: Record<string, unknown>): readonly string[] | null | undefined {
  const value = status.filesTouched;
  if (value === null) return null;
  if (!Array.isArray(value) || !value.every((entry): entry is string => typeof entry === "string")) return undefined;
  return value;
}

function statusPatch(status: Record<string, unknown>): StatusPatch {
  const patch: StatusPatch = {};
  const state = status.state;
  if (isAgentState(state)) patch.state = state;
  const model = modelField(status);
  if (model !== undefined) patch.model = model;
  const tokens = tokensField(status);
  if (tokens !== undefined) patch.tokens = tokens;
  const context = contextField(status);
  if (context !== undefined) patch.context = context;
  const filesTouched = filesTouchedField(status);
  if (filesTouched !== undefined) patch.filesTouched = filesTouched;
  for (const name of ["lastError", "thinking", "task", "dispatchId", "lastText", "currentFile", "sessionPath", "sessionId", "project", "extensionHash", "blockedMessage"] as const) {
    const value = stringField(status, name);
    if (value !== undefined) patch[name] = value;
  }
  for (const name of ["cost", "turns", "startedAt", "finishedAt"] as const) {
    const value = name === "startedAt" || name === "finishedAt" ? instantField(status, name) : numberField(status, name);
    if (value !== undefined) patch[name] = value;
  }
  return patch;
}

/** Seed a status row and return its agent key. */
export function seedStatus(root: OrchDir, key: string, status: Record<string, unknown>): string {
  if (agentById(root, key) === null) {
    const adapter = isAdapterId(status.agent) ? status.agent : undefined;
    seedAgent(key, adapter === undefined ? {} : { adapter }, root);
  }
  mergeAgentStatus(root, key, statusPatch(status), Date.now());
  return key;
}

/** Build a complete status row for tests that consume composed entities. */
export function statusRow(overrides: Partial<AgentStatusRow> & { agentId: string }): AgentStatusRow {
  const { agentId, ...rest } = overrides;
  return {
    agentId,
    state: "idle",
    lastError: null,
    modelProvider: null,
    modelId: null,
    thinking: null,
    task: null,
    dispatchId: null,
    lastText: null,
    currentFile: null,
    filesTouched: null,
    tokensIn: null,
    tokensOut: null,
    cacheRead: null,
    cacheWrite: null,
    cost: null,
    contextTokens: null,
    contextPercent: null,
    turns: null,
    sessionPath: null,
    sessionId: null,
    project: null,
    extensionHash: null,
    startedAt: null,
    finishedAt: null,
    updatedAt: Date.now(),
    blockedMessage: null,
    ...rest,
  };
}

/** Build a complete in-memory presence entry for tests that consume composed entities. */
export function presenceEntryFixture(overrides: Partial<PresenceEntry> = {}): PresenceEntry {
  return {
    key: "agent0001",
    alive: true,
    result: "done",
    status: null,
    ...overrides,
  };
}
