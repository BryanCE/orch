import { afterEach, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { hostIdentity } from "../src/hosts/identity.ts";
import { orchDirAt } from "../src/orch-dir.ts";
import { processStartToken } from "../src/process-identity.ts";
import { acceptMail, mailDelivery, readMail } from "../src/daemon/server/mail.ts";
import { placeHere } from "../src/process-place.ts";
import { FakePanedBackend, fakePane, withRegisteredBackend } from "./helpers/backend.ts";
import type { MailDelivery } from "../src/types/settings.ts";
import { isLeadingOrch, peerOrchs } from "../src/daemon/server/peer-orchs.ts";
import { agentById, getOrCreateSessionAgent } from "../src/store/agent-rows.ts";
import { setSpace } from "../src/store/interval-rows.ts";
import { selectOutboxMessage } from "../src/store/outbox-rows.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { matchOrchs } from "../src/commands/orchs.ts";
import { DEAD_PID, placeAgent, seedAgentRow, seedOperator } from "./helpers/agent.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { testServices } from "./helpers/services.ts";
import type { PeerOrch } from "../src/daemon/client/protocol.ts";
import type { CallerCredential, OrchDir } from "../src/types/core.ts";

const dirs: OrchDir[] = [];
const savedOrchDir: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
afterEach(() => {
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (savedOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = savedOrchDir;
});

function fixture(): OrchDir {
  const directory = tempOrchDir("orch-peer-orchs-");
  dirs.push(directory);
  process.env.ORCH_DIR = directory;
  writeSettingsFixture(directory, { fleet: { cross_space: false } });
  orm(directory).run(sql`INSERT INTO spaces(id,name,created_at) VALUES (${"web"},${"web"},1),(${"api"},${"api"},1)`);
  return directory;
}

function settingsWith(directory: OrchDir, orchPeers: boolean) {
  return testServices({ orchDir: directory, settings: { fleet: { cross_space: false, orch_peers: orchPeers } } }).settings.current();
}

const LIVE_TOKEN = processStartToken(process.pid) ?? "";

/** A harness session the way `register-session` files one, live unless given a dead pid. */
function seedSession(directory: OrchDir, harnessId: string, sessionToken: string, options: { cwd?: string; spawnedBy?: string; pid?: number } = {}): string {
  const pid = options.pid ?? process.pid;
  return getOrCreateSessionAgent(directory, {
    pid, startToken: pid === process.pid ? LIVE_TOKEN : "dead", sessionToken, harnessId,
    cwd: options.cwd ?? process.cwd(), label: `${harnessId} session`, host: hostIdentity(), now: Date.now(),
    ...(options.spawnedBy === undefined ? {} : { spawnedBy: options.spawnedBy }),
  }).id;
}

function credentialOf(harnessId: string, sessionToken: string): CallerCredential {
  return { launch: null, session: { harnessId, sessionId: sessionToken, pid: process.pid }, pid: process.pid };
}

function rowOf(directory: OrchDir, id: string) {
  const row = agentById(directory, id);
  if (row === null) throw new Error(`no row for ${id}`);
  return row;
}

describe("a leading orch", () => {
  test("is a harness session with no spawner, or one a raw terminal started", () => {
    const directory = fixture();
    const alone = seedSession(directory, "claude", "tok-alone");
    const operator = seedOperator(directory);
    const typed = seedSession(directory, "codex", "tok-typed", { spawnedBy: operator });

    expect(isLeadingOrch(directory, rowOf(directory, alone))).toBe(true);
    expect(isLeadingOrch(directory, rowOf(directory, typed))).toBe(true);
    expect(isLeadingOrch(directory, rowOf(directory, operator))).toBe(false);
  });

  test("is never a spawned agent, nor a session started inside one", () => {
    const directory = fixture();
    const orch = seedSession(directory, "claude", "tok-orch");
    seedAgentRow(directory, { id: "worker", spawnedBy: orch });
    const nested = seedSession(directory, "codex", "tok-nested", { spawnedBy: "worker" });

    expect(isLeadingOrch(directory, rowOf(directory, "worker"))).toBe(false);
    expect(isLeadingOrch(directory, rowOf(directory, nested))).toBe(false);
  });
});

describe("mail between two leading orchs", () => {
  function twoOrchs(directory: OrchDir): { web: string; api: string } {
    const web = seedSession(directory, "claude", "tok-web");
    const api = seedSession(directory, "codex", "tok-api");
    setSpace(directory, web, 10, "web");
    setSpace(directory, api, 10, "api");
    return { web, api };
  }

  test("is refused while fleet.orch_peers is off", () => {
    const directory = fixture();
    const { web, api } = twoOrchs(directory);

    expect(() => acceptMail(directory, settingsWith(directory, false), web, api, "hello"))
      .toThrow("orch peers are off. The user turns them on with: orch settings fleet.orch_peers true");
  });

  test("passes the space wall while fleet.orch_peers is on", () => {
    const directory = fixture();
    const { web, api } = twoOrchs(directory);

    const accepted = acceptMail(directory, settingsWith(directory, true), web, api, "hello");

    expect(selectOutboxMessage(directory, accepted.id)?.payload).toEqual({ action: "mail", from: web, text: "hello" });
  });

  test("to another orch's worker still obeys the space wall", () => {
    const directory = fixture();
    const { web, api } = twoOrchs(directory);
    seedAgentRow(directory, { id: "apiworker", spawnedBy: api });
    setSpace(directory, "apiworker", 10, "api");

    expect(() => acceptMail(directory, settingsWith(directory, true), web, "apiworker", "hello"))
      .toThrow("space wall: actor space web cannot write to target space api (apiworker)");
  });
});

describe("where mail between two leading orchs lands", () => {
  const mail = (to_orch: MailDelivery) => ({ to_spawner: "prompt" as const, to_worker: "prompt" as const, to_orch });

  function orchInPane(directory: OrchDir, focused: boolean): { web: string; api: string; backend: FakePanedBackend } {
    const web = seedSession(directory, "claude", "tok-web");
    const api = seedSession(directory, "codex", "tok-api");
    placeAgent(api, { backend: "headless", handle: "pane-api" }, directory);
    return { web, api, backend: new FakePanedBackend({ panes: [fakePane("pane-api", { focused })] }) };
  }

  test("follows mail.to_orch, never mail.to_worker", () => {
    const directory = fixture();
    const { web, api } = orchInPane(directory, false);

    expect(mailDelivery(directory, mail("events"), web, placeHere(directory, api))).toBe("events");
  });

  test("goes to the monitor while the human is in the other orch's pane", () => {
    const directory = fixture();
    const { web, api, backend } = orchInPane(directory, true);

    const landing = withRegisteredBackend(backend, () => mailDelivery(directory, mail("prompt-unless-focused"), web, placeHere(directory, api)));

    expect(landing).toBe("events");
  });

  test("types into the other orch's input while its pane is not in view", () => {
    const directory = fixture();
    const { web, api, backend } = orchInPane(directory, false);

    const landing = withRegisteredBackend(backend, () => mailDelivery(directory, mail("prompt-unless-focused"), web, placeHere(directory, api)));

    expect(landing).toBe("prompt");
  });
});

describe("readMail", () => {
  test("gives the sender and the recipient the full text by the start of its id, and no one else", () => {
    const directory = fixture();
    const web = seedSession(directory, "claude", "tok-web");
    const api = seedSession(directory, "codex", "tok-api");
    seedSession(directory, "pi", "tok-other");
    const text = "all of it ".repeat(100);
    const { id } = acceptMail(directory, settingsWith(directory, true), web, api, text);
    const code = id.split("-")[0] ?? id;

    expect(readMail(directory, credentialOf("codex", "tok-api"), code)).toEqual({ id, text });
    expect(readMail(directory, credentialOf("claude", "tok-web"), code).text).toBe(text);
    expect(() => readMail(directory, credentialOf("pi", "tok-other"), code)).toThrow(`no mail ${code} to or from you`);
  });
});

describe("peerOrchs", () => {
  test("lists every other live leading orch, never the caller, a dead one, or a worker", () => {
    const directory = fixture();
    const caller = seedSession(directory, "claude", "tok-caller");
    const peer = seedSession(directory, "codex", "tok-peer", { cwd: "/work/billing" });
    seedSession(directory, "pi", "tok-dead", { pid: DEAD_PID });
    seedAgentRow(directory, { id: "worker", spawnedBy: caller });

    const orchs = peerOrchs(directory, settingsWith(directory, true), credentialOf("claude", "tok-caller"));

    expect(orchs.map((orch) => orch.id)).toEqual([peer]);
    expect(orchs[0]).toMatchObject({ harness: "codex", cwd: "/work/billing", host: hostIdentity().name });
  });

  test("refuses while fleet.orch_peers is off", () => {
    const directory = fixture();
    seedSession(directory, "claude", "tok-caller");

    expect(() => peerOrchs(directory, settingsWith(directory, false), credentialOf("claude", "tok-caller")))
      .toThrow("orch peers are off");
  });

  test("refuses a caller that is not a leading orch", () => {
    const directory = fixture();
    const orch = seedSession(directory, "claude", "tok-orch");
    const nested = seedSession(directory, "codex", "tok-nested", { spawnedBy: orch });

    expect(rowOf(directory, nested).kind).toBe("session");
    expect(() => peerOrchs(directory, settingsWith(directory, true), credentialOf("codex", "tok-nested")))
      .toThrow("only a leading orch, a harness session a human started, may reach other orchs");
  });
});

describe("matchOrchs", () => {
  const orch = (id: string, name: string, project: string): PeerOrch => ({
    id, name, label: null, harness: "claude", space: null, host: "box", cwd: `${project}/src`, project,
  });
  const orchs = [orch("a1", "claude-a1", "/work/billing"), orch("b2", "claude-b2", "/work/web"), orch("c3", "claude-c3", "/work/web")];

  test("a name or id wins over a project", () => {
    expect(matchOrchs(orchs, "claude-b2").map((match) => match.id)).toEqual(["b2"]);
    expect(matchOrchs(orchs, "a1").map((match) => match.id)).toEqual(["a1"]);
  });

  test("a project's name or path names every orch working in it", () => {
    expect(matchOrchs(orchs, "billing").map((match) => match.id)).toEqual(["a1"]);
    expect(matchOrchs(orchs, "/work/web").map((match) => match.id)).toEqual(["b2", "c3"]);
  });

  test("an unknown target matches nothing", () => {
    expect(matchOrchs(orchs, "payroll")).toEqual([]);
  });
});
