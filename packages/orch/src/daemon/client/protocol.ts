import { z } from "zod";
import { WORKTREE_LANDINGS, WORKTREE_PROVIDER_IDS } from "../../types/worktree.ts";
import { isRecord } from "../../util.ts";
import type { HostedProcess } from "../../types/process.ts";
import { isPeerView } from "../../shared/peer-view.ts";
import { isPaneLabels } from "../../shared/environment.ts";
import { isThinkingLevel } from "../../policy/thinking.ts";
import { CompactionTableSchema, ExtensionExclusionsSchema, HostSchema } from "../../settings/schema.ts";
import { AGENT_STATES } from "../../agent-state.ts";
import { AGENT_STATUS_ROW, AGENT_VIEW, ENTITY, HOST_ID, HOST_IDENTITY, PRESENCE_ENTRY, RUN_RECORD } from "./fleet-schemas.ts";
import { CALLER_KINDS, type ThinkingLevel, type WorkerPolicy } from "../../types/policy.ts";
import type { CallerCredential, CallerSession, LogLevel, LogRecord, TokenTotals, WorkerHeaderContext } from "../../types/core.ts";
import { isLogLevel, isLogRecord } from "../../log.ts";
import { HOST_LINK_STATES, SIGNAL_OUTCOMES, type HostGreeting, type HostLinkView } from "../../types/host.ts";
import type { FleetCapacity } from "../../policy/capacity.ts";
import { isAgentNotice, type AgentNotice } from "../../shared/bridge-message.ts";
import type { PaneLabels } from "../../types/plexer.ts";
import { CHECK_STATUSES, type CheckFinding } from "../../types/doctor.ts";
import type { NotifierChoice } from "../../types/notify.ts";
import { ORCH_RUNTIMES } from "../../runtimes.ts";
import { ADAPTER_IDS, type HarnessModel, type SessionView, type SessionViewEntry } from "../../types/adapter.ts";
import { RESULT_SOURCES, type AgentRead, type AgentReading } from "../../types/agent-read.ts";
import type { FleetStatus, PeerFleetStatus, PeerView, PendingQuestionView } from "../../types/daemon.ts";
import type { BridgeNotification } from "../../types/agent.ts";
import { LIVENESS, type ResultReport, type StatusPatch } from "../../types/presence.ts";
import { GRANT_KINDS, type GrantRequest, type SpaceListing, type SpaceRow, type SpawnRegistration } from "../../types/store.ts";
import { BACKEND_IDS, type BackendGroup } from "../../types/backend.ts";
import type { CloseTargetWire } from "../../entities/close-targets.ts";
import type { ReapCandidate, StatusRow } from "../../types/command.ts";
import { isPackIntakeRec, isTaskOptions, isTaskRec, type PackIntakeRec, type TaskOptions, type TaskRec } from "../../types/queue.ts";

const agentWorktreeSchema = z.object({ path: z.string(), branch: z.string(), base: z.string(), provider: z.enum(WORKTREE_PROVIDER_IDS) });

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

/** A pid and its start token, meaningless without the host it runs on. */
export const PROCESS_INSTANCE = z.object({ pid: z.number().int().positive(), startToken: z.string().nullable() });

/** One process instance on one host. */
export const HOSTED_PROCESS = PROCESS_INSTANCE.extend({ host: HOST_ID }) satisfies z.ZodType<HostedProcess>;

const CALLER = z.object({
  launch: z.string().nullable(),
  session: CALLER_SESSION.nullable(),
  pid: z.number().int().positive(),
}) satisfies z.ZodType<CallerCredential>;


export const HOST_GREETING = z.object({ host: HOST_IDENTITY, commit: z.string().nullable(), version: z.string() }).strict() satisfies z.ZodType<HostGreeting>;

const HOST_LINK_VIEW = z.object({
  name: z.string(),
  dest: z.string(),
  state: z.enum(HOST_LINK_STATES),
  hostId: HOST_ID.nullable(),
  greeting: HOST_GREETING.nullable(),
  reason: z.string().nullable(),
  lastSeen: z.number().nullable(),
  retryAt: z.number().nullable(),
  attempt: z.number().int().nullable(),
}) satisfies z.ZodType<HostLinkView>;

/** What orchd stored when it registered the caller's row: the process it keys
 *  liveness and token-less identity on, and the session token it matches. */
const STORED_IDENTITY = z.object({
  process: z.object({
    pid: z.number().int(),
    startToken: z.string().nullable(),
    since: z.number(),
    host: HOST_IDENTITY.nullable(),
    liveness: z.enum(LIVENESS),
  }).nullable(),
  sessionToken: z.string().nullable(),
  claimedAt: z.number().nullable(),
});

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

/** What a worker header says about one agent's place and its spawner's reach. */
const WORKER_HEADER_CONTEXT = z.object({
  maySpawn: z.boolean(),
  cwd: z.string().optional(),
  worktreeBranch: z.string().optional(),
  gatedCommands: z.array(z.string()).readonly().optional(),
  verifyCommands: z.array(z.string()).readonly().optional(),
  spawnerRepliable: z.boolean().optional(),
}) satisfies z.ZodType<WorkerHeaderContext>;

const nonBlank = z.string().refine((value) => value.trim().length > 0, "must not be blank");
const optionalText = z.string().transform((value) => value.length === 0 ? undefined : value).optional();
const workerPolicy = z.object({
  inheritExtensions: z.boolean(),
  excludeExtensions: ExtensionExclusionsSchema,
  builtinTools: z.boolean(),
  allowTools: z.array(z.string()).readonly(),
  compactAtTokens: CompactionTableSchema,
}) satisfies z.ZodType<WorkerPolicy>;
/** The harness and tuning a restart relaunches an agent on. */
const RELAUNCH = z.object({
  harnessId: nonBlank,
  model: nonBlank,
  thinking: z.custom<ThinkingLevel>(isThinkingLevel),
});

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
  pid: z.number().int().positive(),
  sessionToken: z.string().nullish(),
  harness: z.string(),
  cwd: z.string(),
  label: z.string().optional(),
  space: z.string().nullish(),
  /** The plexer env vars set in the caller's environment, raw. orchd runs plexer
   *  detection over them; the caller never probes a plexer itself. */
  plexerEnv: z.record(z.string(), z.string()),
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
  worktree: agentWorktreeSchema.optional(),
  process: HOSTED_PROCESS,
}) satisfies z.ZodType<SpawnRegistration>;

const LEASE_RESULT = z.object({ id: z.string(), name: z.string() });

/** One agent a spawn asks for: its name, harness, tuning, and the task it starts on, if any. */
const SPAWN_AGENT = z.object({ name: nonBlank, harness: z.enum(ADAPTER_IDS), model: nonBlank, thinking: z.custom<ThinkingLevel>(isThinkingLevel), prompt: z.string().nullable() });
/** The worktree a launch asked for: the provider that makes it. orchd adds its own worktree settings. */
const SPAWN_WORKTREE = z.object({ provider: z.enum(WORKTREE_PROVIDER_IDS) }).nullable();
/** One agent a spawn or tile started: where it landed and the tuning it launched on. */
const SPAWNED_AGENT = z.object({
  key: z.string(),
  handle: z.string(),
  name: z.string(),
  cwd: z.string(),
  branch: z.string().nullable(),
  harness: z.enum(ADAPTER_IDS),
  model: z.string(),
  thinking: z.custom<ThinkingLevel>(isThinkingLevel),
});
/** What the CLI needs to know of a harness after a launch: what says an agent of it came up (its
 *  bridge attaching, or the status it reports on start; null when it gives no signal), and
 *  whether its running sessions take a model pin. */
const HARNESS_TRAITS = z.object({ id: z.enum(ADAPTER_IDS), startup: z.enum(["bridge", "start"]).nullable(), takesModel: z.boolean() });
export type HarnessTraits = z.infer<typeof HARNESS_TRAITS>;
/** A tab of the caller's plexer, as the plexer lists it. */
const BACKEND_GROUP = z.object({
  id: z.string(),
  label: z.string().nullable(),
  workspace: z.string().nullable(),
  focused: z.boolean(),
  number: z.number().nullable(),
  placementCount: z.number().nullable(),
  status: z.string().nullable(),
}) satisfies z.ZodType<BackendGroup>;
/** What `orch tab` does to a tab of the caller's plexer. `new` opens one in the named space's
 *  home, else beside the caller. */
const TAB_ACTION = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list"), all: z.boolean() }),
  z.object({ kind: z.literal("new"), label: z.string().nullable(), cwd: nonBlank, space: nonBlank.nullable() }),
  z.object({ kind: z.literal("rename"), target: nonBlank, label: nonBlank }),
  z.object({ kind: z.literal("close"), target: nonBlank }),
  z.object({ kind: z.literal("focus"), target: nonBlank }),
]);
export type TabAction = z.infer<typeof TAB_ACTION>;
/** Why a launch does not apply in the caller's environment. */
const ENVIRONMENT_ANSWER = z.object({ outcome: z.literal("answer"), reason: z.literal("no-environment-role"), text: z.string() });

/** What a rename did to the pane showing the agent, apart from the name orch records: the
 *  border relabelled, no border to relabel, or a relabel that failed and why. */
const CHROME_OUTCOME = z.object({ chrome: z.enum(["renamed", "none", "failed"]), chromeError: z.string().nullable() });
export type ChromeOutcome = z.infer<typeof CHROME_OUTCOME>;

/** Where a resolved agent runs. `here`: this machine, with the plexer and handle its pane is
 *  addressed by. `host`: a linked host, named; only that host's orchd acts on it. */
const LIFECYCLE_PLACE = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("here"), plexer: z.string().nullable(), handle: z.string() }),
  z.object({ kind: z.literal("host"), host: z.string() }),
]);
export type LifecyclePlace = z.infer<typeof LIFECYCLE_PLACE>;

/** A viewer's terminal, in character cells. */
/** One key a host presents: its known_hosts line, and the fingerprint a person compares. */
const HOST_KEY = z.object({ line: z.string().min(1), fingerprint: z.string() });
const SCREEN_SIZE = z.object({ cols: z.number().int().positive(), rows: z.number().int().positive() });

const CLOSE_TARGET = z.object({
  key: z.string(),
  name: z.string(),
  backendId: z.string().nullable(),
  handle: z.string().nullable(),
  host: HOST_IDENTITY,
  recorded: PROCESS_INSTANCE.nullable(),
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

const SPACE_ROW = z.object({ id: z.string(), name: z.string() }) satisfies z.ZodType<SpaceRow>;
const SPACE_LISTING = SPACE_ROW.extend({ home: z.string().nullable() }) satisfies z.ZodType<SpaceListing>;
const GRANT_REQUEST = z.object({ id: z.string(), actionHash: z.string(), kind: z.enum(GRANT_KINDS), params: z.record(z.string(), z.string()), requestedBy: z.string().nullable(), requestedAt: z.number() }) satisfies z.ZodType<GrantRequest>;
const PACK_INTAKE = z.custom<PackIntakeRec>(isPackIntakeRec);
const TASK = z.object({ task: z.custom<TaskRec>(isTaskRec) });

const OK = z.object({ ok: z.literal(true) });
const HARNESS_MODEL = z.object({ spec: z.string(), label: z.string().optional(), resolved: z.string().optional() }) satisfies z.ZodType<HarnessModel>;
const ACCEPTED = z.object({
  accepted: z.literal(true),
  id: z.string(),
  ack: z.enum(["acknowledged", "unavailable"]),
});
const SUBSYSTEM = z.enum(["running", "stopped"]);
const CHECK_FINDING = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(CHECK_STATUSES),
  detail: z.string(),
  fix: z.object({ description: z.string(), destructive: z.boolean().optional() }).optional(),
  backends: z.array(z.object({
    id: z.string(),
    detected: z.boolean().optional(),
    enabled: z.boolean().optional(),
    active: z.boolean().optional(),
    insideSession: z.boolean(),
    roles: z.array(z.string()).readonly(),
    space: z.string().nullable(),
  })).optional(),
  ignoredRecords: z.array(z.object({ path: z.string(), reason: z.string() })).optional(),
}) satisfies z.ZodType<CheckFinding>;
const NOTIFIER_CHOICE = z.object({
  id: z.string(),
  label: z.string(),
  available: z.boolean(),
  remediation: z.string(),
  requiredFields: z.array(z.object({ name: z.string(), label: z.string(), description: z.string().optional(), secret: z.boolean().optional() })).readonly(),
}) satisfies z.ZodType<NotifierChoice>;

const ORPHAN = z.object({ id: z.string(), name: z.string() });

/** What an abort did: the turn cancelled, or why abort does not apply to that agent. */
const ABORTED = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("aborted") }),
  z.object({ outcome: z.literal("answer"), reason: z.enum(["no-pane", "no-environment-role"]), text: z.string() }),
]);

/** Why a pane verb does not apply to an agent. */
const PANE_ANSWER = z.object({ kind: z.literal("answer"), reason: z.enum(["no-pane", "no-environment-role"]), text: z.string() });

/** What a pane verb does to the pane an agent sits in, where the agent runs. `move` to a null
 *  tab opens a new one; a null split lets the tiling planner pick. `group` only reads which
 *  group the pane is in. */
const PANE_ACTION = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("keys"), keys: z.array(nonBlank).min(1) }),
  z.object({ kind: z.literal("focus") }),
  z.object({ kind: z.literal("zoom"), mode: z.enum(["on", "off", "toggle"]) }),
  z.object({ kind: z.literal("label"), label: nonBlank }),
  z.object({ kind: z.literal("move"), tab: nonBlank.nullable(), split: z.enum(["down", "right"]).nullable(), label: z.string().nullable() }),
  z.object({ kind: z.literal("group") }),
]);
export type PaneAction = z.infer<typeof PANE_ACTION>;

/** A pane verb done: the pane's handle and the group it is in after it, or why it did not apply. */
const PANE_OUTCOME = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("done"), handle: z.string(), group: z.string().nullable() }),
  PANE_ANSWER,
]);
export type PaneOutcome = z.infer<typeof PANE_OUTCOME>;

/** A harness relaunch in place: `reload` has the harness reload itself; `restart` quits it and
 *  launches it again, on another harness, model or command when one is named. The orchd where the
 *  agent runs plans the launch with its own settings. */
const LIFECYCLE_REQUEST = z.discriminatedUnion("verb", [
  z.object({ verb: z.literal("reload") }),
  z.object({ verb: z.literal("restart"), harness: nonBlank.nullable(), model: nonBlank.nullable(), thinking: nonBlank.nullable(), cmd: nonBlank.nullable() }),
]);
export type LifecycleRequest = z.infer<typeof LIFECYCLE_REQUEST>;

/** How a reload or restart went: back with a live bridge, or why not; the command a restart
 *  launched, and the harness and tuning the agent's store moved it onto, once it got that far. */
const LIFECYCLE_OUTCOME = z.object({ ok: z.boolean(), reason: z.string().nullable(), command: z.string().nullable(), relaunched: RELAUNCH.nullable() });
export type LifecycleOutcome = z.infer<typeof LIFECYCLE_OUTCOME>;

/** Whether an agent reached the state a wait asked for in time, and the state it was last in. */
const WAITED = z.object({ reached: z.boolean(), state: z.enum(AGENT_STATES).nullable() });
/** What review reads off an agent's branch: how far it is ahead of its base, its last subject, and the diff. */
const WORKTREE_REVIEW = z.object({ summary: z.string(), diff: z.string(), commitsAhead: z.number().int().nonnegative() });
/** One finished agent's branch waiting for review. `key` is the address the agent answers to;
 *  `host` names the linked host its worktree is on, null when it is on this one. */
const REVIEW_ITEM = z.object({
  target: z.string(),
  key: z.string(),
  branch: z.string(),
  worktree: z.string(),
  base: z.string(),
  state: z.literal("done"),
  task: z.string(),
  summary: z.string(),
  diff: z.string(),
  commitsAhead: z.number().int().nonnegative(),
  adapter: z.string(),
  provider: z.enum(WORKTREE_PROVIDER_IDS),
  /** The agent has ended: its work stands, and there is nobody left to send feedback to. */
  ended: z.boolean(),
  host: z.string().nullable(),
});
/** What orchd did with an agent's worktree, on the host the worktree is on. */
const WORKTREE_ACTED = z.discriminatedUnion("action", [
  z.object({ action: z.literal("review"), review: WORKTREE_REVIEW }),
  z.object({ action: z.literal("land"), strategy: z.enum(WORKTREE_LANDINGS) }),
  z.object({ action: z.literal("remove") }),
]);
export type WorktreeActed = z.infer<typeof WORKTREE_ACTED>;
export type WorktreeAction = WorktreeActed["action"];

/** One orphan worktree `orch clean --worktrees` looked at, and what it did with it. `reason` says
 *  what work a kept or discarded one held, or why it failed; null when it was removed clean. */
const WORKTREE_CLEANED = z.object({
  path: z.string(),
  branch: z.string().nullable(),
  outcome: z.enum(["removed", "kept", "discarded", "failed"]),
  reason: z.string().nullable(),
});
/** The orphan worktrees of one repository: how many orch made there, and each one cleaned. A
 *  directory outside a repository is refused with why. */
const WORKTREES_CLEANED = z.union([
  z.object({ refused: z.string() }),
  z.object({ found: z.number().int().nonnegative(), cleaned: z.array(WORKTREE_CLEANED) }),
]);

/** A drive or kill verb a linked host's orchd asks this one to do on an agent it asked this
 *  host to run. The asking orchd already ruled on it (lease gate, close authority); `actor` is
 *  the agent it resolved the caller to, or null for one with no row, kept for this host's records. */
const PEER_DRIVE_TARGET = z.object({ key: nonBlank, actor: z.string().min(1).nullable() });
const PEER_DRIVE = z.discriminatedUnion("action", [
  PEER_DRIVE_TARGET.extend({ action: z.literal("dispatch"), text: nonBlank }),
  PEER_DRIVE_TARGET.extend({ action: z.literal("steer"), text: nonBlank }),
  PEER_DRIVE_TARGET.extend({ action: z.literal("answer"), text: nonBlank, questionId: nonBlank.nullable() }),
  PEER_DRIVE_TARGET.extend({ action: z.literal("model"), model: nonBlank }),
  PEER_DRIVE_TARGET.extend({ action: z.literal("lifecycle"), request: LIFECYCLE_REQUEST }),
  PEER_DRIVE_TARGET.extend({ action: z.literal("clear") }),
  PEER_DRIVE_TARGET.extend({ action: z.literal("rename"), name: nonBlank }),
  PEER_DRIVE_TARGET.extend({ action: z.literal("abort") }),
  PEER_DRIVE_TARGET.extend({ action: z.literal("close") }),
  PEER_DRIVE_TARGET.extend({ action: z.literal("reap") }),
  PEER_DRIVE_TARGET.extend({ action: z.literal("pane"), pane: PANE_ACTION }),
  PEER_DRIVE_TARGET.extend({ action: z.literal("wait"), status: z.enum(AGENT_STATES), timeoutMs: z.number().int().positive() }),
]);
export type PeerDrive = z.infer<typeof PEER_DRIVE>;
/** The far orchd's answer to a peer drive, in the shape the near verb answers its own caller. */
const PEER_DRIVE_RESULT = z.discriminatedUnion("action", [
  ACCEPTED.extend({ action: z.literal("dispatch") }),
  ACCEPTED.extend({ action: z.literal("steer") }),
  ACCEPTED.extend({ action: z.literal("answer") }),
  z.object({ action: z.literal("model"), ok: z.literal(true), applied: z.string() }),
  LIFECYCLE_OUTCOME.extend({ action: z.literal("lifecycle") }),
  z.object({ action: z.literal("clear"), ok: z.literal(true) }),
  CHROME_OUTCOME.extend({ action: z.literal("rename") }),
  z.object({ action: z.literal("abort"), aborted: ABORTED }),
  z.object({ action: z.literal("close"), outcome: z.enum(SIGNAL_OUTCOMES) }),
  z.object({ action: z.literal("reap"), reaped: z.array(LEASE_RESULT) }),
  z.object({ action: z.literal("pane"), outcome: PANE_OUTCOME }),
  WAITED.extend({ action: z.literal("wait") }),
]);
export type PeerDriveResult = z.infer<typeof PEER_DRIVE_RESULT>;

const registerSessionResponse = z.object({
  id: z.string().min(1),
  label: z.string(),
  kind: z.literal("session"),
  unleased: z.array(ORPHAN),
  registrationWarning: z.string().optional(),
});

const tokenTotals = z.object({
  input: z.number().optional(),
  output: z.number().optional(),
  cacheRead: z.number().optional(),
  cacheWrite: z.number().optional(),
}) satisfies z.ZodType<TokenTotals>;

const SESSION_VIEW_ENTRY = z.object({
  role: z.enum(["user", "assistant", "tool"]),
  text: z.string().optional(),
  toolCalls: z.array(z.object({ name: z.string(), arg: z.string() })).readonly().optional(),
  tool: z.string().optional(),
  isError: z.boolean().optional(),
  timestamp: z.string().optional(),
}) satisfies z.ZodType<SessionViewEntry>;

const SESSION_VIEW = z.object({
  state: z.enum(AGENT_STATES).optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  thinking: z.string().optional(),
  task: z.string().optional(),
  lastText: z.string().optional(),
  cost: z.number().optional(),
  tokens: tokenTotals.optional(),
  turns: z.number().optional(),
  entries: z.array(SESSION_VIEW_ENTRY).readonly().optional(),
}) satisfies z.ZodType<SessionView>;

const READ_MISSING = z.object({ kind: z.literal("missing"), reason: z.string() });

/** What a caller asks to read of one agent. */
const AGENT_READ = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("result") }),
  z.object({ kind: z.literal("tail"), lines: z.number().int().positive() }),
  z.object({ kind: z.literal("session") }),
  z.object({ kind: z.literal("screen"), lines: z.number().int().positive() }),
  z.object({
    kind: z.literal("log"),
    since: z.number().optional(),
    level: z.custom<LogLevel>(isLogLevel).optional(),
    dispatch: nonBlank.optional(),
  }),
]) satisfies z.ZodType<AgentRead>;


/** The answer to an agent read, from the orchd whose store holds the agent. */
const AGENT_READING = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("result"),
    lookup: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("found"), source: z.enum(RESULT_SOURCES), payload: z.unknown() }),
      READ_MISSING,
    ]),
  }),
  z.object({
    kind: z.literal("tail"),
    lookup: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("found"), sessionPath: z.string().nullable(), view: SESSION_VIEW }),
      READ_MISSING,
    ]),
  }),
  z.object({
    kind: z.literal("session"),
    lookup: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("found"), sessionPath: z.string(), view: SESSION_VIEW.nullable() }),
      READ_MISSING,
    ]),
  }),
  z.object({
    kind: z.literal("screen"),
    lookup: z.discriminatedUnion("kind", [z.object({ kind: z.literal("found"), handle: z.string(), text: z.string() }), PANE_ANSWER]),
  }),
  z.object({ kind: z.literal("log"), records: z.array(z.custom<LogRecord>(isLogRecord)) }),
]) satisfies z.ZodType<AgentReading>;

const statusRow = z.object({
  key: z.string(),
  agentId: z.string().nullable().optional(),
  paneId: z.string().nullable(),
  managed: z.boolean(),
  owned: z.boolean(),
  kind: z.enum(CALLER_KINDS).nullable(),
  createdAt: z.number().nullable(),
  pid: z.number().nullable(),
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
  host: HOST_IDENTITY,
  hostOffline: z.object({ lastSeen: z.number().nullable() }).optional(),
  askedBy: z.string().nullable(),
  endReason: z.string().nullable(),
  warning: z.string().optional(),
  lease: z.object({ holderId: z.string(), holderAlive: z.boolean() }).nullable(),
  leaseKnown: z.boolean(),
}) satisfies z.ZodType<StatusRow>;

const fleetStatus = z.object({
  names: z.object({ agents: z.record(z.string(), z.string()), spaces: z.record(z.string(), z.string()) }),
  rows: z.array(statusRow),
}) satisfies z.ZodType<FleetStatus>;

const peerFleetStatus = fleetStatus.extend({ seq: z.number().int(), log: z.string() }) satisfies z.ZodType<PeerFleetStatus>;

export const RPC_PARAMS = {
  "daemon-status": z.undefined(),
  /** `stream` is the pid, on this machine, of a CLI stream (`orch events`, `orch monitor`) that
   *  `orch close --stream` ends; a subscriber that is not one leaves it out. */
  // `log` is the event log `since` was read from: a linked host's orchd sends both to resume.
  "subscribe-events": z.object({ since: z.number().int().optional(), log: z.string().optional(), stream: z.number().int().positive().optional() }),
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
  "report-prompt": z.object({ key: nonBlank, prompt: z.string() }),
  /** `pid` is the caller's own process on this machine: orchd reads its identity from the OS. */
  "command-lock": z.object({ command: nonBlank, cwd: nonBlank, pid: z.number().int().positive(), agent: z.string().nullable(), held: z.array(z.string()), waitingSince: z.number() }),
  "command-unlock": z.object({ pid: z.number().int().positive() }),
  enqueue: z.object({
    enqueuedBy: nonBlank,
    text: nonBlank,
    opts: z.custom<TaskOptions>(isTaskOptions),
    scope: z.object({ agentId: nonBlank.optional(), packId: nonBlank.optional(), spaceId: nonBlank.optional() }),
  }),
  status: z.object({ caller: z.string().nullable() }),
  attach: z.object({ key: nonBlank }),
  /** `worker` wraps the text in the worker header for that harness and context; absent sends it as written. */
  dispatch: GOVERNANCE.extend({ target: nonBlank, text: nonBlank, worker: z.object({ harness: z.enum(ADAPTER_IDS).nullable(), context: WORKER_HEADER_CONTEXT }).optional() }),
  steer: GOVERNANCE.extend({ target: nonBlank, text: nonBlank }),
  message: GOVERNANCE.extend({ from: nonBlank, target: nonBlank, text: nonBlank }),
  answer: GOVERNANCE.extend({ target: nonBlank, text: nonBlank, questionId: nonBlank.optional() }),
  "set-model": GOVERNANCE.extend({ target: nonBlank, model: nonBlank }),
  /** Reload or restart an agent's harness where it runs, and answer once its bridge is back. */
  lifecycle: GOVERNANCE.extend({ target: nonBlank, request: LIFECYCLE_REQUEST }),
  /** Re-read settings.json now, as an edit would. */
  "settings-reload": z.undefined(),
  /** What each named harness says it can run, read by orchd through that harness's adapter. */
  "harness-catalogues": z.object({ harnesses: z.array(z.enum(ADAPTER_IDS)) }),
  /** Forget every stored model catalogue and ask the harnesses again; answers once all have. */
  "catalogue-refresh": z.undefined(),
  /** Admit a model on a harness by orch's policy and orchd's catalogue. `agent` names the running
   *  agent the model is for, whose refusal points at a harness that offers it; null for a launch. */
  "admit-model": z.object({ harness: z.enum(ADAPTER_IDS), model: nonBlank, agent: nonBlank.nullable() }),
  /** Re-read settings.json, then rewrite each enabled harness's file the settings no longer match. */
  "harness-files-sync": z.undefined(),
  /** Run doctor's checks in orchd. `fix` applies every safe fix and each one those uncover;
   *  `only` narrows it to the named checks' fixes, destructive ones included, applied once. */
  doctor: z.object({ fix: z.boolean(), only: z.array(nonBlank).optional() }),
  /** Probe this machine for the selected harnesses' and plexers' binaries. */
  "setup-prerequisites": z.object({ adapters: z.array(z.enum(ADAPTER_IDS)), backends: z.array(z.enum(BACKEND_IDS)) }),
  /** Install the named missing prerequisites of the selected harnesses and plexers, in order. */
  "setup-install": z.object({ adapters: z.array(z.enum(ADAPTER_IDS)), backends: z.array(z.enum(BACKEND_IDS)), bins: z.array(nonBlank) }),
  /** Install each harness's integration, wire orch's bins onto PATH, point the entrypoint at the runtime. */
  "setup-integrate": z.object({ adapters: z.array(z.enum(ADAPTER_IDS)), runtime: z.enum(ORCH_RUNTIMES), copy: z.boolean() }),
  /** Which notifiers this machine can deliver through. */
  "notifier-probe": z.undefined(),
  /** Which plexers are installed and usable on this machine. */
  "plexers-available": z.undefined(),
  /** Send a test event in this state to every configured sink. */
  "notify-test": z.object({ state: z.enum(AGENT_STATES).exclude(["asking"]) }),
  "clear-session": GOVERNANCE.extend({ target: nonBlank }),
  /** Cancel an agent's current turn, wherever it runs. A kill verb: never gated by a lease. */
  abort: GOVERNANCE.extend({ target: nonBlank }),
  "spawn-headless": GOVERNANCE.extend({
    key: nonBlank,
    name: nonBlank,
    spawner: z.string().nullable(),
    worktree: agentWorktreeSchema.optional(),
    adapter: nonBlank,
    model: nonBlank,
    thinking: z.custom<ThinkingLevel>(isThinkingLevel),
    /** The first prompt. Null only for a spawn on a linked host, whose agent idles there for a dispatch. */
    prompt: nonBlank.nullable(),
    cwd: optionalText,
    env: z.record(z.string(), z.string()).optional(),
    preferredModels: z.array(nonBlank).optional(),
    tools: optionalText,
    workers: workerPolicy.optional(),
    /** A host from settings.hosts to run the agent on, over its link; absent runs it here. */
    host: nonBlank.optional(),
  }),
  /** Launch named agents for the caller, in its plexer on this machine, headless, or on a linked
   *  host. orchd admits the spawn, places it, and launches each agent; `plexer` is --plexer. */
  spawn: GOVERNANCE.extend({
    agents: z.array(SPAWN_AGENT).min(1),
    cmd: nonBlank.nullable(),
    plexer: nonBlank.nullable(),
    cwd: nonBlank,
    tab: nonBlank.nullable(),
    space: nonBlank.nullable(),
    host: nonBlank.nullable(),
    worktree: SPAWN_WORKTREE,
  }),
  /** Add one agent to an open tab of the caller's plexer, where the tiling planner puts it. */
  tile: GOVERNANCE.extend({
    tab: nonBlank,
    agent: SPAWN_AGENT.omit({ prompt: true }),
    cmd: nonBlank.nullable(),
    plexer: nonBlank.nullable(),
    cwd: nonBlank,
    worktree: SPAWN_WORKTREE,
  }),
  /** List, open, rename, close or focus a tab of the caller's plexer. */
  tab: GOVERNANCE.extend({ action: TAB_ACTION }),
  "agent-closed": GOVERNANCE.extend({ key: nonBlank }),
  /** Record an agent orch did not spawn, found in a pane on this machine, as the caller's: orchd
   *  reads the process that pane runs. Every other axis is the registration's. */
  "adopt-agent": SPAWN_REGISTRATION.omit({ process: true, placed: true }).extend({ backendId: nonBlank, handle: nonBlank }).extend(GOVERNANCE.shape),
  detach: GOVERNANCE.extend({ target: nonBlank }),
  adopt: GOVERNANCE.extend({ targets: z.array(nonBlank).optional(), all: z.boolean().optional() }),
  rename: GOVERNANCE.extend({ target: nonBlank, name: nonBlank }),
  reap: GOVERNANCE.extend({ target: nonBlank.optional(), dead: z.boolean().optional() }),
  "reap-candidates": GOVERNANCE,
  reclaim: GOVERNANCE.extend({ target: nonBlank, relaunch: RELAUNCH.optional() }),
  "set-handle": GOVERNANCE.extend({ target: nonBlank, handle: nonBlank }),
  /** Every space, with whether the plexer settings name holds a home for it. */
  spaces: z.undefined(),
  /** Focus a space's home in the plexer settings name. */
  "space-focus": z.object({ target: nonBlank }),
  /** Create a space, and its home in the plexer settings name when that plexer holds homes. */
  "space-create": GOVERNANCE.extend({ name: nonBlank, cwd: nonBlank }),
  "space-rename": GOVERNANCE.extend({ target: nonBlank, name: nonBlank }),
  "space-delete": GOVERNANCE.extend({ target: nonBlank }),
  grants: z.undefined(),
  hosts: z.undefined(),
  "host-check": z.object({ name: nonBlank }),
  "host-forget": z.object({ name: nonBlank }),
  /** The keys a host presents right now, for the human adding it to confirm. */
  "host-scan": z.object({ caller: CALLER, host: HostSchema }),
  /** Trust these keys for a host's links from now on, in place of any it presented before. */
  "host-trust": z.object({ caller: CALLER, host: HostSchema, keys: z.array(HOST_KEY) }),
  /** orch's public key, made the first time it is asked for, and how to authorize it on a host by hand. */
  "host-key": z.object({ host: HostSchema }),
  /** Log in to a host once as the person, in a terminal orchd holds under `key`, to put orch's key
   *  in place there. The login's screen streams on this connection, a snapshot first, and ends
   *  when the login does; letting go of it ends the login. */
  "host-authorize": z.object({ caller: CALLER, host: HostSchema, key: nonBlank, ...SCREEN_SIZE.shape }),
  /** From a linked host's orchd: whether each of these processes on this host is alive. */
  "peer-alive": z.object({ processes: z.array(HOSTED_PROCESS) }),
  /** From a linked host's orchd: a drive or kill verb on an agent it asked this host to run. */
  "peer-drive": PEER_DRIVE,
  /** From a linked host's orchd: read an agent it asked this host to run. */
  "peer-read": z.object({ key: nonBlank, read: AGENT_READ }),
  /** From a linked host's orchd: the pending questions of the agents it asked this host to run. */
  "peer-questions": z.object({}),
  /** From a linked host's orchd: the status rows of the agents it asked this host to run. */
  "peer-status": z.object({}),
  /** Read an agent's result or session tail wherever it runs: here, or over its host's link. */
  "agent-read": z.object({ caller: CALLER, key: nonBlank, read: AGENT_READ }),
  /** Work the pane an agent sits in, wherever it runs: here, or through its host's orchd. */
  "agent-pane": GOVERNANCE.extend({ target: nonBlank, action: PANE_ACTION }),
  /** Answer once an agent reports a state, or once the timeout passes, wherever it runs. */
  "agent-wait": z.object({ caller: CALLER, target: nonBlank, status: z.enum(AGENT_STATES), timeoutMs: z.number().int().positive() }),
  /** Every finished agent's branch waiting for review, read on the host its worktree is on. */
  reviews: z.undefined(),
  /** Land an agent's branch on its base, or remove its worktree, on the host the worktree is on. */
  "agent-worktree": GOVERNANCE.extend({ key: nonBlank, action: z.enum(["land", "remove"]) }),
  /** From a linked host's orchd: review, land or remove the worktree of an agent it asked this host to run. */
  "peer-worktree": z.object({ key: nonBlank, action: z.enum(["review", "land", "remove"]) }),
  /** End every CLI stream (`orch events`, `orch monitor`) subscribed to this orchd. */
  "end-streams": z.undefined(),
  /** Stream an agent's screen on this connection, wherever it runs: from the holder here, or
   *  relayed from its host's orchd over the link. Screen lines follow until it ends or the
   *  connection closes, a snapshot first. The snapshot can arrive before the reply. */
  "attach-screen": z.object({ caller: CALLER, key: nonBlank, ...SCREEN_SIZE.shape }),
  /** From a linked host's orchd: stream the screen of an agent it asked this host to run. */
  "peer-attach-screen": z.object({ key: nonBlank, ...SCREEN_SIZE.shape }),
  /** Keystrokes for a screen this connection is attached to. */
  "screen-input": z.object({ key: nonBlank, data: z.string() }),
  /** The viewer's terminal size, for a screen this connection is attached to. */
  "screen-resize": z.object({ key: nonBlank, ...SCREEN_SIZE.shape }),
  /** Stop streaming one screen on this connection. The agent keeps running. */
  "screen-detach": z.object({ key: nonBlank }),
  grant: GOVERNANCE.extend({ target: nonBlank, decision: z.enum(["approve", "deny"]) }),
  "queue-list": z.object({ history: z.boolean() }),
  "queue-cancel": GOVERNANCE.extend({ target: nonBlank, by: nonBlank }),
  "queue-edit": GOVERNANCE.extend({ target: nonBlank, by: nonBlank, text: nonBlank }),
  "queue-take-on": GOVERNANCE.extend({ target: nonBlank, taker: nonBlank }),
  "queue-reap": GOVERNANCE.extend({ target: nonBlank, by: nonBlank }),
  "queue-intake": GOVERNANCE.extend({ by: nonBlank, agent: nonBlank.optional(), space: nonBlank.optional(), close: z.boolean() }),
  /** `worktreesIn` is a directory whose repository's orphan worktrees orchd cleans as well; null
   *  leaves worktrees alone. `all` discards the work an orphan still holds. */
  clean: GOVERNANCE.extend({ all: z.boolean(), worktreesIn: nonBlank.nullable() }),
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
  /** The agents the caller holds an open lease on; `live` keeps only those not known dead. */
  "owned-agents": z.object({ caller: CALLER, live: z.boolean() }),
  orphans: z.object({}),
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
  /** Bind this connection to another host's orchd. Sent by `orch host serve` on this host,
   *  which reads the origin from its forced command and the token from this orchd. */
  "peer-hello": z.object({ origin: HOST_ID, token: z.string().min(1) }),
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
    /** How many agents' PTYs this orchd holds: each ends when orchd stops. */
    held: z.number().int().nonnegative(),
  }),
  "subscribe-events": z.object({ subscribed: z.literal(true) }),
  "environment-labels": z.custom<PaneLabels>(isPaneLabels).nullable(),
  "peer-view": z.custom<PeerView>(isPeerView),
  notify: OK,
  "report-status": OK,
  "report-result": OK,
  "report-prompt": OK,
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
  /** `backend` is the environment the agent runs in where it was spawned: a held PTY when a
   *  peer asked, a detached process otherwise. */
  "spawn-headless": z.object({ key: z.string(), backend: z.enum(BACKEND_IDS), handle: z.string(), process: HOSTED_PROCESS }),
  "set-model": z.object({ ok: z.literal(true), applied: z.string() }),
  lifecycle: LIFECYCLE_OUTCOME,
  "settings-reload": OK,
  /** `error` is why a harness could not list its models; its `models` are then empty. */
  /** `suggested` is the model the harness launches on by default; `compaction` is whether it takes a compaction point. */
  "harness-catalogues": z.object({ catalogues: z.array(z.object({ id: z.enum(ADAPTER_IDS), models: z.array(HARNESS_MODEL), suggested: z.string().nullable(), compaction: z.boolean(), error: z.string().nullable() })) }),
  "catalogue-refresh": OK,
  /** The spec the model runs as, and whether a running session of the harness can change model. */
  "admit-model": z.object({ model: z.string(), takesModel: z.boolean() }),
  /** The harness files rewritten. */
  "harness-files-sync": z.object({ written: z.array(z.string()) }),
  /** `changes` are the fixes applied, in order. */
  doctor: z.object({ results: z.array(CHECK_FINDING), changes: z.array(z.string()) }),
  /** `lines` are what the probe found, one per binary, for the CLI to print. */
  "setup-prerequisites": z.object({ lines: z.array(z.string()), missing: z.array(z.object({ bin: z.string(), cmd: z.string() })) }),
  "setup-install": z.object({ lines: z.array(z.string()) }),
  /** `gaps` are integrations expected and not installed; `smokeBlocker` is why a smoke cannot run here. */
  "setup-integrate": z.object({ lines: z.array(z.string()), gaps: z.array(z.string()), smokeBlocker: z.string().nullable() }),
  "notifier-probe": z.object({ choices: z.array(NOTIFIER_CHOICE) }),
  "plexers-available": z.object({ plexers: z.array(z.enum(BACKEND_IDS)) }),
  /** One entry per configured sink, named as `orch settings notify` names it. */
  "notify-test": z.object({ results: z.array(z.object({ sink: z.string(), ok: z.boolean() })) }),
  "clear-session": OK,
  abort: ABORTED,
  /** `headless`: placed nowhere, so each agent's key is its handle. `notes` are the lines the
   *  launch reports in order. `panes` are this machine's panes showing agents on `host`. */
  spawn: z.discriminatedUnion("outcome", [
    ENVIRONMENT_ANSWER,
    z.object({
      outcome: z.literal("spawned"),
      backend: z.string(),
      headless: z.boolean(),
      host: z.string().nullable(),
      tab: z.string().nullable(),
      requested: z.number().int().positive(),
      agents: z.array(SPAWNED_AGENT),
      panes: z.array(z.object({ key: z.string(), handle: z.string() })),
      harnesses: z.array(HARNESS_TRAITS),
      notes: z.array(z.string()),
    }),
  ]),
  /** The tab's tiling after the agent landed: each place, the name it shows, and its size. */
  tile: z.discriminatedUnion("outcome", [
    ENVIRONMENT_ANSWER,
    z.object({
      outcome: z.literal("tiled"),
      tab: z.string(),
      agent: SPAWNED_AGENT,
      harness: HARNESS_TRAITS,
      layout: z.array(z.object({ handle: z.string(), name: z.string(), size: z.string() })),
    }),
  ]),
  /** `done` names the tab a rename, close or focus acted on, with its label before the act. */
  tab: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("answer"), reason: z.literal("no-environment-role"), text: z.string() }),
    z.object({ kind: z.literal("list"), tabs: z.array(BACKEND_GROUP) }),
    z.object({ kind: z.literal("created"), group: BACKEND_GROUP, rootHandle: z.string() }),
    z.object({ kind: z.literal("done"), tab: z.object({ id: z.string(), label: z.string().nullable() }) }),
  ]),
  "agent-closed": z.object({ outcome: z.enum(SIGNAL_OUTCOMES) }),
  "adopt-agent": OK,
  detach: LEASE_RESULT.extend({ released: z.boolean() }),
  adopt: z.object({ results: z.array(LEASE_RESULT.extend({ adopted: z.boolean() })) }),
  rename: LEASE_RESULT.extend(CHROME_OUTCOME.shape),
  reap: z.object({ reaped: z.array(LEASE_RESULT) }),
  "reap-candidates": z.object({ candidates: z.array(REAP_CANDIDATE) }),
  reclaim: OK,
  "set-handle": OK,
  spaces: z.object({ spaces: z.array(SPACE_LISTING) }),
  "space-focus": z.discriminatedUnion("outcome", [
    ENVIRONMENT_ANSWER,
    z.object({ outcome: z.literal("focused"), space: SPACE_ROW }),
  ]),
  /** `home` says what became of the space's home in the caller's plexer. */
  "space-create": SPACE_ROW.extend({ home: z.enum(["none", "created"]) }),
  "space-rename": SPACE_ROW.extend({ previousName: z.string(), home: z.enum(["none", "renamed"]) }),
  "space-delete": SPACE_ROW.extend({ home: z.enum(["none", "closed"]) }),
  grants: z.object({ requests: z.array(GRANT_REQUEST) }),
  hosts: z.object({ hosts: z.array(HOST_LINK_VIEW) }),
  "host-check": HOST_LINK_VIEW,
  "host-forget": z.object({ name: z.string() }),
  /** `windows` says the host's ssh server announced itself as Windows OpenSSH. */
  "host-scan": z.object({ keys: z.array(HOST_KEY), windows: z.boolean() }),
  "host-trust": OK,
  /** `where` and `command` are the step a person takes on the host to authorize the key by hand. */
  "host-key": z.object({ publicKey: z.string(), where: z.string(), command: z.string() }),
  "host-authorize": OK,
  "peer-alive": z.object({ alive: z.array(z.boolean()) }),
  "peer-drive": PEER_DRIVE_RESULT,
  "peer-read": AGENT_READING,
  "peer-questions": z.object({ questions: z.array(z.custom<PendingQuestionView>(isPendingQuestionView)) }),
  "peer-status": peerFleetStatus,
  /** `host` names the linked host the agent runs on; null when it runs here. */
  "agent-read": z.object({ host: z.string().nullable(), reading: AGENT_READING }),
  "agent-pane": PANE_OUTCOME,
  "agent-wait": WAITED,
  "end-streams": z.object({ ended: z.number().int().nonnegative() }),
  reviews: z.object({ reviews: z.array(REVIEW_ITEM) }),
  "agent-worktree": WORKTREE_ACTED,
  "peer-worktree": WORKTREE_ACTED,
  /** `host` names the linked host the agent runs on; null when it runs here. */
  "attach-screen": z.object({ host: z.string(), linked: z.boolean() }),
  "peer-attach-screen": OK,
  "screen-input": OK,
  "screen-resize": OK,
  "screen-detach": OK,
  grant: z.object({ id: z.string(), decision: z.enum(["approve", "deny"]), expiresAt: z.number().nullable() }),
  "queue-list": z.object({ tasks: z.array(z.custom<TaskRec>(isTaskRec)) }),
  "queue-cancel": TASK,
  "queue-edit": TASK,
  "queue-take-on": TASK,
  "queue-reap": OK,
  "queue-intake": z.object({ intakes: z.array(PACK_INTAKE) }),
  clean: z.object({ malformed: z.array(z.string()), closed: z.number(), reaped: z.array(z.string()), removed: z.array(z.string()), liveHolders: z.array(z.string()), worktrees: WORKTREES_CLEANED.nullable() }),
  fleet: z.object({ views: z.array(AGENT_VIEW), presence: z.array(PRESENCE_ENTRY), entities: z.array(ENTITY) }),
  capacity: z.object({
    packs: z.array(z.object({ root: z.object({ id: z.string(), name: z.string() }), used: z.number(), cap: z.number() })).readonly(),
    spaces: z.array(z.object({ name: z.string(), used: z.number(), cap: z.number().nullable() })).readonly(),
    total: z.object({ host: z.string(), used: z.number(), cap: z.number().nullable() }),
  }) satisfies z.ZodType<FleetCapacity>,
  runs: z.object({ runs: z.array(RUN_RECORD) }),
  run: z.object({ run: RUN_RECORD.nullable() }),
  "agent-status": z.object({ status: AGENT_STATUS_ROW.nullable() }),
  "process-live": z.object({ live: z.boolean() }),
  "resolve-target": z.object({ entity: ENTITY, view: AGENT_VIEW.nullable(), holder: z.string().nullable(), callerOwns: z.boolean() }),
  self: z.object({ id: z.string().nullable(), kind: z.enum(CALLER_KINDS), space: z.string().nullable(), view: AGENT_VIEW.nullable(), depth: z.number().int().nonnegative(), stored: STORED_IDENTITY.nullable() }),
  "resolve-lifecycle": z.object({ entity: ENTITY, key: z.string(), view: AGENT_VIEW.nullable(), place: LIFECYCLE_PLACE, holder: z.string().nullable(), callerOwns: z.boolean() }),
  "close-targets": z.object({ targets: z.array(CLOSE_TARGET), refusal: z.string().nullable() }),
  "owned-agents": z.object({ keys: z.array(z.string()) }),
  orphans: z.object({ agents: z.array(ORPHAN) }),
  question: OK,
  ack: OK,
  "control-outcome": OK,
  reload: OK,
  questions: z.object({ questions: z.array(z.custom<PendingQuestionView>(isPendingQuestionView)) }),
  "register-session": registerSessionResponse,
  "claim-identity": z.object({ id: z.string() }),
  "peer-hello": HOST_GREETING,
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
  | "dispatch" | "steer" | "message" | "answer" | "set-model" | "lifecycle" | "clear-session" | "abort" | "spawn-headless" | "spawn" | "tile" | "tab"
  | "agent-closed" | "agent-pane" | "agent-worktree" | "adopt-agent" | "detach" | "adopt" | "rename" | "reap" | "reap-candidates" | "reclaim" | "set-handle"
  | "space-create" | "space-rename" | "space-delete" | "grant"
  | "queue-cancel" | "queue-edit" | "queue-take-on" | "queue-reap" | "queue-intake" | "clean";
/** Methods that say who is on the other end of a connection. The RPC server answers them
 *  itself, because what they decide belongs to the connection, not to a handler. */
export type IdentityMethod = "register-session" | "claim-identity" | "peer-hello";

function isPendingQuestionView(value: unknown): value is PendingQuestionView {
  if (!isRecord(value)) return false;
  return typeof value.questionId === "string"
    && typeof value.agentId === "string"
    && typeof value.key === "string"
    && (typeof value.name === "string" || value.name === null)
    && HOST_IDENTITY.safeParse(value.host).success
    && (typeof value.space === "string" || value.space === null)
    && typeof value.question === "string"
    && typeof value.askedAt === "number";
}

/** Another host's `orch status --json`, read off its stdout: the one status payload that crosses a trust boundary. */
export function isFleetStatus(value: unknown): value is FleetStatus {
  return fleetStatus.safeParse(value).success;
}

