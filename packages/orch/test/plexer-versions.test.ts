import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";



import { compareVersions, versionInRange } from "../src/backends/versions.ts";
import { backendVersionsVerdict } from "../src/doctor/backends.ts";
import { ensureHost, ensurePlexer, ensureHostPlexer, hostPlexers } from "../src/store/agent-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const dirs: OrchDir[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });
function fixture(): OrchDir { const d = tempOrchDir("orch-plexer-versions-"); dirs.push(d); return d; }

describe("plexer version support", () => {
  test("a floor admits every version at or above it", () => {
    expect(versionInRange("0.8.0", ">=0.8.0")).toBe(true);
    expect(versionInRange("0.9.0", ">=0.8.0")).toBe(true);
    expect(versionInRange("1.4.2", ">=0.8.0")).toBe(true);
    expect(versionInRange("0.7.99", ">=0.8.0")).toBe(false);
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

  test("doctor names both versions and tells the operator to update the plexer", () => {
    const result = backendVersionsVerdict([{ plexerId: "herdr", range: ">=0.8.0", detected: true, installed: "0.7.9" }]);
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("herdr");
    expect(result.detail).toContain("0.7.9");
    expect(result.detail).toContain(">=0.8.0");
    expect(result.detail).toContain("update herdr");
  });

  test("a supported plexer the user never installed is not a complaint", () => {
    const result = backendVersionsVerdict([{ plexerId: "herdr", range: ">=0.8.0", detected: false, installed: null }]);
    expect(result.status).toBe("ok");
    expect(result.detail).toContain("herdr: not installed");
  });

  test("an in-range install reports ok with the version it read", () => {
    const result = backendVersionsVerdict([{ plexerId: "herdr", range: ">=0.8.0", detected: true, installed: "0.8.4" }]);
    expect(result.status).toBe("ok");
    expect(result.detail).toContain("installed 0.8.4");
  });

  test("a compatible server rides along on the row without complaint", () => {
    const result = backendVersionsVerdict([
      { plexerId: "herdr", range: ">=0.8.0", detected: true, installed: "0.9.0", server: { version: "0.9.0", compatible: true } },
    ]);
    expect(result.status).toBe("ok");
    expect(result.detail).toContain("server 0.9.0 (compatible)");
  });

  test("a server the installed client outgrew fails and names the restart", () => {
    const result = backendVersionsVerdict([
      { plexerId: "herdr", range: ">=0.8.0", detected: true, installed: "0.9.0", server: { version: "0.8.2", compatible: false } },
    ]);
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("0.8.2");
    expect(result.detail).toContain("restart the herdr server");
  });

  test("a server that reports no compatibility is unknown, never a failure", () => {
    const result = backendVersionsVerdict([
      { plexerId: "herdr", range: ">=0.8.0", detected: true, installed: "0.9.0", server: { version: "0.8.2", compatible: null } },
    ]);
    expect(result.status).toBe("ok");
    expect(result.detail).toContain("compatibility unknown");
  });

  test("a plexer with no server running says nothing about one", () => {
    const result = backendVersionsVerdict([{ plexerId: "herdr", range: ">=0.8.0", detected: true, installed: "0.9.0", server: null }]);
    expect(result.status).toBe("ok");
    expect(result.detail).not.toContain("server");
  });

  test("only an installed plexer that cannot report a version warns", () => {
    const result = backendVersionsVerdict([{ plexerId: "herdr", range: ">=0.8.0", detected: true, installed: null }]);
    expect(result.status).toBe("warn");
    expect(result.detail).toContain("--version");
  });
});
