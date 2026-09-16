import type { OrchDir, LogContext, Logger } from "../../../types/core.ts";
import { SETTINGS_DEFAULTS } from "../../../settings/schema.ts";
import { errorMessage } from "../../../util.ts";
import { randomUUID } from "node:crypto";
import { withTransaction } from "../../../store/connection.ts";
import { currentLease } from "../../../store/lease-rows.ts";
import { insertOutboxMessage, outboxMessageState, selectOutboxMessage } from "../../../store/outbox-rows.ts";
import { confirmDelivery } from "../../../control/ack.ts";
import { checkWall, operatorControls } from "../../../policy/space.ts";
import { emitAndNotify } from "../events.ts";
import { deliverOutboxMessage } from "../outbox.ts";
import { acceptMail, mailDelivery } from "../mail.ts";
import { normalizeControlTarget } from "../../../control/normalize-target.ts";
import { deliverControl, resolveTargetAdapter, resolveTargetRoute } from "../../../control/dispatch.ts";
import { isAgentGone } from "../../../control/agent-gone.ts";
import { bridgeAttached } from "../../../control/bridge-links.ts";
import { isOutboxPayload } from "../../../control/bridge-message.ts";
import { agentView } from "../../../store/agent-view.ts";
import { agentProcessLive } from "../../../store/interval-rows.ts";
import { decisionLogger } from "../../client/decision-log.ts";
import { leaseHolderIsAlive } from "../state.ts";
import type { DaemonState } from "../state.ts";
import type { Governance, ParamsOf } from "../../client/protocol.ts";
import type { NotifyEvent } from "../../../types/notify.ts";
import type { OutboxDelivery, OutboxDeps } from "../../../types/daemon.ts";
import { pendingQuestion, settleQuestion } from "../../../store/question-rows.ts";

/** Build the event carrying mail for a live session with no bridge route. */
function sessionMessageEvent(directory: OrchDir, key: string, id: string, text: string): NotifyEvent {
  const view = agentView(directory, key);
  const holder = currentLease(directory, key)?.orchId;
  return {
    type: "message",
    key,
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
function deliverToSessionStream(state: DaemonState, target: string, action: string, id: string, text: string, log: Logger): OutboxDelivery {
  const directory = state.directory;
  if (!agentProcessLive(directory, target)) {
    log.warn("dispatch.gone", { target, reason: "no delivery route" });
    return "gone";
  }
  const event = sessionMessageEvent(directory, target, id, text);
  emitAndNotify((published) => state.server?.emit(published), state.services.settings.current().notify, event, directory, state.services.settings);
  log.info("dispatch.delivered", { target, action, reason: "session-stream" });
  return "acked";
}

/** Send one outbox write into its target's text channel. New work and a mid-run steer
 *  differ only in the action kind; both go through the one control dispatcher. Mail is a
 *  steer when its direction's `mail` setting is `prompt`, and a stream event on `events`. */
export async function deliverWrite(state: DaemonState, target: string, payload: unknown, id: string): Promise<OutboxDelivery> {
  const directory = state.directory;
  const canonicalTarget = normalizeControlTarget(directory, target);
  const log = decisionLogger(directory, state.services.settings.currentOrNull()).forCorrelation(id);
  if (!isOutboxPayload(payload) || payload.action === "answer" || payload.action === "model") {
    log.warn("dispatch.malformed", { target: canonicalTarget });
    return "gone";
  }
  const text = payload.text;
  if (payload.action === "mail" && mailDelivery(directory, state.services.settings.current().mail, payload.from, canonicalTarget) === "events") {
    return deliverToSessionStream(state, canonicalTarget, payload.action, id, text, log);
  }
  const kind = payload.action === "dispatch" ? "run" : "steer";
  const route = resolveTargetRoute(directory, canonicalTarget);
  // Nobody spawned a raw session, so nothing composes a bridge for it: its event stream is its channel.
  const rawSession = agentView(directory, canonicalTarget)?.spawnedBy === null;
  if (rawSession && !bridgeAttached(canonicalTarget) && !route?.backend.agentInput) {
    return deliverToSessionStream(state, canonicalTarget, payload.action, id, text, log);
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
    const outcome = await deliverControl(directory, state.services.settings.current(), state.services.models, canonicalTarget, { kind, text, id });
    if (outcome.outcome === "answer") {
      const agentId = canonicalTarget;
      decisionLogger(directory, state.services.settings.currentOrNull(), { correlationId: id, agentId }).debug("boundary.answer", {
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
    deliver: (target, payload, id) => deliverWrite(state, target, payload, id),
    now: () => Date.now(),
    maxAttempts: state.services.settings.current().daemon.outbox_max_attempts,
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
 * through here at all. */
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
    decisionLogger(directory, settings.currentOrNull(), { ...context, agentId: targetId }).debug("lease.granted", {
      target,
      holderId: lease === null ? null : (holderId ?? lease.orchId),
      holderAlive,
    });
  };
  if (foreignLease && lease !== null && holderAlive) {
    // The space's human operator keeps control of every fleet keyed into their
    // space, whichever orch holds it; a spawned agent's actor token is its own
    // id, never `operator`, so this lane grants an agent nothing.
    if (!operatorControls(directory, actor, target, actorSpace, actorIsOperator)) {
      decisionLogger(directory, settings.currentOrNull(), { ...context, agentId: targetId }).debug("lease.refused", {
        target,
        holderId: holderId ?? lease.orchId,
        holderAlive: true,
        steal,
      });
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

async function acceptTextWrite<M extends "dispatch" | "steer">(state: DaemonState, action: M, params: ParamsOf<M>, id: string): Promise<"none" | "expected"> {
  const directory = state.directory;
  const { target, text } = params;
  const log = decisionLogger(directory, state.services.settings.currentOrNull()).forCorrelation(id);
  withTransaction(directory, () => {
    governWrite(state, target, params, { correlationId: id });
    insertOutboxMessage(directory, { id, target, payload: { action, text } });
  });
  log.info("dispatch.accepted", { target, action });
  await deliverOutboxMessage(directory, id, outboxDeps(state));
  const deliveryState = outboxMessageState(directory, id);
  if (deliveryState === "undeliverable") throw new Error(`write ${id}: agent ${target} is gone`);
  if (deliveryState === "pending") {
    log.info("dispatch.queued", { target, action, reason: "bridge-detached" });
    return "none";
  }
  if (deliveryState === "awaiting") return "expected";
  if (deliveryState === "delivered") log.info("dispatch.delivered", { target, action });
  return "none";
}

async function deliverAcceptedText(state: DaemonState, id: string): Promise<"none" | "expected"> {
  const directory = state.directory;
  const row = selectOutboxMessage(directory, id);
  if (row === undefined) throw new Error(`write ${id} does not exist`);
  await deliverOutboxMessage(directory, id, outboxDeps(state));
  const deliveryState = outboxMessageState(directory, id);
  if (deliveryState === "undeliverable") throw new Error(`write ${id}: agent ${row.target} is gone`);
  if (deliveryState === "pending") {
    decisionLogger(directory, state.services.settings.currentOrNull()).forCorrelation(id).info("dispatch.queued", { target: row.target, action: row.payload.action, reason: "bridge-detached" });
    return "none";
  }
  if (deliveryState === "awaiting") return "expected";
  if (deliveryState === "delivered") decisionLogger(directory, state.services.settings.currentOrNull()).forCorrelation(id).info("dispatch.delivered", { target: row.target, action: row.payload.action });
  return "none";
}

async function confirmTextWrite<M extends "dispatch" | "steer">(state: DaemonState, action: M, params: ParamsOf<M>): Promise<{ accepted: true; id: string; ack: "acknowledged" | "unavailable" }> {
  const id = randomUUID();
  const timeoutMs = state.services.settings.current().timeouts.dispatch_ack_ms;
  let ack: "acknowledged" | "unavailable";
  try {
    ack = await confirmDelivery(id, timeoutMs, () => acceptTextWrite(state, action, params, id));
  } catch (error: unknown) {
    if (!errorMessage(error).includes(`delivery ${id} was not acknowledged within`)) throw error;
    ack = outboxMessageState(state.directory, id) === "delivered" ? "acknowledged" : "unavailable";
  }
  return { accepted: true, id, ack };
}

export async function steer(state: DaemonState, params: ParamsOf<"steer">) {
  return confirmTextWrite(state, "steer", params);
}

export async function dispatch(state: DaemonState, params: ParamsOf<"dispatch">) {
  return confirmTextWrite(state, "dispatch", params);
}

export async function message(state: DaemonState, params: ParamsOf<"message">): Promise<{ accepted: true; id: string; ack: "acknowledged" | "unavailable" }> {
  const directory = state.directory;
  const settings = state.services.settings;
  const from = params.from;
  const target = params.target;
  const sender = agentView(directory, params.from);
  const prefix = sender ? `[from ${sender.name} (${params.from})] ` : `[from ${params.from}] `;
  const accepted = acceptMail(directory, settings.currentOrNull(), from, target, prefix + params.text);
  const timeoutMs = settings.current().timeouts.dispatch_ack_ms;
  let ack: "acknowledged" | "unavailable";
  try {
    ack = await confirmDelivery(accepted.id, timeoutMs, () => deliverAcceptedText(state, accepted.id));
  } catch (error: unknown) {
    if (!errorMessage(error).includes(`delivery ${accepted.id} was not acknowledged within`)) throw error;
    ack = outboxMessageState(directory, accepted.id) === "delivered" ? "acknowledged" : "unavailable";
  }
  return { accepted: true, id: accepted.id, ack };
}

export async function answer(state: DaemonState, params: ParamsOf<"answer">): Promise<{ accepted: true; id: string; ack: "acknowledged" | "unavailable" }> {
  const directory = state.directory;
  const settings = state.services.settings;
  const target = params.target;
  const text = params.text;
  const targetId = target;
  const current = pendingQuestion(directory, targetId);
  const requestedQuestionId = params.questionId;
  if (current === undefined || (requestedQuestionId !== undefined && current.id !== requestedQuestionId)) {
    throw new Error(requestedQuestionId === undefined
      ? `${target} is not asking a question`
      : `question ${requestedQuestionId} is not pending for ${target}`);
  }
  governWrite(state, target, params);
  const id = randomUUID();
  const ack = await confirmDelivery(id, settings.current().timeouts.dispatch_ack_ms, async () => {
    const outcome = await deliverControl(directory, settings.current(), state.services.models, target, { kind: "answer", text, id });
    if (outcome.outcome === "answer") throw new Error(outcome.text);
    if (!settleQuestion(directory, { id: current.id, answer: text, answeredAt: Date.now() })) {
      throw new Error(`question ${current.id} is no longer pending`);
    }
    return outcome.ack;
  });
  return { accepted: true, id, ack };
}
