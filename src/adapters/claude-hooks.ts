import * as os from "node:os";
import * as path from "node:path";
import { runtimeArgv, type OrchRuntime } from "../runtime.ts";

// Claude's hook wire format lives here, in the claude adapter family (law #2:
// one adapter module owns a foreign tool's entire wire surface). Leaf on
// purpose — imported by both the adapter's installShim and doctor's hook check
// without pulling either's graph into the other.

/** Built hook shim inside a package root (source: extensions/claude/index.ts); plain ESM JS any runtime can run. */
export function claudeHookShimPath(root: string): string {
  return path.join(root, "dist", "scripts", "claude-hooks.js");
}

/** Single-quote one argv element for the POSIX sh string claude stores as a hook command. */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * The exact settings.json command for one orch Claude hook event under the
 * runtime declared in settings.json. orch requires ONE declared runtime — the
 * hook installer never probes PATH to pick one, and the invocation form comes
 * from the shared `runtimeArgv` builder so claude, codex, and pi agree.
 * The env gate makes non-orch sessions skip the shim without spawning a runtime
 * at all; the shim also self-gates, so this is defense in depth.
 *
 * `orchDir` scopes deno's filesystem permissions; it is unused by node and bun,
 * which take no permission flags. Every argv element is quoted — the runtime path
 * and shim path are absolute and may contain spaces (Windows "Program Files",
 * macOS "Application Support").
 */
export function claudeHookCommand(shim: string, event: string, runtime: OrchRuntime, orchDir: string): string {
  // Claude writes transcripts under its own config dir; the shim reads the one
  // named in the hook payload to recover the last assistant message.
  const transcriptRoot = path.join(os.homedir(), ".claude");
  const argv = runtimeArgv(runtime, shim, [event], { orchDir, readOnly: [transcriptRoot] });
  return `[ -n "$ORCH_AGENT_KEY" ] || exit 0; ${argv.map(shellQuote).join(" ")}`;
}
