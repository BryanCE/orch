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
  test("unscoped actor bypasses ownership and the wall", () => {
    const dir = freshDir();
    setOwner(dir, "herdr~wA~p1", "herdr~wA~p9");
    // No actor field => headless/unscoped operator, eligible by policy.
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
});
