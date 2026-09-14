import type { OrchDir } from "../../types/core.ts";
import { appendEvent, oldestEventSeq, selectEventsSince } from "../../store/event-rows.ts";
import type { NotifyEvent } from "../../types/notify.ts";
import { notifyEventSchema } from "../../notify/event.ts";
import type { BufferedEvent, ReplayResult } from "../../types/daemon.ts";

/** Maximum number of durable events returned by one replay request. Retention is configured
 * separately; this bound prevents a subscriber from being flooded by an unbounded replay. */
export const REPLAY_WINDOW = 1_000;

export class ReplayBuffer {
  constructor(private readonly orchDir: OrchDir) {}

  push(event: NotifyEvent): BufferedEvent {
    const stored = appendEvent(this.orchDir, Date.now(), event);
    return { event, seq: stored.seq };
  }

  since(seq: number): ReplayResult {
    const oldestSeq = oldestEventSeq(this.orchDir);
    // `seq` is the last sequence the subscriber has. The row immediately before
    // the oldest retained row is still contiguous; only an earlier request has a gap.
    const gap = oldestSeq !== undefined && seq < oldestSeq - 1;
    return {
      events: selectEventsSince(this.orchDir, seq, REPLAY_WINDOW).flatMap(({ event, seq: eventSeq }) => {
        const parsed = notifyEventSchema.safeParse(event);
        return parsed.success ? [{ event: parsed.data, seq: eventSeq }] : [];
      }),
      gap,
      ...(oldestSeq === undefined ? {} : { oldestSeq }),
    };
  }
}
