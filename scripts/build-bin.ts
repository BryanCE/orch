import { writeShebangRuntime } from "../src/doctor/runtime.ts";

// The npm artifact must be deterministic and runnable by every npm user. Runtime
// selection is applied after install by `orch setup`; it must never leak a
// publisher's local settings into the packaged entrypoint.
export const BUILD_RUNTIME = "node";

export function stampBuildEntrypoint(output: string): void {
  writeShebangRuntime(output, BUILD_RUNTIME);
}

if (import.meta.main) {
  const output = "dist/bin/orch.js";
  stampBuildEntrypoint(output);
  process.stdout.write(`build-bin: ${output} runs under ${BUILD_RUNTIME}\n`);
}
