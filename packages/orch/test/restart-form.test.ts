import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { methods } from "@agentclientprotocol/sdk";
import { appendSessionEntries, parseSessionLog, SET_ASIDE_SUFFIX } from "../src/agent/session-log.ts";
import { logPathOf } from "../src/backends/headless/index.ts";
import { attachedLink, detachLink } from "../src/control/agent-links.ts";
import { spawnHeldLaunch } from "../src/daemon/server/handlers/lifecycle.ts";
import { applyLifecycle } from "../src/daemon/server/handlers/relaunch.ts";
import { allAdapters } from "../src/adapters/registry.ts";
import { restartPipes, switchForm } from "../src/daemon/server/handlers/restart-form.ts";
import { endSessionAgents, holdsSession } from "../src/daemon/server/session-agents.ts";
import type { DaemonState } from "../src/daemon/server/state.ts";
import { acceptStatusReport } from "../src/daemon/server/status-report.ts";
import { hostIdentity } from "../src/hosts/identity.ts";
import { placeHere } from "../src/process-place.ts";
import { mintAgentId } from "../src/shared/agent-id.ts";
import { agentView, agentViews, holderOf } from "../src/store/agent-view.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { errorMessage } from "../src/util.ts";
import type { AgentAdapter } from "../src/types/adapter.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { FormId } from "../src/types/form.ts";
import type { PipesProvider } from "../src/types/pipes.ts";
import { fakeAdapter } from "./helpers/adapter.ts";
import { seedOrch } from "./helpers/agent.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import { FakePtyProvider } from "./helpers/fake-pty.ts";
import { chunk, defaultFakeScript, fakeAcpAgent, type FakeAcpScript } from "./helpers/fake-acp-agent.ts";
import { fakePipes } from "./helpers/fake-pipes.ts";
import { testDaemonServices } from "./helpers/services.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const dirs: OrchDir[] = [];
const states: DaemonState[] = [];
const attached: { readonly directory: OrchDir; readonly key: string }[] = [];

afterEach(async () => {
  for (const { directory, key } of attached.splice(0)) {
    const link = attachedLink(placeHere(directory, key));
    if (link !== null) detachLink(directory, key, link);
  }
  for (const state of states.splice(0)) state.held.killAll();
  await endSessionAgents();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

/** Offers neither load nor resume. */
const NO_REOPEN: Partial<FakeAcpScript> = { initialize: { protocolVersion: defaultFakeScript().initialize.protocolVersion, agentCapabilities: {} } };
/** Offers resume and not load. */
const RESUME_ONLY: Partial<FakeAcpScript> = { initialize: { protocolVersion: defaultFakeScript().initialize.protocolVersion, agentCapabilities: { sessionCapabilities: { resume: {} } } } };

/** The harness: a binding that shares sessions with its terminal program, and a resume argv. */
function adapterOf(overrides: Partial<AgentAdapter> = {}): AgentAdapter {
  return fakeAdapter({
    acp: { argv: () => ["fake-acp"], env: () => ({}), sharesSessions: true, install: {} },
    resume: { argv: (_opts, sessionId) => ["fake-tui", "--resume", sessionId] },
    ...overrides,
  });
}

const ADAPTER = adapterOf();

/** Orchd with a fake PTY provider, and pipes whose far end is a new fake ACP agent per process. */
function setup(script: Partial<FakeAcpScript> = {}) {
  const orchDir = tempOrchDir("orch-restart-form-");
  dirs.push(orchDir);
  const agents: ReturnType<typeof fakeAcpAgent>[] = [];
  const { provider, spawned } = fakePipes(() => process.pid);
  const pipes: PipesProvider = {
    spawn(request) {
      const child = provider.spawn(request);
      const far = spawned.at(-1);
      if (far === undefined) throw new Error("no pipes process was spawned");
      const agent = fakeAcpAgent(defaultFakeScript(script));
      agents.push(agent);
      // Orchd closing its end cancels these pipes with an error, which is how a session ends.
      void far.fromOrchd.pipeTo(agent.streams.input).catch(() => undefined);
      void agent.streams.output.pipeTo(far.toOrchd).catch(() => undefined);
      return child;
    },
  };
  const ptys = new FakePtyProvider(() => process.pid);
  const state = idleDaemonState(testDaemonServices({ orchDir }), orchDir, ptys, pipes);
  states.push(state);
  return { orchDir, state, agents, ptys, spawned };
}

type Harness = ReturnType<typeof setup>;

/** Start an agent in `form` the way a spawn does, and report the session id a harness would. */
async function launch(harness: Harness, form: FormId, sessionId: string | null, spawner: string | null = null): Promise<string> {
  const key = mintAgentId();
  attached.push({ directory: harness.orchDir, key });
  await spawnHeldLaunch(harness.state, ADAPTER, {
    form, key, name: "switcher", spawner, orchDir: harness.orchDir, cwd: harness.orchDir,
    model: "next", thinking: "medium", firstPrompt: null,
  });
  if (sessionId !== null) acceptStatusReport(harness.orchDir, key, { sessionId }, () => undefined);
  return key;
}

const formOf = (harness: Harness, key: string): FormId | null => agentView(harness.orchDir, key)?.form ?? null;
const methodsOf = (agent: ReturnType<typeof fakeAcpAgent>): string[] => agent.received.map((request) => request.method);

function refusal(promise: Promise<unknown>): Promise<string | null> {
  return promise.then(() => null, (error: unknown) => errorMessage(error));
}

/** Wait until a condition holds. */
async function until(check: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("the condition was never reached");
}

describe("restart in another form", () => {
  test("an acp agent restarted to tui ends its session, releases its pipes and runs the resume argv in a PTY, same agent", async () => {
    const harness = setup();
    const spawner = mintAgentId();
    seedOrch(harness.orchDir, spawner);
    const key = await launch(harness, "acp", null, spawner);
    const first = harness.agents[0];
    expect(holdsSession(key)).toBe(true);
    const holderBefore = holderOf(harness.orchDir, key);
    expect(holderBefore).not.toBeNull();

    await switchForm(harness.state, placeHere(harness.orchDir, key), ADAPTER, "tui");

    await until(() => methodsOf(first!).includes(methods.agent.session.close));
    expect(holdsSession(key)).toBe(false);
    expect(harness.spawned[0]?.killed).toBe(true);
    expect(harness.ptys.spawned).toHaveLength(1);
    const request = harness.ptys.last().request;
    expect([request.file, ...request.args]).toEqual(["fake-tui", "--resume", "test-session"]);
    expect(agentViews(harness.orchDir).filter((view) => view.name === "switcher").map((view) => view.id)).toEqual([key]);
    expect(holderOf(harness.orchDir, key)).toEqual(holderBefore);
    expect(formOf(harness, key)).toBe("tui");
  });

  test("that agent restarted back to acp ends the PTY, loads the session and replays the whole log", async () => {
    const harness = setup({ replay: [chunk("one"), chunk("two")] });
    const key = await launch(harness, "acp", null);
    await switchForm(harness.state, placeHere(harness.orchDir, key), ADAPTER, "tui");
    const pty = harness.ptys.last();
    const logPath = logPathOf(harness.orchDir, key);
    appendSessionEntries(logPath, [{ role: "user", text: "stale" }]);

    await switchForm(harness.state, placeHere(harness.orchDir, key), ADAPTER, "acp");

    expect(pty.killed).toBe(true);
    const reopened = harness.agents.at(-1)!;
    expect(reopened.received.find((request) => request.method === methods.agent.session.load)?.params).toMatchObject({ sessionId: "test-session" });
    expect(parseSessionLog(readFileSync(logPath, "utf8"))).toEqual([{ role: "assistant", text: "onetwo" }]);
    expect(formOf(harness, key)).toBe("acp");
    expect(holdsSession(key)).toBe(true);
  });

  test("a binding that offers resume and not load receives session/resume", async () => {
    const harness = setup(RESUME_ONLY);
    const key = await launch(harness, "tui", "test-session");

    await switchForm(harness.state, placeHere(harness.orchDir, key), ADAPTER, "acp");

    const methodsSeen = methodsOf(harness.agents.at(-1)!);
    expect(methodsSeen).toContain(methods.agent.session.resume);
    expect(methodsSeen).not.toContain(methods.agent.session.load);
  });

  test("a restart with no form on an acp agent starts the binding again on its session id", async () => {
    const harness = setup();
    const key = await launch(harness, "acp", null);

    await restartPipes(harness.state, placeHere(harness.orchDir, key), ADAPTER);

    expect(harness.spawned).toHaveLength(3);
    expect(harness.spawned[1]?.killed).toBe(true);
    expect(harness.agents.at(-1)!.received.find((request) => request.method === methods.agent.session.load)?.params).toMatchObject({ sessionId: "test-session" });
    expect(formOf(harness, key)).toBe("acp");
  });
});

describe("restart in another form is refused before anything is ended", () => {
  test("a harness without the role the form needs", async () => {
    const harness = setup();
    const key = await launch(harness, "acp", null);

    const reason = await refusal(switchForm(harness.state, placeHere(harness.orchDir, key), adapterOf({ resume: null }), "tui"));

    expect(reason).toBe("harness pi has no tui form");
    expect(holdsSession(key)).toBe(true);
    expect(formOf(harness, key)).toBe("acp");
  });

  test("a backend that does not offer the stdio the form needs", async () => {
    const harness = setup();
    const key = mintAgentId();
    registerSpawnedAgent(harness.orchDir, {
      form: "tui", key, harnessId: "pi", backendId: "headless", placed: false, cwd: harness.orchDir, name: "switcher", model: "test", spawner: null,
      process: { host: hostIdentity().id, pid: process.pid, startToken: `restart-form-${key}` },
    });

    const reason = await refusal(switchForm(harness.state, placeHere(harness.orchDir, key), ADAPTER, "acp"));

    expect(reason).toBe("cannot switch switcher to acp: its backend headless does not run that form");
    expect(harness.ptys.spawned).toHaveLength(0);
    expect(harness.spawned).toHaveLength(0);
    expect(agentView(harness.orchDir, key)).not.toBeNull();
    expect(formOf(harness, key)).toBe("tui");
  });

  test("an agent with no recorded session id", async () => {
    const harness = setup();
    const key = await launch(harness, "tui", null);

    const reason = await refusal(switchForm(harness.state, placeHere(harness.orchDir, key), ADAPTER, "acp"));

    expect(reason).toBe("cannot switch switcher to acp: no session id is recorded");
    expect(harness.ptys.last().killed).toBe(false);
    expect(formOf(harness, key)).toBe("tui");
  });

  test("a binding that does not share sessions with its TUI", async () => {
    const harness = setup();
    const key = await launch(harness, "tui", "test-session");
    const unshared = adapterOf({ acp: { argv: () => ["fake-acp"], env: () => ({}), sharesSessions: false, install: {} } });

    const reason = await refusal(switchForm(harness.state, placeHere(harness.orchDir, key), unshared, "acp"));

    expect(reason).toBe("cannot switch switcher to acp: the pi binding does not share sessions with its TUI");
    expect(harness.ptys.last().killed).toBe(false);
    expect(formOf(harness, key)).toBe("tui");
  });

  test("a binding that offers neither load nor resume", async () => {
    const harness = setup(NO_REOPEN);
    const key = await launch(harness, "tui", "test-session");

    const reason = await refusal(switchForm(harness.state, placeHere(harness.orchDir, key), ADAPTER, "acp"));

    expect(reason).toBe("cannot switch switcher to acp: the pi binding does not offer session load");
    expect(harness.ptys.last().killed).toBe(false);
    expect(harness.spawned).toHaveLength(1);
    expect(harness.spawned[0]?.killed).toBe(true);
    expect(holdsSession(key)).toBe(false);
    expect(formOf(harness, key)).toBe("tui");
  });

  test("restarting an acp agent whose binding offers neither load nor resume, with a session id recorded", async () => {
    const harness = setup(NO_REOPEN);
    const key = await launch(harness, "acp", null);
    expect(harness.spawned).toHaveLength(1);

    const reason = await refusal(restartPipes(harness.state, placeHere(harness.orchDir, key), ADAPTER));

    expect(reason).toBe("cannot switch switcher to acp: the pi binding does not offer session load");
    expect(harness.spawned).toHaveLength(2);
    expect(harness.spawned[0]?.killed).toBe(false);
    expect(harness.spawned[1]?.killed).toBe(true);
    expect(holdsSession(key)).toBe(true);
    expect(formOf(harness, key)).toBe("acp");
  });
});

describe("a restart that fails after the old form is ended", () => {
  test("a start that throws during a switch leaves the open form the old one", async () => {
    const harness = setup();
    const key = await launch(harness, "acp", null);
    harness.ptys.spawn = () => Promise.reject(new Error("pty start failed"));

    const reason = await refusal(switchForm(harness.state, placeHere(harness.orchDir, key), ADAPTER, "tui"));

    expect(reason).toBe("pty start failed");
    expect(formOf(harness, key)).toBe("acp");
  });

  test("a session/load the agent rejects leaves the session log holding what it held", async () => {
    const harness = setup({ loadError: "load refused" });
    const key = await launch(harness, "acp", null);
    const logPath = logPathOf(harness.orchDir, key);
    appendSessionEntries(logPath, [{ role: "user", text: "kept" }]);

    const reason = await refusal(restartPipes(harness.state, placeHere(harness.orchDir, key), ADAPTER));

    expect(reason).not.toBeNull();
    expect(parseSessionLog(readFileSync(logPath, "utf8"))).toEqual([{ role: "user", text: "kept" }]);
    expect(existsSync(`${logPath}${SET_ASIDE_SUFFIX}`)).toBe(false);
  });
});

describe("restart through the lifecycle handler", () => {
  test("a tui agent on a backend with no pipes, restarted to acp, is refused and keeps running in tui", async () => {
    const harness = setup();
    const withAcp = allAdapters().find((candidate) => candidate.acp !== null);
    if (withAcp === undefined) throw new Error("no registered adapter has an acp role");
    const key = mintAgentId();
    registerSpawnedAgent(harness.orchDir, {
      form: "tui", key, harnessId: withAcp.id, backendId: "headless", placed: false, cwd: harness.orchDir, name: "switcher", model: "test", spawner: null,
      process: { host: hostIdentity().id, pid: process.pid, startToken: `restart-handler-${key}` },
    });

    const reason = await refusal(applyLifecycle(harness.state, { target: key, request: { verb: "restart", harness: null, model: null, thinking: null, cmd: null, form: "acp" } }));

    expect(reason).toBe("cannot switch switcher to acp: its backend headless does not run that form");
    expect(formOf(harness, key)).toBe("tui");
  });
});
