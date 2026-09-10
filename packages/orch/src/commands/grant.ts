import { hostname } from "node:os";
import { confirm, isCancel } from "@clack/prompts";
import { orchDir } from "../presence/writer.ts";
import { currentHostOs, ensureHost } from "../store/agent-rows.ts";
import { approveGrantRequest, denyGrantRequest, pendingGrantRequest, pendingGrantRequests, renderGrantRequest } from "../store/grant-rows.ts";
import { die } from "./target.ts";
import type { GrantRequest } from "../types/store.ts";

/**
 * Approve actions an agent asked for and was refused.
 *
 * The gate is the terminal: an agent reaches orch through a pipe and cannot
 * answer a prompt on one, so an answer here is evidence a human was present.
 * That is why a non-interactive run refuses instead of defaulting to yes — a
 * flag that skipped the prompt would hand the agent the key this exists to keep
 * from it. The request id is NOT a secret and is not what makes this safe: it is
 * printed to the agent too, and its job is to bind an answer to one exact action.
 */

function writeLine(text: string): void {
  process.stdout.write(`${text}\n`);
}

function listRequests(requests: readonly GrantRequest[]): void {
  writeLine(`\n${requests.length} request${requests.length === 1 ? "" : "s"} awaiting approval:\n`);
  for (const request of requests) writeLine(`${renderGrantRequest(request)}\n`);
}

/** The host row the approval points at: the machine that had the terminal. */
function approvingHost(directory: string): string {
  const host = hostname();
  ensureHost(directory, host, host, currentHostOs(), Date.now());
  return host;
}

async function reviewRequest(directory: string, request: GrantRequest): Promise<void> {
  writeLine(`\n${renderGrantRequest(request)}\n`);
  const answer = await confirm({ message: "Approve this exact action?", initialValue: false });
  if (isCancel(answer) || answer !== true) {
    denyGrantRequest(directory, request.id);
    writeLine(`denied ${request.id}.`);
    return;
  }
  const expiresAt = approveGrantRequest(directory, request.id, approvingHost(directory));
  const minutes = Math.round((expiresAt - Date.now()) / 60_000);
  writeLine(`granted ${request.id} - one use, expires in ${minutes}m. The agent may now retry that exact command.`);
}

export async function cmdGrant(args: string[]): Promise<void> {
  const directory = orchDir();
  const requested = args.find((argument) => !argument.startsWith("--"));
  const requests = pendingGrantRequests(directory);
  if (requests.length === 0) {
    writeLine("No requests are awaiting approval.");
    return;
  }
  if (args.includes("--list")) {
    listRequests(requests);
    return;
  }
  if (!process.stdin.isTTY) {
    listRequests(requests);
    die("approving needs a terminal: open one and run 'orch grant <id>' yourself. No flag answers this prompt.");
  }
  const named = requested ? pendingGrantRequest(directory, requested) : null;
  if (requested && !named) die(`no pending request ${requested}; 'orch grant --list' shows what is waiting.`);
  for (const request of named ? [named] : requests) await reviewRequest(directory, request);
}
