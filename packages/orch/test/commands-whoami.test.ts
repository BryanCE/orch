import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cmdWhoami } from "../src/commands/whoami.ts";
import { startRpcServer } from "../src/daemon/server/rpc.ts";
import { orchDirAt } from "../src/orch-dir.ts";
import { recordingLogger } from "./helpers/logger.ts";
import { stubRpcHandlers } from "./helpers/rpc-handlers.ts";
import { testServices } from "./helpers/services.ts";
import { captureStdout } from "./helpers/stdout.ts";
import { agentViewFixture } from "./helpers/views.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import type { ResultOf } from "../src/daemon/client/protocol.ts";

/** whoami prints everything orchd holds for this caller, beside the credential it sent. */

beforeEach(() => { isolateOrchEnv(); });
afterEach(() => { restoreOrchEnv(); });

async function whoami(self: ResultOf<"self">, args: string[] = []): Promise<string> {
  const root = orchDirAt(process.env.ORCH_DIR!);
  const server = await startRpcServer(root, stubRpcHandlers({ self: () => self }), { logger: recordingLogger().logger });
  try {
    return await captureStdout(() => cmdWhoami(testServices({ orchDir: root, settings: null }), args));
  } finally {
    await server.close();
  }
}

function storedFor(pid: number): NonNullable<ResultOf<"self">["stored"]> {
  return {
    process: { pid, startToken: "1", since: 0, host: { id: "host", name: "BRYAN-SWE", os: "linux" }, alive: true },
    sessionToken: null,
    claimedAt: null,
  };
}

describe("orch whoami", () => {
  test.serial("a plain shell is the human, with no row and no harness marker", async () => {
    const text = await whoami({ id: null, kind: "operator", space: null, view: null, depth: 0, stored: null });
    expect(text).toContain("You are the human (operator). orch has no row for this caller.");
    expect(text).toContain(`  sent process ${process.ppid}`);
    expect(text).toContain("  sent no harness marker");
  });

  test.serial("a registered session prints its row, what orchd stored, and what it sent", async () => {
    process.env.PI_CODING_AGENT = "true";
    process.env.PI_SESSION_ID = "session-token";
    const view = agentViewFixture("sessionaaa", { name: "pi-session", environment: { plexer: "herdr", handle: "wR:p1" } });
    const stored = { ...storedFor(process.ppid), sessionToken: "session-token" };
    const text = await whoami({ id: view.id, kind: "session", space: "orch", view, depth: 0, stored });
    expect(text).toContain("You are pi-session (sessionaaa), a pi session.");
    expect(text).toContain("  role orch, space orch, depth 0, spawned by nobody");
    expect(text).toContain("  plexer herdr, handle wR:p1, worktree none, branch none");
    expect(text).toContain(`  stored process ${process.ppid} on BRYAN-SWE (linux), since 1970-01-01 00:00:00, alive`);
    expect(text).toContain("  stored session token session-token, claimed never");
    expect(text).toContain("  sent harness marker pi, session id session-token, session pid none");
    expect(text).not.toContain("warning:");
  });

  test.serial("a pi row stored under a plain shell is flagged", async () => {
    const view = agentViewFixture("whuge3lyn4", { name: "pi-whuge3ly", harnessId: "pi" });
    const text = await whoami({ id: view.id, kind: "operator", space: null, view, depth: 0, stored: storedFor(2024406) });
    expect(text).toContain("warning: the row's harness is pi, but this caller is cli");
    expect(text).toContain(`warning: the stored process 2024406 is not this caller's process ${process.ppid}`);
  });

  test.serial("--json prints the credential sent and the answer orchd gave", async () => {
    const self: ResultOf<"self"> = { id: null, kind: "operator", space: null, view: null, depth: 0, stored: null };
    const payload: unknown = JSON.parse(await whoami(self, ["--json"]));
    expect(payload).toMatchObject({ caller: { launch: null, session: null, process: { pid: process.ppid } }, self });
  });
});
