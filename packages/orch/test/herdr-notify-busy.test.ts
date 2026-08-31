import { describe, expect, test } from "bun:test";
import { deliverHerdrNotification, isNotificationShown } from "../src/backends/herdr/notify.ts";

// herdr shows ONE toast at a time. A notification sent while another is on screen
// is dropped with {"shown":false,"reason":"busy"} -- and herdr still exits 0. orch
// read only the exit code, so every dropped toast was reported as delivered: an
// eight-agent wave produced one visible notification and seven silent losses,
// which reads to a human as "orch's notifications vanish too fast".
describe("a herdr notification is delivered only when herdr says it was shown", () => {
  test("shown is a delivery", () => {
    expect(isNotificationShown('{"id":"cli:notification:show","result":{"reason":"shown","shown":true,"type":"notification_show"}}')).toBe(true);
  });

  test("busy is NOT a delivery, however herdr exited", () => {
    expect(isNotificationShown('{"id":"cli:notification:show","result":{"reason":"busy","shown":false,"type":"notification_show"}}')).toBe(false);
  });

  test("every other refusal herdr can answer with is also not a delivery", () => {
    for (const reason of ["disabled", "rate_limited", "no_foreground_client"]) {
      expect(isNotificationShown(`{"result":{"reason":"${reason}","shown":false,"type":"notification_show"}}`)).toBe(false);
    }
  });

  test("output that is not a herdr answer is never read as a delivery", () => {
    for (const output of ["", "not json", "{}", '{"result":{}}', '{"result":{"shown":"true"}}']) {
      expect(isNotificationShown(output)).toBe(false);
    }
  });
});

// The fix for `busy` is to WAIT for the on-screen toast and send the next one
// after it, not to drop it. Each notification then gets its own full display
// window, which is exactly what herdr's own native notifications get.
describe("a busy herdr is waited out, not dropped", () => {
  function recorder(answers: readonly string[]) {
    const sent: string[] = [];
    const waited: number[] = [];
    let call = 0;
    return {
      sent, waited,
      send: (args: readonly string[]): string => { sent.push(args.join(" ")); return answers[Math.min(call++, answers.length - 1)]!; },
      wait: (ms: number): void => { waited.push(ms); },
    };
  }
  const SHOWN = '{"result":{"reason":"shown","shown":true}}';
  const BUSY = '{"result":{"reason":"busy","shown":false}}';

  test("a toast shown on the first try is sent once and waits for nothing", () => {
    const io = recorder([SHOWN]);
    expect(deliverHerdrNotification({ title: "t", body: "b" }, io)).toBe(true);
    expect(io.sent.length).toBe(1);
    expect(io.waited).toEqual([]);
  });

  test("a busy herdr is retried after a wait, and the retry is the delivery", () => {
    const io = recorder([BUSY, SHOWN]);
    expect(deliverHerdrNotification({ title: "t", body: "b" }, io)).toBe(true);
    expect(io.sent.length).toBe(2);
    expect(io.waited.length).toBe(1);
    expect(io.waited[0]).toBeGreaterThan(0);
  });

  test("a herdr that stays busy gives up rather than blocking the daemon forever", () => {
    const io = recorder([BUSY]);
    expect(deliverHerdrNotification({ title: "t", body: "b" }, io)).toBe(false);
    expect(io.sent.length).toBeLessThanOrEqual(6);
    expect(io.sent.length).toBeGreaterThan(1);
  });

  test("a refusal that waiting cannot fix is not retried", () => {
    const io = recorder(['{"result":{"reason":"disabled","shown":false}}']);
    expect(deliverHerdrNotification({ title: "t", body: "b" }, io)).toBe(false);
    expect(io.sent.length).toBe(1);
  });
});
