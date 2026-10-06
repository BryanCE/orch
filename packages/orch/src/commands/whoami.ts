// `orch whoami`: everything orchd holds for the caller, beside what the caller sent. Registers nothing.
import { callerCredential } from "../identity/credential.ts";
import { OPERATOR_HARNESS_ID } from "../identity/operator.ts";
import { roleOf, term } from "../policy/vocabulary.ts";
import { formatTimestamp } from "../format.ts";
import { parseCommand } from "./registry.ts";
import { whoAmI, type CallerSelf } from "./self.ts";
import type { CallerCredential } from "../types/core.ts";
import type { AgentView } from "../types/store.ts";
import type { Services } from "../types/services.ts";

type Stored = NonNullable<CallerSelf["stored"]>;

/** What kind of caller orchd sees, in words. */
function callerWords(self: CallerSelf, caller: CallerCredential): string {
  if (self.kind === "operator") return "the human (operator)";
  if (self.kind === "agent") return "a spawned agent";
  return `a ${caller.session?.harnessId ?? "harness"} session`;
}

/** The row: identity, provenance, lease, environment, tuning, ending. */
function rowLines(self: CallerSelf, view: AgentView): string[] {
  const { environment, tuning } = view;
  return [
    `harness ${view.harnessId}, label ${view.label ?? "none"}, created ${formatTimestamp(view.createdAt)}`,
    `role ${term(roleOf(view))}, space ${self.space ?? "none"}, depth ${self.depth}, spawned by ${view.spawnedByName ?? "nobody"}`,
    `held by ${view.heldBy === null ? "nobody" : `${view.heldBy.orchId} since ${formatTimestamp(view.heldBy.since)}`}`,
    `cwd ${view.cwd}`,
    `plexer ${environment.plexer ?? "none"}, handle ${environment.handle ?? "none"}, worktree ${environment.worktree ?? "none"}, branch ${environment.branch ?? "none"}`,
    `model ${tuning.model ?? "default"}, thinking ${tuning.thinking ?? "default"}`,
    ...(view.endedAt === null ? [] : [`ended ${formatTimestamp(view.endedAt)}`]),
  ];
}

/** What orchd stored at registration: the process it keys liveness on, the session token. */
function storedLines(stored: Stored): string[] {
  const process = stored.process;
  const host = process?.host;
  return [
    process === null
      ? "stored process none"
      : `stored process ${process.pid} on ${host ? `${host.name} (${host.os})` : "an unknown host"}, since ${formatTimestamp(process.since)}, ${process.alive ? "alive" : "dead"}`,
    `stored session token ${stored.sessionToken ?? "none"}, claimed ${stored.claimedAt === null ? "never" : formatTimestamp(stored.claimedAt)}`,
  ];
}

/** The credential this command sent: process, harness marker, launch id. */
function sentLines(caller: CallerCredential): string[] {
  const session = caller.session;
  return [
    `sent process ${caller.process.pid}${caller.process.startToken === null ? " (start time unknown)" : ""}`,
    session === null
      ? "sent no harness marker"
      : `sent harness marker ${session.harnessId}, session id ${session.sessionId ?? "none"}, session pid ${session.pid ?? "none"}`,
    ...(caller.launch === null ? [] : [`sent launch credential ${caller.launch}`]),
  ];
}

/** Where the stored row and this caller disagree: the sign of a row filed under the wrong process. */
function mismatchLines(view: AgentView, stored: Stored, caller: CallerCredential): string[] {
  const sentHarness = caller.session?.harnessId ?? OPERATOR_HARNESS_ID;
  const storedPid = stored.process?.pid;
  return [
    ...(view.harnessId === sentHarness ? [] : [`warning: the row's harness is ${view.harnessId}, but this caller is ${sentHarness}`]),
    ...(storedPid === undefined || storedPid === caller.process.pid ? [] : [`warning: the stored process ${storedPid} is not this caller's process ${caller.process.pid}`]),
  ];
}

function whoamiText(self: CallerSelf, caller: CallerCredential): string {
  const view = self.view;
  if (view === null || self.stored === null) {
    return [`You are ${callerWords(self, caller)}. orch has no row for this caller.`, ...sentLines(caller).map((line) => `  ${line}`)].join("\n");
  }
  const details = [...rowLines(self, view), ...storedLines(self.stored), ...sentLines(caller)];
  return [
    `You are ${view.name} (${view.id}), ${callerWords(self, caller)}.`,
    ...details.map((line) => `  ${line}`),
    ...mismatchLines(view, self.stored, caller),
  ].join("\n");
}

/** Print who orchd sees as the caller of this terminal. */
export async function cmdWhoami(services: Services, args: string[]): Promise<void> {
  const { flags } = parseCommand("whoami", args);
  const caller = callerCredential();
  const self = await whoAmI(services, caller);
  process.stdout.write(flags.has("--json") ? JSON.stringify({ caller, self }, null, 2) + "\n" : whoamiText(self, caller) + "\n");
}
