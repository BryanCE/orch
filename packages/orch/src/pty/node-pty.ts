import type { PtyProcess, PtyProvider, PtySpawnRequest } from "../types/pty.ts";

type NodePty = typeof import("@lydell/node-pty");

/**
 * The PTY provider on `@lydell/node-pty`, which ships prebuilt binaries for linux, darwin
 * and win32 on x64 and arm64. The native module stays outside every bundle and loads on the
 * first spawn, so an orchd that never holds an agent never needs it.
 */
export function nodePtyProvider(): PtyProvider {
  let loading: Promise<NodePty> | undefined;
  return {
    spawn: async (request: PtySpawnRequest): Promise<PtyProcess> => {
      loading ??= import("@lydell/node-pty");
      const pty = await loading;
      const child = pty.spawn(request.file, [...request.args], {
        name: request.term,
        cols: request.cols,
        rows: request.rows,
        cwd: request.cwd,
        env: { ...request.env },
      });
      return {
        pid: child.pid,
        write: (data) => { child.write(data); },
        resize: (cols, rows) => { child.resize(cols, rows); },
        kill: () => { child.kill(); },
        onData: (listener) => { child.onData(listener); },
        onExit: (listener) => { child.onExit(({ exitCode, signal }) => { listener({ exitCode, signal: signal ?? null }); }); },
      };
    },
  };
}
