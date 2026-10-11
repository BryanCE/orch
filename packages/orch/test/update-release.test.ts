import { describe, expect, test } from "bun:test";
import { join, win32 } from "node:path";
import {
  breakingNotes,
  compareReleases,
  installRelease,
  installedOrchBin,
  latestRelease,
  notesBetween,
  parseReleaseVersion,
  type PackageRunner,
  type RunResult,
} from "../src/update/release.ts";

function mustVersion(value: string) {
  const version = parseReleaseVersion(value);
  if (version === null) throw new Error(`invalid test release version: ${value}`);
  return version;
}

function fakeRunner(stdout: string, code = 0, stderr = "", calls: { args: readonly string[]; stdio: string; timeoutSetting: string }[] = []): PackageRunner {
  return (args, options): RunResult => {
    calls.push({ args, stdio: options.stdio, timeoutSetting: options.timeoutSetting });
    return { code, stdout, stderr };
  };
}

describe("package releases", () => {
  test("parses and compares published release versions", () => {
    expect(parseReleaseVersion("1.2.3")).not.toBeNull();
    expect(parseReleaseVersion("1.2.3-beta.1")).not.toBeNull();
    expect(parseReleaseVersion("v1.2.3")).toBeNull();
    expect(parseReleaseVersion("1.2")).toBeNull();
    expect(parseReleaseVersion(123)).toBeNull();
    const beta = parseReleaseVersion("1.2.3-beta.1");
    const stable = parseReleaseVersion("1.2.3");
    if (beta === null || stable === null) throw new Error("valid release version was rejected");
    expect(compareReleases(beta, stable)).toBeLessThan(0);
  });

  test("reads latest release from npm JSON", () => {
    expect(latestRelease("pkg", fakeRunner('"0.2.0"'), 1000)).toBe(mustVersion("0.2.0"));
  });

  test("includes npm stderr when a command fails", () => {
    expect(() => latestRelease("pkg", fakeRunner("", 1, " registry unavailable "), 1000)).toThrow("npm view pkg version --json failed: registry unavailable");
  });

  test("reads breaking-note records and accepts an empty response", () => {
    const version = mustVersion("1.0.0");
    expect(breakingNotes("pkg", version, fakeRunner('{"1.1.0":["change"]}'), 1000).get(mustVersion("1.1.0"))).toEqual(["change"]);
    expect(breakingNotes("pkg", version, fakeRunner(""), 1000).size).toBe(0);
  });

  test("filters the open/closed version interval and sorts notes", () => {
    const notes = breakingNotes("pkg", mustVersion("1.0.0"), fakeRunner('{"1.3.0":["c"],"1.1.0":["a"],"1.2.0":["b"]}'), 1000);
    expect(notesBetween(notes, mustVersion("1.1.0"), mustVersion("1.3.0"))).toEqual([
      { version: mustVersion("1.2.0"), notes: ["b"] },
      { version: mustVersion("1.3.0"), notes: ["c"] },
    ]);
  });

  test("installs globally with inherited stdio", () => {
    const calls: { args: readonly string[]; stdio: string; timeoutSetting: string }[] = [];
    installRelease("pkg", mustVersion("1.2.3"), fakeRunner("", 0, "", calls), 2000);
    expect(calls).toEqual([{ args: ["install", "-g", "pkg@1.2.3"], stdio: "inherit", timeoutSetting: "timeouts.update_install_ms" }]);
  });

  test("resolves npm's global prefix to the orch entrypoint", () => {
    const path = installedOrchBin(fakeRunner("/global/prefix\n"), 1000);
    expect(path).toBe(process.platform === "win32" ? win32.join("/global/prefix", "orch.cmd") : join("/global/prefix", "bin", "orch"));
  });
});
