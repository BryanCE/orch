import type { AgentLink } from "../control/agent-links.ts";
import type { BridgeDelivery } from "../shared/bridge-message.ts";
import type { SessionViewEntry } from "../types/adapter.ts";
import type { SessionLinkEvents, TurnOutcome } from "../types/held-session.ts";
import { acpEntryBuilder, outcomeOf } from "./entries.ts";
import {
  openAcpSession,
  type AcpClientInfo,
  type AcpOpen,
  type AcpSession,
  type AcpStreams,
} from "./session.ts";

/** A control link and the session it drives. */
export interface AcpLink {
  readonly link: AgentLink;
  readonly session: AcpSession;
}

/** Opens a queued prompt link over one ACP session. */
export async function openAcpLink(
  streams: AcpStreams,
  open: AcpOpen,
  info: AcpClientInfo,
  events: SessionLinkEvents,
): Promise<AcpLink> {
  const builder = acpEntryBuilder();
  const asks = new Map<string, (optionId: string | null) => void>();
  const prompts: { readonly id: string; readonly text: string }[] = [];
  let running = false;
  let closed = false;
  let text = "";
  let messageId: string | null = null;
  let continuingMessage = false;
  const emit = (entries: readonly SessionViewEntry[]) => {
    if (entries.length > 0) events.onEntries(entries);
  };
  const reportError = (error: unknown) => {
    const failure = error instanceof Error ? error : new Error(String(error));
    events.onError(failure);
    return failure;
  };
  const dropAsks = () => {
    for (const [id, resolve] of asks) {
      asks.delete(id);
      resolve(null);
      events.onAskDropped(id);
    }
  };
  const session = await openAcpSession(streams, open, {
    onLoad() {
      events.onLoad?.();
    },
    onUpdate(update) {
      if (update.sessionUpdate === "agent_message_chunk" && update.content.type === "text") {
        const id = update.messageId ?? null;
        text = continuingMessage && messageId === id ? text + update.content.text : update.content.text;
        messageId = id;
        continuingMessage = true;
      } else {
        continuingMessage = false;
      }
      emit(builder.push(update));
    },
    onPermission(ask) {
      return new Promise<string | null>((resolve) => {
        const id = events.onAsk(ask);
        asks.set(id, resolve);
      });
    },
  }, info);
  emit(builder.flush());
  void session.ended.then(dropAsks);

  async function nextPrompt(): Promise<void> {
    if (running || closed) return;
    const prompt = prompts.shift();
    if (!prompt) return;
    running = true;
    text = "";
    continuingMessage = false;
    events.onApplied(prompt.id);
    events.onTurnStarted(prompt.id);
    let outcome: TurnOutcome;
    try {
      outcome = outcomeOf(await session.prompt(prompt.text));
    } catch (error) {
      const failure = reportError(error);
      outcome = { state: "error", error: failure.message };
    }
    emit(builder.flush());
    events.onTurnEnded(outcome, text);
    running = false;
    void nextPrompt();
  }

  const link: AgentLink = {
    takes: session.offer.modelOption === null
      ? ["dispatch", "steer", "answer"]
      : ["dispatch", "steer", "answer", "model"],
    push(delivery: BridgeDelivery) {
      if (closed) {
        reportError(new Error(`ACP link is closed: ${delivery.message.action} ${delivery.id} was not sent`));
        return;
      }
      const message = delivery.message;
      switch (message.action) {
        case "dispatch":
        case "steer":
          prompts.push({ id: delivery.id, text: message.text });
          void nextPrompt();
          return;
        case "answer": {
          const resolve = asks.get(message.questionId);
          if (!resolve || message.optionId === null) {
            reportError(new Error(`No selectable ACP ask for ${message.questionId}`));
            return;
          }
          asks.delete(message.questionId);
          resolve(message.optionId);
          events.onApplied(delivery.id);
          if (asks.size === 0) events.onAsksSettled();
          return;
        }
        case "model":
          void session.setModel(message.model).then(() => events.onApplied(delivery.id), reportError);
          return;
        default: {
          const exhaustive: never = message;
          return exhaustive;
        }
      }
    },
    async reset() {
      if (running) throw new Error("a turn is running; abort it before starting a new conversation");
      prompts.length = 0;
      dropAsks();
      events.onReset(await session.renew());
    },
    abort() {
      const cancelling = session.cancel();
      dropAsks();
      void cancelling.catch(reportError);
    },
    close() {
      closed = true;
      prompts.length = 0;
      dropAsks();
      void session.close().catch(reportError);
    },
  };
  return { link, session };
}
