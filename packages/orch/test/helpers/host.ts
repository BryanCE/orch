import { hostIdFrom } from "../../src/host.ts";
import { hostIdentity } from "../../src/hosts/identity.ts";
import type { HostId, HostIdentity, HostOs } from "../../src/types/host.ts";
import type { HostedProcess } from "../../src/types/process.ts";

/** A host a fixture names: an id minted the way a stored row or a wire value is. */
export function testHost(id: string, name = id, os: HostOs = "linux"): HostIdentity {
  return { id: hostIdFrom(id), name, os };
}

/** A process on a host: this machine unless the fixture names another. */
export function hosted(pid: number, startToken: string | null = null, host: HostId = hostIdentity().id): HostedProcess {
  return { host, pid, startToken };
}
