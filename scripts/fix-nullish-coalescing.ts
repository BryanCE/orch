#!/usr/bin/env bun
// fallow-ignore-file unused-file
// Rewrites `||` to `??` (and `||=` to `??=`) at the exact byte offsets oxlint's
// typescript(prefer-nullish-coalescing) rule reports via --format=json. Runs
// oxlint itself, so offsets are always fresh. Same-length replacement, so no
// offset drift within a file.
//
//   bun scripts/fix-nullish-coalescing.ts --dry-run   # preview, writes nothing
//   bun scripts/fix-nullish-coalescing.ts             # real run, edits files

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "..");
const RULE = "prefer-nullish-coalescing";

interface OxlintLabel {
  span?: { offset?: number; length?: number };
}

interface OxlintDiagnostic {
  code?: string;
  message?: string;
  filename?: string;
  labels?: OxlintLabel[];
}

interface Site {
  file: string;
  offset: number;
}

function runOxlintJson(): { stdout: string; stderr: string; exitCode: number } {
  const proc = Bun.spawnSync(["bunx", "oxlint", "--format=json", "."], {
    cwd: REPO_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  // oxlint exits nonzero when it finds errors; that is the expected case here.
  return { stdout: proc.stdout.toString(), stderr: proc.stderr.toString(), exitCode: proc.exitCode };
}

function parseDiagnostics(stdout: string): OxlintDiagnostic[] | null {
  const start = !stdout.includes("{") ? stdout.indexOf("[") : Math.min(...[stdout.indexOf("{"), stdout.indexOf("[")].filter((i) => i !== -1));
  if (start === -1) return null;
  try {
    const parsed: unknown = JSON.parse(stdout.slice(start));
    if (Array.isArray(parsed)) return parsed as OxlintDiagnostic[];
    const diagnostics = (parsed as { diagnostics?: unknown }).diagnostics;
    return Array.isArray(diagnostics) ? (diagnostics as OxlintDiagnostic[]) : null;
  } catch {
    return null;
  }
}

function collectSites(diagnostics: OxlintDiagnostic[]): Site[] {
  const sites: Site[] = [];
  const seen = new Set<string>();
  for (const diagnostic of diagnostics) {
    if (!diagnostic.code?.includes(RULE)) continue;
    const offset = diagnostic.labels?.[0]?.span?.offset;
    const file = diagnostic.filename;
    if (typeof offset !== "number" || !file) continue;
    const key = `${file}@${offset}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sites.push({ file, offset });
  }
  return sites;
}

interface RewriteResult {
  changed: number;
  mismatches: string[];
  preview: string[];
}

function rewriteFileSites(file: string, sites: Site[], isDryRun: boolean): RewriteResult {
  const absolute = resolve(REPO_ROOT, file);
  const buffer = Buffer.from(readFileSync(absolute));
  const result: RewriteResult = { changed: 0, mismatches: [], preview: [] };

  for (const site of sites) {
    const three = buffer.subarray(site.offset, site.offset + 3).toString("utf8");
    let replacement: string | null = null;
    if (three.startsWith("||=")) replacement = "??=";
    else if (three.startsWith("||")) replacement = "??";
    if (replacement === null) {
      result.mismatches.push(`${file}@${site.offset} — expected || here, found ${JSON.stringify(three)}`);
      continue;
    }
    buffer.write(replacement, site.offset, "utf8");
    result.changed++;
    const lineStart = buffer.lastIndexOf(0x0a, site.offset) + 1;
    const lineEnd = buffer.indexOf(0x0a, site.offset);
    result.preview.push(`${file}: ${buffer.subarray(lineStart, lineEnd === -1 ? undefined : lineEnd).toString("utf8").trim()}`);
  }

  if (!isDryRun && result.changed > 0) writeFileSync(absolute, buffer);
  return result;
}

const isDryRun = process.argv.includes("--dry-run");
const { stdout, stderr, exitCode } = runOxlintJson();
const diagnostics = parseDiagnostics(stdout);

if (diagnostics === null) {
  console.error("Could not parse oxlint --format=json output. Debug info:");
  console.error(`  exit code: ${exitCode}`);
  console.error(`  stdout head: ${JSON.stringify(stdout.slice(0, 400))}`);
  console.error(`  stderr head: ${JSON.stringify(stderr.slice(0, 400))}`);
  process.exit(1);
}

const sites = collectSites(diagnostics);
if (!sites.length) {
  console.error(`oxlint returned ${diagnostics.length} diagnostics but zero ${RULE} sites with spans. Debug info:`);
  console.error(`  exit code: ${exitCode}`);
  console.error(`  first diagnostic: ${JSON.stringify(diagnostics[0] ?? null).slice(0, 400)}`);
  process.exit(1);
}

const byFile = new Map<string, Site[]>();
for (const site of sites) {
  const group = byFile.get(site.file) ?? [];
  group.push(site);
  byFile.set(site.file, group);
}

let totalChanged = 0;
const allMismatches: string[] = [];
for (const [file, fileSites] of byFile) {
  const result = rewriteFileSites(file, fileSites, isDryRun);
  totalChanged += result.changed;
  allMismatches.push(...result.mismatches);
  if (isDryRun) for (const entry of result.preview) console.log(entry);
}

console.log(`\n${isDryRun ? "[dry-run] would rewrite" : "Rewrote"} ${totalChanged} operator(s) across ${byFile.size} file(s).`);
if (allMismatches.length) {
  console.log(`\nSkipped ${allMismatches.length} site(s) that did not match || on disk:`);
  for (const entry of allMismatches) console.log(`  ${entry}`);
  process.exit(1);
}
