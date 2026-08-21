import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { governWrite } from "../src/daemon/orchd.ts";
import { getOwner, setOwner } from "../src/store/sqlite.ts";

const dirs: string[] = [];
function freshDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-gov-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) removeTempDir(dir);
});

describe("daemon governWrite enforcement", () => {
  test("an unscoped actor is refused on an owned target", () => {
    const dir = freshDir();
    setOwner(dir, "herdr~wA~p1", "herdr~wA~p9");
    // No actor field => the caller cannot own anything, so an owned agent refuses it.
    expect(() => governWrite(dir, "herdr~wA~p1", { target: "herdr~wA~p1", text: "hi" })).toThrow(/owned by herdr~wA~p9/);
  });

  test("an unscoped actor may write to an unowned target", () => {
    const dir = freshDir();
    expect(() => governWrite(dir, "herdr~wA~p1", { target: "herdr~wA~p1", text: "hi" })).not.toThrow();
  });

  test("owner may write to its own agent", () => {
    const dir = freshDir();
    setOwner(dir, "herdr~wA~p1", "herdr~wA~p9");
    expect(() => governWrite(dir, "herdr~wA~p1", { actor: "herdr~wA~p9", text: "hi" })).not.toThrow();
  });

  test("a foreign owner in the same workspace is refused", () => {
    const dir = freshDir();
    setOwner(dir, "herdr~wA~p1", "herdr~wA~p9");
    expect(() => governWrite(dir, "herdr~wA~p1", { actor: "herdr~wA~p2", text: "hi" })).toThrow(/owned by herdr~wA~p9/);
  });

  test("a cross-workspace write is refused by the wall before ownership", () => {
    const dir = freshDir();
    setOwner(dir, "herdr~wB~p1", "herdr~wB~p9");
    expect(() => governWrite(dir, "herdr~wB~p1", { actor: "herdr~wA~p9", text: "hi" })).toThrow(/workspace wall/);
  });

  test("--cross-workspace clears the wall but ownership still applies", () => {
    const dir = freshDir();
    setOwner(dir, "herdr~wB~p1", "herdr~wB~p9");
    expect(() => governWrite(dir, "herdr~wB~p1", { actor: "herdr~wA~p9", text: "hi", crossWorkspace: true })).toThrow(/owned by herdr~wB~p9/);
  });

  test("--steal transfers ownership to the actor", () => {
    const dir = freshDir();
    setOwner(dir, "herdr~wA~p1", "herdr~wA~p9");
    expect(() => governWrite(dir, "herdr~wA~p1", { actor: "herdr~wA~p2", text: "hi", steal: true })).not.toThrow();
    expect(getOwner(dir, "herdr~wA~p1")).toBe("herdr~wA~p2");
  });

  test("an unowned target is writable by any same-workspace actor", () => {
    const dir = freshDir();
    expect(() => governWrite(dir, "herdr~wA~p1", { actor: "herdr~wA~p9", text: "hi" })).not.toThrow();
  });

  // The human operator of a workspace keeps control of every fleet keyed into
  // it, whichever agent spawned them; a spawned agent's actor token is its own
  // key, never `operator`, so this lane grants an agent nothing.
  test("the workspace operator writes to any same-workspace owned agent", () => {
    const dir = freshDir();
    setOwner(dir, "herdr~wA~p1", "herdr~wA~worker-9");
    expect(() => governWrite(dir, "herdr~wA~p1", { actor: "herdr~wA~operator", text: "hi" })).not.toThrow();
    // Supremacy is control, not theft: the spawner keeps its ownership record.
    expect(getOwner(dir, "herdr~wA~p1")).toBe("herdr~wA~worker-9");
  });

  test("a foreign workspace's operator still hits the wall", () => {
    const dir = freshDir();
    setOwner(dir, "herdr~wB~p1", "herdr~wB~worker-9");
    expect(() => governWrite(dir, "herdr~wB~p1", { actor: "herdr~wA~operator", text: "hi" })).toThrow(/workspace wall/);
  });
});
