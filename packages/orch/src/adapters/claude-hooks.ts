import * as path from "node:path";
import { runtimeArgv, type OrchRuntime } from "../runtime.ts";
import { shellQuote, toolDir } from "../util.ts";
import type { OrchDir } from "../types/core.ts";

// Claude's hook wire format lives here, in the claude adapter family (law #2:
// one adapter module owns a foreign tool's entire wire surface). Leaf on
// purpose — imported by both the adapter's installShim and doctor's hook check
// without pulling either's graph into the other.

/** Every Claude hook event orch registers its shim under. */
export const CLAUDE_HOOK_EVENTS = ["SessionStart", "UserPromptSubmit", "Stop", "StopFailure", "Notification", "PreToolUse"] as const;

/** The events whose shim runs only on a match, so Claude starts no process for the rest:
 *  PreToolUse rewrites only Bash, and only these notification types wait on the human
 *  (`idle_prompt` only means the turn ended a while ago). */
export const CLAUDE_HOOK_MATCHERS: Readonly<Partial<Record<(typeof CLAUDE_HOOK_EVENTS)[number], string>>> = {
  PreToolUse: "Bash",
  Notification: "permission_prompt|elicitation_dialog|elicitation_url_dialog",
};

/** Built hook shim inside a package root (source: extensions/claude/index.ts); plain ESM JS any runtime can run. */
export function claudeHookShimPath(root: string): string {
  return path.join(root, "dist", "scripts", "claude-hooks.js");
}

/** Orch-owned Claude settings passed only to sessions orch launches. */
export function claudeSettingsPath(orchDir: OrchDir): string {
  return path.join(orchDir, "claude", "settings.json");
}

/**
 * The exact settings.json command for one orch Claude hook event under the
 * runtime declared in settings.json. orch requires ONE declared runtime — the
 * hook installer never probes PATH to pick one, and the invocation form comes
 * from the shared `runtimeArgv` builder so claude, codex, and pi agree.
 * The shim self-gates, so non-orch sessions exit without recording presence.
 *
 * `orchDir` scopes deno's filesystem permissions; it is unused by node and bun,
 * which take no permission flags. Every argv element is quoted — the runtime path
 * and shim path are absolute and may contain spaces (Windows "Program Files",
 * macOS "Application Support").
 */
export function claudeHookCommand(shim: string, event: string, runtime: OrchRuntime, orchDir: OrchDir): string {
  // Claude writes transcripts under its own config dir; the shim reads the one
  // named in the hook payload to recover the last assistant message.
  const transcriptRoot = toolDir("CLAUDE_CONFIG_DIR", ".claude");
  const argv = runtimeArgv(runtime, shim, [event], { orchDir, readOnly: [transcriptRoot] });
  return argv.map(shellQuote).join(" ");
}
