import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compareVersions, versionInRange, SUPPORTED_RANGES } from "../src/backends/versions.ts";
import { backendVersionsVerdict } from "../src/doctor/backends.ts";
import { ensureHost, ensurePlexer, ensureHostPlexer, hostPlexers } from "../src/store/agent-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });
function fixture(): string { const d = mkdtempSync(join(tmpdir(), "orch-plexer-versions-")); dirs.push(d); return d; }

describe("plexer version support", () => {
  test("pins herdr to the tested range, including both exclusive boundaries", () => {
    expect(SUPPORTED_RANGES.herdr).toBe(">=0.8.0 <0.9.0");
    expect(versionInRange("0.8.0", SUPPORTED_RANGES.herdr)).toBe(true);
    expect(versionInRange("0.8.9", SUPPORTED_RANGES.herdr)).toBe(true);
    expect(versionInRange("0.7.99", SUPPORTED_RANGES.herdr)).toBe(false);
    expect(versionInRange("0.9.0", SUPPORTED_RANGES.herdr)).toBe(false);
  });

  test("compares numeric versions rather than lexical strings", () => {
    expect(compareVersions("0.10.0", "0.9.0")).toBeGreaterThan(0);
    expect(compareVersions("v0.8.0", "0.8.0")).toBe(0);
  });

  test("rotates one open host install row when the plexer changes version", () => {
    const d = fixture();
    ensurePlexer(d, "herdr", "herdr");
    ensureHost(d, "host", "host", "linux", 1_000);
    ensureHostPlexer(d, "host", "herdr", "0.8.1", 2_000);
    ensureHostPlexer(d, "host", "herdr", "0.8.2", 3_000);
    expect(hostPlexers(d, "host", "herdr")).toEqual([
      { hostId: "host", plexerId: "herdr", since: 2_000, until: 3_000, version: "0.8.1" },
      { hostId: "host", plexerId: "herdr", since: 3_000, until: null, version: "0.8.2" },
    ]);
  });

  test("doctor names both versions and tells the operator to update orch", () => {
    const result = backendVersionsVerdict([{ plexerId: "herdr", detected: true, installed: "0.9.0" }]);
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("herdr");
    expect(result.detail).toContain("0.9.0");
    expect(result.detail).toContain(">=0.8.0 <0.9.0");
    expect(result.detail).toContain("update orch");
  });

  test("a supported plexer the user never installed is not a complaint", () => {
    const result = backendVersionsVerdict([{ plexerId: "herdr", detected: false, installed: null }]);
    expect(result.status).toBe("ok");
    expect(result.detail).toContain("herdr: not installed");
  });

  test("an in-range install reports ok with the version it read", () => {
    const result = backendVersionsVerdict([{ plexerId: "herdr", detected: true, installed: "0.8.4" }]);
    expect(result.status).toBe("ok");
    expect(result.detail).toContain("installed 0.8.4");
  });

  test("only an installed plexer that cannot report a version warns", () => {
    const result = backendVersionsVerdict([{ plexerId: "herdr", detected: true, installed: null }]);
    expect(result.status).toBe("warn");
    expect(result.detail).toContain("--version");
  });
});
