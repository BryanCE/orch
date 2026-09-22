import { z } from "zod";
import { isRecord } from "../../util.ts";
import { HOST_OS_VALUES } from "../../types/host.ts";
import { isPeerView } from "../../agent/peers.ts";
import { isPaneLabels } from "../../agent/environment.ts";
import { isLifecycleVerb } from "../../adapters/adapter.ts";
import { isThinkingLevel } from "../../policy/thinking.ts";
import { AGENT_STATES } from "../../agent-state.ts";
import { AGENT_STATUS_ROW, AGENT_VIEW, ENTITY, PRESENCE_ENTRY, RUN_RECORD } from "./fleet-schemas.ts";
import type { ThinkingLevel, WorkerPolicy } from "../../types/policy.ts";
import type { CallerCredential, CallerSession, TokenTotals } from "../../types/core.ts";
import type { FleetCapacity } from "../../policy/capacity.ts";
import { isAgentNotice, type AgentNotice } from "../../control/bridge-message.ts";
import type { PaneLabels } from "../../types/plexer.ts";
import type { LifecycleVerb } from "../../types/adapter.ts";
import type { FleetStatus, PeerView, PendingQuestionView } from "../../types/daemon.ts";
import type { BridgeNotification } from "../../types/agent.ts";
import type { ResultReport, StatusPatch } from "../../types/presence.ts";
import { GRANT_KINDS, type GrantAction, type GrantRequest, type SpaceListing, type SpaceRow, type SpawnRegistration } from "../../types/store.ts";
import type { HomeSubject } from "../../types/backend.ts";
import type { CloseTargetWire } from "../../entities/close-targets.ts";
import type { ReapCandidate, StatusRow } from "../../types/command.ts";
import { isPackIntakeRec, isTaskOptions, isTaskRec, type PackIntakeRec, type TaskOptions, type TaskRec } from "../../types/queue.ts";

const RPC_ERROR_CODES = [
  "INVALID_REQUEST", "INVALID_PARAMS", "METHOD_NOT_FOUND", "HANDLER_ERROR",
  "UNKNOWN_AGENT", "IDENTITY_REQUIRED", "IDENTITY_UNAVAILABLE", "RPC_ERROR",
] as const;
export type RpcErrorCode = (typeof RPC_ERROR_CODES)[number];

export function isRpcErrorCode(value: unknown): value is RpcErrorCode {
  return typeof value === "string" && RPC_ERROR_CODES.some((code) => code === value);
}

const CALLER_SESSION = z.object({ harnessId: z.string(), sessionId: z.string().nullable(), pid: z.number().int().nullable() }) satisfies z.ZodType<CallerSession>;
/** What a caller says about itself with no store; orchd resolves it to an agent. */
export const CALLER = z.object({
  launch: z.string().nullable(),
  session: CALLER_SESSION.nullable(),
  process: z.object({ pid: z.number().int(), startToken: z.string().nullable() }),
}) satisfies z.ZodType<CallerCredential>;

/** Fields on every governed write. `callDaemon` sends `caller`; orchd stamps the actor fields from it before the handler runs (`stampGovernance`); `governWrite` reads them. */
const GOVERNANCE = z.object({
  caller: CALLER.optional(),
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
  oldState: z.enum(AGENT_STATES),
  newState: z.enum(AGENT_STATES),
  ts: nonBlank,
  space: optionalText,
  task: optionalText,
  lastError: optionalText,
  cost: z.number().optional(),
}) satisfies z.ZodType<BridgeNotification>;

const STATUS_PATCH = z.object({
  state: z.enum(AGENT_STATES).optional(),
  lastError: z.string().nullish(),
  model: z.object({ provider: z.string(), id: z.string() }).nullish(),
  thinking: z.string().nullish(),
  task: z.string().nullish(),
  dispatchId: z.string().nullish(),
  lastText: z.string().nullish(),
  currentFile: z.string().nullish(),
  filesTouched: z.array(z.string()).nullish(),
  tokens: z.object({ input: z.number(), output: z.number(), cacheRead: z.number(), cacheWrite: z.number() }).nullish(),
  cost: z.number().nullish(),
  context: z.object({ tokens: z.number(), percent: z.number().nullish() }).nullish(),
  turns: z.number().nullish(),
  sessionPath: z.string().nullish(),
  sessionId: z.string().nullish(),
  project: z.string().nullish(),
  extensionHash: z.string().nullish(),
  startedAt: z.number().nullish(),
  finishedAt: z.number().nullish(),
  blockedMessage: z.string().nullish(),
}) satisfies z.ZodType<StatusPatch>;

const RESULT_REPORT = z.object({
  text: z.string(),
  dispatchId: z.string().nullish(),
  task: z.string().nullish(),
  model: z.object({ provider: z.string(), id: z.string() }).nullish(),
  thinking: z.string().nullish(),
  tokens: z.object({ input: z.number(), output: z.number(), cacheRead: z.number(), cacheWrite: z.number() }).nullish(),
  cost: z.number().nullish(),
  turns: z.number().nullish(),
  sessionPath: z.string().nullish(),
  finishedAt: z.number(),
}) satisfies z.ZodType<ResultReport>;

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

/** The one record a placed spawn states, over the wire: the same shape as
 *  {@link SpawnRegistration}, checked field by field at the daemon. */
const SPAWN_REGISTRATION = z.object({
  key: nonBlank,
  harnessId: nonBlank,
  backendId: nonBlank.optional(),
  placed: z.boolean(),
  handle: z.string().optional(),
  cwd: z.string(),
  name: nonBlank,
  space: z.string().optional(),
  model: z.string(),
  thinking: z.custom<ThinkingLevel>(isThinkingLevel).optional(),
  spawner: z.string().nullable(),
  owner: z.string().optional(),
  worktree: z.object({ path: z.string(), branch: z.string() }).optional(),
  process: z.object({ pid: z.number().int(), startToken: z.string().nullable() }),
}) satisfies z.ZodType<SpawnRegistration>;

const LEASE_RESULT = z.object({ id: z.string(), name: z.string() });

const CLOSE_TARGET = z.object({
  key: z.string(),
  backendId: z.string().nullable(),
  handle: z.string().nullable(),
  recorded: z.object({ pid: z.number().int(), startToken: z.string().nullable() }).nullable(),
  placeKnown: z.boolean(),
}) satisfies z.ZodType<CloseTargetWire>;

const REAP_CANDIDATE = z.object({
  id: z.string(),
  name: z.string(),
  harnessId: z.string(),
  createdAt: z.number(),
  ownership: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("leased"), holder: z.string() }),
    z.object({ kind: z.literal("unleased"), reason: z.enum(["none", "holder-gone"]) }),
  ]),
  processLive: z.boolean(),
  classification: z.enum(["dead", "held", "idle"]),
}) satisfies z.ZodType<ReapCandidate>;

const HOME_SUBJECT = z.object({ kind: z.enum(["space", "pack"]), id: nonBlank }) satisfies z.ZodType<HomeSubject>;
const SPACE_ROW = z.object({ id: z.string(), name: z.string() }) satisfies z.ZodType<SpaceRow>;
const SPACE_LISTING = SPACE_ROW.extend({ home: z.string().nullable() }) satisfies z.ZodType<SpaceListing>;
const GRANT_ACTION = z.object({ kind: z.enum(GRANT_KINDS), params: z.record(z.string(), z.string()) }) satisfies z.ZodType<GrantAction>;
const GRANT_REQUEST = z.object({ id: z.string(), actionHash: z.string(), kind: z.enum(GRANT_KINDS), params: z.record(z.string(), z.string()), requestedBy: z.string().nullable(), requestedAt: z.number() }) satisfies z.ZodType<GrantRequest>;
const PACK_INTAKE = z.custom<PackIntakeRec>(isPackIntakeRec);
const TASK = z.object({ task: z.custom<TaskRec>(isTaskRec) });

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

const tokenTotals = z.object({
  input: z.number().optional(),
  output: z.number().optional(),
  cacheRead: z.number().optional(),
  cacheWrite: z.number().optional(),
}) satisfies z.ZodType<TokenTotals>;

const statusRow = z.object({
  key: z.string(),
  agentId: z.string().nullable().optional(),
  paneId: z.string().nullable(),
  managed: z.boolean(),
  name: z.string().nullable(),
  tab: z.string().nullable(),
  agent: z.string().nullable(),
  spawnedBy: z.string().nullable(),
  worktree: z.string().nullable(),
  branch: z.string().nullable(),
  cwd: z.string().nullable(),
  focused: z.boolean(),
  model: z.string(),
  state: z.string(),
  stateFallback: z.boolean(),
  exited: z.boolean(),
  alive: z.boolean(),
  cost: z.number(),
  ctxPercent: z.number().nullable(),
  task: z.string().nullable(),
  dispatchId: z.string().nullable(),
  lastText: z.string().nullable(),
  backendStatus: z.string().nullable(),
  backend: z.string().nullable(),
  bridgeAttached: z.boolean().nullable(),
  tokens: tokenTotals.nullable(),
  spaceId: z.string().nullable().optional(),
  rootAgentId: z.string().nullable().optional(),
  host: z.string().optional(),
  warning: z.string().optional(),
  lease: z.object({ holderId: z.string(), holderAlive: z.boolean() }).nullable(),
  leaseKnown: z.boolean(),
}) satisfies z.ZodType<StatusRow>;

const fleetStatus = z.object({
  names: z.object({ agents: z.record(z.string(), z.string()), spaces: z.record(z.string(), z.string()) }),
  rows: z.array(statusRow),
}) satisfies z.ZodType<FleetStatus>;

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
  "report-status": z.object({ key: nonBlank, status: STATUS_PATCH }),
  "report-result": z.object({ key: nonBlank, result: RESULT_REPORT }),
  "command-lock": z.object({ command: nonBlank, cwd: nonBlank, pid: z.number().int().positive(), startToken: z.string().nullable(), agent: z.string().nullable(), held: z.array(z.string()), waitingSince: z.number() }),
  "command-unlock": z.object({ pid: z.number().int().positive(), startToken: z.string().nullable() }),
  enqueue: z.object({
    enqueuedBy: nonBlank,
    text: nonBlank,
    opts: z.custom<TaskOptions>(isTaskOptions),
    scope: z.object({ agentId: nonBlank.optional(), packId: nonBlank.optional(), spaceId: nonBlank.optional() }),
  }),
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
  "agent-closed": GOVERNANCE.extend({ key: nonBlank }),
  "register-agent": SPAWN_REGISTRATION.extend(GOVERNANCE.shape),
  detach: GOVERNANCE.extend({ target: nonBlank }),
  adopt: GOVERNANCE.extend({ target: nonBlank.optional(), all: z.boolean().optional() }),
  rename: GOVERNANCE.extend({ target: nonBlank, name: nonBlank }),
  reap: GOVERNANCE.extend({ target: nonBlank.optional(), dead: z.boolean().optional() }),
  "reap-candidates": GOVERNANCE,
  reclaim: GOVERNANCE.extend({ target: nonBlank }),
  "set-handle": GOVERNANCE.extend({ target: nonBlank, handle: nonBlank }),
  spaces: z.object({ plexerId: nonBlank }),
  space: z.object({ target: nonBlank, plexerId: nonBlank }),
  "space-create": GOVERNANCE.extend({ name: nonBlank }),
  "space-rename": GOVERNANCE.extend({ target: nonBlank, name: nonBlank, plexerId: nonBlank }),
  "space-delete": GOVERNANCE.extend({ target: nonBlank, plexerId: nonBlank }),
  home: z.object({ subject: HOME_SUBJECT, plexerId: nonBlank }),
  "record-home": GOVERNANCE.extend({ subject: HOME_SUBJECT, plexerId: nonBlank, handle: nonBlank }),
  "clear-home": GOVERNANCE.extend({ subject: HOME_SUBJECT }),
  grants: z.undefined(),
  grant: GOVERNANCE.extend({ target: nonBlank, decision: z.enum(["approve", "deny"]), host: nonBlank }),
  "admit-home": GOVERNANCE.extend({ action: GRANT_ACTION }),
  "resolve-agent": z.object({ target: nonBlank }),
  "queue-list": z.object({ history: z.boolean() }),
  "queue-cancel": GOVERNANCE.extend({ target: nonBlank, by: nonBlank }),
  "queue-edit": GOVERNANCE.extend({ target: nonBlank, by: nonBlank, text: nonBlank }),
  "queue-take-on": GOVERNANCE.extend({ target: nonBlank, taker: nonBlank }),
  "queue-reap": GOVERNANCE.extend({ target: nonBlank, by: nonBlank }),
  "queue-intake": GOVERNANCE.extend({ by: nonBlank, agent: nonBlank.optional(), space: nonBlank.optional(), close: z.boolean() }),
  clean: GOVERNANCE.extend({ force: z.boolean() }),
  fleet: z.object({ skipBackends: z.boolean().optional() }).optional(),
  capacity: z.object({ packRootId: z.string().nullable().optional(), packSpace: z.string().nullable().optional() }),
  runs: z.object({ caller: CALLER, target: nonBlank.optional(), limit: z.number().int().positive().optional() }),
  run: z.object({ dispatchId: nonBlank }),
  "agent-status": z.object({ target: nonBlank }),
  "process-live": z.object({ target: nonBlank }),
  "resolve-target": z.object({ caller: CALLER, target: nonBlank, all: z.boolean().optional(), crossSpace: z.boolean().optional() }),
  self: z.object({ caller: CALLER }),
  "resolve-lifecycle": z.object({ caller: CALLER, target: nonBlank }),
  "close-targets": z.object({ caller: CALLER, targets: z.array(nonBlank), all: z.boolean() }),
  "owned-agents": z.object({ caller: CALLER }),
  question: z.custom<AgentNotice>(isAgentNotice),
  questions: z.object({ caller: CALLER, all: z.boolean().optional() }),
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
    subsystems: z.object({ workLoop: SUBSYSTEM, livenessTick: SUBSYSTEM, settingsWatch: SUBSYSTEM }),
  }),
  "subscribe-events": z.object({ subscribed: z.literal(true) }),
  "environment-labels": z.custom<PaneLabels>(isPaneLabels).nullable(),
  "peer-view": z.custom<PeerView>(isPeerView),
  notify: OK,
  "report-status": OK,
  "report-result": OK,
  "command-lock": z.discriminatedUnion("verdict", [
    z.object({ verdict: z.literal("run"), patterns: z.array(z.string()) }),
    z.object({ verdict: z.literal("wait"), pattern: z.string(), holder: z.string(), since: z.number() }),
    z.object({ verdict: z.literal("gave-up"), pattern: z.string(), holder: z.string(), waitedMs: z.number() }),
    z.object({ verdict: z.literal("refused"), requestId: z.string() }),
    z.object({ verdict: z.literal("denied"), pattern: z.string() }),
  ]),
  "command-unlock": OK,
  enqueue: z.object({ task: z.custom<TaskRec>(isTaskRec) }),
  status: fleetStatus,
  attach: z.object({ attached: z.literal(true), open: z.number() }),
  dispatch: ACCEPTED,
  steer: ACCEPTED,
  message: ACCEPTED,
  answer: ACCEPTED,
  "spawn-headless": z.object({ key: z.string(), pid: z.number() }),
  "set-model": z.object({ ok: z.literal(true), applied: z.string() }),
  lifecycle: z.object({ ok: z.literal(true), verb: z.custom<LifecycleVerb>(isLifecycleVerb) }),
  "agent-closed": OK,
  "register-agent": OK,
  detach: LEASE_RESULT.extend({ released: z.boolean() }),
  adopt: z.object({ results: z.array(LEASE_RESULT.extend({ adopted: z.boolean() })) }),
  rename: LEASE_RESULT,
  reap: z.object({ reaped: z.array(LEASE_RESULT) }),
  "reap-candidates": z.object({ candidates: z.array(REAP_CANDIDATE) }),
  reclaim: OK,
  "set-handle": OK,
  spaces: z.object({ spaces: z.array(SPACE_LISTING) }),
  space: SPACE_LISTING,
  "space-create": SPACE_ROW,
  "space-rename": SPACE_LISTING.extend({ previousName: z.string() }),
  "space-delete": SPACE_LISTING,
  home: z.object({ handle: z.string().nullable() }),
  "record-home": OK,
  "clear-home": OK,
  grants: z.object({ requests: z.array(GRANT_REQUEST) }),
  grant: z.object({ id: z.string(), decision: z.enum(["approve", "deny"]), expiresAt: z.number().nullable() }),
  "admit-home": z.union([z.object({ granted: z.literal(true) }), z.object({ granted: z.literal(false), requestId: z.string() })]),
  "resolve-agent": z.object({ id: z.string(), rootAgentId: z.string() }),
  "queue-list": z.object({ tasks: z.array(z.custom<TaskRec>(isTaskRec)) }),
  "queue-cancel": TASK,
  "queue-edit": TASK,
  "queue-take-on": TASK,
  "queue-reap": OK,
  "queue-intake": z.object({ intakes: z.array(PACK_INTAKE) }),
  clean: z.object({ malformed: z.array(z.string()), closed: z.number(), reaped: z.array(z.string()), removed: z.array(z.string()), liveHolders: z.array(z.string()), liveWorktrees: z.array(z.string()) }),
  fleet: z.object({ views: z.array(AGENT_VIEW), presence: z.array(PRESENCE_ENTRY), entities: z.array(ENTITY) }),
  capacity: z.object({
    packs: z.array(z.object({ root: z.object({ id: z.string(), name: z.string() }), used: z.number(), cap: z.number() })).readonly(),
    spaces: z.array(z.object({ name: z.string(), used: z.number(), cap: z.number().nullable() })).readonly(),
    total: z.object({ used: z.number(), cap: z.number().nullable() }),
  }) satisfies z.ZodType<FleetCapacity>,
  runs: z.object({ runs: z.array(RUN_RECORD) }),
  run: z.object({ run: RUN_RECORD.nullable() }),
  "agent-status": z.object({ status: AGENT_STATUS_ROW.nullable() }),
  "process-live": z.object({ live: z.boolean() }),
  "resolve-target": z.object({ entity: ENTITY, view: AGENT_VIEW.nullable(), holder: z.string().nullable(), callerOwns: z.boolean() }),
  self: z.object({ id: z.string().nullable(), kind: z.enum(["operator", "session", "agent"]), space: z.string().nullable(), view: AGENT_VIEW.nullable(), depth: z.number().int().nonnegative() }),
  "resolve-lifecycle": z.object({ entity: ENTITY, key: z.string(), view: AGENT_VIEW.nullable(), backendId: z.string().nullable(), handle: z.string(), holder: z.string().nullable(), callerOwns: z.boolean() }),
  "close-targets": z.object({ targets: z.array(CLOSE_TARGET), refusal: z.string().nullable() }),
  "owned-agents": z.object({ keys: z.array(z.string()) }),
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

/** A reply's result is the schema's type. orchd checked the data when it entered;
 *  the client that dialed its token does not check it again on the way out. */
export function daemonResult<M extends RpcMethod>(_method: M, value: unknown): ResultOf<M> {
  return value as ResultOf<M>;
}

export function isRpcMethod(value: unknown): value is RpcMethod {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(RPC_PARAMS, value);
}

export type GovernedMethod =
  | "dispatch" | "steer" | "message" | "answer" | "set-model" | "lifecycle" | "spawn-headless"
  | "agent-closed" | "register-agent" | "detach" | "adopt" | "rename" | "reap" | "reap-candidates" | "reclaim" | "set-handle"
  | "space-create" | "space-rename" | "space-delete" | "record-home" | "clear-home" | "grant" | "admit-home"
  | "queue-cancel" | "queue-edit" | "queue-take-on" | "queue-reap" | "queue-intake" | "clean";
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

/** Another host's `orch status --json`, read off its stdout: the one status payload that crosses a trust boundary. */
export function isFleetStatus(value: unknown): value is FleetStatus {
  return fleetStatus.safeParse(value).success;
}

