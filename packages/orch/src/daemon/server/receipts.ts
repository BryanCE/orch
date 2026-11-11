// What this orchd answered to each request a linked host sent to be done once. A link can drop
// after this orchd did the work and before its answer arrived, and the asking orchd then sends
// the request again under the same id: it gets the first answer, and the work is not done twice.

interface Receipt {
  readonly outcome: Promise<unknown>;
  readonly at: number;
}

export class Receipts {
  /** By request id, oldest first. */
  private readonly taken = new Map<string, Receipt>();

  constructor(private readonly ttlMs: () => number, private readonly now: () => number = Date.now) {}

  /** Run `run` for a request id this orchd has not taken, else give what the first run gave:
   *  its answer, its refusal, or its outcome once it settles when it still runs. */
  once(id: string, run: () => Promise<unknown>): Promise<unknown> {
    const at = this.now();
    const ttlMs = this.ttlMs();
    for (const [taken, receipt] of this.taken) {
      if (at - receipt.at <= ttlMs) break;
      this.taken.delete(taken);
    }
    const held = this.taken.get(id);
    if (held !== undefined) return held.outcome;
    const outcome = run();
    this.taken.set(id, { outcome, at });
    return outcome;
  }
}
