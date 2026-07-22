// Build-tooling: after `npm install -g` lands a fresh entrypoint, record the JS
// runtime that entrypoint actually runs under so `orch doctor`'s runtime check
// passes without the operator re-running `orch setup`. This is exactly what
// setup's reconcileRuntime does (record the runtime that matches the installed
// entrypoint's shebang), minus the interactive wizard — safe to run every build.
import { realpathSync } from "node:fs";
import { binaryPath } from "../src/util.ts";
import { shebangRuntime } from "../src/doctor/runtime.ts";
import { loadConfigOrNull, writeSettingsRuntime } from "../src/config.ts";
import { orchDir } from "../src/presence/writer.ts";
import { DEFAULT_RUNTIME, type OrchRuntime } from "../src/runtime.ts";

/** The runtime named by the installed `orch` entrypoint's shebang, or null when orch is not on PATH. */
function readEntrypointRuntime(): OrchRuntime | null {
  const entrypoint = binaryPath("orch");
  if (!entrypoint) return null;
  let target = entrypoint;
  try {
    target = realpathSync(entrypoint);
  } catch {}
  return shebangRuntime(target);
}

const dir = orchDir();

// A machine with no recorded composition still owes a full `orch setup`; writing
// runtime alone would leave a half-formed settings.json, so defer to setup there.
if (!loadConfigOrNull(dir)) {
  process.stdout.write("record-runtime: no settings recorded yet — orch setup will record the runtime\n");
  process.exit(0);
}

const runtime = readEntrypointRuntime() ?? DEFAULT_RUNTIME;
writeSettingsRuntime(dir, runtime);
process.stdout.write(`record-runtime: recorded runtime=${runtime}\n`);
