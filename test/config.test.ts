import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { loadConfig, resolveSetting } from "../src/config.ts";

const directories: string[] = [];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-config-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  while (directories.length) fs.rmSync(directories.pop()!, { recursive: true, force: true });
  delete process.env.ORCH_CONFIG_TEST;
});

describe("loadConfig", () => {
  test("uses defaults when config.toml is missing", () => {
    expect(loadConfig(tempDir())).toEqual({
      defaults: {},
      queue: { max_retries: 1 },
      notify: [],
      hosts: {},
    });
  });

  test("parses every supported config section", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "config.toml"), `
[defaults]
adapter = "claude"
backend = "headless"
model = "sonnet"
spawn_cap = 4
worktree = true

[queue]
max_retries = 3

[[notify]]
type = "webhook"
on = ["done", "error"]
url = "https://example.test/orch"

[hosts.gpu1]
ssh = "bryan@gpu1"
`);

    expect(loadConfig(directory)).toEqual({
      defaults: {
        adapter: "claude",
        backend: "headless",
        model: "sonnet",
        spawn_cap: 4,
        worktree: true,
      },
      queue: { max_retries: 3 },
      notify: [{ type: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
      hosts: { gpu1: { ssh: "bryan@gpu1" } },
    });
  });

  test("names the file, key, expected, and found type for invalid fields", () => {
    const directory = tempDir();
    const file = path.join(directory, "config.toml");
    fs.writeFileSync(file, "[queue]\nmax_retries = \"once\"\n");

    expect(() => loadConfig(directory)).toThrow(`${file}: queue.max_retries: expected number, found string`);
  });
});

describe("resolveSetting", () => {
  test("uses flag, environment coercion, config, then fallback in precedence order", () => {
    process.env.ORCH_CONFIG_TEST = "7";
    expect(resolveSetting({ flag: 9, env: "ORCH_CONFIG_TEST", config: 3, fallback: 1 })).toBe(9);
    expect(resolveSetting({ env: "ORCH_CONFIG_TEST", config: 3, fallback: 1 })).toBe(7);

    process.env.ORCH_CONFIG_TEST = "false";
    expect(resolveSetting({ env: "ORCH_CONFIG_TEST", config: true, fallback: true })).toBe(false);

    delete process.env.ORCH_CONFIG_TEST;
    expect(resolveSetting({ env: "ORCH_CONFIG_TEST", config: 3, fallback: 1 })).toBe(3);
    expect(resolveSetting({ env: "ORCH_CONFIG_TEST", fallback: "pi" })).toBe("pi");
  });
});
