import { spawnSync } from "node:child_process";
import { join, win32 } from "node:path";
import { z } from "zod";
import { compareVersions, parseSemver } from "../backends/versions.ts";
import { binaryPath, errnoCode } from "../util.ts";

declare const releaseVersionBrand: unique symbol;
/** A published orch version, `x.y.z` or `x.y.z-pre`. Only parseReleaseVersion makes one. */
export type ReleaseVersion = string & { readonly [releaseVersionBrand]: true };

function isReleaseVersion(value: unknown): value is ReleaseVersion {
  return typeof value === "string" && !value.startsWith("v") && !value.includes("+") && parseSemver(value) !== null;
}

export function parseReleaseVersion(value: unknown): ReleaseVersion | null {
  return isReleaseVersion(value) ? value : null;
}

export function compareReleases(left: ReleaseVersion, right: ReleaseVersion): number {
  return compareVersions(left, right);
}

export interface RunResult { readonly code: number; readonly stdout: string; readonly stderr: string }
/** `inherit` streams to the user's terminal (install); `pipe` captures (queries). */
export type PackageRunner = (args: readonly string[], options: { readonly timeoutMs: number; readonly timeoutSetting: string; readonly stdio: "pipe" | "inherit" }) => RunResult;

export const npmRunner: PackageRunner = (args, options) => {
  const npm = binaryPath("npm");
  if (npm === null) return { code: 127, stdout: "", stderr: "npm is not on PATH" };
  const result = spawnSync(npm, [...args], { encoding: "utf8", timeout: options.timeoutMs, stdio: options.stdio });
  const stderr = errnoCode(result.error) === "ETIMEDOUT"
    ? `npm timed out; raise ${options.timeoutSetting}`
    : result.error?.message ?? result.stderr ?? "";
  return { code: result.status ?? 127, stdout: result.stdout ?? "", stderr };
};

export type BreakingNotes = ReadonlyMap<ReleaseVersion, readonly string[]>;

function runNpm(args: readonly string[], runner: PackageRunner, timeoutMs: number, timeoutSetting: string): string {
  const result = runner(args, { timeoutMs, timeoutSetting, stdio: "pipe" });
  if (result.code !== 0) throw new Error(`npm ${args.join(" ")} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

export function latestRelease(name: string, runner: PackageRunner, timeoutMs: number): ReleaseVersion {
  const output = runNpm(["view", name, "version", "--json"], runner, timeoutMs, "timeouts.update_query_ms");
  const json: unknown = JSON.parse(output);
  const parsed = z.string().parse(json);
  const version = parseReleaseVersion(parsed);
  if (version === null) throw new Error(`npm view ${name} version returned invalid release version: ${parsed}`);
  return version;
}

export function breakingNotes(name: string, version: ReleaseVersion, runner: PackageRunner, timeoutMs: number): BreakingNotes {
  const output = runNpm(["view", `${name}@${version}`, "breakingChanges", "--json"], runner, timeoutMs, "timeouts.update_query_ms");
  if (!output.trim()) return new Map();
  const json: unknown = JSON.parse(output);
  const parsed = z.record(z.string(), z.array(z.string())).parse(json);
  const notes = new Map<ReleaseVersion, readonly string[]>();
  for (const [key, values] of Object.entries(parsed)) {
    const release = parseReleaseVersion(key);
    if (release === null) throw new Error(`npm breakingChanges returned invalid release version key: ${key}`);
    notes.set(release, values);
  }
  return notes;
}

export function notesBetween(notes: BreakingNotes, from: ReleaseVersion, to: ReleaseVersion): readonly { readonly version: ReleaseVersion; readonly notes: readonly string[] }[] {
  return [...notes]
    .filter(([version]) => compareReleases(version, from) > 0 && compareReleases(version, to) <= 0)
    .sort(([left], [right]) => compareReleases(left, right))
    .map(([version, values]) => ({ version, notes: values }));
}

export function installRelease(name: string, version: ReleaseVersion, runner: PackageRunner, timeoutMs: number): void {
  const args = ["install", "-g", `${name}@${version}`];
  const result = runner(args, { timeoutMs, timeoutSetting: "timeouts.update_install_ms", stdio: "inherit" });
  if (result.code !== 0) throw new Error(`npm ${args.join(" ")} failed: ${result.stderr.trim()}`);
}

export function installedOrchBin(runner: PackageRunner, timeoutMs: number): string {
  const output = runNpm(["prefix", "-g"], runner, timeoutMs, "timeouts.update_query_ms").trim();
  return process.platform === "win32" ? win32.join(output, "orch.cmd") : join(output, "bin", "orch");
}
