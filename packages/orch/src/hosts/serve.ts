// The far end of a host link: `orch host serve`, started over SSH by the orchd that
// holds the link. It says which host it is, then answers requests about this machine
// until the link closes. It never dials an orchd here and never starts one: the
// agents it answers for belong to the orchd on the other end.
import type { Readable, Writable } from "node:stream";
import { buildCommit } from "../build-stamp.ts";
import { framedLineReader } from "../daemon/client/wire.ts";
import { recordedInstanceIsLive } from "../process-identity.ts";
import { hostIdentity } from "../host.ts";
import { errorMessage, packageManifest } from "../util.ts";
import type { HostGreeting } from "../types/host.ts";
import { encodeHostFrame, HOST_PARAMS, isHostMethod, parseHostFrame, type HostMethod, type HostResultOf } from "./protocol.ts";

/** Which host this is and which orch build answers here. */
export function hostGreeting(): HostGreeting {
  return { host: hostIdentity(), commit: buildCommit(), version: packageManifest().version };
}

function ping(): HostResultOf<"ping"> {
  return { at: Date.now() };
}

function alive(pid: number, startToken: string | null): HostResultOf<"alive"> {
  return { alive: recordedInstanceIsLive(pid, startToken) };
}

function answer(method: HostMethod, params: unknown): unknown {
  switch (method) {
    case "ping":
      HOST_PARAMS.ping.parse(params);
      return ping();
    case "alive": {
      const { pid, startToken } = HOST_PARAMS.alive.parse(params);
      return alive(pid, startToken);
    }
    default: {
      const exhaustive: never = method;
      throw new Error(`unknown host request ${String(exhaustive)}`);
    }
  }
}

/** One request line, answered as one line. A malformed line names nothing to answer. */
function respond(line: string): string | null {
  const frame = parseHostFrame(line);
  if (frame?.kind !== "request") return null;
  if (!isHostMethod(frame.method)) return encodeHostFrame({ kind: "failure", id: frame.id, message: `this orch answers no ${frame.method} request` });
  try {
    return encodeHostFrame({ kind: "reply", id: frame.id, result: answer(frame.method, frame.params) });
  } catch (error: unknown) {
    return encodeHostFrame({ kind: "failure", id: frame.id, message: errorMessage(error) });
  }
}

/** Serve one link over `input` and `output` until `input` ends. */
export function serveHostLink(input: Readable, output: Writable, greeting: HostGreeting = hostGreeting()): Promise<void> {
  output.write(encodeHostFrame({ kind: "greeting", greeting }));
  framedLineReader(input, (line) => {
    const reply = respond(line.trim());
    if (reply !== null) output.write(reply);
  });
  return new Promise((resolve) => {
    input.once("end", resolve);
    input.once("close", resolve);
  });
}
