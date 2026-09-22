import { spawn } from "node:child_process";
import { hostOs } from "../host.ts";
import { processStartToken } from "../process-identity.ts";
import { HELD_LOCKS_ENV, heldPatterns } from "../policy/command-gate.ts";
import { sleep } from "../util.ts";
import { askDaemon, readRpc } from "./daemon.ts";
import { whoAmI } from "./self.ts";
import { die } from "./target.ts";
import type { Services } from "../types/services.ts";
import type { ParamsOf } from "../daemon/client/protocol.ts";

const USAGE = "usage: orch lock -- '<command>'";

/** Ask orchd until the command may run; returns the patterns this process now holds. */
async function awaitLock(services: Services, params: ParamsOf<"command-lock">): Promise<string[]> {
  const pollMs = services.settings.current().timeouts.lock_poll_ms;
  let announced = false;
  for (;;) {
    const verdict = await readRpc(services, "command-lock", params);
    if (verdict.verdict === "run") {
      if (verdict.patterns.length) process.stdout.write(`orch lock: holding "${verdict.patterns.join('", "')}".\n`);
      return verdict.patterns;
    }
    if (verdict.verdict === "refused") {
      die(`orch lock: this command is in gated_commands and needs the human's approval. Ask the human to run: orch grant ${verdict.requestId}\nThen run the exact same command again.`);
    }
    if (verdict.verdict === "denied") {
      die(`orch lock: "${verdict.pattern}" is in denied_commands and no agent of your kind may run it. The command did not run. Run it over only the files you changed, or leave it to the human.`);
    }
    if (verdict.verdict === "gave-up") {
      die(`orch lock: gave up on "${verdict.pattern}" after ${Math.round(verdict.waitedMs / 1000)}s (timeouts.lock_wait_ms); ${verdict.holder} still holds it. The command did not run.\nDo your other work first, then run the same command again. Stop and report only when no other work is left.`);
    }
    if (!announced) process.stdout.write(`orch lock: waiting for "${verdict.pattern}", held by ${verdict.holder}.\n`);
    announced = true;
    await sleep(pollMs);
  }
}

function shellPath(): string {
  return process.env.SHELL ?? (hostOs() === "windows" ? "bash" : "/bin/sh");
}

/** Run the command under the caller's shell, passing signals through; resolves its exit code. */
function runShell(command: string, held: readonly string[]): Promise<number> {
  const child = spawn(shellPath(), ["-c", command], { stdio: "inherit", env: { ...process.env, [HELD_LOCKS_ENV]: held.join("\n") } });
  const forward = (signal: NodeJS.Signals) => { child.kill(signal); };
  process.on("SIGINT", forward);
  process.on("SIGTERM", forward);
  return new Promise((resolve) => {
    child.on("error", (error) => { process.stdout.write(`orch lock: ${error.message}\n`); resolve(127); });
    child.on("close", (code, signal) => { resolve(code ?? (signal === null ? 1 : 128)); });
  });
}

export async function cmdLock(services: Services, args: string[]): Promise<void> {
  const separator = args.indexOf("--");
  const command = separator === -1 ? "" : args.slice(separator + 1).join(" ");
  if (!command.trim()) die(USAGE);
  const self = await whoAmI(services);
  const startToken = processStartToken(process.pid) ?? null;
  const held = heldPatterns(process.env);
  const taken = await awaitLock(services, { command, cwd: process.cwd(), pid: process.pid, startToken, agent: self.id, held, waitingSince: Date.now() });
  try {
    process.exitCode = await runShell(command, [...held, ...taken]);
  } finally {
    // An unlock orchd never heard is stale once this process exits; the next taker replaces it.
    if (taken.length) await askDaemon(services, "command-unlock", { pid: process.pid, startToken }).catch(() => undefined);
  }
}
