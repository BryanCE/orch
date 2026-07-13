import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { applyFixes, runDoctor } from "../src/doctor.ts";

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
    const stale = check(results, "stale-presence");

    expect(stale).toMatchObject({ status: "warn", detail: expect.stringContaining("former-agent") });
    expect(stale.fix).toBeDefined();
    expect(applyFixes([stale])).toEqual({ applied: [stale.fix!.description] });
    expect(fs.existsSync(agent)).toBe(false);
    expect(check(results, "spawned-registry")).toMatchObject({ status: "warn", detail: expect.stringContaining("2") });
  });

  test("does not offer a fix for missing binaries", async () => {
    const directory = tempDir();
    const previousPath = process.env.PATH;
    try {
      process.env.PATH = path.join(directory, "empty-bin");
      const bins = check(await runDoctor(directory), "bins");
      expect(bins).toMatchObject({ status: "fail", detail: "bun is not on PATH" });
      expect(bins.fix).toBeUndefined();
    } finally {
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
    }
  });

  test("applyFixes reports exactly the changes it applies", () => {
    const directory = tempDir();
    const first = path.join(directory, "first");
    const second = path.join(directory, "second");
    const results = [
      {
        id: "first",
        label: "first",
        status: "warn" as const,
        detail: "missing",
        fix: {
          description: "Create first fixture",
          apply() {
            fs.writeFileSync(first, "first");
          },
        },
      },
      {
        id: "second",
        label: "second",
        status: "warn" as const,
        detail: "missing",
        fix: {
          description: "Create second fixture",
          apply() {
            fs.writeFileSync(second, "second");
          },
        },
      },
      { id: "report-only", label: "report-only", status: "fail" as const, detail: "not reversible" },
    ];

    expect(applyFixes(results)).toEqual({ applied: ["Create first fixture", "Create second fixture"] });
    expect(fs.readFileSync(first, "utf8")).toBe("first");
    expect(fs.readFileSync(second, "utf8")).toBe("second");
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
