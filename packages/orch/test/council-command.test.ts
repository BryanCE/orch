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

describe("orch council", () => {
  test("scores prints a row per member and a column per round", async () => {
    const { root, services } = await setup(["ada", "bea"]);
    askReview(root, { dispatchId: "d1", councilId: "c1", round: 1, member: "ada", askedAt: 2 });
    askReview(root, { dispatchId: "d2", councilId: "c1", round: 1, member: "bea", askedAt: 2 });
    scoreReview(root, "d1", 5, { score: 7 });
    const output = await captureStdout(() => cmdCouncil(services, ["scores", "plan", "--dir", root]));
    expect(output).toContain("Council plan, open. 1 of 3 rounds run. Scores are out of 10.");
    expect(output).toMatch(/ada\s+-\s+7\s/);
    expect(output).toMatch(/bea\s+-\s+running\s/);
  });

  test("scores --json prints the reviews", async () => {
    const { root, services } = await setup(["ada", "bea"]);
    askReview(root, { dispatchId: "d1", councilId: "c1", round: 1, member: "ada", askedAt: 2 });
    askReview(root, { dispatchId: "d2", councilId: "c1", round: 1, member: "bea", askedAt: 2 });
    scoreReview(root, "d1", 5, { score: 7 });
    const output = await captureStdout(() => cmdCouncil(services, ["scores", "plan", "--dir", root, "--json"]));
    const result: unknown = JSON.parse(output);
    expect(result).toMatchObject({ name: "plan", scale: 10, rounds: 3, members: ["ada", "bea"] });
    expect(result).toHaveProperty("reviews.length", 2);
  });

  test("close with no member running says so", async () => {
    const { root, services } = await setup([]);
    expect(await captureStdout(() => cmdCouncil(services, ["close", "plan", "--dir", root]))).toBe("Closed council plan. No member was still running.\n");
  });

  test("scores names a council that was never convened", async () => {
    const { root, services } = await setup([]);
    return expect(cmdCouncil(services, ["scores", "ghost", "--dir", root])).rejects.toThrow("no council named ghost was convened here");
  });

  test("convene needs a subject", async () => {
    const { services } = await setup([]);
    return expect(cmdCouncil(services, ["convene", "next", "ada", "--model", "luna"])).rejects.toThrow("say what it is with --prompt");
  });

  test("convene with no member and no council.models says how to set one", async () => {
    const { services } = await setup([]);
    return expect(cmdCouncil(services, ["convene", "next", "--prompt", "Review plan.md."])).rejects.toThrow("the council.models setting is empty");
  });

  test("convene takes --model only with named members", async () => {
    const { services } = await setup([]);
    return expect(cmdCouncil(services, ["convene", "next", "--model", "luna", "--prompt", "Review plan.md."])).rejects.toThrow("--model and --harness go with named members");
  });

  test("steer needs its text", async () => {
    const { services } = await setup([]);
    return expect(cmdCouncil(services, ["steer", "plan"])).rejects.toThrow("usage:");
  });

  test("round needs its text", async () => {
    const { services } = await setup([]);
    return expect(cmdCouncil(services, ["round", "plan"])).rejects.toThrow("usage:");
  });
});
