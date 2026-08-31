import { createFileRoute } from "@tanstack/react-router";

import { eventsResponse } from "@/server/daemon";

/** The browser's one live feed. `daemon-events.ts` opens an EventSource here. */
export const Route = createFileRoute("/api/events")({
  server: {
    handlers: {
      GET: ({ request }) => eventsResponse(request),
    },
  },
});
