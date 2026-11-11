import { describe, expect, test } from "bun:test";
import { Receipts } from "../src/daemon/server/receipts.ts";
import { subscriberBehind } from "../src/daemon/server/rpc.ts";

describe("what orchd answered to a request sent to be done once", () => {
  test("the same id runs once and gets the first answer again", async () => {
    const receipts = new Receipts(() => 100);
    let runs = 0;
    const run = () => Promise.resolve({ n: ++runs });

    expect(await receipts.once("host-a:1", run)).toEqual({ n: 1 });
    expect(await receipts.once("host-a:1", run)).toEqual({ n: 1 });
    expect(runs).toBe(1);
  });

  test("a request sent again while the first still runs waits for it", async () => {
    const receipts = new Receipts(() => 100);
    let runs = 0;
    let resolve = (_value: string): void => {
      throw new Error("request has not started");
    };
    const run = () => {
      runs++;
      return new Promise<string>((done) => {
        resolve = done;
      });
    };

    const first = receipts.once("host-a:1", run);
    const second = receipts.once("host-a:1", run);
    expect(runs).toBe(1);
    resolve("done");
    expect(await first).toBe("done");
    expect(await second).toBe("done");
  });

  test("a refusal is the answer too: it is given again and nothing runs twice", async () => {
    const receipts = new Receipts(() => 100);
    let runs = 0;
    const run = () => {
      runs++;
      return Promise.reject(new Error("refused"));
    };

    expect(await receipts.once("host-a:1", run).then(
      () => null,
      (error: unknown) => error instanceof Error ? error.message : String(error),
    )).toBe("refused");
    expect(await receipts.once("host-a:1", run).then(
      () => null,
      (error: unknown) => error instanceof Error ? error.message : String(error),
    )).toBe("refused");
    expect(runs).toBe(1);
  });

  test("two ids both run", async () => {
    const receipts = new Receipts(() => 100);
    let runs = 0;
    const run = () => Promise.resolve(++runs);

    await receipts.once("host-a:1", run);
    await receipts.once("host-b:1", run);
    expect(runs).toBe(2);
  });

  test("a receipt older than its time to live is forgotten", async () => {
    let now = 1_000;
    const receipts = new Receipts(() => 100, () => now);
    let runs = 0;
    const run = () => Promise.resolve(++runs);

    await receipts.once("host-a:1", run);
    now = 1_100;
    await receipts.once("host-a:1", run);
    expect(runs).toBe(1);
    now = 1_101;
    await receipts.once("host-a:1", run);
    expect(runs).toBe(2);
  });
});

describe("a subscriber that reads too slowly", () => {
  test("nothing bounds it when no limit is set", () => {
    expect(subscriberBehind(1_000_000, undefined)).toBe(false);
  });

  test("it is behind only past the limit", () => {
    expect(subscriberBehind(10, 10)).toBe(false);
    expect(subscriberBehind(11, 10)).toBe(true);
  });
});
