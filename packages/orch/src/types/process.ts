// Every process orch records runs on some host, and orch can reach it in exactly one of two
// ways: the OS on this box answers for it, or a host link does. The types below make the
// two impossible to mix. A local probe or signal takes only a `LocalProcess`, which only
// `src/local-process.ts` mints; a link takes only a `HostedProcess`. A pid that lives on
// another host cannot reach a local kill, because nothing can turn it into a `LocalProcess`.
import type { HostId } from "./host.ts";

/** A pid and the start token that proves the pid still names one instance; null when the
 *  OS would not say. Meaningless alone: it names a process only together with its host. */
export interface ProcessInstance {
  readonly pid: number;
  readonly startToken: string | null;
}

/** One process instance on one host. */
export interface HostedProcess extends ProcessInstance {
  readonly host: HostId;
}

/** A process the OS on this box answers for. The only thing a local probe or signal takes. */
export type LocalProcess = ProcessInstance & { readonly __brand: "LocalProcess" };

/** A host orch reaches over a link: its id, and the name `settings.hosts` gives it. */
export interface LinkedHost {
  readonly id: HostId;
  readonly name: string;
}

/** Where a recorded process can be reached from this orch. `local`: the OS on this box
 *  answers for it. `linked`: only that host's link may be asked. `unreachable`: a host that
 *  is neither, so nothing here can say whether it lives, and nothing here may signal it. */
export type ProcessPlace =
  | { readonly kind: "local"; readonly process: LocalProcess }
  | { readonly kind: "linked"; readonly host: LinkedHost; readonly process: HostedProcess }
  | { readonly kind: "unreachable"; readonly process: HostedProcess };
