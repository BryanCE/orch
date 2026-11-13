// How orchd runs opencode with its session held: every opencode agent is one session on the one
// server orchd shares between them (./opencode-server.ts). The `server` form shows the session on
// orchd's own screen; the `tui` form runs opencode's terminal program attached to the session.
import { OpencodeServerOwner, serverIdentity, type OpencodeServer } from "./opencode-server.ts";
import { driveSession, openSessionOn, type SessionLaunch } from "./opencode-session.ts";
import type { BackendSpawnOpts } from "../types/backend.ts";
import type { HeldSessionDriver, SessionOpenContext } from "../types/held-session.ts";

/** The terminal program attached to `sessionId` on the server, started in the agent's directory. */
function terminalArgv(server: OpencodeServer, sessionId: string, cwd: string): readonly string[] {
  return ["opencode", "--server", server.url, "--session", sessionId, cwd];
}

function launchOf(opts: BackendSpawnOpts, env: Readonly<Record<string, string>>): SessionLaunch {
  return { model: opts.model, thinking: opts.thinking, env };
}

/** Drive opencode through the servers `owner` lends. */
export function opencodeDriver(owner: OpencodeServerOwner): HeldSessionDriver {
  return {
    // An opencode session lives in opencode's own store, which its terminal program reads too.
    sharesSessions: true,
    // A recorded session is a row in opencode's store; the server opens it by id.
    reopens: () => Promise.resolve(true),
    probe: (context: SessionOpenContext) => serverIdentity(owner, context),
    async connect(opts, env, context) {
      const { server, release } = await owner.borrow(context);
      const launch = launchOf(opts, env);
      return {
        process: {
          pid: server.pid,
          exited: server.exited,
          shared: true,
          // The shared server's stderr is its owner's to log, not any one agent's.
          onStderr: () => undefined,
          release,
        },
        async open(open, events) {
          const sessionId = await openSessionOn(server, open, launch, context);
          return driveSession(server, sessionId, open.cwd, launch, null, events, context);
        },
      };
    },
    terminal: {
      clientEnv: owner.clientEnv,
      async attach(opts, env, open, context) {
        const { server, release } = await owner.borrow(context);
        const launch = launchOf(opts, env);
        let sessionId: string;
        try {
          sessionId = await openSessionOn(server, open, launch, context);
        } catch (error: unknown) {
          release();
          throw error;
        }
        const cwd = open.cwd;
        return {
          argv: terminalArgv(server, sessionId, cwd),
          env: server.clientEnv,
          sessionId,
          open: (events, terminal) => Promise.resolve(driveSession(server, sessionId, cwd, launch, (next) => terminal.relaunch(terminalArgv(server, next, cwd)), events, context)),
          release,
        };
      },
    },
  };
}

/** orchd's one opencode server owner, and the driver every opencode agent runs on. */
export const opencodeServerDriver: HeldSessionDriver = opencodeDriver(new OpencodeServerOwner());
