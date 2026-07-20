// The JS runtime orch runs under is a DECLARED value, never one inferred from PATH
// order. This module is the single source of that vocabulary and of the invocation
// form for each runtime. Node built-ins and util only — the harness shims are
// bundled standalone and must not drag config/adapters/store along.

import { binaryPath } from "./util.ts";

/**
 * Every runtime orch supports. All three are first-class choices: orch's own code
 * is runtime-agnostic by construction (Rule 6 bans `Bun.*` and `bun:*` in source
 * precisely SO the tree runs anywhere), so whichever of these a user has is a
 * valid way to run it. Rule 6 constrains what orch's code may depend on, not what
 * a user may execute it with.
 */
export const ORCH_RUNTIMES = ["node", "deno", "bun"] as const;

/** The declared runtime recorded as the top-level `runtime` key of settings.json. */
export type OrchRuntime = (typeof ORCH_RUNTIMES)[number];

/**
 * What a fresh install records absent an explicit choice. `node` only because it
 * is the most universally present and is what an `npm install -g` lands under —
 * a starting point, not a judgment about the others.
 */
export const DEFAULT_RUNTIME: OrchRuntime = "node";

/**
 * Env vars the harness shims read. Enumerated rather than blanket `--allow-env`
 * so a shim cannot read tokens sitting elsewhere in the agent's environment.
 */
const SHIM_ENV_VARS = [
  "ORCH_AGENT_KEY",
  "ORCH_DIR",
  "ORCH_AGENT_LOG",
  "CLAUDE_PID",
  "CODEX_PID",
  "HOME",
  "USERPROFILE",
] as const;

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
