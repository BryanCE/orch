import { hostname } from "node:os";
import { confirm, isCancel } from "@clack/prompts";
import type { Services } from "../types/services.ts";
import { renderGrantRequest } from "../policy/grant-sentence.ts";
import { readRpc, writeRpc } from "./daemon.ts";
import { die } from "./target.ts";
import { parseCommand } from "./registry.ts";
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

async function reviewRequest(services: Services, request: GrantRequest): Promise<void> {
  writeLine(`\n${renderGrantRequest(request)}\n`);
  const answer = await confirm({ message: "Approve this exact action?", initialValue: false });
  if (isCancel(answer) || answer !== true) {
    await writeRpc(services, "grant", { target: request.id, decision: "deny", host: hostname() });
    writeLine(`denied ${request.id}.`);
    return;
  }
  const { expiresAt } = await writeRpc(services, "grant", { target: request.id, decision: "approve", host: hostname() });
  const minutes = Math.round(((expiresAt ?? Date.now()) - Date.now()) / 60_000);
  writeLine(`granted ${request.id} - one use, expires in ${minutes}m. The agent may now retry that exact command.`);
}

export async function cmdGrant(services: Services, args: string[]): Promise<void> {
  const { flags, positional } = parseCommand("grant", args);
  const requested = positional[0];
  const requests = (await readRpc(services, "grants", undefined)).requests;
  if (requests.length === 0) {
    writeLine("No requests are awaiting approval.");
    return;
  }
  if (flags.has("--list")) {
    listRequests(requests);
    return;
  }
  if (!process.stdin.isTTY) {
    listRequests(requests);
    die("approving needs a terminal: open one and run 'orch grant <id>' yourself. No flag answers this prompt.");
  }
  const named = requested ? requests.find((request) => request.id === requested) ?? null : null;
  if (requested && !named) die(`no pending request ${requested}; 'orch grant --list' shows what is waiting.`);
  for (const request of named ? [named] : requests) await reviewRequest(services, request);
}
