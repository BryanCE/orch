// The far end of a host link: `orch host serve`, run over ssh by another host's orchd. It is a
// pipe and nothing else, so it is client transport. It starts this host's orchd if none is
// running, sends it `peer-hello` as the peer its forced command names, then copies the link's
// bytes to that orchd and back until either side ends. Everything a linked orchd asks of this host, this host's orchd answers.
import { readFileSync } from "node:fs";
import type { Duplex, Readable, Writable } from "node:stream";
import { connectDaemon } from "./rpc.ts";
import { ensureDaemon } from "./reach.ts";
import { encodeRequest, endpointPaths } from "./wire.ts";
import type { Logger, OrchDir } from "../../types/core.ts";
import type { HostId } from "../../types/host.ts";

export interface ServeOptions {
  /** This host's orch directory: where its orchd runs. */
  readonly orchDir: OrchDir;
  /** The host whose orchd holds this link, from the forced command its key is pinned to. */
  readonly origin: HostId;
  readonly logger: Logger;
  /** How long dialing this host's orchd may take. */
  readonly connectTimeoutMs: number;
  /** Reach this host's orchd, started if it is down. Tests hand in one of their own. */
  readonly dial?: () => Promise<Duplex>;
}

async function dialOrchd(options: ServeOptions): Promise<Duplex> {
  await ensureDaemon(options.orchDir, options.logger);
  return connectDaemon(options.orchDir, options.connectTimeoutMs);
}

/** Pipe one link to this host's orchd until either side ends. */
export async function serveHostLink(input: Readable, output: Writable, options: ServeOptions): Promise<void> {
  const orchd = await (options.dial ?? (() => dialOrchd(options)))();
  const token = readFileSync(endpointPaths(options.orchDir).token, "utf8").trim();
  orchd.write(encodeRequest(0, "peer-hello", { origin: options.origin, token }));
  input.pipe(orchd);
  orchd.pipe(output);
  await new Promise<void>((resolve) => {
    const done = (): void => {
      input.unpipe(orchd);
      orchd.unpipe(output);
      orchd.destroy();
      resolve();
    };
    orchd.once("close", done);
    orchd.once("error", done);
    input.once("end", done);
    input.once("close", done);
  });
}
