import { errorMessage } from "../../util.ts";
import type { Logger } from "../../types/core.ts";
import type { NotifyEvent } from "../../types/notify.ts";

export interface EventBus {
  emit(event: NotifyEvent): void;
  on(handler: (event: NotifyEvent) => void): () => void;
}

export function createEventBus(logger: Logger): EventBus {
  const handlers = new Set<(event: NotifyEvent) => void>();
  return {
    on: (handler) => {
      const wrapped = (event: NotifyEvent): void => {
        try {
          handler(event);
        } catch (error: unknown) {
          logger.warn("events.handler-failed", { error: errorMessage(error) });
        }
      };
      handlers.add(wrapped);
      return () => {
        handlers.delete(wrapped);
      };
    },
    emit: (event) => {
      for (const handler of handlers) handler(event);
    },
  };
}
