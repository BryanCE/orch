import { createServerFn } from "@tanstack/react-start";

import { daemonRpc, down, type DaemonDown, type DaemonEndpoint } from "./daemon";
import { projectFleet, projectHistory, type AgentGroup, type Space } from "@/lib/fleet";
import { fleetStatusOf } from "@/lib/status-row";
import type { PendingQuestionView } from "@orch/types/daemon.ts";
import type { LifecycleVerb } from "@orch/types/adapter.ts";

// Every export here is a server function, so the TanStack Start plugin strips this
// module's body from the client bundle. Adding a plain exported function pulls
// ./daemon — and node:net with it — into the browser chunk, which kills hydration.

interface DaemonUp { daemon: "up" }
export type DaemonHome = "same-host" | "wsl" | "remote";
interface DaemonWhere {
  home: DaemonHome;
  endpoint: DaemonEndpoint;
}
type DaemonStatus = DaemonDown | (DaemonUp & { running: true; startedAt?: string; where: DaemonWhere });
export interface FleetSnapshot {
  daemon: "up";
  /** Live work, grouped by orch's space. */
  spaces: Space[];
  /** Ended work, grouped by the agent that spawned it. */
  history: AgentGroup[];
}
type FleetResult = DaemonDown | FleetSnapshot;

type SendAck = { accepted: true; id: string; ack: "acknowledged" | "unavailable" };

interface AgentQuestion {
  key: string;
  name: string | null;
  text: string | null;
  askedAt: number | null;
}

/**
 * Which machine orchd sits on, relative to this web server. A unix socket is one
 * filesystem, so it is the same host. A Windows web server that reached a daemon
 * holding a unix socket crossed loopback into WSL — the standing setup here.
 */
function daemonHome(endpoint: DaemonEndpoint, daemonTransport: unknown): DaemonHome {
  if (endpoint.transport === "unix") return "same-host";
  if (process.platform === "win32" && daemonTransport === "unix") return "wsl";
  return "remote";
}

export const getDaemonStatus = createServerFn({ method: "GET" }).handler(async (): Promise<DaemonStatus> => {
  try {
    const { result, endpoint } = await daemonRpc<Record<string, unknown>>("daemon-status");
    return {
      daemon: "up",
      running: true,
      ...(typeof result?.startedAt === "string" ? { startedAt: result.startedAt } : {}),
      where: { home: daemonHome(endpoint, result?.socket), endpoint },
    };
  } catch (error) {
    return down(error);
  }
});

interface DaemonSendAcceptedResult {
  accepted: true;
  id: string;
  ack: "acknowledged" | "unavailable";
}

interface SendAcceptedResult extends DaemonSendAcceptedResult {
  ok: true;
}

interface MessageUnavailable {
  ok: false;
  accepted: false;
  reason: "message-unavailable";
}

type SendResult = SendAcceptedResult | MessageUnavailable | DaemonDown;

/**
 * Send text to one agent. `steer` interrupts the current turn; `dispatch` deliberately
 * clears the session before sending. `message` is unavailable here because a web
 * request has no orch agent identity to provide as the daemon's `from` parameter.
 */
export const sendToAgent = createServerFn({ method: "POST" })
  .validator((input: { key: string; text: string; kind: "message" | "steer" | "dispatch" }) => input)
  .handler(async ({ data }): Promise<SendResult> => {
    if (data.kind === "message") return { ok: false, accepted: false, reason: "message-unavailable" };
    try {
      const method = data.kind === "steer" ? "steer" : "dispatch";
      const { result } = await daemonRpc<DaemonSendAcceptedResult>(method, { target: data.key, text: data.text });
      return { ok: true, ...result };
    } catch (error) {
      return down(error);
    }
  });

/** Read the merged pane + presence view from orchd. */
export const getFleet = createServerFn({ method: "GET" }).handler(async (): Promise<FleetResult> => {
  try {
    const { result } = await daemonRpc<unknown>("status");
    const fleet = fleetStatusOf(result);
    return {
      daemon: "up",
      spaces: projectFleet(fleet),
      history: projectHistory(fleet),
    };
  } catch (error) {
    return down(error);
  }
});

export const answerAgent = createServerFn({ method: "POST" })
  .validator((input: { key: string; text: string; questionId?: string }) => input)
  .handler(async ({ data }): Promise<SendAck | DaemonDown> => {
    try {
      const { result } = await daemonRpc<SendAck>("answer", { target: data.key, text: data.text, questionId: data.questionId });
      return result;
    } catch (error) {
      return down(error);
    }
  });

// The daemon exposes reset, reload and restart here; closing and aborting agents have
// no daemon capability and therefore are not browser controls yet.
export const controlAgent = createServerFn({ method: "POST" })
  .validator((input: { key: string; verb: LifecycleVerb }) => input)
  .handler(async ({ data }): Promise<{ ok: true; verb: LifecycleVerb } | DaemonDown> => {
    try {
      const { result } = await daemonRpc<{ ok: true; verb: LifecycleVerb }>("lifecycle", { target: data.key, verb: data.verb });
      return result;
    } catch (error) {
      return down(error);
    }
  });

export const setAgentModel = createServerFn({ method: "POST" })
  .validator((input: { key: string; model: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; applied: string } | DaemonDown> => {
    try {
      const { result } = await daemonRpc<{ ok: true; applied: string }>("set-model", { target: data.key, model: data.model });
      return result;
    } catch (error) {
      return down(error);
    }
  });

interface QuestionsResult {
  questions: PendingQuestionView[];
}

export const getQuestions = createServerFn({ method: "GET" }).handler(async (): Promise<{ daemon: "up"; questions: AgentQuestion[] } | DaemonDown> => {
  try {
    const { result } = await daemonRpc<QuestionsResult>("questions");
    return {
      daemon: "up",
      questions: result.questions.map((question) => ({
        key: question.key,
        name: question.name,
        text: question.question,
        askedAt: question.askedAt,
      })),
    };
  } catch (error) {
    return down(error);
  }
});
