import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { sourceFiles } from "./helpers/sources.ts";
import { join } from "node:path";
import { callerSession } from "../src/adapters/session-env.ts";
import { fakeAdapter } from "./helpers/adapter.ts";

const envNames = ["PI_CODING_AGENT", "CLAUDECODE", "CLAUDE_PID", "CODEX_PID", "NOVEL_HARNESS_MARKER"];
const saved = new Map(envNames.map((name) => [name, process.env[name]]));

function clearHarnessEnv(): void {
  for (const name of envNames) delete process.env[name];
}

afterEach(() => {
  clearHarnessEnv();
  for (const [name, value] of saved) {
    if (value !== undefined) process.env[name] = value;
  }
});

describe("adapter-owned session environment", () => {
  test("resolves each caller harness through the public session resolver", () => {
    clearHarnessEnv();
    process.env.CODEX_PID = "123";
    expect(callerSession()?.harnessId).toBe("codex");
    clearHarnessEnv();
    process.env.PI_CODING_AGENT = "1";
    expect(callerSession()?.harnessId).toBe("pi");
    clearHarnessEnv();
    process.env.CLAUDECODE = "1";
    expect(callerSession()?.harnessId).toBe("claude");
    clearHarnessEnv();
    expect(callerSession()?.harnessId ?? "cli").toBe("cli");
  });

  test("keeps harness env literals inside adapter modules", () => {
    const forbidden = /PI_CODING_AGENT|CLAUDECODE|CLAUDE_PID|CODEX_PID/;
    const offenders = sourceFiles(join(import.meta.dir, "..", "src"))
      .filter((path) => !path.includes("src/adapters/"))
      .filter((path) => forbidden.test(readFileSync(path, "utf8")));
    expect(offenders).toEqual([]);
  });

  test("a registered adapter resolves a novel marker without resolver changes", () => {
    clearHarnessEnv();
    process.env.NOVEL_HARNESS_MARKER = "present";
    const adapter = fakeAdapter({ id: "omp", sessionEnvMarker: "NOVEL_HARNESS_MARKER" });
    expect(callerSession([adapter])?.harnessId).toBe("omp");
  });
});
