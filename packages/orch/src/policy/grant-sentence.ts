import type { GrantKind, GrantRequest } from "../types/store.ts";

/** What a human is shown for each action, in orch's words and never a caller's. */
const ACTION_SENTENCE: Record<GrantKind, string> = {
  "spawn.new-space": "open a NEW space on your screen and spawn agents into it",
  "command.run": "run a command listed in gated_commands, once, in this directory",
};

export function isGrantKind(value: string): value is GrantKind {
  return value in ACTION_SENTENCE;
}

/** What a human reads before approving: orch's own sentence for the action, then
 *  the params that will execute, verbatim. The requester names itself on its own
 *  line and never gets to describe the action. */
export function renderGrantRequest(request: GrantRequest): string {
  const fields = Object.keys(request.params).sort()
    .map((name) => `    ${name.padEnd(10)} ${request.params[name]}`);
  return [
    `  ${request.id}  ${request.kind}`,
    `    action     ${ACTION_SENTENCE[request.kind]}`,
    ...fields,
    `    requested  by ${request.requestedBy ?? "an unregistered caller"}`,
  ].join("\n");
}
