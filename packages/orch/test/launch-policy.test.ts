import { afterEach, describe, expect, test } from "bun:test";
import { launchPolicy } from "../src/daemon/server/launch-policy.ts";
import { resolveAdapterOrDie } from "../src/daemon/server/spawn/models.ts";
import { testDaemonServices } from "./helpers/services.ts";
import { writeProjectSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

describe("launchPolicy", () => {
  const directories: string[] = [];
  afterEach(() => {
    for (const directory of directories.splice(0)) removeTempDir(directory);
  });
  function fixture() {
    const orchDir = tempOrchDir("orch-launch-policy-");
    const project = tempOrchDir("orch-launch-policy-");
    directories.push(orchDir, project);
    const services = testDaemonServices({ orchDir, models: { read: () => "", warm: () => Promise.resolve(), forget: () => undefined } });
    const request = { adapter: resolveAdapterOrDie("claude"), project, model: "haiku", name: "a", readOnly: null };
    return { services, project, request };
  }
  const refusal = (message: string) => new Error(message);
  const projectPolicy = { workers: { compact_at_tokens: { claude: { haiku: 100000 } } }, models: { preferred: { claude: ["haiku"] } } };

  test("an agent that is not read-only takes its project's policy, compaction point included", () => {
    const { services, project, request } = fixture();
    writeProjectSettingsFixture(project, projectPolicy);
    const policy = launchPolicy(services, request, refusal);
    expect(policy.env).toEqual({ CLAUDE_CODE_AUTO_COMPACT_WINDOW: "100000" });
    expect(policy.workers.readOnly).toBeNull();
    expect(policy.workers.compactAtTokens.claude).toEqual({ haiku: 100000 });
    expect(policy.preferredModels).toEqual(["haiku"]);
  });
  test("a project with no point launches with no compaction env", () => {
    const { services, request } = fixture();
    const policy = launchPolicy(services, request, refusal);
    expect(policy.env).toEqual({});
    expect(policy.preferredModels).toEqual([]);
  });
  test("two projects give two policies", () => {
    const { services, project, request } = fixture();
    const other = tempOrchDir("orch-launch-policy-");
    directories.push(other);
    writeProjectSettingsFixture(project, projectPolicy);
    expect(launchPolicy(services, request, refusal).env).toEqual({ CLAUDE_CODE_AUTO_COMPACT_WINDOW: "100000" });
    expect(launchPolicy(services, { ...request, project: other }, refusal).env).toEqual({});
  });
  test("a read-only agent takes the read-only policy", () => {
    const { services, request } = fixture();
    const pi = { ...request, adapter: resolveAdapterOrDie("pi") };
    expect(launchPolicy(services, { ...pi, readOnly: { out: null } }, refusal).workers.allowTools).toEqual(["read", "grep", "find", "ls", "orch_ask"]);
    const policy = launchPolicy(services, { ...pi, readOnly: { out: "/repo/out/a" } }, refusal);
    expect(policy.workers.readOnly).toEqual({ out: "/repo/out/a" });
    expect(policy.workers.allowTools).toEqual(["read", "grep", "find", "ls", "edit", "write", "orch_ask"]);
    expect(launchPolicy(services, { ...request, readOnly: { out: "/repo/out" } }, refusal).env).toEqual({ ORCH_READ_ONLY: "1", ORCH_OUT_DIR: "/repo/out" });
  });
  test("a harness that cannot refuse a tool call is refused read-only, with the one message", () => {
    const { services, request } = fixture();
    const codex = { ...request, adapter: resolveAdapterOrDie("codex"), name: "rev" };
    expect(() => launchPolicy(services, { ...codex, readOnly: { out: null } }, refusal)).toThrow("codex cannot run rev read-only: orch has no way to refuse its tool calls. Launch it on one of: pi, omp, claude.");
    expect(() => launchPolicy(services, codex, refusal)).not.toThrow();
  });
});
