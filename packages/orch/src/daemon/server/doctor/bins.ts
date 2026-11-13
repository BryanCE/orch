import { binaryOnPath, binaryPath, errorMessage } from "../../../util.ts";
import { probeBinding } from "../acp-probe.ts";
import { bindingPrerequisites } from "../../../shared/prerequisites.ts";
import type { AgentAdapter, AcpRole } from "../../../types/adapter.ts";
import type { BinaryStatus, CheckResult } from "../../../types/doctor.ts";
import type { PipesProvider } from "../../../types/pipes.ts";
import type { SessionOpenContext } from "../../../types/held-session.ts";

/** How doctor starts an ACP binding to ask who it is. */
export interface BindingProbe {
  readonly pipes: PipesProvider;
  readonly timeoutMs: number;
}

/** What a found binding said about itself, or why it said nothing. */
interface BindingAnswer {
  readonly answering: boolean;
  readonly text: string;
}

function bindingLine(command: string, found: string | null, answer: BindingAnswer | null): CheckResult {
  const id = `binding-${command}`;
  const label = `${command} binding`;
  if (!found) return { id, label, status: "warn", detail: `${command} is not on PATH; other harness forms remain available` };
  if (answer === null) return { id, label, status: "ok", detail: `${command} found at ${found}` };
  return {
    id,
    label,
    status: answer.answering ? "ok" : "warn",
    detail: `${command} found at ${found}; ${answer.text}`,
  };
}

/** Asks the binding who it is. Never rejects. */
async function answerOf(acp: AcpRole, probe: BindingProbe): Promise<BindingAnswer> {
  try {
    const answer = await probeBinding(probe.pipes, acp, probe.timeoutMs);
    return {
      answering: true,
      text: `answers as ${answer.name ?? "an unnamed agent"} ${answer.version ?? "with no version"} on ACP protocol ${answer.protocolVersion}`,
    };
  } catch (error: unknown) {
    return { answering: false, text: `not answering: ${errorMessage(error)}` };
  }
}

/** Optional binding executables, each reported independently of its harness. */
export function checkBindingPrerequisites(adapters: readonly AgentAdapter[]): CheckResult[] {
  return bindingPrerequisites(adapters).map(({ command }) => bindingLine(command, binaryPath(command), null));
}

/** Each binding's line. A found binding whose adapter declares an ACP role is also asked who it is. */
export async function checkBindingAnswers(adapters: readonly AgentAdapter[], probe: BindingProbe): Promise<CheckResult[]> {
  return Promise.all(bindingPrerequisites(adapters).map(async ({ command, acp }) => {
    const found = binaryPath(command);
    if (!found) return bindingLine(command, found, null);
    return bindingLine(command, found, await answerOf(acp, probe));
  }));
}

/** Each enabled harness that runs a server orchd drives: start it, ask who it is, close it. */
export async function checkServerAnswers(adapters: readonly AgentAdapter[], context: SessionOpenContext): Promise<CheckResult[]> {
  return Promise.all(adapters.flatMap((adapter) => {
    const driver = adapter.server;
    if (driver === null) return [];
    const id = `server-${adapter.id}`;
    const label = `${adapter.id} server`;
    return [driver.probe(context).then(
      (identity): CheckResult => ({ id, label, status: "ok", detail: `${identity.name} ${identity.version} serves its API to orchd` }),
      (error: unknown): CheckResult => ({ id, label, status: "fail", detail: `orchd could not start ${adapter.id}'s server: ${errorMessage(error)}` }),
    )];
  }));
}

export function binaryStatus(ids: readonly string[]): BinaryStatus {
  return Object.fromEntries(ids.map((id) => [id, binaryOnPath(id)]));
}

export function checkBins(bins: BinaryStatus, ids: readonly string[]): CheckResult {
  const missing = ids.filter((id) => !bins[id]);
  if (!missing.length) return { id: "bins", label: "Required binaries", status: "ok", detail: ids.length ? `${ids.join(" and ")} ${ids.length === 1 ? "is" : "are"} on PATH` : "no adapters enabled" };
  return {
    id: "bins",
    label: "Required binaries",
    status: "fail",
    detail: `${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not on PATH`,
  };
}
