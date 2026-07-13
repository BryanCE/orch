import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { runDoctor } from "../src/doctor.ts";

const directories: string[] = [];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-doctor-"));
  directories.push(directory);
  return directory;
}

function check(results: Awaited<ReturnType<typeof runDoctor>>, id: string) {
  const result = results.find((entry) => entry.id === id);
  if (!result) throw new Error(`missing ${id} result`);
  return result;
}

afterEach(() => {
  while (directories.length) fs.rmSync(directories.pop()!, { recursive: true, force: true });
});

describe("runDoctor", () => {
  test("reports a dead presence pid and corrupt spawn registry lines", async () => {
    const directory = tempDir();
    const agent = path.join(directory, "agents", "former-agent");
    fs.mkdirSync(agent, { recursive: true });
    fs.writeFileSync(path.join(agent, "status.json"), JSON.stringify({ pid: 99999999 }));
    fs.writeFileSync(path.join(directory, "spawned.jsonl"), "{\"pane\":\"w1:p1\"}\nnot json\n");

    const results = await runDoctor(directory);

    expect(check(results, "stale-presence")).toMatchObject({ status: "warn", detail: expect.stringContaining("former-agent"), fix: "orch clean" });
    expect(check(results, "spawned-registry")).toMatchObject({ status: "warn", detail: expect.stringContaining("2") });
  });

  test("reports invalid config and accepts missing config", async () => {
    const invalid = tempDir();
    fs.writeFileSync(path.join(invalid, "config.toml"), "[queue]\nmax_retries = \"never\"\n");
    const missing = tempDir();

    expect(check(await runDoctor(invalid), "config")).toMatchObject({ status: "fail", detail: expect.stringContaining("config.toml") });
    expect(check(await runDoctor(missing), "config")).toEqual({ id: "config", label: "Config validity", status: "ok", detail: "no config" });
  });

  test("never throws when individual checks encounter broken inputs", async () => {
    const directory = tempDir();
    fs.mkdirSync(path.join(directory, "agents"), { recursive: true });
    fs.writeFileSync(path.join(directory, "spawned.jsonl"), "{broken\n");

    await expect(runDoctor(directory)).resolves.toBeArray();
  });
});
