import { z } from "zod";
import type { AgentEnvironment, AgentHolder, AgentTuning, AgentView, RunRecord } from "../../types/store.ts";
import type { PresenceEntry } from "../../types/presence.ts";
import type { AgentStatusRow } from "../../store/status-rows.ts";
import type { Entity } from "../../types/core.ts";

// Keys mirror ENVIRONMENT_AXES in src/store/agent-view.ts; explicit fields keep
// the required Record keys visible to Zod's inferred output type.
const AGENT_ENVIRONMENT = z.object({
  plexer: z.string().nullable(),
  handle: z.string().nullable(),
  space: z.string().nullable(),
  worktree: z.string().nullable(),
  branch: z.string().nullable(),
}) satisfies z.ZodType<AgentEnvironment>;

const AGENT_HOLDER = z.object({
  orchId: z.string(),
  since: z.number(),
}) satisfies z.ZodType<AgentHolder>;

const AGENT_TUNING = z.object({
  model: z.string().nullable(),
  thinking: z.string().nullable(),
}) satisfies z.ZodType<AgentTuning>;

export const AGENT_STATUS_ROW = z.object({
  agentId: z.string(),
  state: z.string(),
  lastError: z.string().nullable(),
  modelProvider: z.string().nullable(),
  modelId: z.string().nullable(),
  thinking: z.string().nullable(),
  task: z.string().nullable(),
  dispatchId: z.string().nullable(),
  lastText: z.string().nullable(),
  currentFile: z.string().nullable(),
  filesTouched: z.string().nullable(),
  tokensIn: z.number().nullable(),
  tokensOut: z.number().nullable(),
  cacheRead: z.number().nullable(),
  cacheWrite: z.number().nullable(),
  cost: z.number().nullable(),
  contextTokens: z.number().nullable(),
  contextPercent: z.number().nullable(),
  turns: z.number().nullable(),
  sessionPath: z.string().nullable(),
  sessionId: z.string().nullable(),
  project: z.string().nullable(),
  extensionHash: z.string().nullable(),
  startedAt: z.number().nullable(),
  finishedAt: z.number().nullable(),
  updatedAt: z.number(),
  blockedMessage: z.string().nullable(),
}) satisfies z.ZodType<AgentStatusRow>;

export const PRESENCE_ENTRY = z.object({
  key: z.string(),
  status: AGENT_STATUS_ROW.nullable(),
  result: z.string().nullable(),
  alive: z.boolean(),
}) satisfies z.ZodType<PresenceEntry>;

export const AGENT_VIEW = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string().nullable(),
  harnessId: z.string(),
  cwd: z.string(),
  createdAt: z.number(),
  spawnedBy: z.string().nullable(),
  spawnedByName: z.string().nullable(),
  rootAgentId: z.string(),
  heldBy: AGENT_HOLDER.nullable(),
  environment: AGENT_ENVIRONMENT,
  tuning: AGENT_TUNING,
  endedAt: z.number().nullable(),
}) satisfies z.ZodType<AgentView>;

export const ENTITY = z.object({
  key: z.string(),
  paneId: z.string().nullable(),
  managed: z.boolean(),
  name: z.string().nullable(),
  tabLabel: z.string().nullable(),
  agent: z.string().nullable(),
  focused: z.boolean(),
  backendStatus: z.string().nullable(),
  backend: z.string().nullable(),
  presence: PRESENCE_ENTRY.nullable(),
  sessionPath: z.string().nullable(),
  presenceOnly: z.boolean(),
  ended: z.boolean(),
  space: z.string().nullable(),
  host: z.string().optional(),
}) satisfies z.ZodType<Entity>;

export const RUN_RECORD = z.object({
  dispatchId: z.string(),
  agentKey: z.string(),
  adapter: z.string().optional(),
  model: z.string().optional(),
  space: z.string().optional(),
  task: z.string().optional(),
  state: z.string(),
  startedAt: z.number(),
  finishedAt: z.number().optional(),
  tokensIn: z.number().optional(),
  tokensOut: z.number().optional(),
  cacheRead: z.number().optional(),
  cacheWrite: z.number().optional(),
  cost: z.number().optional(),
  turns: z.number().optional(),
  result: z.unknown().optional(),
  lastError: z.string().optional(),
}) satisfies z.ZodType<RunRecord>;
