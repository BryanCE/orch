import { describe, expect, test } from "bun:test";
import { PREREQUISITES } from "../src/shared/prerequisites.ts";
import { setupPrerequisites } from "../src/daemon/server/setup.ts";
import { HOST_OS_VALUES } from "../src/types/host.ts";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fakeAdapter } from "./helpers/adapter.ts";
import { checkBindingAnswers, checkBindingPrerequisites, checkBins, binaryStatus } from "../src/daemon/server/doctor/bins.ts";
import { methods, PROTOCOL_VERSION } from "@agentclientprotocol/sdk";
import { fakePipes } from "./helpers/fake-pipes.ts";
import { fakeAcpAgent } from "./helpers/fake-acp-agent.ts";
import type { PipesProvider } from "../src/types/pipes.ts";

/** Setup preselects a recommended tool, so it must install it on every OS, and NixOS
 *  users, who get no install command, must get a page that tells them how. */
describe("binding prerequisites", () => {
  const command = "test-binding";
  const adapter = fakeAdapter({ acp: { argv: () => [command], env: () => ({}), sharesSessions: false, install: {} } });

  test("finds the declared binding on PATH", () => {
    const directory = mkdtempSync(join(tmpdir(), "orch-binding-"));
    const previous = process.env.PATH;
    const previousPathext = process.env.PATHEXT;
    try {
      process.env.PATHEXT = "";
      const executable = join(directory, command);
      writeFileSync(executable, "", { mode: 0o755 });
      process.env.PATH = directory;
      expect(checkBindingPrerequisites([adapter])).toEqual([{
        id: `binding-${command}`, label: `${command} binding`, status: "ok", detail: `${command} found at ${executable}`,
      }]);
    } finally {
      if (previous === undefined) delete process.env.PATH;
      else process.env.PATH = previous;
      if (previousPathext === undefined) delete process.env.PATHEXT;
      else process.env.PATHEXT = previousPathext;
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("a missing binding warns without failing its harness", () => {
    const directory = mkdtempSync(join(tmpdir(), "orch-binding-"));
    const previous = process.env.PATH;
    const previousPathext = process.env.PATHEXT;
    try {
      process.env.PATHEXT = "";
      writeFileSync(join(directory, adapter.id), "", { mode: 0o755 });
      process.env.PATH = directory;
      const [binding] = checkBindingPrerequisites([adapter]);
      expect(binding?.status).toBe("warn");
      expect(binding?.detail).toContain(`${command} is not on PATH`);
      expect(checkBins(binaryStatus([adapter.id]), [adapter.id]).status).toBe("ok");
    } finally {
      if (previous === undefined) delete process.env.PATH;
      else process.env.PATH = previous;
      if (previousPathext === undefined) delete process.env.PATHEXT;
      else process.env.PATHEXT = previousPathext;
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("a null role adds no prerequisite", () => {
    expect(checkBindingPrerequisites([fakeAdapter({ acp: null })])).toEqual([]);
  });
});

/** A binding that answers ACP initialize: fake pipes whose stdio is wired to a fake agent. */
function answeringPipes(agent: ReturnType<typeof fakeAcpAgent>): PipesProvider {
  const pipes = fakePipes();
  return {
    spawn(request) {
      const child = pipes.provider.spawn(request);
      const wire = pipes.spawned.at(-1);
      if (!wire) throw new Error("fake pipes started no process");
      wire.fromOrchd.pipeTo(agent.streams.input).catch(() => undefined);
      agent.streams.output.pipeTo(wire.toOrchd).catch(() => undefined);
      return child;
    },
  };
}

describe("binding answers", () => {
  const command = "test-binding";
  const acpAdapter = fakeAdapter({ acp: { argv: () => [command], env: () => ({}), sharesSessions: false, install: {} } });
  const id = `binding-${command}`;
  const label = `${command} binding`;

  /** Runs `action` with the binding on PATH, handing it the binding's path. */
  async function withBindingOnPath<T>(action: (executable: string) => Promise<T>): Promise<T> {
    const directory = mkdtempSync(join(tmpdir(), "orch-binding-"));
    const previous = process.env.PATH;
    const previousPathext = process.env.PATHEXT;
    try {
      process.env.PATHEXT = "";
      const executable = join(directory, command);
      writeFileSync(executable, "", { mode: 0o755 });
      process.env.PATH = directory;
      return await action(executable);
    } finally {
      if (previous === undefined) delete process.env.PATH;
      else process.env.PATH = previous;
      if (previousPathext === undefined) delete process.env.PATHEXT;
      else process.env.PATHEXT = previousPathext;
      rmSync(directory, { recursive: true, force: true });
    }
  }

  test("a binding that answers shows its name, version and protocol version", async () => {
    const agent = fakeAcpAgent({
      initialize: { protocolVersion: PROTOCOL_VERSION, agentInfo: { name: "fake-binding", version: "2.0.1" } },
      sessionId: "unused",
      configOptions: [],
      replay: [],
      turns: [],
    });
    await withBindingOnPath(async (executable) => {
      expect(await checkBindingAnswers([acpAdapter], { pipes: answeringPipes(agent), timeoutMs: 5_000 })).toEqual([{
        id, label, status: "ok",
        detail: `${command} found at ${executable}; answers as fake-binding 2.0.1 on ACP protocol ${PROTOCOL_VERSION}`,
      }]);
    });
    expect(agent.received.map((request) => request.method)).toEqual([methods.agent.initialize]);
  });

  test("a binding that never answers is reported as not answering", async () => {
    await withBindingOnPath(async (executable) => {
      expect(await checkBindingAnswers([acpAdapter], { pipes: fakePipes().provider, timeoutMs: 20 })).toEqual([{
        id, label, status: "warn",
        detail: `${command} found at ${executable}; not answering: no ACP initialize reply within 20 ms`,
      }]);
    });
  });
});

describe("a recommended tool installs everywhere", () => {
  const recommended = Object.entries(PREREQUISITES).filter(([, entry]) => entry.recommended === true);

  test("at least one tool is recommended", () => {
    expect(recommended.map(([id]) => id)).toContain("herdr");
  });

  for (const [id, entry] of recommended) {
    test(`${id} has an install command for each host OS and a docs page for NixOS`, () => {
      for (const os of HOST_OS_VALUES) expect(entry.install?.[os]).toBeString();
      expect(entry.docsUrl).toBeString();
    });
  }
});

describe("setup offers a missing binding", () => {
  function withEmptyPath<T>(action: (directory: string) => T): T {
    const directory = mkdtempSync(join(tmpdir(), "orch-setup-binding-"));
    const previous = process.env.PATH;
    const previousPathext = process.env.PATHEXT;
    try {
      process.env.PATHEXT = "";
      process.env.PATH = directory;
      return action(directory);
    } finally {
      if (previous === undefined) delete process.env.PATH;
      else process.env.PATH = previous;
      if (previousPathext === undefined) delete process.env.PATHEXT;
      else process.env.PATHEXT = previousPathext;
      rmSync(directory, { recursive: true, force: true });
    }
  }

  test("a missing codex-acp is queued with its install command, after bun", () => {
    withEmptyPath(() => {
      const { missing } = setupPrerequisites({ adapters: ["codex"], backends: [] });
      expect(missing).toContainEqual({ bin: "codex-acp", cmd: "bun add -g @agentclientprotocol/codex-acp" });
      expect(missing.findIndex(({ bin }) => bin === "bun")).toBeLessThan(missing.findIndex(({ bin }) => bin === "codex-acp"));
    });
  });

  test("a codex-acp on PATH is not queued", () => {
    withEmptyPath((directory) => {
      writeFileSync(join(directory, "codex-acp"), "", { mode: 0o755 });
      const { missing } = setupPrerequisites({ adapters: ["codex"], backends: [] });
      expect(missing.some(({ bin }) => bin === "codex-acp")).toBe(false);
    });
  });
});
