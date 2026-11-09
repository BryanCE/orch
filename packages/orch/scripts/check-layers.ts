#!/usr/bin/env bun
/**
 * Rule 21: the CLI is a client; orchd does the work.
 *
 * Every source module belongs to one layer:
 * - client: the CLI. It parses, calls orchd over RPC, prints.
 * - server: orchd. Everything that touches an agent, a plexer, a process, the store or an agent's files.
 * - shared: types, the wire protocol, settings, pure helpers.
 *
 * The check follows value imports transitively from every client and shared module and fails when
 * one reaches a server module, through any number of shared modules in between. A type-only import
 * carries no code and is allowed.
 *
 * `layers-baseline.json` lists the loads that existed when the rule landed. It only shrinks: a load
 * not in it fails, and an entry no longer in the code fails until it is deleted. When it is empty
 * the layers become packages. Never add to it: a new failure means the code belongs in orchd,
 * behind an RPC.
 *
 * `--report` also counts the client modules that reach server code through shared ones.
 * `--prune` deletes baseline entries the code no longer has. It never adds one.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");
const baselinePath = join(packageRoot, "layers-baseline.json");

/** Modules only orchd may load. A directory entry covers everything under it. */
export const SERVER: readonly string[] = [
  "src/daemon/server/",
  "src/store/",
  "src/presence/",
  "src/backends/",
  "src/adapters/",
  "src/control/",
  "src/agent/",
  "src/pty/",
  "src/hosts/",
  "src/worktrees/",
  "src/entities/",
  "src/process-identity.ts",
  "src/process-place.ts",
  "src/local-process.ts",
  "src/session.ts",
  // Starting a process is acting on the machine: only orchd does it.
  "node:child_process",
];

/** The CLI. Everything else under src/ and bin/ is shared. */
export const CLIENT: readonly string[] = [
  "src/commands/",
  "src/cli/",
  "bin/orch.ts",
];

/** Entry points of orchd and of machine-admin tools that run on this machine by design. */
const ROOTS: readonly string[] = ["src", "bin"];

type Layer = "client" | "server" | "shared";

function inLayer(path: string, entries: readonly string[]): boolean {
  return entries.some((entry) => entry.endsWith("/") ? path.startsWith(entry) : path === entry);
}

export function layerOf(path: string): Layer {
  if (inLayer(path, SERVER)) return "server";
  if (inLayer(path, CLIENT)) return "client";
  return "shared";
}

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(path);
  }
  return files;
}

/** Package-relative, forward-slashed. */
function key(file: string): string {
  return relative(packageRoot, file).replace(/\\/g, "/");
}

/** Every specifier a module loads at runtime: value imports, re-exports and dynamic imports. */
const STATIC_IMPORT = /^\s*(?:import|export)\s+(?!type\b)(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/gm;
const DYNAMIC_IMPORT = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

function runtimeSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  for (const match of source.matchAll(STATIC_IMPORT)) specifiers.push(match[1]!);
  for (const match of source.matchAll(DYNAMIC_IMPORT)) specifiers.push(match[1]!);
  return specifiers;
}

function resolveSpecifier(from: string, specifier: string): string | null {
  let target: string;
  if (specifier.startsWith(".")) target = resolve(dirname(from), specifier);
  else if (specifier.startsWith("orch/core/")) target = join(packageRoot, "src", specifier.slice("orch/core/".length));
  else if (inLayer(specifier, SERVER)) return specifier;
  else return null;
  if (existsSync(target) && statSync(target).isFile()) return target;
  if (existsSync(`${target}.ts`)) return `${target}.ts`;
  if (existsSync(join(target, "index.ts"))) return join(target, "index.ts");
  return null;
}

/** Module → the modules it loads at runtime, package-relative. */
export function importGraph(): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const root of ROOTS) {
    for (const file of sourceFiles(join(packageRoot, root))) {
      const targets: string[] = [];
      for (const specifier of runtimeSpecifiers(readFileSync(file, "utf8"))) {
        const resolved = resolveSpecifier(file, specifier);
        if (resolved !== null) targets.push(resolved.startsWith("node:") ? resolved : key(resolved));
      }
      graph.set(key(file), targets);
    }
  }
  return graph;
}

export interface Violation {
  /** The client or shared module the chain starts from. */
  readonly from: string;
  /** The server module it reaches. */
  readonly server: string;
  /** The import chain, `from` first, `server` last. */
  readonly chain: readonly string[];
}

/** For each non-server module, the first path to each server module it reaches without passing
 *  through another server module. A shared module that reaches server is itself the violation;
 *  its importers are reported against it only once. */
export function violations(graph: ReadonlyMap<string, readonly string[]>): Violation[] {
  const found: Violation[] = [];
  for (const [module, imports] of graph) {
    if (layerOf(module) === "server") continue;
    for (const target of imports) {
      if (layerOf(target) === "server") found.push({ from: module, server: target, chain: [module, target] });
    }
  }
  return found.sort((left, right) => left.from.localeCompare(right.from) || left.server.localeCompare(right.server));
}

/** Client modules that reach server code through shared modules, with the chain. */
export function clientReach(graph: ReadonlyMap<string, readonly string[]>): Violation[] {
  const found: Violation[] = [];
  for (const module of graph.keys()) {
    if (layerOf(module) !== "client") continue;
    const seen = new Set<string>([module]);
    const queue: string[][] = [[module]];
    while (queue.length > 0) {
      const chain = queue.shift()!;
      for (const next of graph.get(chain.at(-1)!) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        const extended = [...chain, next];
        if (layerOf(next) === "server") found.push({ from: module, server: next, chain: extended });
        else queue.push(extended);
      }
    }
  }
  return found;
}

/** One load as the baseline spells it. */
export function loadLine(violation: Violation): string {
  return `${violation.from} -> ${violation.server}`;
}

/** Loads in the code and not in the baseline, and baseline entries no longer in the code. */
export function ratchet(current: readonly string[], baseline: readonly string[]): { readonly added: string[]; readonly stale: string[] } {
  const now = new Set(current);
  const allowed = new Set(baseline);
  return {
    added: current.filter((line) => !allowed.has(line)),
    stale: baseline.filter((line) => !now.has(line)),
  };
}

function readBaseline(): string[] {
  if (!existsSync(baselinePath)) return [];
  const parsed: unknown = JSON.parse(readFileSync(baselinePath, "utf8"));
  if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === "string")) {
    throw new Error(`${key(baselinePath)} must be a JSON array of "from -> server" strings`);
  }
  return parsed;
}

function main(): void {
  const graph = importGraph();
  const current = violations(graph).map(loadLine);
  const baseline = readBaseline();
  const { added, stale } = ratchet(current, baseline);
  if (process.argv.includes("--prune") && stale.length > 0) {
    const gone = new Set(stale);
    writeFileSync(baselinePath, `${JSON.stringify(baseline.filter((line) => !gone.has(line)), null, 2)}\n`);
    console.log(`check:layers pruned ${stale.length} entries gone from the code`);
    stale.length = 0;
  }
  for (const line of added) console.log(`check:layers FAIL ${line}: a client or shared module loads server code`);
  for (const line of stale) console.log(`check:layers FAIL ${line}: gone from the code; delete it from layers-baseline.json`);
  if (process.argv.includes("--report")) {
    const clients = new Set(clientReach(graph).map((violation) => violation.from));
    console.log(`${current.length} direct loads; ${clients.size} client modules reach server code.`);
  }
  if (added.length > 0) {
    console.log(`Rule 21: the CLI is a client. Move this code into orchd behind an RPC, or into shared if it does no I/O on an agent. Never add it to the baseline.`);
  }
  if (added.length > 0 || stale.length > 0) process.exit(1);
  console.log(`check:layers ok: ${graph.size} modules, ${current.length} baseline loads left`);
}

if (import.meta.main) main();
