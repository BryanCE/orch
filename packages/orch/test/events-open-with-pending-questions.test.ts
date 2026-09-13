import { afterEach, describe, expect, test } from "bun:test";

import { startEventsTransport, parseEventsOptions } from "../src/commands/events.ts";
import { startRpcServer } from "../src/daemon/rpc/server.ts";
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
    const server = await startRpcServer(root, stubRpcHandlers({ questions: () => ({ questions: [question] }) }));
    const received: { event: NotifyEvent; seq: number }[] = [];
    const context: EventsContext = {
      options: parseEventsOptions([]),
      accepts: () => true,
      emit: (event, seq) => {
        received.push({ event, seq });
        return true;
      },
    };
    const transport = startEventsTransport(context, testServices({ orchDir: root, settings: null }));
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(received).toHaveLength(1);
      const first = received[0];
      expect(first?.event.type).toBe("asking");
      if (first === undefined || first.event.type !== "asking") throw new Error("expected asking event");
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
