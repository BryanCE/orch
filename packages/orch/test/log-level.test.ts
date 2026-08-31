import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { configuredLogLevel } from "../src/config.ts";
import { isLogRecord } from "../src/log.ts";
import { commandLogger } from "../src/commands/logging.ts";
import { decisionLogger } from "../src/daemon/decision-log.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
const previousOrchDir = process.env.ORCH_DIR;
const previousLevel = process.env.ORCH_LOG_LEVEL;

afterEach(() => {
  while (dirs.length > 0) removeTempDir(dirs.pop()!);
  if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = previousOrchDir;
  if (previousLevel === undefined) delete process.env.ORCH_LOG_LEVEL;
  else process.env.ORCH_LOG_LEVEL = previousLevel;
});

function fixture(settings: Record<string, unknown> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-log-level-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  writeSettingsFixture(dir, settings);
  return dir;
}

/** Event names off disk, verified through orch's own record guard. */
function events(file: string): string[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter((line) => line.trim())
    .map((line): unknown => JSON.parse(line))
    .filter(isLogRecord)
    .map((record) => record.event);
}

// Logging is a setting, so it has to reach every logger.
// Four call sites hardcoded `level: "info"`, which meant `logging.level` and
// ORCH_LOG_LEVEL were accepted, displayed by `orch settings`, and then ignored
// by the CLI logger and three of the daemon's own loggers.
describe("the configured log level reaches every logger", () => {
  test("the env var wins over settings.json", () => {
    const dir = fixture({ logging: { level: "warn" } });
    process.env.ORCH_LOG_LEVEL = "debug";
    expect(configuredLogLevel(dir)).toBe("debug");
  });

  test("settings.json is used when the env var is unset", () => {
    const dir = fixture({ logging: { level: "error" } });
    delete process.env.ORCH_LOG_LEVEL;
    expect(configuredLogLevel(dir)).toBe("error");
  });

  // A junk env value must not silently outrank the file the user actually wrote.
  test("an unrecognised env value falls back to the configured level", () => {
    const dir = fixture({ logging: { level: "error" } });
    process.env.ORCH_LOG_LEVEL = "loud";
    expect(configuredLogLevel(dir)).toBe("error");
  });

  test("the CLI logger honours the configured level", () => {
    const dir = fixture({ logging: { level: "debug" } });
    delete process.env.ORCH_LOG_LEVEL;
    commandLogger().debug("cli.debug.record", {});
    expect(events(join(dir, "orch.log"))).toContain("cli.debug.record");
  });

  test("the CLI logger drops records below the configured level", () => {
    const dir = fixture({ logging: { level: "error" } });
    delete process.env.ORCH_LOG_LEVEL;
    commandLogger().info("cli.info.record", {});
    expect(events(join(dir, "orch.log"))).not.toContain("cli.info.record");
  });

  test("the daemon logger resolves through the same helper", () => {
    const dir = fixture({ logging: { level: "debug" } });
    delete process.env.ORCH_LOG_LEVEL;
    decisionLogger(dir).debug("daemon.debug.record", {});
    expect(events(join(dir, "orchd.log"))).toContain("daemon.debug.record");
  });
});
