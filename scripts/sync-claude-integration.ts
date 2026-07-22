// Build-tooling: a rebuild produces a fresh Claude hook shim and may change the
// declared runtime, both of which the hook command in ~/.claude/settings.json
// embeds — so the installed hooks go stale on every build. Re-sync them here so
// the operator never re-runs `orch setup` for it. Gated on the user ALREADY
// having orch Claude hooks: keep existing integration current, never mint Claude
// config for someone who only runs pi.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { claudeAdapter } from "../src/adapters/claude.ts";

const settingsPath = path.join(os.homedir(), ".claude", "settings.json");
const alreadyIntegrated = fs.existsSync(settingsPath)
  && fs.readFileSync(settingsPath, "utf8").includes("claude-hooks.js");

if (!alreadyIntegrated) {
  process.stdout.write("sync-claude-integration: no orch Claude hooks installed — skipping\n");
  process.exit(0);
}

claudeAdapter.installShim();
