/** Internal config: values the code is tuned around. User settings live in `settings.json`, not here. */

/** How long orch waits on a plexer's own CLI (herdr, tmux, orca). */
export const PLEXER_TIMEOUTS = {
  /** One command that changes or reads a pane. */
  commandMs: 5_000,
  /** One pane or tab listing; kept short because every fleet read can make one. */
  listMs: 3_000,
  /** The HUD's reads through the plexer CLI. */
  hudMs: 2_000,
  /** The HUD's fire-and-forget status writes to the plexer's socket. */
  hudSocketMs: 500,
  /** How long herdr may take to report a freshly started agent. */
  agentStartMs: 30_000,
  /** How long one listing answers repeated reads in the same moment. */
  listCacheMs: 1_500,
  /** How often a status wait checks the store again. */
  statusPollMs: 250,
} as const;
