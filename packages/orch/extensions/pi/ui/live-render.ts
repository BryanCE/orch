// What keeps an open view current: a once-a-second redraw for the clocks it shows, and the
// subscription that redraws it when its data changes. Stopping ends both, once.
const TICK_MS = 1000;

export class LiveRender {
  private stopped = false;
  private readonly ticker: ReturnType<typeof setInterval>;

  /** `unsubscribe` ends the subscription the view opened to redraw on a change. */
  constructor(redraw: () => void, private readonly unsubscribe: () => void) {
    this.ticker = setInterval(redraw, TICK_MS);
  }

  get running(): boolean {
    return !this.stopped;
  }

  /** True only for the call that stopped it, so the view closes once. */
  stop(): boolean {
    if (this.stopped) return false;
    this.stopped = true;
    clearInterval(this.ticker);
    this.unsubscribe();
    return true;
  }
}
