import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseRpcLine } from "../src/daemon/rpc/wire.ts";
import { ensureHost } from "../src/store/agent-rows.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { hosts } from "../src/db/schema.ts";
import { hostOsOf } from "../src/host.ts";
import { isRecord } from "../src/util.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";

const dirs: OrchDir[] = [];
const packageRoot = join(import.meta.dir, "..");
const walk = (directory: string): string[] => readdirSync(directory).flatMap((entry) => {
  const file = `${directory}/${entry}`;
  return statSync(file).isDirectory() ? walk(file) : [file];
});

afterEach(() => {
  closeAllStores();
  while (dirs.length > 0) removeTempDir(dirs.pop() ?? "");
});

describe("one spelling per shared fact", () => {
  test("host OS and the store agree for an injected Windows platform", () => {
    const directory = tempOrchDir("orch-one-spelling-");
    dirs.push(directory);

    expect(hostOsOf("win32")).toBe("windows");
    expect(hostOsOf("linux")).toBe("linux");
    expect(hostOsOf("win32")).toBe(hostOsOf("win32"));

    ensureHost(directory, "host", "Host", hostOsOf("win32"), 1);
    const stored = orm(directory).select({ os: hosts.os }).from(hosts).get();
    expect(stored?.os).toBe("windows");
  });

  test("the shared record guard rejects arrays and null", () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord({ answer: 42 })).toBe(true);
    expect(parseRpcLine([])).toBeNull();
    expect(parseRpcLine(null)).toBeNull();
  });

  test("removed identity method has no source spelling", () => {
    const matches = walk(join(packageRoot, "src")).flatMap((file) => readFileSync(file, "utf8").match(/\bhello\b/g) ?? []);
    expect(matches).toHaveLength(0);
  });

  test("settings reads have no literal fallbacks", () => {
    // A settings.json read is `<config>.<section>.<key>`; a bare `settings.<key>`
    // is a command's parsed-flags object (AgentSettings), not the file.
    const pattern = /\b(settings|config)\.(fleet|queue|retention|timeouts|daemon|doctor|tiling|skills|workers|models|defaults|logging)\.\w+ \?\? [0-9"']/g;
    const matches = walk(join(packageRoot, "src")).flatMap((file) => readFileSync(file, "utf8").match(pattern) ?? []);
    expect(matches).toHaveLength(0);
  });

  test("launch env has one spelling", () => {
    const files = ["src", "extensions", "test"].flatMap((directory) => walk(join(packageRoot, directory)));
    const oldName = ["ORCH_AGENT", "KEY"].join("_");
    const oldPattern = new RegExp(oldName, "g");
    const oldCount = files.reduce((count, file) => count + (readFileSync(file, "utf8").match(oldPattern)?.length ?? 0), 0);
    expect(oldCount).toBe(0);
    const idName = ["ORCH_AGENT", "ID"].join("_");
    const idPattern = new RegExp(idName, "g");
    const idInTests = walk(join(packageRoot, "test")).reduce((count, file) => count + (readFileSync(file, "utf8").match(idPattern)?.length ?? 0), 0);
    expect(idInTests).toBe(1);
  });

  test("removed spawn cap has no source or README spelling", () => {
    const forbidden = ["spawn" + "_" + "cap", "ORCH" + "_" + "SPAWN" + "_" + "CAP", "spawn" + "-" + "cap", "spawn" + "Cap"];
    const files = [join(packageRoot, "README.md")];
    for (const file of [...files, ...walk(join(packageRoot, "src"))]) {
      const text = readFileSync(file, "utf8");
      for (const spelling of forbidden) expect(text).not.toContain(spelling);
    }
  });
});
