// The far end of a host link: `orch host serve`, started over SSH by the orchd that
// holds the link. It says which host it is, answers requests about this machine, and
// carries orchd's RPC for the agents here that orchd owns, until the link closes. It
// never starts an orchd here: those agents belong to the orchd on the other end.
import type { Readable, Writable } from "node:stream";
import { buildCommit } from "../build-stamp.ts";
import { framedLineReader } from "../daemon/client/wire.ts";
import { recordedInstanceIsLive } from "../process-identity.ts";
import { signalOtherProcess } from "../backends/process.ts";
import { hostIdentity } from "../host.ts";
import { errorMessage, packageManifest } from "../util.ts";
import type { OrchDir } from "../types/core.ts";
import type { HostGreeting } from "../types/host.ts";
import { RelayListener } from "./relay.ts";
import { launchForOrigin, type OpenRelay } from "./launch.ts";
import { encodeHostFrame, HOST_PARAMS, isHostMethod, parseHostFrame, type HostFrame, type HostMethod, type HostResultOf } from "./protocol.ts";

/** Which host this is and which orch build answers here. */
export function hostGreeting(): HostGreeting {
  return { host: hostIdentity(), commit: buildCommit(), version: packageManifest().version };
}

export interface ServeOptions {
  /** This host's orch directory; each origin's relay directory lives under it. */
  readonly orchDir: OrchDir;
  readonly greeting?: HostGreeting;
}

/** One link's far end: its requests answered, its relay held. */
class LinkServer {
  private readonly relay: RelayListener;
  /** Which orchd this link carries, and where its agents live here; null until it asks. */
  private opened: OpenRelay | null = null;

  constructor(private readonly orchDir: OrchDir, private readonly write: (frame: HostFrame) => void) {
    this.relay = new RelayListener(write);
  }

  receive(line: string): void {
    const frame = parseHostFrame(line);
    if (frame === null) return;
    switch (frame.kind) {
      case "request": {
        const { id, method, params } = frame;
        if (!isHostMethod(method)) {
          this.write({ kind: "failure", id, message: `this orch answers no ${method} request` });
          return;
        }
        this.answer(method, params).then(
          (result) => { this.write({ kind: "reply", id, result }); },
          (error: unknown) => { this.write({ kind: "failure", id, message: errorMessage(error) }); },
        );
        return;
      }
      case "stream-line":
        this.relay.line(frame.stream, frame.line);
        return;
      case "stream-end":
        this.relay.end(frame.stream);
        return;
      // Only this end greets, opens streams, and answers.
      case "greeting":
      case "stream-open":
      case "reply":
      case "failure":
        return;
      default: {
        const exhaustive: never = frame;
        throw new Error(`unknown host frame ${String(exhaustive)}`);
      }
    }
  }

  close(): void {
    this.relay.close();
  }

  private async answer(method: HostMethod, params: unknown): Promise<unknown> {
    switch (method) {
      case "ping":
        HOST_PARAMS.ping.parse(params);
        return { at: Date.now() } satisfies HostResultOf<"ping">;
      case "alive": {
        const { processes } = HOST_PARAMS.alive.parse(params);
        return { alive: processes.map(({ pid, startToken }) => recordedInstanceIsLive(pid, startToken)) } satisfies HostResultOf<"alive">;
      }
      case "relay": {
        const { origin, token } = HOST_PARAMS.relay.parse(params);
        const orchDir = await this.relay.open(this.orchDir, origin.id, token);
        this.opened = { orchDir, origin };
        return { orchDir } satisfies HostResultOf<"relay">;
      }
      case "signal": {
        const recorded = HOST_PARAMS.signal.parse(params);
        if (!recordedInstanceIsLive(recorded.pid, recorded.startToken)) return { outcome: "gone" } satisfies HostResultOf<"signal">;
        signalOtherProcess(recorded.pid, "SIGTERM");
        return { outcome: "signalled" } satisfies HostResultOf<"signal">;
      }
      case "launch": {
        const launch = HOST_PARAMS.launch.parse(params);
        if (this.opened === null) throw new Error("no orchd's relay is open on this link, so an agent here could not reach it");
        return launchForOrigin(this.opened, launch) satisfies HostResultOf<"launch">;
      }
      default: {
        const exhaustive: never = method;
        throw new Error(`unknown host request ${String(exhaustive)}`);
      }
    }
  }
}

/** Serve one link over `input` and `output` until `input` ends. */
export function serveHostLink(input: Readable, output: Writable, options: ServeOptions): Promise<void> {
  const server = new LinkServer(options.orchDir, (frame) => { output.write(encodeHostFrame(frame)); });
  output.write(encodeHostFrame({ kind: "greeting", greeting: options.greeting ?? hostGreeting() }));
  framedLineReader(input, (line) => { server.receive(line.trim()); });
  return new Promise((resolve) => {
    const done = (): void => {
      server.close();
      resolve();
    };
    input.once("end", done);
    input.once("close", done);
  });
}
