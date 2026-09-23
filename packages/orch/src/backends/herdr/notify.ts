import type { NotificationPosition, OrchSettings } from "../../types/settings.ts";
import { SETTINGS_DEFAULTS } from "../../settings/schema.ts";
import type { HerdrCli } from "./cli.ts";
import { HERDR_SINK_ID } from "../backend.ts";
import { notificationText } from "../../notify/format.ts";
import { isRecord } from "../../util.ts";
import type { NotificationIo, Notifier } from "../../types/notify.ts";

/** True when herdr is one of the plexers orch launches agents into. */
function herdrRunsAgents(settings: OrchSettings | null): boolean {
  return settings?.enabled.backends.includes("herdr") ?? false;
}

/** Herdr-owned native notification sink. */
export function createHerdrNotifier(cli: HerdrCli): Notifier {
  const io: NotificationIo = {
    send: (args) => cli.answer([...args]),
    wait: (ms) => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); },
  };
  return {
    id: HERDR_SINK_ID,
    label: "Herdr",
    metadata: { description: "Herdr native notifications", requiredConfig: [] },
    remediation: "fix: enable the herdr plexer in orch setup, and start herdr so its control socket answers",
    available: (settings) => herdrRunsAgents(settings) && cli.reachable(),
    deliver: (event, _config, settings) => {
      const position = settings?.notification.position ?? SETTINGS_DEFAULTS.notification.position;
      return Promise.resolve(deliverHerdrNotification(notificationText(event), position, io));
    },
  };
}

/**
 * How many times a `busy` herdr is waited out before the notification is given up.
 * Bounded on purpose: the daemon delivers notifications, and a caller that waits
 * forever for a screen stops doing the work it was actually running.
 */
const BUSY_RETRIES = 4;

/** One toast's display window. herdr shows one at a time, so the next send has to
 *  land after the current one clears — that is what gives each notification the
 *  same full window herdr's own native ones get. */
const BUSY_WAIT_MS = 2500;

/** herdr answers a refused notification with a reason. Only `busy` is transient:
 *  it means another toast holds the screen right now, which waiting fixes.
 *  `disabled`, `rate_limited` and `no_foreground_client` are facts about the
 *  session, and retrying them just burns the daemon's time. */
const TRANSIENT_REASON = "busy";

/** Herdr's answer to `notification show`. Verified, never asserted: this is a line
 *  of text off another process's stdout, so it is `unknown` until it is checked. */
export function isNotificationShown(output: string): boolean {
  return readNotificationAnswer(output)?.shown === true;
}

interface NotificationAnswer {
  readonly shown: boolean;
  readonly reason: string | null;
}

function readNotificationAnswer(output: string): NotificationAnswer | null {
  let parsed: unknown;
  try { parsed = JSON.parse(output); } catch { return null; }
  if (!isRecord(parsed) || !isRecord(parsed.result)) return null;
  const { shown, reason } = parsed.result;
  if (typeof shown !== "boolean") return null;
  return { shown, reason: typeof reason === "string" ? reason : null };
}

/**
 * Deliver one toast, waiting out a busy screen instead of dropping it.
 *
 * The bug this exists to fix: herdr shows ONE toast at a time and answers every
 * other send with `{"shown":false,"reason":"busy"}` while exiting 0. orch read the
 * exit code only, so a wave of eight agents produced one visible notification and
 * seven silent losses that were all reported as delivered.
 */
export function deliverHerdrNotification(text: { title: string; body: string }, position: NotificationPosition, io: NotificationIo): boolean {
  const args = ["notification", "show", text.title, "--body", text.body, "--position", position];
  for (let attempt = 0; attempt <= BUSY_RETRIES; attempt++) {
    const answer = readNotificationAnswer(io.send(args));
    if (answer?.shown === true) return true;
    // A refusal waiting cannot fix is a final answer, not a slot to retry into.
    if (answer !== null && answer.reason !== TRANSIENT_REASON) return false;
    if (attempt < BUSY_RETRIES) io.wait(BUSY_WAIT_MS);
  }
  return false;
}
