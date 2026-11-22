## settings-command.test.ts

### Imports
```ts
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { writeSettingsFixture } from "../test/helpers/settings.ts";
import * as registry from "../src/settings/registry.ts";
import { SETTINGS_REGISTRY } from "../src/settings/registry.ts";
import { cmdSettings } from "../src/commands/settings.ts";
import { createServices } from "../src/services.ts";
import { CommandRefusal } from "../src/refusal.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { mintAgentId } from "../src/shared/agent-id.ts";
import { AGENT_SETTINGS_GRANT } from "../src/policy/agent-settings.ts";
import { isRecord } from "../src/util.ts";
import { claudeSettingsPath } from "../src/adapters/claude-hooks.ts";
import { removeTempDir, tempOrchDir } from "../test/helpers/tempdir.ts";
import { captureStdout } from "../test/helpers/stdout.ts";
import { serveFileDaemon, servedServices } from "../test/helpers/daemon-state.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import { seedOperator } from "../test/helpers/agent.ts";
import { HARNESS_SESSION_VARS, isolateOrchEnv, restoreOrchEnv } from "../test/helpers/env.ts";
import type { OrchDir } from "../src/types/core.ts";
```

### Shared setup and helpers
```ts
const directories: OrchDir[] = [];
function tempDir(): OrchDir {
  const directory = tempOrchDir("orch-settings-cmd-");
  directories.push(directory);
  return directory;
}
beforeEach(() => { isolateOrchEnv(); });
afterEach(() => {
  restoreOrchEnv();
  while (directories.length) removeTempDir(directories.pop()!);
});
const CALLER_VARS = [LAUNCH_ENV, ...HARNESS_SESSION_VARS];
async function runSettingsCli(orchDir: OrchDir, extraEnv: Record<string, string>, args: readonly string[]): Promise<string> {
  const saved = Object.fromEntries(CALLER_VARS.map((name) => [name, process.env[name]]));
  for (const name of CALLER_VARS) delete process.env[name];
  process.env.ORCH_DIR = orchDir;
  Object.assign(process.env, extraEnv);
  const servers: RpcServer[] = [];
  await serveFileDaemon(orchDir, servers);
  try {
    return await captureStdout(() => cmdSettings(createServices({ orchDir }), [...args]));
  } finally {
    while (servers.length > 0) await servers.pop()!.close();
    for (const name of CALLER_VARS) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }
}
function runSettings(orchDir: OrchDir, extraEnv: Record<string, string>, ...args: string[]): Promise<string> {
  return runSettingsCli(orchDir, extraEnv, args);
}
async function runSettingsExpectingFailure(orchDir: OrchDir, extraEnv: Record<string, string>, ...args: string[]): Promise<{ message: string }> {
  try { await runSettingsCli(orchDir, extraEnv, args); }
  catch (error: unknown) { if (error instanceof CommandRefusal) return { message: error.message }; throw error; }
  throw new Error("orch settings succeeded, expected a refusal");
}
interface SettingReport { readonly value: unknown; readonly source: string; readonly agentWritable: boolean }
function settingsReport(output: string): Record<string, SettingReport> {
  const parsed: unknown = JSON.parse(output);
  if (!isRecord(parsed)) throw new Error("settings --json did not return an object");
  const report: Record<string, SettingReport> = {};
  for (const [key, entry] of Object.entries(parsed)) {
    if (!isRecord(entry) || !("value" in entry) || !("source" in entry) || !("agentWritable" in entry)) throw new Error(`settings --json entry ${key} has no value/source/agentWritable`);
    const { source, agentWritable } = entry;
    if (typeof source !== "string") throw new Error(`settings --json entry ${key} has a non-string source`);
    if (typeof agentWritable !== "boolean") throw new Error(`settings --json entry ${key} has a non-boolean agentWritable`);
    report[key] = { value: entry.value, source, agentWritable };
  }
  return report;
}
```

### Representative test: setting one key
```ts
test("sets an integer through its registry entry", async () => {
  const directory = tempDir();
  writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
  expect(await runSettings(directory, {}, "fleet.max_depth", "5")).toContain("fleet.max_depth = 5");
});
```

### Matching assertion lines
- settings-command.test.ts:130 `expect(report["defaults.adapter"]).toEqual({ value: "pi", source: "settings.json", agentWritable: false });`
- settings-command.test.ts:131 `expect(report["defaults.backend"]).toEqual({ value: "headless", source: "settings.json", agentWritable: false });`
- settings-command.test.ts:178 `expect(failed.message).toContain("settings.json");`
- settings-command.test.ts:316 `expect(await runSettings(directory, asAgent(), "workers.verify_commands", "[\"bun check\"]")).toContain("workers.verify_commands = [\"bun check\"]");`
- settings-command.test.ts:324 `expect(failed.message).toContain("workers.verify_commands");`
- settings-command.test.ts:338 `expect(await runSettings(directory, {}, "grant", "fleet.max_depth")).toBe("agents may write: workers.verify_commands, locked_commands.commands, fleet.max_depth\n");`
- settings-command.test.ts:345 `expect(await runSettings(directory, {}, "revoke", "locked_commands.commands")).toBe("agents may write: workers.verify_commands\n");`
- settings-command.test.ts:346 `expect(await runSettings(directory, {}, "revoke", "workers.verify_commands")).toBe("agents may write: (none)\n");`
- settings-command.test.ts:347 `const failed = await runSettingsExpectingFailure(directory, asAgent(), "locked_commands.commands", "[\"git push\"]");`
- settings-command.test.ts:354 `expect(await runSettings(directory, {}, "grant", "locked_commands.commands")).toBe("agents may write: workers.verify_commands, locked_commands.commands\n");`
- settings-command.test.ts:364 `expect((await runSettingsExpectingFailure(directory, asAgent(), "revoke", "locked_commands.commands")).message).toContain("operator-only for an agent");`
- settings-command.test.ts:372 `expect(row("workers.verify_commands")).toMatch(/ agent$/);`
- settings-command.test.ts:375 `expect(report["workers.verify_commands"]?.agentWritable).toBe(true);`

## settings-shell.test.ts

### Imports
```ts
import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileSettingsManager } from "../src/settings/manager.ts";
import { shouldLaunchSettingsEditor } from "../src/commands/settings.ts";
import { SETTINGS_REGISTRY, writeRegisteredSetting } from "../src/settings/registry.ts";
import { createEditorState, editorReducer } from "../src/settings/editor.ts";
import { commitAndFlush, loadEntries, toggleAgentGrant, type Session } from "../src/settings/shell/state.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
```

### Shared setup
```ts
const dirs: OrchDir[] = [];
function tempDir(prefix: string): OrchDir {
  const directory = tempOrchDir(prefix);
  dirs.push(directory);
  return directory;
}
afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop() ?? "");
});
```

### Representative test: editor save
```ts
test("a committed choice shows its saved value on the next screen", () => {
  const directory = tempDir("orch-settings-shell-");
  writeSettingsFixture(directory, { mail: { to_spawner: "prompt" } });
  const manager = fileSettingsManager(directory);
  const session: Session = { state: createEditorState(loadEntries(manager)), filter: "", searching: false, status: undefined, quit: false, filterKeySpent: false, views: { install: manager, project: null }, view: "install" };
  const index = session.state.settings.findIndex((entry) => entry.spec.key === "mail.to_spawner");
  const opened = editorReducer({ ...session.state, focusedIndex: index }, { type: "open" });
  expect(opened.mode).toBe("editing");
  if (opened.mode !== "editing") return;
  commitAndFlush(session, manager, opened, "prompt-unless-focused");
  expect(session.status).toBe("mail.to_spawner saved");
  expect(session.state.settings[session.state.focusedIndex]?.value).toBe("prompt-unless-focused");
  expect(manager.current().mail.to_spawner).toBe("prompt-unless-focused");
});
```

### Matching assertion lines
- settings-shell.test.ts:38 `const text = readFileSync(join(directory, "settings.json"), "utf8");`
- settings-shell.test.ts:73 `expect(manager.current().agents.writable_settings).toEqual(["workers.verify_commands", "locked_commands.commands", "fleet.max_depth"]);`
- settings-shell.test.ts:77 `expect(manager.current().agents.writable_settings).toEqual(["workers.verify_commands", "locked_commands.commands"]);`

## settings-precedence.test.ts

### Imports
```ts
import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { fileSettingsManager } from "../src/settings/manager.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
```

### Shared setup
```ts
const directories: OrchDir[] = [];
function tempDir(): OrchDir {
  const directory = tempOrchDir("orch-settings-precedence-");
  directories.push(directory);
  return directory;
}
afterEach(() => {
  while (directories.length) removeTempDir(directories.pop()!);
});
```

### Representative test: settings sources
```ts
test("parses notify entries and hosts into expected shapes", () => {
  const directory = tempDir();
  writeSettingsFixture(directory, {
    notify: [{ id: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
    hosts: { gpu1: { dest: "bryan@gpu1", orch_dir: "/srv/orch" } },
  });
  expect(fileSettingsManager(directory).current()).toMatchObject({
    notify: [{ id: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
    hosts: { gpu1: { dest: "bryan@gpu1", orch_dir: "/srv/orch" } },
  });
});
```

### Matching assertion lines
not found

## council-command.test.ts

### Imports
```ts
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { cmdCouncil } from "../src/commands/council.ts";
import { hostIdentity } from "../src/hosts/identity.ts";
import { orchDirAt } from "../src/orch-dir.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { askReview, insertCouncil, scoreReview } from "../src/store/council-rows.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import type { OrchDir } from "../src/types/core.ts";
import { HARNESS_SESSION_ENV } from "../src/shared/session-env.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { servedServices } from "./helpers/daemon-state.ts";
import { captureStdout } from "./helpers/stdout.ts";
import { isolateHarnessSession } from "./helpers/env.ts";
```

### Shared setup
```ts
const servers: RpcServer[] = [];
const dirs: OrchDir[] = [];
let restoreHarnessSession: (() => void) | undefined;
let savedPiMarker: string | undefined;
let savedPiSessionId: string | undefined;
let oldOrchDir: OrchDir | undefined;
const settings = { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } };
beforeEach(() => {
  restoreHarnessSession = isolateHarnessSession("pi");
  savedPiMarker = process.env[HARNESS_SESSION_ENV.pi.marker];
  savedPiSessionId = process.env[HARNESS_SESSION_ENV.pi.sessionId];
  delete process.env[HARNESS_SESSION_ENV.pi.marker];
  delete process.env[HARNESS_SESSION_ENV.pi.sessionId];
  oldOrchDir = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
});
afterEach(async () => {
  restoreHarnessSession?.();
  if (savedPiMarker === undefined) delete process.env[HARNESS_SESSION_ENV.pi.marker];
  else process.env[HARNESS_SESSION_ENV.pi.marker] = savedPiMarker;
  if (savedPiSessionId === undefined) delete process.env[HARNESS_SESSION_ENV.pi.sessionId];
  else process.env[HARNESS_SESSION_ENV.pi.sessionId] = savedPiSessionId;
  restoreHarnessSession = undefined;
  while (servers.length) await servers.pop()?.close();
  closeAllStores();
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldOrchDir;
  for (const dir of dirs.splice(0)) removeTempDir(dir);
});
async function setup(members: string[]): Promise<{ root: OrchDir; directory: string; services: Awaited<ReturnType<typeof servedServices>> }> {
  const root = tempOrchDir("orch-council-command-");
  dirs.push(root);
  process.env.ORCH_DIR = root;
  writeSettingsFixture(root, settings);
  ensureHarness(root, "pi", "pi", 1);
  for (const id of ["lead", "ada", "bea"]) insertAgent(root, { host: hostIdentity(), id, name: id, spawnedBy: null, harnessId: "pi", cwd: root, createdAt: 1 });
  const directory = join(root, ".orch", "councils", "plan");
  insertCouncil(root, { id: "c1", name: "plan", directory, convenedBy: "lead", scale: 10, convenedAt: 1, closedAt: null }, members.map((name) => ({ agentId: name, name })));
  const services = await servedServices({ orchDir: root, settings }, servers);
  return { root, directory, services };
}
```

### Representative test: lineup / convene
```ts
test("convene needs a subject", async () => {
  const { services } = await setup([]);
  return expect(cmdCouncil(services, ["convene", "next", "ada", "--model", "luna"])).rejects.toThrow("say what it is with --prompt");
});
```

### Matching assertion lines
not found

## council-handlers.test.ts

### Imports
```ts
import { afterEach, describe, expect, test } from "bun:test";
import * as path from "node:path";
import { hostIdentity } from "../src/hosts/identity.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { askReview, closeCouncil, councilAt, insertCouncil, scoreReview } from "../src/store/council-rows.ts";
import { closeCouncilNamed, councilRound, councilScores, councilSteer } from "../src/daemon/server/council.ts";
import { upsertRun } from "../src/store/run-rows.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import { testServices } from "./helpers/services.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { DaemonState } from "../src/daemon/server/state.ts";
```

### Shared setup
```ts
const dirs: OrchDir[] = [];
afterEach(() => {
  closeAllStores();
  while (dirs.length) {
    const dir = dirs.pop();
    if (dir !== undefined) removeTempDir(dir);
  }
});
function seeded(members: string[]): { dir: OrchDir; state: DaemonState; directory: string } {
  const dir = tempOrchDir("orch-council-handlers-");
  dirs.push(dir);
  ensureHarness(dir, "pi", "pi", 1);
  for (const name of ["lead", ...members]) insertAgent(dir, { host: hostIdentity(), id: name, name, spawnedBy: null, harnessId: "pi", cwd: dir, createdAt: 1 });
  const directory = path.join(dir, ".orch", "councils", "plan");
  insertCouncil(dir, { id: "c1", name: "plan", directory, convenedBy: "lead", scale: 10, convenedAt: 1, closedAt: null }, members.map((name) => ({ agentId: name, name })));
  const state = idleDaemonState(testServices({ orchDir: dir, settings: { defaults: { adapter: "pi", backend: "headless" } } }), dir);
  return { dir, state, directory };
}
const ref = (dir: OrchDir) => ({ name: "plan", cwd: dir });
```

### Representative test: round limit
```ts
test("a council that has run its rounds takes no more", () => {
  const { dir, state } = seeded(["ada"]);
  for (const round of [1, 2, 3]) {
    askReview(dir, { dispatchId: `d${round}`, councilId: "c1", round, member: "ada", askedAt: round });
    scoreReview(dir, `d${round}`, round, { score: 7 });
  }
  return expect(councilRound(state, { ...ref(dir), subject: "go" })).rejects.toThrow("council plan has run its 3 rounds. Close it, or raise the council.rounds setting to go on");
});
```

### Matching assertion lines
not found

## hosts-link.test.ts

### Imports
```ts
import { registerHostedAgent } from "../src/store/spawn-registration.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { z } from "zod";
import { framedLineReader } from "../src/daemon/client/wire.ts";
import { HostLinks, type HostAgentsSink, type HostEventSink, type LinkSpawner } from "../src/hosts/link.ts";
import { eventLogId } from "../src/daemon/server/replay.ts";
import { startFarOrchd, type FarOrchd } from "./helpers/far-orchd.ts";
import { hostEventCursor, latestHostLink, setHostEventCursor } from "../src/store/host-rows.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { mintAgentId } from "../src/shared/agent-id.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { processStartToken } from "../src/process-identity.ts";
import { errorMessage } from "../src/util.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { AgentOrigin, HostGreeting } from "../src/types/host.ts";
import type { NotifyEvent } from "../src/types/notify.ts";
import type { LinkedHost } from "../src/types/process.ts";
import type { OrchDir } from "../src/types/core.ts";
import { testHost, hosted } from "./helpers/host.ts";
import { hostIdFrom } from "../src/host.ts";
import { hostIdentity } from "../src/hosts/identity.ts";
import { upsertRun } from "../src/store/run-rows.ts";
import { drainWrites } from "../src/store/connection.ts";
import { readAgentAnywhere } from "../src/daemon/server/handlers/host.ts";
import { nearOrchd, type NearOrchd } from "./helpers/held-far.ts";
import type { CallerCredential } from "../src/types/core.ts";
import { answer as answerQuestion, dispatch } from "../src/daemon/server/handlers/write.ts";
import { abortAnywhere, closeAnywhere } from "../src/daemon/server/handlers/drive.ts";
import { clearSession, listPendingQuestions } from "../src/daemon/server/handlers/lifecycle.ts";
import { recordQuestion } from "../src/store/question-rows.ts";
import { rename } from "../src/daemon/server/handlers/lease.ts";
import { resolveLifecycleEntity } from "../src/daemon/server/handlers/resolve.ts";
import { selectOpenOutboxForTarget, selectOutboxMessage } from "../src/store/outbox-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { acquireLease, currentLease } from "../src/store/lease-rows.ts";
```

### Shared setup
```ts
const dirs: OrchDir[] = [];
const otherDirs: OrchDir[] = [];
const links: HostLinks[] = [];
const fars: FarOrchd[] = [];
const nears: NearOrchd[] = [];
afterEach(async () => {
  for (const link of links.splice(0)) link.closeAll();
  for (const near of nears.splice(0)) await near.close();
  closeAllStores();
  while (fars.length) await fars.pop()!.close();
  for (const dir of [...dirs.splice(0), ...otherDirs.splice(0)]) removeTempDir(dir);
});
function greeting(id: string): HostGreeting { return { host: testHost(id, `machine-${id}`), commit: null, version: "0.1.0" }; }
function hostLinks(spawn: LinkSpawner, events: HostEventSink = () => undefined, agents: HostAgentsSink = () => undefined, linkSettings: Readonly<Record<string, number>> = {}, changed: (host: string) => void = () => undefined): HostLinks {
  const orchDir = tempOrchDir("orch-host-link-");
  dirs.push(orchDir);
  const services = testServices({ orchDir, settings: { hosts: { box: { dest: "box" } }, links: { request_timeout_ms: 500, ...linkSettings } } });
  const made = new HostLinks({ orchDir, settings: () => services.settings.current(), logger: services.logger, spawn, events, agents, changed });
  links.push(made);
  return made;
}
```

### Representative test: dispatch over peer-drive
```ts
test("a dispatch to an agent on a linked host is delivered by that host's orchd, and nothing is queued here", async () => {
  const far = await startFarOrchd(greeting("far-8"));
  fars.push(far);
  const key = farAgent(far, { askedBy: hostIdentity().id, spawner: null }, true);
  const near = await nearDriving(far, key);
  const answer = await dispatch(near.state, { target: key, text: "do the far thing" });
  expect(answer.accepted).toBe(true);
  expect(selectOutboxMessage(far.orchDir, answer.id)).toMatchObject({ target: key, payload: { action: "dispatch", text: "do the far thing" } });
  expect(selectOutboxMessage(near.orchDir, answer.id)).toBeUndefined();
});
```

### Matching assertion lines
not found

## acp-far.test.ts

### Imports
```ts
import { afterEach, describe, expect, test } from "bun:test";
import { methods } from "@agentclientprotocol/sdk";
import { rpcCall } from "../src/daemon/client/rpc.ts";
import { abortAnywhere } from "../src/daemon/server/handlers/drive.ts";
import { spawnHeadless } from "../src/daemon/server/handlers/lifecycle.ts";
import { answer, dispatch } from "../src/daemon/server/handlers/write.ts";
import { endSessionAgents } from "../src/daemon/server/session-agents.ts";
import type { DaemonState } from "../src/daemon/server/state.ts";
import { hostIdentity } from "../src/hosts/identity.ts";
import { mintAgentId } from "../src/shared/agent-id.ts";
import { agentView } from "../src/store/agent-view.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { selectAgentStatus } from "../src/store/status-rows.ts";
import type { CallerCredential } from "../src/types/core.ts";
import type { HostGreeting } from "../src/types/host.ts";
import { stampGovernance } from "../src/daemon/server/governance.ts";
import type { Governance } from "../src/daemon/client/protocol.ts";
import { acpProgram, chunk, defaultFakeScript, fakeAcpAgent, modelSelector, permission, turn, type FakeAcpScript } from "./helpers/fake-acp-agent.ts";
import { HELD_FAR_CATALOGUE, nearOrchd, type NearOrchd } from "./helpers/held-far.ts";
import { testHost } from "./helpers/host.ts";
import { startFarOrchd, type FarOrchd } from "./helpers/far-orchd.ts";
```

### Shared setup
```ts
const fars: FarOrchd[] = [];
const nears: NearOrchd[] = [];
const previousCodexHome = process.env.CODEX_HOME;
const OPERATOR: CallerCredential = { launch: null, session: null, pid: process.pid };
function asOperator<P extends Governance, R>(near: NearOrchd, verb: (state: DaemonState, params: P) => R, params: P): R {
  return verb(near.state, stampGovernance(near.state, { ...params, caller: OPERATOR }));
}
async function until(check: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("the condition was never reached");
}
function greeting(id: string): HostGreeting { return { host: testHost(id, `machine-${id}`), commit: null, version: "0.1.0" }; }
async function acpThere(id: string, turns: FakeAcpScript["turns"]) {
  const agent = fakeAcpAgent(defaultFakeScript({ turns, configOptions: [modelSelector(["gpt-5.6-luna"])] }));
  const program = acpProgram(agent);
  const far = await startFarOrchd(greeting(id), { models: HELD_FAR_CATALOGUE, pipes: program.pipes });
  fars.push(far);
  process.env.CODEX_HOME = far.orchDir;
  const key = mintAgentId();
  await spawnHeadless(far.state, { project: "/fleet/project", form: "acp", key, name: "acp-far", spawner: null, adapter: "codex", model: "gpt-5.6-luna", thinking: "medium", prompt: null, cwd: far.orchDir }, hostIdentity().id);
  const near = await nearOrchd(far, key, { name: "acp-far", form: "acp", harness: "codex", model: "gpt-5.6-luna", followEvents: true, serve: true });
  nears.push(near);
  return { far, near, key, agent };
}
afterEach(async () => {
  for (const near of nears.splice(0)) await near.close();
  while (fars.length) await fars.pop()!.close();
  await endSessionAgents();
  closeAllStores();
  if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
  else process.env.CODEX_HOME = previousCodexHome;
});
```

### Representative test: linked-host spawn
```ts
test("dispatch from here runs a turn there, and result here names the host", async () => {
  const { far, near, key } = await acpThere("acp-far-result", [turn({ updates: [chunk("far acp done")] })]);
  const sent = await asOperator(near, dispatch, { target: key, text: "do it" });
  await until(() => selectAgentStatus(far.orchDir, key)?.state === "done");
  expect(agentView(far.orchDir, key)?.form).toBe("acp");
  expect(await rpcCall(near.orchDir, "agent-read", { caller: OPERATOR, key, read: { kind: "result" } })).toMatchObject({ host: "box", reading: { kind: "result", lookup: { kind: "found", payload: "far acp done" } } });
  expect(sent).toMatchObject({ accepted: true });
});
```

### Matching assertion lines
not found

## project-directory.test.ts

### Imports
```ts
import { afterEach, describe, expect, test } from "bun:test";
import { projectDirectory } from "../src/daemon/server/spawn/project.ts";
import { agentLaunchEnv } from "../src/policy/spawner.ts";
import { recordAgentStatus } from "../src/presence/store.ts";
import { placeHere } from "../src/process-place.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { seedAgent } from "./helpers/agent.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
```

### Shared setup
```ts
const directories: OrchDir[] = [];
afterEach(() => {
  closeAllStores();
  for (const directory of directories.splice(0)) removeTempDir(directory);
});
function orchDirWith(project: string | null): OrchDir {
  const directory = tempOrchDir("orch-project-directory-");
  directories.push(directory);
  seedAgent("lead", { adapter: "pi", cwd: "/repo/main", name: "lead" }, directory);
  recordAgentStatus(directory, placeHere(directory, "lead"), { state: "working", project }, 1);
  return directory;
}
```

### Representative test: project directory
```ts
test("a spawned agent takes its spawner's project, not the directory it launches in", () => {
  expect(projectDirectory(orchDirWith("/repo/main"), "lead", "/repo/main/.orch-worktrees/w1")).toBe("/repo/main");
});
```

### Matching assertion lines
not found
