#!/usr/bin/env node
// orch-ding - the worked example for the `command` notify sink. The `sound` sink is the same
// noise with nothing to type; both play through src/notify/ding.ts.
//
//   orch settings notify add command --command="orch-ding" --on=blocked,error,done
//
// orchd runs it with the notification JSON on stdin and discards its output.
//
// Overrides:
//   ORCH_DING_LOG    file to append one "<timestamp> <title>" line to per event
//   ORCH_DING_SOUND  sound file to play instead of the host's default
import { appendFileSync } from "node:fs";
import { playDing } from "../src/notify/ding.ts";
import { isRecord } from "../src/util.ts";

const UNTITLED = "orch notification";

/** The event's title, or a stand-in when a human ran this with no event to read. */
function titleOf(payload: string): string {
  if (!payload.trim()) return UNTITLED;
  try {
    const parsed: unknown = JSON.parse(payload);
    const title = isRecord(parsed) ? parsed.title : undefined;
    return typeof title === "string" && title.trim() ? title : UNTITLED;
  } catch {
    return UNTITLED;
  }
}

/** A terminal stdin means nobody piped an event in; reading it would hang. */
async function readPayload(): Promise<string> {
  if (process.stdin.isTTY) return "";
  process.stdin.setEncoding("utf8");
  let payload = "";
  for await (const chunk of process.stdin) payload += String(chunk);
  return payload;
}

const title = titleOf(await readPayload());
const log = process.env.ORCH_DING_LOG;
if (log) appendFileSync(log, `${new Date().toISOString()} ${title}\n`);
if (process.stdout.isTTY) process.stdout.write(`ding: ${title}\n`);

await playDing();
