import { writeShebangRuntime } from "../src/doctor/runtime.ts";

// The npm artifact must be deterministic and runnable by every npm user. Runtime
// selection is applied after install by `orch setup`; it must never leak a
// publisher's local settings into the packaged entrypoint.
export const BUILD_RUNTIME = "node";

export function stampBuildEntrypoint(output: string): void {
  writeShebangRuntime(output, BUILD_RUNTIME);
}

/** Every packaged entrypoint. Each is stamped, so a bin cannot ship with bun's shebang. */
export const BUILD_ENTRYPOINTS: readonly string[] = ["dist/bin/orch.js", "dist/bin/orch-ding.js"];

if (import.meta.main) {
  for (const output of BUILD_ENTRYPOINTS) {
    stampBuildEntrypoint(output);
    process.stdout.write(`build-bin: ${output} runs under ${BUILD_RUNTIME}\n`);
  }
}
