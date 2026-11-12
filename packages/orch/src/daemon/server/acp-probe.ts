import { probeAcpAgent, type AcpAgentProbe } from "../../acp/session.ts";
import { definedEnv, packageManifest } from "../../util.ts";
import type { AcpRole } from "../../types/adapter.ts";
import type { PipesProvider } from "../../types/pipes.ts";

/** Starts an ACP binding on pipes, asks it to initialize and returns what it offers. Rejects when
 *  it does not answer within `timeoutMs`. The process is ended and its pipes released on every path. */
export async function probeBinding(pipes: PipesProvider, acp: AcpRole, timeoutMs: number): Promise<AcpAgentProbe> {
  const child = pipes.spawn({ argv: acp.argv({}), cwd: process.cwd(), env: definedEnv({ ...process.env, ...acp.env({}) }) });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timedOut = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => { reject(new Error(`no ACP initialize reply within ${timeoutMs} ms`)); }, timeoutMs);
    });
    return await Promise.race([probeAcpAgent({ input: child.input, output: child.output }, packageManifest()), timedOut]);
  } finally {
    clearTimeout(timer);
    child.kill();
  }
}
