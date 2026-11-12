import type { OrchDir, LogContext, Logger } from "../../../types/core.ts";
import { SETTINGS_DEFAULTS } from "../../../settings/schema.ts";
import { errorMessage } from "../../../util.ts";
import { randomUUID } from "node:crypto";
import { withTransaction } from "../../../store/connection.ts";
import { currentLease } from "../../../store/lease-rows.ts";
import { insertOutboxMessage, outboxMessageState, selectOutboxMessage } from "../../../store/outbox-rows.ts";
import { confirmDelivery } from "../../../control/ack.ts";
import { echoAwaited } from "../../../control/echo.ts";
import type { ControlAck } from "../../../types/control.ts";
import { checkWall, operatorControls } from "../../../policy/space.ts";
import { publishFromOrchd } from "../events.ts";
import { deliverOutboxMessage } from "../outbox.ts";
import { acceptMail, mailDelivery } from "../mail.ts";
import { normalizeControlTarget } from "../../../control/normalize-target.ts";
import { deliverControl, resolveTargetAdapter, resolveTargetRoute } from "../../../control/dispatch.ts";
import { isAgentGone } from "../../../control/agent-gone.ts";
import { linkAttached } from "../../../control/agent-links.ts";
import { isOutboxPayload } from "../../../shared/bridge-message.ts";
import { agentView } from "../../../store/agent-view.ts";
import { leaseHolderIsAlive } from "../state.ts";
import type { DaemonState } from "../state.ts";
import type { Governance, ParamsOf } from "../../client/protocol.ts";
import type { NotifyEvent } from "../../../types/notify.ts";
import type { OutboxDelivery, OutboxDeps } from "../../../types/daemon.ts";
import { pendingQuestion, questionOptionsOf, settleQuestion } from "../../../store/question-rows.ts";
import { hereIsLive, hostOfPlace, placeAgentIfAny } from "../../../process-place.ts";
import { hostIdentity } from "../../../hosts/identity.ts";
import type { HereAgent } from "../../../types/agent-place.ts";
import { atAgentHost, driveOnHost } from "./host.ts";
import { getAdapter } from "../../../adapters/registry.ts";
import { workerPrompt } from "../../../worker-prompt.ts";

/** Build the event carrying mail for a live session with no bridge route. */
function sessionMessageEvent(directory: OrchDir, agent: HereAgent, id: string, text: string): NotifyEvent {
  const key = agent.id;
  const view = agentView(directory, key);
  const holder = currentLease(directory, key)?.orchId;
  return {
    type: "message",
    key,
    host: hostIdentity(),
    space: view?.environment.space ?? undefined,
    agent: view?.name ?? null,
    name: view?.name ?? null,
    tab: null,
    model: null,
    ...(holder === undefined ? {} : { holder }),
    newState: "message",
    dispatchId: id,
    ts: new Date().toISOString(),
    mail: { id, text },
  };
}

/** Publish one write as a `message` event on a live target's stream. The target's input is
 *  never touched; a dead target has no stream, so the write is gone. */
function deliverToSessionStream(state: DaemonState, agent: HereAgent, action: string, id: string, text: string, log: Logger): OutboxDelivery {
  const directory = state.directory;
  if (!hereIsLive(directory, agent)) {
    log.warn("dispatch.gone", { target: agent.id, reason: "no delivery route" });
    return "gone";
  }
  const event = sessionMessageEvent(directory, agent, id, text);
  publishFromOrchd(state, event);
  log.info("dispatch.delivered", { target: agent.id, action, reason: "session-stream" });
  return "acked";
}

/** Deliver one outbox write to the agent it names, where it runs. Only an agent here has a
 *  delivery route on this machine; a write recorded for one on another host is that host's
 *  orchd's to deliver (writes to it go over its link), so it is gone from here. */
async function deliverOutboxWrite(state: DaemonState, target: string, payload: unknown, id: string): Promise<OutboxDelivery> {
  const directory = state.directory;
  const canonicalTarget = normalizeControlTarget(directory, target);
  const log = state.services.logger.forCorrelation(id);
  const place = placeAgentIfAny(directory, canonicalTarget);
  if (place === null) {
    log.warn("dispatch.gone", { target: canonicalTarget, reason: "no agent row" });
    return "gone";
  }
  switch (place.kind) {
    case "here":
      return deliverWrite(state, place.agent, payload, id);
    case "linked":
    case "unreachable":
      log.warn("dispatch.gone", { target: canonicalTarget, reason: `runs on host ${hostOfPlace(place)}, whose orchd delivers its writes` });
      return "gone";
    default: {
      const exhaustive: never = place;
      throw new Error(`unknown agent place ${String(exhaustive)}`);
    }
  }
}

/** Send one outbox write into the text channel of an agent this orchd runs. New work and a
 *  mid-run steer differ only in the action kind; both go through the one control dispatcher.
 *  Mail is a steer when its direction's `mail` setting is `prompt`, and a stream event on
 *  `events`. */
export async function deliverWrite(state: DaemonState, agent: HereAgent, payload: unknown, id: string): Promise<OutboxDelivery> {
  const directory = state.directory;
  const canonicalTarget = agent.id;
  const log = state.services.logger.forCorrelation(id);
  if (!isOutboxPayload(payload) || payload.action === "answer" || payload.action === "model") {
    log.warn("dispatch.malformed", { target: canonicalTarget });
    return "gone";
  }
  const text = payload.text;
  if (payload.action === "mail" && mailDelivery(directory, state.services.settings.current().mail, payload.from, agent) === "events") {
    return deliverToSessionStream(state, agent, payload.action, id, text, log);
  }
  const kind = payload.action === "dispatch" ? "run" : "steer";
  const route = resolveTargetRoute(directory, agent);
  // A raw session registered itself; orch launched none of it, so nothing composes a bridge for
  // it and its event stream is its channel. The row's kind says so, never its spawner: an agent
  // a linked host asked for has no spawner here and is still orch's launch, bridge and all.
  const caller = agentView(directory, canonicalTarget)?.kind;
  const rawSession = caller !== undefined && caller !== "agent";
  if (rawSession && !linkAttached(canonicalTarget) && !route?.backend.agentInput) {
    return deliverToSessionStream(state, agent, payload.action, id, text, log);
  }
  if (!resolveTargetAdapter(directory, canonicalTarget)) {
    if (!route?.backend.agentInput) {
      log.warn("dispatch.gone", { target: canonicalTarget, reason: "no delivery route" });
      return "gone";
    }
    route.backend.agentInput.submit(String(route.handle), text);
    return "acked";
  }
  try {
    const outcome = await deliverControl(directory, state.services.settings.current(), state.services.models, agent, { kind, text, id });
    if (outcome.outcome === "answer") {
      const agentId = canonicalTarget;
      state.services.logger.forCorrelation(id).forAgent(agentId).debug("boundary.answer", {
        target: canonicalTarget,
        reason: outcome.reason,
      });
      log.warn("dispatch.refused", { target: canonicalTarget, reason: outcome.reason, text: outcome.text });
      return "acked";
    }
    return outcome.ack === "expected" ? "queued" : "acked";
  } catch (error) {
    if (isAgentGone(error)) {
      log.warn("dispatch.gone", { target: canonicalTarget, reason: errorMessage(error) });
      return "gone";
    }
    log.error("dispatch.failed", { target: canonicalTarget, error: errorMessage(error) });
    return "failed";
  }
}

export function outboxDeps(state: DaemonState): OutboxDeps {
  return {
    deliver: (target, payload, id) => deliverOutboxWrite(state, target, payload, id),
    now: () => Date.now(),
    maxAttempts: state.services.settings.current().daemon.outbox_max_attempts,
    logger: state.services.logger,
  };
}

/** Enforce the space wall, then lease authority, before a write is accepted.
 *
 * A1: ownership IS the lease. There is no second `ownership` id space beside
 * `agent_leases` for this gate to consult, so the whole rule is stated once, on
 * the one lease. An open lease is mutual exclusion for every driving verb, but
 * ONLY while its holder is alive: Rule 11 - a dead holder is not a collision, it
 * is a stale row, and gating on one strands a whole fleet with nothing able to
 * drive it. Exclusion is never authorization: `abort`/`close`/`reap` do not come
 * through here at all.
 *
 * Across hosts the gate runs once, here, on the host the caller typed the verb on; a
 * target on a linked host is then driven by that host's orchd, which takes this ruling
 * and never gates again. Only the HOLDER's liveness is read, never the target's, so a
 * far target whose host is offline cannot make a write refuse here: the link refuses it,
 * by name, after the gate. A holder that itself runs on a linked host reads as alive
 * while its liveness is unknown (unknown is never dead), so a foreign live-or-unknown
 * holder still excludes, exactly as a local live one does. */
export function governWrite(state: DaemonState, target: string, params: Governance, context: LogContext = {}): void {
  const directory = state.directory;
  const settings = state.services.settings;
  const actor = params.actor && params.actor.length > 0 ? params.actor : null;
  const steal = params.steal === true;
  const actorSpace = params.actorSpace ?? null;
  const actorIsOperator = params.actorIsOperator === true;
  const configuredSettings = settings.currentOrNull();
  const configuredCrossSpace = configuredSettings === null
    ? SETTINGS_DEFAULTS.fleet.cross_space
    : configuredSettings.fleet.cross_space;
  const crossSpace = params.crossSpace === true || configuredCrossSpace;
  const wall = checkWall(directory, actor, target, { crossSpace });
  if (!wall.allowed) throw new Error(wall.reason ?? "space wall denied the write");
  const targetId = target;
  const lease = currentLease(directory, targetId);
  const actorId = actor;
  const holderId = lease?.orchId;
  const holderAlive = lease === null ? false : leaseHolderIsAlive(directory, lease.orchId);
  const foreignLease = lease !== null && holderId !== actorId;
  // Every grant is part of the decision trail, not just the interesting ones: a
  // dispatch whose lease step left no record cannot be told apart from one that
  // never reached the lease step at all.
  const logLeaseGrant = (): void => {
    state.services.logger.debug("lease.granted", {
      target,
      holderId: lease === null ? null : (holderId ?? lease.orchId),
      holderAlive,
    }, { ...context, agentId: targetId });
  };
  if (foreignLease && lease !== null && holderAlive) {
    // The space's human operator keeps control of every fleet keyed into their
    // space, whichever orch holds it; a spawned agent's actor token is its own
    // id, never `operator`, so this lane grants an agent nothing.
    if (!operatorControls(directory, actor, target, actorSpace, actorIsOperator)) {
      state.services.logger.debug("lease.refused", {
        target,
        holderId: holderId ?? lease.orchId,
        holderAlive: true,
        steal,
      }, { ...context, agentId: targetId });
      // C4: taking an agent from a LIVE orch is deliberate and has its own verb.
      // A driving verb must never transfer a holding as a side effect, so the
      // refusal names the verb that does it instead of doing it here.
      throw new Error(steal
        ? `agent is leased by ${lease.orchId}; take it deliberately with 'orch adopt ${target} --steal', then drive it`
        : `agent is leased by ${lease.orchId}; only its lease holder may drive it`);
    }
  }
  logLeaseGrant();
}

/** What the caller of one write waits on, read from the row its delivery attempt left. */
function writeAck(state: DaemonState, id: string, target: string, action: string): ControlAck {
  const log = state.services.logger.forCorrelation(id);
  const deliveryState = outboxMessageState(state.directory, id);
  if (deliveryState === "undeliverable") throw new Error(`write ${id}: agent ${target} is gone`);
  if (deliveryState === "pending") {
    log.info("dispatch.queued", { target, action, reason: "bridge-detached" });
    return "none";
  }
  if (deliveryState === "awaiting") return "expected";
  if (deliveryState === "delivered") log.info("dispatch.delivered", { target, action });
  return echoAwaited(id) ? "echo" : "none";
}

/** The ack once the wait timed out: a bridge ack can land just after the timer; a typed prompt counts only once echoed. */
function lateAck(directory: OrchDir, id: string): "acknowledged" | "unavailable" {
  return outboxMessageState(directory, id) === "delivered" && !echoAwaited(id) ? "acknowledged" : "unavailable";
}

type TextAction = "dispatch" | "steer";
interface Accepted { accepted: true; id: string; ack: "acknowledged" | "unavailable" }

/** Rules on one write inside the transaction that records it, by its correlation id. */
type WriteGate = (correlationId: string) => void;

async function acceptTextWrite(state: DaemonState, action: TextAction, target: string, text: string, id: string, gate: WriteGate): Promise<ControlAck> {
  const directory = state.directory;
  withTransaction(directory, () => {
    gate(id);
    insertOutboxMessage(directory, { id, target, payload: { action, text } });
  });
  state.services.logger.forCorrelation(id).info("dispatch.accepted", { target, action });
  await deliverOutboxMessage(directory, id, outboxDeps(state));
  return writeAck(state, id, target, action);
}

async function deliverAcceptedText(state: DaemonState, id: string): Promise<ControlAck> {
  const directory = state.directory;
  const row = selectOutboxMessage(directory, id);
  if (row === undefined) throw new Error(`write ${id} does not exist`);
  await deliverOutboxMessage(directory, id, outboxDeps(state));
  return writeAck(state, id, row.target, row.payload.action);
}

/** Record one text write to an agent this orchd runs and deliver it, waiting for its ack. A
 *  write a linked host asked for was ruled on there, so its gate rules on nothing here. */
export async function confirmTextWrite(state: DaemonState, action: TextAction, agent: HereAgent, text: string, gate: WriteGate): Promise<Accepted> {
  const id = randomUUID();
  const timeoutMs = state.services.settings.current().timeouts.dispatch_ack_ms;
  let ack: "acknowledged" | "unavailable";
  try {
    ack = await confirmDelivery(id, timeoutMs, () => acceptTextWrite(state, action, agent.id, text, id, gate));
  } catch (error: unknown) {
    if (!errorMessage(error).includes(`delivery ${id} was not acknowledged within`)) throw error;
    ack = lateAck(state.directory, id);
  }
  return { accepted: true, id, ack };
}

/** The agent a write names, for placing it. A target that names no agent stays as written,
 *  and this host's delivery answers for it as it always has. */
function placedKey(directory: OrchDir, target: string): string {
  try {
    return normalizeControlTarget(directory, target);
  } catch {
    return target;
  }
}

/** A text write, ruled on here and delivered where the agent runs: by this orchd, or by its
 *  host's orchd over the link, which delivers it with its own code and answers for the ack. */
function writeText(state: DaemonState, action: TextAction, params: ParamsOf<TextAction>): Promise<Accepted> {
  const { target, text } = params;
  const key = placedKey(state.directory, target);
  const here = (agent: HereAgent): Promise<Accepted> => confirmTextWrite(state, action, agent, text, (id) => { governWrite(state, target, params, { correlationId: id }); });
  return atAgentHost(state, key, {
    here,
    there: async (link) => {
      governWrite(state, target, params);
      const { accepted, id, ack } = await driveOnHost(state, link, { action, key, text, actor: params.actor ?? null });
      return { accepted, id, ack };
    },
  });
}

export async function steer(state: DaemonState, params: ParamsOf<"steer">): Promise<Accepted> {
  return writeText(state, "steer", params);
}

/** Work for an agent. A `worker` dispatch is wrapped in the worker header composed for the
 *  harness named, from what that harness's adapter takes; any other is sent as written. */
export async function dispatch(state: DaemonState, params: ParamsOf<"dispatch">): Promise<Accepted> {
  const worker = params.worker;
  if (worker === undefined) return writeText(state, "dispatch", params);
  const adapter = worker.harness === null ? undefined : getAdapter(worker.harness);
  return writeText(state, "dispatch", { ...params, text: workerPrompt(params.text, false, adapter, worker.context) });
}

export async function message(state: DaemonState, params: ParamsOf<"message">): Promise<Accepted> {
  const directory = state.directory;
  const settings = state.services.settings;
  const from = params.from;
  const target = params.target;
  const sender = agentView(directory, params.from);
  const prefix = sender ? `[from ${sender.name}] ` : `[from ${params.from}] `;
  const accepted = acceptMail(directory, settings.currentOrNull(), from, target, prefix + params.text, state.services.logger);
  const timeoutMs = settings.current().timeouts.dispatch_ack_ms;
  let ack: "acknowledged" | "unavailable";
  try {
    ack = await confirmDelivery(accepted.id, timeoutMs, () => deliverAcceptedText(state, accepted.id));
  } catch (error: unknown) {
    if (!errorMessage(error).includes(`delivery ${accepted.id} was not acknowledged within`)) throw error;
    ack = lateAck(directory, accepted.id);
  }
  return { accepted: true, id: accepted.id, ack };
}

/** Answer the question an agent this orchd runs is asking: deliver the answer, then settle
 *  the question. `questionId`, when given, must name the pending one. */
export async function answerHere(state: DaemonState, agent: HereAgent, text: string, questionId: string | null): Promise<Accepted> {
  const directory = state.directory;
  const settings = state.services.settings;
  const current = pendingQuestion(directory, agent.id);
  if (current === undefined || (questionId !== null && current.id !== questionId)) {
    throw new Error(questionId === null
      ? `${agent.id} is not asking a question`
      : `question ${questionId} is not pending for ${agent.id}`);
  }
  const options = questionOptionsOf(directory, current.id);
  let optionId: string | null = null;
  if (options.length > 0) {
    const position = /^\d+$/.test(text) ? Number(text) : NaN;
    const option = Number.isSafeInteger(position) ? options[position - 1] : undefined;
    if (option === undefined) throw new Error(`answer with a number from 1 to ${options.length}`);
    optionId = option.id;
    text = option.label;
  }
  const id = randomUUID();
  const ack = await confirmDelivery(id, settings.current().timeouts.dispatch_ack_ms, async () => {
    const outcome = await deliverControl(directory, settings.current(), state.services.models, agent, { kind: "answer", text, optionId, id });
    if (outcome.outcome === "answer") throw new Error(outcome.text);
    if (!settleQuestion(directory, { id: current.id, answer: text, answeredAt: Date.now() })) {
      throw new Error(`question ${current.id} is no longer pending`);
    }
    return outcome.ack;
  });
  return { accepted: true, id, ack };
}

/** `answer`: ruled on here, answered where the agent runs. An agent on a linked host has its
 *  question pending in that host's store, so that host's orchd answers it. */
export async function answer(state: DaemonState, params: ParamsOf<"answer">): Promise<Accepted> {
  const key = placedKey(state.directory, params.target);
  const questionId = params.questionId ?? null;
  governWrite(state, params.target, params);
  return atAgentHost(state, key, {
    here: (agent) => answerHere(state, agent, params.text, questionId),
    there: async (link) => {
      const { accepted, id, ack } = await driveOnHost(state, link, { action: "answer", key, text: params.text, questionId, actor: params.actor ?? null });
      return { accepted, id, ack };
    },
  });
}
