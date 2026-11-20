/** Claude Code exports CLAUDECODE=1, its per-session UUID, and its own pid. */
export const CLAUDE_SESSION_ENV = { marker: "CLAUDECODE", sessionId: "CLAUDE_CODE_SESSION_ID", sessionPid: "CLAUDE_PID" } as const;
