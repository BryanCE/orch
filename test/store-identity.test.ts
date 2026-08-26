import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import {
  deleteSessionIdentitiesBefore,
  getOrCreateSessionIdentity,
  isSessionIdentity,
} from "../src/store/identity-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const tempDirs: string[] = [];

afterEach(() => {
  closeAllStores();
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

function fixture(): string {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-store-identity-"));
  tempDirs.push(orchDir);
  return orchDir;
}

describe("identity store rows", () => {
  test("accepts session identity values and rejects malformed values", () => {
    expect(isSessionIdentity({ id: "session-1", label: "lead", kind: "session" })).toBe(true);
    expect(isSessionIdentity({ id: "", label: "lead", kind: "session" })).toBe(false);
    expect(isSessionIdentity({ id: "session-1", label: "lead", kind: "worker" })).toBe(false);
    expect(isSessionIdentity(null)).toBe(false);
  });

  test("reuses an identity for the same process start and replaces it after pid recycling", () => {
    const orchDir = fixture();
    const first = getOrCreateSessionIdentity(orchDir, 42, "2026-01-01T00:00:00.000Z", "old session");
    const sameProcess = getOrCreateSessionIdentity(orchDir, 42, "2026-01-01T00:00:00.000Z", "renamed session");
    const recycledProcess = getOrCreateSessionIdentity(orchDir, 42, "2026-01-02T00:00:00.000Z", "new session");

    expect(sameProcess.id).toBe(first.id);
    expect(sameProcess.label).toBe("renamed session");
    expect(recycledProcess.id).not.toBe(first.id);
    expect(recycledProcess.label).toBe("new session");
  });

  test("deletes identities older than the cutoff", () => {
    const orchDir = fixture();
    getOrCreateSessionIdentity(orchDir, 1, "2026-01-01T00:00:00.000Z", "old");
    getOrCreateSessionIdentity(orchDir, 2, "2026-01-02T00:00:00.000Z", "new");

    expect(deleteSessionIdentitiesBefore(orchDir, "2026-01-02T00:00:00.000Z")).toBe(1);
    expect(openStore(orchDir).query("SELECT ancestor_pid FROM session_identities").all()).toEqual([{ ancestor_pid: 2 }]);
  });
});
