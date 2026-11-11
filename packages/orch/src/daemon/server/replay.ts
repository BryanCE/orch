import type { OrchDir } from "../../types/core.ts";
import { appendEvent, newestEventSeq, oldestEventSeq, selectEventsSince } from "../../store/event-rows.ts";
import type { NotifyEvent } from "../../types/notify.ts";
import { notifyEventSchema } from "../../notify/event.ts";
import { storeId } from "../../store/store-identity.ts";
import { bootCodeHash } from "./state.ts";
import type { StoredEvent } from "../../types/store.ts";
import type { BufferedEvent, EventLogPlace, ReplayResult } from "../../types/daemon.ts";
import type { HostId } from "../../types/host.ts";

/** The identity of the event log this orchd writes: the store it is in, and the build writing
 *  it. A place held in a log continues only in that same log: a rebuilt store numbers its
 *  events from the start again, and another build may not write what the old one did. */
export function eventLogId(orchDir: OrchDir): string {
  return `${storeId(orchDir)}@${bootCodeHash}`;
}

/** Stored rows as the events a subscriber is sent; a row this build cannot read is left out. */
function buffered(rows: readonly StoredEvent[]): BufferedEvent[] {
  return rows.flatMap(({ event, seq }) => {
    const parsed = notifyEventSchema.safeParse(event);
    return parsed.success ? [{ event: parsed.data, seq }] : [];
  });
}

/** Maximum number of durable events returned by one replay request. Retention is configured
 * separately; this bound prevents a subscriber from being flooded by an unbounded replay. */
export const REPLAY_WINDOW = 1_000;

export class ReplayBuffer {
  constructor(private readonly orchDir: OrchDir) {}

  push(event: NotifyEvent): BufferedEvent {
    const stored = appendEvent(this.orchDir, Date.now(), event);
    return { event, seq: stored.seq };
  }

  /** Events after `seq`, for a stream on this machine. */
  since(seq: number): ReplayResult {
    const oldestSeq = oldestEventSeq(this.orchDir);
    // `seq` is the last sequence the subscriber has. The row immediately before
    // the oldest retained row is still contiguous; only an earlier request has a gap.
    const gap = oldestSeq !== undefined && seq < oldestSeq - 1;
    return {
      events: buffered(selectEventsSince(this.orchDir, seq, REPLAY_WINDOW)),
      gap,
      ...(oldestSeq === undefined ? {} : { oldestSeq }),
    };
  }

  /** What a linked host's orchd missed since the place it holds: the events about the agents it
   *  asked this host to run. Null when that place does not continue here: it was read from
   *  another log, this log never issued it, events after it were pruned, or more wait than one
   *  replay carries. That host then reloads the state of its agents here instead. */
  resume(place: EventLogPlace, origin: HostId): BufferedEvent[] | null {
    if (place.log !== eventLogId(this.orchDir) || place.seq > newestEventSeq(this.orchDir)) return null;
    const oldestSeq = oldestEventSeq(this.orchDir);
    if (oldestSeq !== undefined && place.seq < oldestSeq - 1) return null;
    const missed = selectEventsSince(this.orchDir, place.seq, REPLAY_WINDOW + 1, origin);
    return missed.length > REPLAY_WINDOW ? null : buffered(missed);
  }
}
