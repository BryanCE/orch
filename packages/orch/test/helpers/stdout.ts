import { isRecord } from "../../src/util.ts";
import { withExitCodeAsync } from "./exit-code.ts";

/** Everything `run` wrote to stdout, with the exit code it set kept out of the runner. */
export async function captureStdout(run: () => Promise<void>): Promise<string> {
  const originalWrite = process.stdout.write.bind(process.stdout);
  let output = "";
  process.stdout.write = (chunk: string | Uint8Array) => { output += chunk.toString(); return true; };
  try {
    await withExitCodeAsync(run);
  } finally {
    process.stdout.write = originalWrite;
  }
  return output;
}

/** The last stdout line as a JSON object; `{}` when the run printed prose instead. */
export function lastJsonRecord(text: string): Record<string, unknown> {
  const last = text.trim().split("\n").at(-1) ?? "{}";
  try {
    const parsed: unknown = JSON.parse(last);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** A `--json` command's stdout, parsed, alongside the raw text. */
export async function captureCommand(run: () => Promise<void>): Promise<{ text: string; payload: Record<string, unknown> }> {
  const text = await captureStdout(run);
  return { text, payload: lastJsonRecord(text) };
}
