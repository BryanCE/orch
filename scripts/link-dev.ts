#!/usr/bin/env node
// Point the local dev install at the BUILT output in dist/, so dev runs exactly
// like a published npm install (node executing dist/bin/orch.js) instead of live
// source. Idempotent: safe to run on every `bun run build:dev`.
import { existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const repo = process.cwd();
const home = homedir();

/** Force-create a symlink `link` -> `target`, replacing whatever was there. */
function relink(target: string, link: string): void {
  if (!existsSync(target)) throw new Error(`build output missing: ${target} (run "bun run build" first)`);
  mkdirSync(dirname(link), { recursive: true });
  try { rmSync(link, { force: true }); } catch {}
  symlinkSync(target, link);
  process.stdout.write(`  ${link} -> ${target}\n`);
}

// The orch CLI: node runs the built bundle, never live bin/orch.ts.
relink(join(repo, "dist/bin/orch.js"), join(home, ".bun/bin/orch"));

// The agent bridges: pi loads the built bundles, never live extensions/*.ts.
const extDir = join(home, ".pi/agent/extensions");
relink(join(repo, "dist/extensions/orchestrator-bridge.js"), join(extDir, "orchestrator-bridge.ts"));
relink(join(repo, "dist/extensions/herdr-agent-state.js"), join(extDir, "herdr-agent-state.ts"));
