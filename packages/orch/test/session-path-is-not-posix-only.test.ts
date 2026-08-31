import { afterEach, describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:net";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPaneStateSocket } from "../src/backends/herdr/pane-socket.ts";
import { isRecord } from "../src/util.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

/**
 * A session path is recognised by being ABSOLUTE, never by starting with "/".
 *
 * Checking whether a file starts with "/" means Windows drive-letter session paths
 * are never recorded, so no session tail / model / cost fallback works for any win32
 * agent. Fix: `path.isAbsolute(file)`.
 *
 * The fix landed at `src/agent/presence.ts:250` and the OLD SHAPE kept running
 * beside it at `src/backends/herdr/pane-socket.ts:74`, which is why the finding
 * is not done: a Windows-side agent in a herdr pane still hands herdr an
 * `agent_session_id` where it should hand a path, so herdr cannot open the
 * session file and orch loses the tail/model/cost fallback that reads it.
 *
 * Asserted at the socket seam, because that is where the decision leaves orch:
 * `updateSessionRef` latches the path and `reportSession` puts it on the wire.
 */

const dirs: string[] = [];
const servers: Server[] = [];

afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise<void>((done) => server.close(() => { done(); }));
  while (dirs.length) removeTempDir(dirs.pop()!);
});

/** A herdr stand-in that keeps the one JSON line it is sent. */
async function captureOneRequest(): Promise<{ socketPath: string; received: Promise<unknown> }> {
  const dir = mkdtempSync(join(tmpdir(), "orch-session-ref-"));
  dirs.push(dir);
  const socketPath = join(dir, "herdr.sock");
  // Assigned synchronously by the Promise executor below, before any connection
  // can arrive; typed as possibly-unset rather than seeded with a no-op that
  // would silently swallow the first line if that ever stopped being true.
  let resolveLine: ((value: unknown) => void) | undefined;
  const received = new Promise<unknown>((resolve) => { resolveLine = resolve; });
  const server = createServer((socket) => {
    let buffer = "";
    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      const line = buffer.slice(0, newline);
      try { resolveLine?.(JSON.parse(line)); } catch { resolveLine?.(line); }
      socket.write(JSON.stringify({ ok: true }) + "\n");
      socket.end();
    });
  });
  servers.push(server);
  await new Promise<void>((ready) => server.listen(socketPath, () => { ready(); }));
  return { socketPath, received };
}

function paramsOf(request: unknown): Record<string, unknown> {
  if (!isRecord(request) || !isRecord(request.params)) throw new Error(`unexpected request: ${JSON.stringify(request)}`);
  return request.params;
}

describe("a session path is recognised by being absolute, not by a leading slash (1.12)", () => {
  test("a Windows drive-letter session path is reported as a PATH", async () => {
    const { socketPath, received } = await captureOneRequest();
    const socket = createPaneStateSocket({
      socketPath, paneId: "w1:p1", source: "orch", agentId: "pi", extensionHash: "hash",
    });

    socket.updateSessionRef({
      sessionManager: {
        getSessionFile: () => "C:\\Users\\bryan\\.pi\\sessions\\abc.jsonl",
        getSessionId: () => "abc",
      },
    });
    await socket.reportSession();

    // The whole point: herdr is handed the FILE, so the session tail, model and
    // cost fallback that read it still work on the Windows side. Falling back to
    // the id is what "never recorded" looked like from herdr's end.
    expect(paramsOf(await received).agent_session_path).toBe("C:\\Users\\bryan\\.pi\\sessions\\abc.jsonl");
  });

  test("a POSIX session path still reports as a path", async () => {
    const { socketPath, received } = await captureOneRequest();
    const socket = createPaneStateSocket({
      socketPath, paneId: "w1:p1", source: "orch", agentId: "pi", extensionHash: "hash",
    });

    socket.updateSessionRef({ sessionManager: { getSessionFile: () => "/home/bryan/.pi/sessions/abc.jsonl" } });
    await socket.reportSession();

    expect(paramsOf(await received).agent_session_path).toBe("/home/bryan/.pi/sessions/abc.jsonl");
  });

  test("a RELATIVE path is not a session path, and the id is used instead", async () => {
    const { socketPath, received } = await captureOneRequest();
    const socket = createPaneStateSocket({
      socketPath, paneId: "w1:p1", source: "orch", agentId: "pi", extensionHash: "hash",
    });

    // Absolute is the test, so a relative one is still refused — widening the
    // check must not turn every string the harness returns into a path.
    socket.updateSessionRef({
      sessionManager: { getSessionFile: () => "sessions/abc.jsonl", getSessionId: () => "abc" },
    });
    await socket.reportSession();

    const params = paramsOf(await received);
    expect(params.agent_session_path).toBeUndefined();
    expect(params.agent_session_id).toBe("abc");
  });
});
