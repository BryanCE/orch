import * as path from "node:path";

// Claude's hook wire format lives here, in the claude adapter family (law #2:
// one adapter module owns a foreign tool's entire wire surface). Leaf on
// purpose — imported by both the adapter's installShim and doctor's hook check
// without pulling either's graph into the other.

/** Built hook shim inside a package root (source: scripts/claude-hooks.ts); plain ESM JS any runtime can run. */
export function claudeHookShimPath(root: string): string {
  return path.join(root, "dist", "scripts", "claude-hooks.js");
}

/**
 * Runtimes a user may run the hook shim with — whichever is on their PATH.
 * orch never requires one specific runtime; node, deno, and bun all work.
 * Order is the installer's preference when several are available.
 */
export const CLAUDE_HOOK_RUNTIMES = ["node", "deno", "bun"] as const;
export type ClaudeHookRuntime = (typeof CLAUDE_HOOK_RUNTIMES)[number];

/**
 * The exact settings.json command for one orch Claude hook event under one
 * runtime. The env gate makes non-orch sessions skip the shim without
 * spawning a runtime at all; the shim also self-gates, so this is defense in
 * depth.
 */
export function claudeHookCommand(shim: string, event: string, runtime: ClaudeHookRuntime): string {
  const run = runtime === "deno" ? "deno run --allow-all" : runtime;
  return `[ -n "$ORCH_AGENT_KEY" ] || exit 0; ${run} ${shim} ${event}`;
}
