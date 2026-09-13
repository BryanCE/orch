import { z } from "zod";
import { isRecord } from "../../util.ts";
import { HOST_OS_VALUES } from "../../types/host.ts";
import { isPeerView } from "../../agent/peers.ts";
import { isPaneLabels } from "../../agent/environment.ts";
import { isLifecycleVerb } from "../../adapters/adapter.ts";
import { isThinkingLevel } from "../../policy/thinking.ts";
import type { ThinkingLevel, WorkerPolicy } from "../../types/policy.ts";
import type { PeerView } from "../peer-view.ts";
import { isAgentNotice, type AgentNotice } from "../../control/bridge-message.ts";
import type { PaneLabels } from "../../types/plexer.ts";
import type { LifecycleVerb } from "../../types/adapter.ts";
import type { DaemonStatusRow, PendingQuestionView } from "../../types/daemon.ts";
import type { NotifyEvent } from "../../types/notify.ts";

const RPC_ERROR_CODES = [
  "INVALID_REQUEST", "INVALID_PARAMS", "METHOD_NOT_FOUND", "HANDLER_ERROR",
  "UNKNOWN_AGENT", "IDENTITY_REQUIRED", "IDENTITY_UNAVAILABLE", "RPC_ERROR",
] as const;
export type RpcErrorCode = (typeof RPC_ERROR_CODES)[number];

export function isRpcErrorCode(value: unknown): value is RpcErrorCode {
  return typeof value === "string" && RPC_ERROR_CODES.some((code) => code === value);
}

/** Fields `callDaemon` stamps on every governed write; `governWrite` reads them. */
const GOVERNANCE = z.object({
  actor: z.string().min(1).optional(),
  actorSpace: z.string().optional(),
  actorIsOperator: z.boolean().optional(),
  steal: z.boolean().optional(),
  crossSpace: z.boolean().optional(),
});
export type Governance = z.infer<typeof GOVERNANCE>;

const nonBlank = z.string().refine((value) => value.trim().length > 0, "must not be blank");
const optionalText = z.string().transform((value) => value.length === 0 ? undefined : value).optional();
const workerPolicy = z.object({
  inheritExtensions: z.boolean(),
  excludeExtensions: z.array(z.string()).readonly(),
  builtinTools: z.boolean(),
  allowTools: z.array(z.string()).readonly(),
}) satisfies z.ZodType<WorkerPolicy>;

const notifyParams = z.object({
  key: nonBlank,
  agent: z.string().nullable(),
  tab: z.string().nullable(),
  model: z.string().nullable(),
  oldState: nonBlank,
  newState: nonBlank,
  ts: nonBlank,
  space: optionalText,
  task: optionalText,
  lastError: optionalText,
  cost: z.number().optional(),
}) satisfies z.ZodType<NotifyEvent>;

const SESSION_CLAIM = z.object({
  token: z.string(),
  pid: z.number(),
  sessionToken: z.string().nullish(),
  harness: z.string(),
  cwd: z.string(),
  label: z.string().optional(),
  plexer: z.string().optional(),
  plexerVersion: z.string().optional(),
  handle: z.string().optional(),
  space: z.string().nullish(),
  hostName: z.string(),
  hostOs: z.enum(HOST_OS_VALUES),
});
export type SessionClaim = z.infer<typeof SESSION_CLAIM>;

const OK = z.object({ ok: z.literal(true) });
const ACCEPTED = z.object({
  accepted: z.literal(true),
  id: z.string(),
  ack: z.enum(["acknowledged", "unavailable"]),
});
const SUBSYSTEM = z.enum(["running", "stopped"]);

const registerSessionResponse = z.object({
  id: z.string().min(1),
  label: z.string(),
  kind: z.literal("session"),
  unleased: z.array(z.object({ id: z.string(), name: z.string() })),
  registrationWarning: z.string().optional(),
});

const daemonStatusRow = z.object({
  key: z.string(),
  agentId: z.string().nullable().optional(),
  paneId: z.string().nullable(),
  managed: z.boolean(),
  name: z.string().nullable(),
  tab: z.string().nullable(),
  agent: z.string().nullable(),
  owner: z.string().nullable(),
  ownerId: z.string().nullable().optional(),
  spawnedBy: z.string().nullable(),
  spawnedByLabel: z.string().nullable(),
  worktree: z.string().nullable(),
  branch: z.string().nullable(),
  cwd: z.string().nullable(),
  focused: z.boolean(),
  model: z.string(),
  modelShort: z.string(),
  state: z.string(),
  stateFallback: z.boolean(),
  staleExtension: z.boolean().optional(),
  exited: z.boolean(),
  alive: z.boolean(),
  cost: z.number(),
  ctxPercent: z.number().nullable(),
  task: z.string().nullable(),
  dispatchId: z.string().nullable(),
  lastText: z.string().nullable(),
  backendStatus: z.string().nullable(),
  backend: z.string().nullable(),
  capabilities: z.object({
    spaceHome: z.boolean(),
    identity: z.boolean(),
    handleLookup: z.boolean(),
    logPruning: z.boolean(),
  }).nullable(),
  sessionPath: z.string().nullable(),
  presenceDir: z.string().nullable(),
  presenceOnly: z.boolean(),
  bridgeAttached: z.boolean().nullable(),
  tokens: z.unknown(),
  turns: z.unknown(),
  spaceId: z.string().nullable().optional(),
  spaceName: z.string().nullable().optional(),
  rootAgentId: z.string().nullable().optional(),
  rootAgentName: z.string().nullable().optional(),
  host: z.string().optional(),
  warning: z.string().optional(),
  lease: z.object({
    holderId: z.string(),
    holderName: z.string(),
    holderAlive: z.boolean(),
  }).nullable(),
  leaseKnown: z.boolean(),
}) satisfies z.ZodType<DaemonStatusRow>;

export const RPC_PARAMS = {
  "daemon-status": z.undefined(),
  "subscribe-events": z.object({ since: z.number().int().optional() }),
  "environment-labels": z.object({ id: nonBlank }),
  "peer-view": z.object({
    ownKey: nonBlank,
    keys: z.array(z.string()).optional(),
    allSpaces: z.boolean().optional(),
    projectRoot: z.string().optional(),
  }),
  notify: notifyParams,
  status: z.undefined(),
  attach: z.object({ key: nonBlank }),
  dispatch: GOVERNANCE.extend({ target: nonBlank, text: nonBlank }),
  steer: GOVERNANCE.extend({ target: nonBlank, text: nonBlank }),
  message: GOVERNANCE.extend({ from: nonBlank, target: nonBlank, text: nonBlank }),
  answer: GOVERNANCE.extend({ target: nonBlank, text: nonBlank, questionId: nonBlank.optional() }),
  "set-model": GOVERNANCE.extend({ target: nonBlank, model: nonBlank }),
  lifecycle: GOVERNANCE.extend({ target: nonBlank, verb: z.custom<LifecycleVerb>(isLifecycleVerb) }),
  "spawn-headless": GOVERNANCE.extend({
    key: nonBlank,
    adapter: nonBlank,
    model: nonBlank,
    thinking: z.custom<ThinkingLevel>(isThinkingLevel),
    prompt: nonBlank,
    cwd: optionalText,
    env: z.record(z.string(), z.string()).optional(),
    preferredModels: z.array(nonBlank).optional(),
    tools: optionalText,
    workers: workerPolicy.optional(),
  }),
  "agent-closed": z.object({ key: nonBlank, oldState: nonBlank }),
  question: z.custom<AgentNotice>(isAgentNotice),
  questions: z.object({ all: z.boolean().optional() }).optional(),
  ack: z.object({ id: nonBlank }),
  "control-outcome": z.object({
    id: nonBlank,
    key: nonBlank,
    command: nonBlank,
    requested: z.record(z.string(), z.unknown()).optional(),
    applied: z.object({ model: z.string(), thinking: z.custom<ThinkingLevel>(isThinkingLevel).optional() }).optional(),
    error: z.string().optional(),
  }),
  reload: z.undefined(),
  "register-session": SESSION_CLAIM,
  "claim-identity": SESSION_CLAIM.extend({ id: z.string(), sessionToken: z.string() }),
} as const;

export const RPC_RESULTS = {
  "daemon-status": z.object({
    pid: z.number(),
    startedAt: z.string(),
    uptimeSec: z.number(),
    codeHash: z.string(),
    socket: z.string(),
    tcpEndpoint: z.string().optional(),
    subsystems: z.object({ workLoop: SUBSYSTEM, presenceWatch: SUBSYSTEM, settingsWatch: SUBSYSTEM }),
  }),
  "subscribe-events": z.object({ subscribed: z.literal(true) }),
  "environment-labels": z.custom<PaneLabels>(isPaneLabels).nullable(),
  "peer-view": z.custom<PeerView>(isPeerView),
  notify: OK,
  status: z.object({ rows: z.array(daemonStatusRow) }),
  attach: z.object({ attached: z.literal(true), open: z.number() }),
  dispatch: ACCEPTED,
  steer: ACCEPTED,
  message: ACCEPTED,
  answer: ACCEPTED,
  "spawn-headless": z.object({ key: z.string(), pid: z.number() }),
  "set-model": z.object({ ok: z.literal(true), applied: z.string() }),
  lifecycle: z.object({ ok: z.literal(true), verb: z.custom<LifecycleVerb>(isLifecycleVerb) }),
  "agent-closed": OK,
  question: OK,
  ack: OK,
  "control-outcome": OK,
  reload: OK,
  questions: z.object({ questions: z.array(z.custom<PendingQuestionView>(isPendingQuestionView)) }),
  "register-session": registerSessionResponse,
  "claim-identity": z.object({ id: z.string() }),
} as const;

export type RpcMethod = keyof typeof RPC_PARAMS;
export type ParamsOf<M extends RpcMethod> = z.infer<(typeof RPC_PARAMS)[M]>;
export type ResultOf<M extends RpcMethod> = z.infer<(typeof RPC_RESULTS)[M]>;

function parseWith<S extends z.ZodType>(schema: S, value: unknown): { ok: true; value: z.output<S> } | { ok: false; issues: z.core.$ZodIssue[] } {
  const parsed = schema.safeParse(value);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, issues: parsed.error.issues };
}

export function parseRpcResult<M extends RpcMethod>(
  method: M,
  value: unknown,
): { ok: true; value: ResultOf<M> } | { ok: false; issues: z.core.$ZodIssue[] };
export function parseRpcResult(
  method: RpcMethod,
  value: unknown,
): { ok: true; value: unknown } | { ok: false; issues: z.core.$ZodIssue[] } {
  return parseWith(RPC_RESULTS[method], value);
}

export function isRpcMethod(value: unknown): value is RpcMethod {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(RPC_PARAMS, value);
}

export type GovernedMethod = "dispatch" | "steer" | "message" | "answer" | "set-model" | "lifecycle" | "spawn-headless";
export type IdentityMethod = "register-session" | "claim-identity";

function isPendingQuestionView(value: unknown): value is PendingQuestionView {
  if (!isRecord(value)) return false;
  return typeof value.questionId === "string"
    && typeof value.agentId === "string"
    && typeof value.key === "string"
    && (typeof value.name === "string" || value.name === null)
    && typeof value.question === "string"
    && typeof value.askedAt === "number";
}

export function isDaemonStatusRow(value: unknown): value is DaemonStatusRow {
  return daemonStatusRow.safeParse(value).success;
}

