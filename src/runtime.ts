// The JS runtime orch runs under is a DECLARED value, never one inferred from PATH
// order. The vocabulary itself lives in the leaf `runtimes.ts` (imported here and
// re-exported, so there is exactly ONE definition); this module owns the
// invocation form for each runtime. The env grant it hands deno comes from the
// leaf `adapters/session-env.ts`, never from the adapter registry: importing the
// registry here put every harness shim on a module cycle back into runtime.ts.

import { SHIM_ENV_VARS } from "./adapters/session-env.ts";
import type { OrchRuntime } from "./runtimes.ts";
import { binaryPath } from "./util.ts";

export { DEFAULT_RUNTIME, ORCH_RUNTIMES, type OrchRuntime } from "./runtimes.ts";

/** Filesystem scope a shim invocation is granted. Paths must be absolute. */
export interface ShimScope {
  /** The resolved $ORCH_DIR — read AND written (presence records live here). */
  orchDir: string;
  /** Additional read-only roots, e.g. the directory holding claude transcripts. */
  readOnly?: readonly string[];
}

/**
 * The argv that executes a plain ESM JS file under one runtime — the ONE
 * definition site, shared by every harness shim so the three can never drift.
 *
 * `bin` is an ABSOLUTE path when the runtime resolves on orch's PATH. The tool
 * that later spawns this command (claude, codex) may not share orch's PATH —
 * version managers (nvm, fnm, volta, asdf) and Windows-vs-WSL shells routinely
 * differ — so a bare name is a real portability hazard. The bare name is used
 * only as a fallback when resolution fails.
 *
 * Deno gets REAL permissions, derived from what the shims actually do, rather
 * than `--allow-all` (which would discard the only reason to run a shim under
 * deno at all). The shims read presence JSON under $ORCH_DIR, atomically rewrite
 * it, read the transcript file claude names in its hook payload, and read the env
 * vars above. They open NO network connections — hence no `--allow-net`, and no
 * `--allow-run` or `--allow-ffi`. `--allow-sys=homedir` is needed only because
 * presence falls back to `~/.orch` when ORCH_DIR is unset.
 *
 * Read scope deliberately does NOT enumerate every possible transcript location.
 * A path outside the granted scope makes deno throw, and the shim's transcript
 * read is already wrapped in try/catch — it degrades to "no last-assistant text"
 * rather than failing. Under-granting costs a detail; over-granting costs the
 * sandbox.
 */
export function runtimeArgv(runtime: OrchRuntime, script: string, args: readonly string[], scope: ShimScope): string[] {
  const bin = binaryPath(runtime) ?? runtime;
  if (runtime !== "deno") return [bin, script, ...args];

  const readable = [scope.orchDir, script, ...(scope.readOnly ?? [])];
  return [
    bin,
    "run",
    `--allow-env=${SHIM_ENV_VARS.join(",")}`,
    "--allow-sys=homedir",
    `--allow-read=${readable.join(",")}`,
    `--allow-write=${scope.orchDir}`,
    script,
    ...args,
  ];
}
