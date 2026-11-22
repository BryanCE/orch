import { afterEach, describe, expect, test } from "bun:test";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { testServices } from "./helpers/services.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import { writeProjectSettingsFixture, writeProjectSettingsText } from "./helpers/settings.ts";
import { seedAgent } from "./helpers/agent.ts";
import { acceptStatusReport } from "../src/daemon/server/status-report.ts";
import { mintAgentId } from "../src/shared/agent-id.ts";
import { agentProjectDirectory, agentSettings, lockRulingSettings } from "../src/daemon/server/project-settings.ts";
import { workerText } from "../src/daemon/server/worker-header.ts";
import type { OrchDir } from "../src/types/core.ts";

const dirs: OrchDir[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) removeTempDir(dir); });
function tempDir(prefix: string): OrchDir {
  const dir = tempOrchDir(prefix);
  dirs.push(dir);
  return dir;
}
function state(install: Record<string, unknown>) {
  const orchDir = tempDir("orch-ps-orchd-");
  return idleDaemonState(testServices({ orchDir, settings: install }), orchDir);
}
function agentIn(s: ReturnType<typeof state>, project: string): string {
  const id = mintAgentId();
  seedAgent(id, { name: id }, s.directory);
  acceptStatusReport(s.directory, id, { project }, () => undefined);
  return id;
}

describe("orchd reads an agent's project", () => {
  test("an agent's settings are its project's", () => {
    const s = state({ workers: { verify_commands: ["go vet"] } });
    const project = tempDir("orch-ps-project-");
    writeProjectSettingsFixture(project, { workers: { verify_commands: ["bunx oxlint"] } });
    expect(agentSettings(s, agentIn(s, project)).workers.verify_commands).toEqual(["bunx oxlint"]);
  });
  test("two agents of two projects read their own", () => {
    const s = state({});
    const a = tempDir("orch-ps-project-");
    const b = tempDir("orch-ps-project-");
    writeProjectSettingsFixture(a, { workers: { verify_commands: ["a"] } });
    writeProjectSettingsFixture(b, { workers: { verify_commands: ["b"] } });
    expect(agentSettings(s, agentIn(s, a)).workers.verify_commands).toEqual(["a"]);
    expect(agentSettings(s, agentIn(s, b)).workers.verify_commands).toEqual(["b"]);
  });
  test("an agent that has not reported takes its spawner's project", () => {
    const s = state({});
    const project = tempDir("orch-ps-project-");
    writeProjectSettingsFixture(project, { workers: { verify_commands: ["bunx oxlint"] } });
    const spawner = agentIn(s, project);
    const child = mintAgentId();
    seedAgent(child, { name: child, spawnedBy: spawner }, s.directory);
    expect(agentProjectDirectory(s.directory, child)).toBe(project);
  });
  test("the lock ruling reads the asking agent's project", () => {
    const s = state({ locked_commands: { commands: ["go test"] } });
    const project = tempDir("orch-ps-project-");
    writeProjectSettingsFixture(project, { locked_commands: { commands: ["bun test"] } });
    expect(lockRulingSettings(s, agentIn(s, project), "/elsewhere").locked_commands.commands).toEqual(["bun test"]);
  });
  test("an unknown agent's lock ruling reads the directory asked from", () => {
    const s = state({ locked_commands: { commands: ["go test"] } });
    const project = tempDir("orch-ps-project-");
    writeProjectSettingsFixture(project, { locked_commands: { commands: ["bun test"] } });
    expect(lockRulingSettings(s, "no-such-agent", project).locked_commands.commands).toEqual(["bun test"]);
    expect(lockRulingSettings(s, null, project).locked_commands.commands).toEqual(["bun test"]);
  });
  test("an invalid project file leaves the install's lock list", () => {
    const s = state({ locked_commands: { commands: ["go test"] } });
    const project = tempDir("orch-ps-project-");
    writeProjectSettingsText(project, "{ nope");
    expect(lockRulingSettings(s, agentIn(s, project), project).locked_commands.commands).toEqual(["go test"]);
  });
  test("the worker header names the target's project commands", () => {
    const s = state({ workers: { verify_commands: ["go vet"] } });
    const project = tempDir("orch-ps-project-");
    writeProjectSettingsFixture(project, { workers: { verify_commands: ["bunx oxlint"] } });
    const text = workerText(s, agentIn(s, project), s.services.settingsFor(project), "do it", { harness: "pi", context: { maySpawn: false } });
    expect(text).toContain("bunx oxlint");
    expect(text).not.toContain("go vet");
    expect(text.endsWith("do it")).toBe(true);
  });
  test("a worker header refuses an invalid project file, naming it", () => {
    const s = state({ workers: { verify_commands: ["go vet"] } });
    const project = tempDir("orch-ps-project-");
    writeProjectSettingsText(project, '{"runtime":"node"}');
    expect(() => workerText(s, agentIn(s, project), s.services.settingsFor(project), "do it", { harness: "pi", context: { maySpawn: false } })).toThrow("runtime");
  });
  test("a read-only agent's header names no verify command", () => {
    const s = state({ workers: { verify_commands: ["go vet"] } });
    const project = tempDir("orch-ps-project-");
    writeProjectSettingsFixture(project, { workers: { verify_commands: ["bunx oxlint"] } });
    const id = agentIn(s, project);
    expect(workerText(s, id, s.services.settingsFor(project), "read it", { harness: "pi", context: { maySpawn: false } }, { readOnly: { out: null } })).not.toContain("bunx oxlint");
  });
});
