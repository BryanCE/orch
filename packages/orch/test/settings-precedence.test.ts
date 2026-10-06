import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { fileSettingsManager } from "../src/settings/manager.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const directories: OrchDir[] = [];

function tempDir(): OrchDir {
  const directory = tempOrchDir("orch-settings-precedence-");
  directories.push(directory);
  return directory;
}

afterEach(() => {
  while (directories.length) removeTempDir(directories.pop()!);
});

describe("settings precedence", () => {
  test("parses notify entries and hosts into expected shapes", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      notify: [{ id: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
      hosts: { gpu1: { dest: "bryan@gpu1", orch_dir: "/srv/orch", timeout_ms: 30 } },
    });

    expect(fileSettingsManager(directory).current()).toMatchObject({
      notify: [{ id: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
      hosts: { gpu1: { dest: "bryan@gpu1", orch_dir: "/srv/orch", timeout_ms: 30 } },
    });
  });

  test("reports a helpful validation error for invalid settings", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { daemon: { tcp_port: "many" } });

    expect(() => fileSettingsManager(directory).current()).toThrow(/daemon\.tcp_port/);
  });
});
