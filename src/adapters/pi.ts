import {
  isRecord,
  loadPresence,
  statusForPresence,
  steerPresence,
  writeAnswer,
  type PresenceEntry,
} from "../store.ts";
import { parseSession } from "../session.ts";
import type {
  AdapterCommand,
  AgentAdapter,
  AgentState,
  AnswerRequest,
  ResultExtractionInput,
  SpawnOpts,
  StateDetectionInput,
  SteerRequest,
} from "./adapter.ts";

/** State input for pi, identified by its orch presence key. */
export interface PiStateDetectionInput extends StateDetectionInput {
  /** Presence key whose status.json is authoritative. */
  readonly key: string;
}

/** Result input for pi, identified by its orch presence key. */
export interface PiResultExtractionInput extends ResultExtractionInput {
  /** Presence key whose result.json is authoritative. */
  readonly key: string;
}

const AGENT_STATES = new Set<AgentState>([
  "idle",
  "working",
  "blocked",
  "done",
  "error",
  "aborted",
  "exited",
  "unknown",
]);

/**
 * Tools a spawned pi worker may load. Keep this explicit: --no-builtin-tools
 * prevents globally installed tools/extensions from silently expanding it.
 * The bridge registers the four orch_* tools; herdr-agent-state registers none.
 */
export const PI_APPROVED_TOOLS = [
  "read",
  "write",
  "edit",
  "bash",
  "orch_ask",
  "orch_agents",
  "orch_send",
  "orch_read",
] as const;

const PI_TOOL_ALLOWLIST = PI_APPROVED_TOOLS.join(",");

export function presenceFor(key: string): PresenceEntry | undefined {
  return loadPresence().get(key);
}

function stateFrom(value: unknown): AgentState {
  return typeof value === "string" && AGENT_STATES.has(value as AgentState)
    ? value as AgentState
    : "unknown";
}

/** Pi adapter preserving the existing pi + orchestrator-bridge behavior. */
export class PiAdapter implements AgentAdapter {
  readonly id = "pi" as const;

  /** Pi supports every D4 capability through the bridge and session files. */
  readonly caps = {
    steer: "inbox" as const,
    ask: true,
    setModel: true,
    sessionTail: true,
  };

  /** Start pi directly in an interactive herdr pane. */
  interactiveCmd(_opts: SpawnOpts): string {
    return "pi";
  }

  /** Start pi with only the built-ins and orch bridge tools workers need. */
  restrictedInteractiveCmd(opts: SpawnOpts): string {
    return `pi --tools ${opts.tools ?? PI_TOOL_ALLOWLIST} --no-builtin-tools`;
  }

  /** Start the existing pif wrapper with the initial prompt for headless runs. */
  headlessCmd(prompt: string, opts: SpawnOpts): string[] {
    const command = ["pif"];
    if (opts.model) command.push("--model", opts.model);
    command.push(prompt);
    return command;
  }

  /** Start pif with the same explicit worker tool allowlist as interactive pi. */
  restrictedHeadlessCmd(prompt: string, opts: SpawnOpts): string[] {
    const command = ["pif", "--tools", opts.tools ?? PI_TOOL_ALLOWLIST, "--no-builtin-tools"];
    if (opts.model) command.push("--model", opts.model);
    command.push(prompt);
    return command;
  }

  /** Read pi's authoritative status.json through the shared presence helpers. */
  detectState(input: PiStateDetectionInput): AgentState {
    const presence = presenceFor(input.key);
    return presence ? stateFrom(statusForPresence(presence)?.state) : "unknown";
  }

  /** Append pi's steer message to inbox.jsonl through the shared store helper. */
  steer(request: SteerRequest): AdapterCommand | undefined {
    const presence = presenceFor(request.key);
    if (!presence) return undefined;
    steerPresence(presence, request.text);
    return undefined;
  }

  /** Write pi's blocking answer through the shared store helper. */
  answer(request: AnswerRequest): AdapterCommand | undefined {
    const presence = presenceFor(request.key);
    if (!presence) return undefined;
    writeAnswer(presence, request.text);
    return undefined;
  }

  /** Read result.json first, then fall back to the last assistant session entry. */
  extractResult(input: PiResultExtractionInput): string | undefined {
    const result = presenceFor(input.key)?.result;
    if (isRecord(result) && typeof result.text === "string") return result.text;
    if (!input.sessionPath) return undefined;
    return parseSession(input.sessionPath).lastAssistant ?? undefined;
  }
}

/** Shared pi adapter instance for command wiring. */
export const piAdapter = new PiAdapter();
