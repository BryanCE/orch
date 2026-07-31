import { loadConfigOrNull } from "../src/config.ts";
import { writeShebangRuntime } from "../src/doctor/runtime.ts";
import { orchDir } from "../src/presence/writer.ts";
import { DEFAULT_RUNTIME, type OrchRuntime } from "../src/runtime.ts";

/** Never fails the build over settings: an unreadable file is `orch setup`'s to report. */
function declaredRuntimeOrDefault(): OrchRuntime {
  try {
    return loadConfigOrNull(orchDir())?.runtime ?? DEFAULT_RUNTIME;
  } catch {
    return DEFAULT_RUNTIME;
  }
}

const output = "dist/bin/orch.js";
const runtime = declaredRuntimeOrDefault();
writeShebangRuntime(output, runtime);
process.stdout.write(`build-bin: ${output} runs under ${runtime}\n`);
