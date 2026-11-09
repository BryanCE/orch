// What a host says about itself when another host's orchd links to it: which host it is,
// and which orch build answers there.
import { buildCommit } from "../build-stamp.ts";
import { hostIdentity } from "../host.ts";
import { packageManifest } from "../util.ts";
import type { HostGreeting } from "../types/host.ts";

export function hostGreeting(): HostGreeting {
  return { host: hostIdentity(), commit: buildCommit(), version: packageManifest().version };
}
