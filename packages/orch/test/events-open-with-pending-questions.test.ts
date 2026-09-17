import { recordingLogger } from "./helpers/logger.ts";
import { afterEach, describe, expect, test } from "bun:test";

import { startEventsTransport, parseEventsOptions } from "../src/commands/events.ts";
import { startRpcServer } from "../src/daemon/server/rpc.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { NotifyEvent } from "../src/types/notify.ts";
import type { PendingQuestionView } from "../src/types/daemon.ts";
import type { EventsContext } from "../src/commands/events.ts";
import { testServices } from "./helpers/services.ts";
import { stubRpcHandlers } from "./helpers/rpc-handlers.ts";
import type { OrchDir } from "../src/types/core.ts";
const roots: OrchDir[] = [];

afterEach(() => {
  while (roots.length > 0) removeTempDir(roots.pop() ?? "");
});

describe("events pending-question snapshot", () => {
  test("a late watcher receives every open question through the event writer", async () => {
    const root = tempOrchDir("orch-events-open-");
    roots.push(root);
    const previous = process.env.ORCH_DIR;
    process.env.ORCH_DIR = root;
    const question: PendingQuestionView = {
      questionId: "q1",
      agentId: "agent1",
      key: "agent1",
      name: "worker",
      question: "Approve the change?",
      askedAt: 100,
    };
    const server = await startRpcServer(root, stubRpcHandlers({ questions: () => ({ questions: [question] }) }), { logger: recordingLogger().logger });
    const received: { event: NotifyEvent; seq: number }[] = [];
    const { promise: firstEvent, resolve: arrived } = Promise.withResolvers<void>();
    const context: EventsContext = {
      options: parseEventsOptions([]),
      accepts: () => true,
      emit: (event, seq) => {
        received.push({ event, seq });
        arrived();
        return true;
      },
    };
    const transport = startEventsTransport(context, testServices({ orchDir: root, settings: null }));
    try {
      // The snapshot crosses the socket; wait on the event, not on a clock.
      await Promise.race([firstEvent, new Promise<void>((_resolve, reject) => setTimeout(() => reject(new Error("no snapshot within 2s")), 2000))]);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(received).toHaveLength(1);
      const first = received[0];
      expect(first?.event.type).toBe("asking");
      if (first?.event.type !== "asking") throw new Error("expected asking event");
      expect(first.event.key).toBe("agent1");
      expect(first.event.oldState).toBe("asking");
      expect(first.event.newState).toBe("asking");
      expect(first.event.askCount).toBe(1);
      expect(first?.seq).toBe(0);
    } finally {
      transport.close();
      await server.close();
      if (previous === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = previous;
    }
  });
});
