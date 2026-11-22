## command-lock.test.ts

Imports:
```ts
import { afterEach, describe, expect, test } from "bun:test";
import { lockCommand, unlockCommand, type LockRequest } from "../src/daemon/server/handlers/command-lock.ts";
import { acceptStatusReport } from "../src/daemon/server/status-report.ts";
import { processStartToken } from "../src/process-identity.ts";
import { hostOs } from "../src/host.ts";
import { mintAgentId } from "../src/shared/agent-id.ts";
import { ensureHost } from "../src/store/agent-rows.ts";
import { approveGrantRequest } from "../src/store/grant-rows.ts";
import { selectAgentStatus } from "../src/store/status-rows.ts";
import { selectCommandLocks, takeCommandLocks } from "../src/store/command-lock-rows.ts";
import { seedAgent, seedOrch } from "./helpers/agent.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { NotifyEvent } from "../src/types/notify.ts";
import type { Role } from "../src/types/policy.ts";
import type { ResultOf } from "../src/daemon/client/protocol.ts";
import { hosted, testHost } from "./helpers/host.ts";
import { hostIdFrom } from "../src/host.ts";
```

Shared setup:
```ts
const dirs: OrchDir[] = [];
const DENIED: Role[] = ["slave"];
const EVERY_AGENT: Role[] = ["orch", "slave"];
const SETTINGS = { locked_commands: { commands: ["bun test"], applies_to: EVERY_AGENT }, gated_commands: ["git push"], denied_commands: { commands: ["bun check"], applies_to: DENIED }, timeouts: { lock_wait_ms: 180_000 } };
const LIVE = hosted(process.pid, processStartToken(process.pid) ?? null);

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function tempDir(): OrchDir {
  const dir = tempOrchDir("orch-command-lock-");
  dirs.push(dir);
  return dir;
}

function request(command: string, pid: number, startToken: string | null = "caller", held: string[] = []): LockRequest {
  return { command, cwd: "/repo", process: hosted(pid, startToken), agent: null, held, waitingSince: Date.now() };
}

function lock(dir: OrchDir, params: LockRequest, events: NotifyEvent[] = []): ResultOf<"command-lock"> {
  return lockCommand(dir, SETTINGS, params, (event) => events.push(event));
}

/** A working agent whose next locked command waits on the live runner's lock. */
function waitingAgent(dir: OrchDir): string {
  const agent = mintAgentId();
  seedAgent(agent, { name: "waiter" }, dir);
  acceptStatusReport(dir, agent, { state: "working" }, () => undefined);
  lock(dir, request("bun test", LIVE.pid, LIVE.startToken));
  return agent;
}
```

Representative test (agent-specific lock ruling):
```ts
test("locked_commands.applies_to picks who waits; the human's own orch lock always does", () => {
  const dir = tempDir();
  const orchestrator = mintAgentId();
  seedOrch(dir, orchestrator);
  const workersOnly = { ...SETTINGS, locked_commands: { commands: ["bun test"], applies_to: DENIED } };
  lock(dir, request("bun test", LIVE.pid, LIVE.startToken));
  expect(lockCommand(dir, workersOnly, { ...request("bun test", 2), agent: orchestrator }, () => undefined)).toEqual({ verdict: "run", patterns: [] });
  expect(lockCommand(dir, workersOnly, request("bun test", 2), () => undefined)).toMatchObject({ verdict: "wait", pattern: "bun test" });
});
```

Matching assertion occurrences:
- 23: `const SETTINGS = { locked_commands: { commands: ["bun test"], applies_to: EVERY_AGENT }, gated_commands: ["git push"], denied_commands: { commands: ["bun check"], applies_to: DENIED }, timeouts: { lock_wait_ms: 180_000 } };`
- 114: `test("locked_commands.applies_to picks who waits; the human's own orch lock always does", () => {`
- 118: `const workersOnly = { ...SETTINGS, locked_commands: { commands: ["bun test"], applies_to: DENIED } };`

## command-gate.test.ts

Imports:
```ts
import { describe, expect, test } from "bun:test";
import { HELD_LOCKS_ENV, heldPatterns, lockedCommandLine, matchedPatterns, wholeCommandMatch } from "../src/policy/command-gate.ts";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";
```

Shared setup:
```ts
describe("matchedPatterns", () => {
  const patterns = ["bun test", "git push"];
```
```ts
describe("the ssh family is gated by default", () => {
  const gated = SETTINGS_DEFAULTS.gated_commands;
```
No shared local functions or hooks.

Representative test (default wrap/gate list):
```ts
test("an agent's ssh, scp, sftp or rsync goes to the human for a grant", () => {
  for (const command of ["ssh prod uptime", "scp a prod:/tmp", "sftp prod", "rsync -a . prod:/srv", "cd x && ssh -p 2222 me@10.0.0.4"]) {
    expect(lockedCommandLine(command, gated), command).toBeDefined();
  }
});
```

Matching assertion occurrences:
- 33: `const gated = SETTINGS_DEFAULTS.gated_commands;`

## bridge-command-gate.test.ts

Imports:
```ts
import { PI_IDENTITY } from "../extensions/pi/vocabulary.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { createAgentPresence } from "../src/agent/presence.ts";
import { registerAgentTools } from "../src/agent/tools.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { stubDaemonLink } from "./helpers/daemon-client.ts";
import { testServices } from "./helpers/services.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { HarnessApi, HarnessContext, HarnessEventHandler } from "../src/types/agent.ts";
```

Shared setup:
```ts
const roots: OrchDir[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) removeTempDir(root);
});

function harnessContext(): HarnessContext {
  return {
    hasUI: false,
    sessionManager: { getSessionFile: () => undefined, getSessionId: () => "test-session", getBranch: () => [] },
    modelRegistry: { find: () => undefined },
    ui: { notify: () => undefined, setStatus: () => undefined, setWidget: () => undefined },
    isIdle: () => true,
    getContextUsage: () => undefined,
  };
}

/** Fire one tool_call at a bridge whose settings lock `bun test`; returns the command the tool would run. */
function toolCall(toolName: string, command: string): unknown {
  return toolInput(toolName, { command }).command;
}

/** Fire one tool_call at a bridge whose settings lock `bun test`; returns the input the tool would run with. */
function toolInput(toolName: string, input: Record<string, unknown>): Record<string, unknown> {
  const root = tempOrchDir("orch-bridge-gate-");
  roots.push(root);
  const handlers = new Map<string, HarnessEventHandler[]>();
  const harness: HarnessApi = {
    on: (name, handler) => { handlers.set(name, [...(handlers.get(name) ?? []), handler]); },
    registerTool: () => undefined,
    registerCommand: () => undefined,
    sendUserMessage: () => undefined,
    setModel: () => Promise.resolve(true),
    getThinkingLevel: () => undefined,
    setThinkingLevel: () => undefined,
    events: { on: () => undefined },
  };
  const daemon = stubDaemonLink();
  const identity = PI_IDENTITY;
  const presence = createAgentPresence({ harness, identity, extensionHash: "test", daemon });
  const settings = testServices({ orchDir: root, settings: { locked_commands: { commands: ["bun test"] } } }).settings;
  registerAgentTools(harness, { presence, daemon, identity, notify: () => undefined, refreshLabels: () => Promise.resolve(), readOnly: null }, settings);
  const event = { toolName, input: { ...input } };
  for (const handler of handlers.get("tool_call") ?? []) void handler(event, harnessContext());
  presence.stopPresence();
  return event.input;
}
```

Representative test (tool_call handler):
```ts
test("a locked bash command is rewritten through orch lock before it runs", () => {
  expect(toolCall("bash", "cd app && bun test")).toMatch(/ lock -- 'cd app && bun test'$/);
});
```

Matching assertion occurrences:
- 51: `const settings = testServices({ orchDir: root, settings: { locked_commands: { commands: ["bun test"] } } }).settings;`

## worker-prompt.test.ts

Imports:
```ts
import { afterEach, describe, expect, test } from "bun:test";
import { getAdapter } from "../src/adapters/registry.ts";
import { prepareWorkerTask, stripWorkerHeader, taskWithReferences, TASK_MAX, workerPrompt } from "../src/worker-prompt.ts";
import { workerHeaderFor } from "../src/worker-prompt.ts";
import { transitionEventFromRow } from "../src/daemon/server/status-events.ts";
import { fakeAdapter } from "./helpers/adapter.ts";
import { seedAgent } from "./helpers/agent.ts";
import { statusRow } from "./helpers/presence.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

import type { OrchDir } from "../src/types/core.ts";
```

Shared setup:
```ts
const orchDirs: OrchDir[] = [];

function makeTempOrchDir(): OrchDir {
  const directory = tempOrchDir("orch-worker-prompt-");
  orchDirs.push(directory);
  return directory;
}

afterEach(() => {
  while (orchDirs.length > 0) removeTempDir(orchDirs.pop()!);
});
```

Representative test (header names verify commands):
```ts
test("the verify clause names the configured commands, and asks for the repository's own when there are none", () => {
  const named = workerHeaderFor(getAdapter("pi"), { verifyCommands: ["bun check", "bun test"] });
  expect(named).toContain("Verify with, over only the files you edited: bun check, bun test.");
  expect(named).not.toContain("this repository already has");

  const unnamed = workerHeaderFor(getAdapter("pi"), { verifyCommands: [] });
  expect(unnamed).toContain("Run the tests and typechecks this repository already has.");
});
```

Matching assertion occurrences:
- 26: `const header = workerHeaderFor(getAdapter("pi"), { readOnly: { out: null }, verifyCommands: ["bun check"], gatedCommands: ["git push"], maySpawn: true, worktreeBranch: "orch/a" });`
- 43: `const header = workerHeaderFor(undefined, { cwd: "/repo.orch-alpha", worktreeBranch: "orch/alpha", verifyCommands: ["bun check"] });`
- 94: `expect(workerHeaderFor(getAdapter("pi"), { verifyCommands: ["bunx oxlint"] })).toContain("a task that edits no file runs no verify command");`
- 98: `const named = workerHeaderFor(getAdapter("pi"), { verifyCommands: ["bun check", "bun test"] });`
- 99: `expect(named).toContain("Verify with, over only the files you edited: bun check, bun test.");`
- 100: `expect(named).not.toContain("this repository already has");`
- 102: `const unnamed = workerHeaderFor(getAdapter("pi"), { verifyCommands: [] });`
- 103: `expect(unnamed).toContain("Run the tests and typechecks this repository already has.");`
- 107: `const header = workerHeaderFor(getAdapter("pi"), { verifyCommands: ["bunx oxlint <files>"], gatedCommands: ["git push"] });`
- 113: `const header = workerHeaderFor(getAdapter("pi"), { gatedCommands: ["git push"] });`
- 119: `expect(workerHeaderFor(getAdapter("pi"), { gatedCommands: [] })).not.toContain("approval");`

## commands-control.test.ts

Imports:
```ts
import { describe, expect, test } from "bun:test";
import { dispatchFlags, pipedText, promptBody } from "../src/commands/control.ts";
import { displayName } from "../src/commands/resolve.ts";
import { parseCommand } from "../src/commands/registry.ts";
import { workerPrompt } from "../src/worker-prompt.ts";
```

Shared setup: no shared helpers or hooks.

Representative test (dispatch prompt context):
```ts
test("adds worker header unless raw", () => {
  expect(workerPrompt("hello", true, undefined)).toBe("hello");
  expect(workerPrompt("hello", false, undefined)).toContain("hello");
});
```

Matching assertions: not found.

## commands-spawn.test.ts

Imports: see `packages/orch/test/commands-spawn.test.ts` lines 1–37; includes imports for spawn planning, settings, worker prompts, adapters/backends, stores, and test service helpers.

Shared setup (helpers and hooks):
```ts
/** What orchd plans from what `orch spawn` asks it for. */
function planned(flags: SpawnFlags, settings: OrchSettings): SpawnSettings {
  return planSpawn(resolveSpawnSettings(flags, settings).params, settings);
}
const tempDirs: OrchDir[] = [];
const servers: RpcServer[] = [];
const previousOrchDir: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  while (tempDirs.length) removeTempDir(tempDirs.pop()!);
  if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = previousOrchDir;
});
const settingsFor = (dir: OrchDir) => testServices({
  orchDir: dir,
  settings: { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless", models: { pi: "openrouter/openai/gpt-5.6-luna" } } },
}).settings.current();
const mixedSettingsFor = (dir: OrchDir) => testServices({
  orchDir: dir,
  settings: {
    enabled: { adapters: ["pi", "omp"], backends: ["headless"] },
    defaults: { adapter: "pi", backend: "headless", models: { pi: "openrouter/openai/gpt-5.6-luna", omp: "openrouter/anthropic/claude-sonnet-4.5" } },
    models: { preferred: { omp: ["openrouter/anthropic/claude-sonnet-4.5"] } },
  },
}).settings.current();
```

Representative test (spawn prompt header):
```ts
test("each pi flavor launches its own binary and preserves raw prompt", () => {
  expect(piAdapter.interactiveCmd({})).toBe("pi");
  expect(piAdapter.headlessCmd("go", {})[0]).toBe("pi");
  expect(ompAdapter.interactiveCmd({})).toBe("omp");
  expect(ompAdapter.headlessCmd("go", {})[0]).toBe("omp");
  expect(workerPrompt("hello", true, undefined)).toBe("hello");
});
```

Matching assertions: not found.

## broker-governance.test.ts

Imports:
```ts
import type { OrchDir } from "../src/types/core.ts";
import type { Governance } from "../src/daemon/client/protocol.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { governWrite as daemonGovernWrite } from "../src/daemon/server/handlers/write.ts";
import { insertOutboxMessage, selectPendingOutbox } from "../src/store/outbox-rows.ts";
import { withTransaction, orm } from "../src/store/connection.ts";
import { ensureHarness, ensureHost, insertAgent } from "../src/store/agent-rows.ts";
import { setSpace } from "../src/store/interval-rows.ts";
import { acquireLease, currentLease } from "../src/store/lease-rows.ts";
import { runnerInstance, seedProcessInstance } from "./helpers/agent.ts";
import { sql } from "drizzle-orm";
import { testServices } from "./helpers/services.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import { hostIdentity } from "../src/hosts/identity.ts";
```

Shared setup:
```ts
const dirs: OrchDir[] = [];
function freshDir(): OrchDir {
  const dir = tempOrchDir("orch-gov-");
  dirs.push(dir);
  ensureHarness(dir, "pi", "pi", 1);
  ensureHost(dir, hostIdentity(), 1);
  return dir;
}

type TestGovernance = Governance & { target?: string; text?: string };

function governWrite(directory: OrchDir, target: string, params: TestGovernance): void {
  const services = testServices({ orchDir: directory, settings: null });
  daemonGovernWrite(idleDaemonState(services, directory), target, params);
}

/** Identity and nothing else: a minted id, with no environment welded into it. */
function agent(dir: OrchDir, id: string): void {
  insertAgent(dir, { host: hostIdentity(), id, name: id, spawnedBy: null, harnessId: "pi", cwd: dir, createdAt: 1 });
}

/** An orch whose recorded process instance is this test process: provably alive. */
function liveOrch(dir: OrchDir, id: string): void {
  agent(dir, id);
  seedProcessInstance(dir, id, 1);
}

/** An orch with a recorded process that is provably NOT this process instance. */
function deadOrch(dir: OrchDir, id: string): void {
  agent(dir, id);
  seedProcessInstance(dir, id, 1, runnerInstance("not-this-process-instance"));
}

/** Environment is a satellite of the identity, on its own timeline. */
function placeIn(dir: OrchDir, id: string, space: string): void {
  orm(dir).run(sql`INSERT OR IGNORE INTO spaces (id, name, created_at) VALUES (${space}, ${space}, ${1})`);
  setSpace(dir, id, 1, space);
}

afterEach(() => {
  for (const dir of dirs.splice(0)) removeTempDir(dir);
});
```

Representative test (dispatch/write governance):
```ts
test("an unscoped actor is refused while a live orch holds the lease", () => {
  const dir = freshDir();
  liveOrch(dir, "holderaaa1");
  agent(dir, "targetaaa1");
  acquireLease(dir, "targetaaa1", "holderaaa1", 2);
  // No actor field => the caller holds nothing, so a live holder excludes it.
  expect(() => governWrite(dir, "targetaaa1", { target: "targetaaa1", text: "hi" })).toThrow(/leased by holderaaa1/);
});
```

Matching assertions: not found.

## held-drive.test.ts

Imports:
```ts
import { afterEach, describe, expect, test } from "bun:test";
import { attachFakeBridge, detachFakeBridges, heldFarAgent, nearOrchd, startHeldFar, type HeldFar, type NearOrchd } from "./helpers/held-far.ts";
import type { FakePty } from "./helpers/fake-pty.ts";
import { testHost } from "./helpers/host.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { rpcCall } from "../src/daemon/client/rpc.ts";
import { dispatch, steer, answer } from "../src/daemon/server/handlers/write.ts";
import { clearSession, setModel } from "../src/daemon/server/handlers/lifecycle.ts";
import { abortAnywhere } from "../src/daemon/server/handlers/drive.ts";
import { rename } from "../src/daemon/server/handlers/lease.ts";
import { ownedAgents } from "../src/daemon/server/handlers/owned.ts";
import { outboxMessageState, selectOutboxMessage } from "../src/store/outbox-rows.ts";
import { pendingQuestion, recordQuestion } from "../src/store/question-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { selectAgentStatus } from "../src/store/status-rows.ts";
import { stampGovernance } from "../src/daemon/server/governance.ts";
import type { Governance } from "../src/daemon/client/protocol.ts";
import type { DaemonState } from "../src/daemon/server/state.ts";
import type { CallerCredential } from "../src/types/core.ts";
import type { HostGreeting } from "../src/types/host.ts";
import type { AgentState } from "../src/agent-state.ts";
```

Shared setup:
```ts
const fars: HeldFar[] = [];
const nears: NearOrchd[] = [];

afterEach(async () => {
  detachFakeBridges();
  for (const near of nears.splice(0)) await near.close();
  closeAllStores();
  while (fars.length) await fars.pop()!.close();
});

function greeting(id: string): HostGreeting {
  return { host: testHost(id, `machine-${id}`), commit: null, version: "0.1.0" };
}

/** A pi agent held on the far host `id`, spawned at this host's asking, with its bridge attached
 *  there, and this host's orchd linked to that host as box. */
async function heldThere(id: string): Promise<{ far: HeldFar; near: NearOrchd; key: string; pty: FakePty; deliveries: ReturnType<typeof attachFakeBridge> }> {
  const far = await startHeldFar(greeting(id));
  fars.push(far);
  const { key, pty } = await heldFarAgent(far);
  const deliveries = attachFakeBridge(far, key);
  const near = await nearOrchd(far, key);
  nears.push(near);
  return { far, near, key, pty, deliveries };
}

/** The operator at this host's terminal: the caller that spawned every agent here. */
const OPERATOR: CallerCredential = { launch: null, session: null, pid: process.pid };

/** A drive verb run by this host's orchd for the operator's CLI, its params stamped as orchd stamps them. */
function asOperator<P extends Governance, R>(near: NearOrchd, verb: (state: DaemonState, params: P) => R, params: P): R {
  return verb(near.state, stampGovernance(near.state, { ...params, caller: OPERATOR }));
}

/** The harness reports its state to the far orchd, over that orchd's socket. */
function report(far: HeldFar, key: string, state: AgentState): Promise<unknown> {
  return rpcCall(far.orchDir, "report-status", { key, status: { state } });
}

/** Resolves once the PTY has been typed `text`. */
function typed(pty: FakePty, text: string): Promise<void> {
  return new Promise((resolve) => {
    const poll = (): void => { if (pty.written.join("").includes(text)) resolve(); else setTimeout(poll, 5); };
    poll();
  });
}

/** `orch reset` here: the far harness takes `/new` in its PTY and comes back idle. */
async function resetThere(far: HeldFar, near: NearOrchd, key: string, pty: FakePty): Promise<unknown> {
  const cleared = asOperator(near, clearSession, { target: key });
  await typed(pty, "/new\r");
  await report(far, key, "idle");
  return cleared;
}
```

Representative test (dispatch to held agent):
```ts
test("dispatch to a fresh agent reaches its bridge there and is acknowledged", async () => {
  const { far, near, key, deliveries } = await heldThere("held-d1");
  const answered = await asOperator(near, dispatch, { target: key, text: "do the far thing" });
  expect(answered).toMatchObject({ accepted: true, ack: "acknowledged" });
  expect(deliveries.map((delivery) => delivery.message)).toEqual([{ action: "dispatch", text: "do the far thing" }]);
  expect(outboxMessageState(far.orchDir, answered.id)).toBe("delivered");
  expect(selectOutboxMessage(near.orchDir, answered.id)).toBeUndefined();
});
```

Matching assertions: not found.
