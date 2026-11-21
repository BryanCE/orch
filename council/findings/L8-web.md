## 1. Routes
- `/` — `packages/web/src/routes/index.tsx`: God-view of live spaces/orphans, question panel, and completed history grouped by spawner. `packages/web/src/routes/index.tsx:14,38-79,111-131`
- `/events` — `packages/web/src/routes/events.tsx`: daemon Activity feed, connection status and replay-gap notice. `packages/web/src/routes/events.tsx:8,13-31`
- `/queue` — `packages/web/src/routes/queue.tsx`: durable queue grouped into queued, claimed, done, failed, cancelled and unrunnable lanes. `packages/web/src/routes/queue.tsx:11,16-24,26-42`
- `/spaces/$slug` — `packages/web/src/routes/spaces/$slug.tsx`: selected space's held agents/orphans, activity and state overview; selecting an agent opens controls/details. `packages/web/src/routes/spaces/$slug.tsx:28,38-160`
- `/api/events` — `packages/web/src/routes/api/events.ts`: SSE endpoint consumed by the browser. `packages/web/src/routes/api/events.ts:5-10`
- The root route is the app shell (theme, sidebar, daemon gate, breadcrumbs and content), not an additional page URL. `packages/web/src/routes/__root.tsx:27-32,47-91`

## 2. Web-server calls to orchd or CLI
- `getDaemonStatus` calls RPC `daemon-status`. `packages/web/src/server/orch.ts:49-56`
- `sendToAgent` calls `steer` or `dispatch` according to kind; `message` is rejected locally because no caller identity is supplied. `packages/web/src/server/orch.ts:78-93`
- `getFleet` calls RPC `status`. `packages/web/src/server/orch.ts:100-108`
- `answerAgent` calls RPC `answer`. `packages/web/src/server/orch.ts:114-120`
- `controlAgent` calls RPC `lifecycle`. `packages/web/src/server/orch.ts:127-133`
- `setAgentModel` calls RPC `set-model`. `packages/web/src/server/orch.ts:138-144`
- `getQuestions` calls RPC `questions`. `packages/web/src/server/orch.ts:153-163`
- `getQueue` calls RPC `queue-list` with `{ history: false }`. `packages/web/src/server/queue.ts:31-35`
- The live stream subscribes via RPC `subscribe-events`; the HTTP handler bridges it to SSE. `packages/web/src/server/daemon.ts:205-219`
- No web-server code invokes the `orch` CLI: `rg -n 'exec|spawn\(|orch ' packages/web/src/{routes,server,hooks,lib,components} --glob '!components/ui/**'` found no CLI invocation; RPC call sites are listed above. `packages/web/src/server/daemon.ts:143-160`

## 3. Live updates
- Browser-side `daemon-events.ts` opens one `EventSource` to `/api/events`, keeps its event/status snapshot, and reconnect behavior comes from EventSource. `packages/web/src/lib/daemon-events.ts:100-133`
- Route `/api/events` calls `eventsResponse`; `server/daemon.ts` bridges daemon's newline-framed `subscribe-events` RPC to `text/event-stream`. `packages/web/src/routes/api/events.ts:5-10`; `packages/web/src/server/daemon.ts:166-219,241-254`
- Fleet, daemon-status, queue and question queries are invalidated on stream updates/link changes, rather than polled. `packages/web/src/hooks/use-live-query-invalidation.ts:6-15`; `packages/web/src/hooks/use-fleet.ts:14-25`; `packages/web/src/routes/queue.tsx:26-34`; `packages/web/src/components/QuestionsPanel.tsx:14-20`

## 4. AgentCard fields and result/cost/tokens
- `AgentCard` shows agent name, pane/detached indicator (with pane coordinate in its title), state, optional last text, optional model id, cost, and optional context percentage. `packages/web/src/components/AgentCard.tsx:63-95`
- Result text does not appear as a result field in the UI; cards/detail show `lastText`. Cost does appear on cards and in space cost rollups; token totals are carried in the fleet projection but not rendered. `packages/web/src/components/AgentCard.tsx:82-95`; `packages/web/src/routes/index.tsx:19-22,96-103`; `packages/web/src/lib/fleet.ts:25-43,91-112`
- Agent detail additionally displays model, cost, context, task, dispatch id, backend status, state source, bridge state and last text. `packages/web/src/routes/spaces/$slug.tsx:279-319`

## 5. QuestionsPanel
- Lists waiting questions with count, agent name/key, question text or fallback, and an answer textarea/button; it submits through `answerAgent` and displays errors. It does let the user answer. `packages/web/src/components/QuestionsPanel.tsx:30-40,45-73`
- The server fetches questions through `questions`, mapping daemon records to key/name/text/time. `packages/web/src/server/orch.ts:153-163`

## 6. Event kinds
- There is no closed event-kind union or kind switch in the UI: its event type is open `Record<string, unknown>`. `packages/web/src/lib/daemon-events.ts:4-7`
- The generic renderer presents `event.type` (or `?`), old/new state, timestamp, and the full event JSON; thus it renders arbitrary event kinds rather than enumerating kinds. `packages/web/src/components/DaemonEventList.tsx:3-13,15-25`

## 7. Queue page path
- `packages/web/src/routes/queue.tsx` declares `/queue`, queries `getQueue`, and renders each lane and task. `packages/web/src/routes/queue.tsx:11-13,26-42,52-83`
- `packages/web/src/hooks/use-live-query-invalidation.ts` subscribes to the shared event hook and invalidates the queue query key on events/link changes. `packages/web/src/hooks/use-live-query-invalidation.ts:4-15`
- `packages/web/src/lib/daemon-events.ts` opens the browser's shared EventSource (`/api/events`) and updates its snapshot on received messages. `packages/web/src/lib/daemon-events.ts:100-133`
- `packages/web/src/routes/api/events.ts` maps `GET /api/events` to `eventsResponse`. `packages/web/src/routes/api/events.ts:5-10`
- `packages/web/src/server/daemon.ts` handles SSE, connects/subscribes to daemon events, and emits the stream. `packages/web/src/server/daemon.ts:166-219,241-254`
- `packages/web/src/server/queue.ts` implements `getQueue`, calls `daemonRpc("queue-list", { history: false })`, validates the result and groups tasks. `packages/web/src/server/queue.ts:25-35`
- `packages/web/src/server/daemon.ts` implements the newline-framed local RPC boundary used by the queue server function. `packages/web/src/server/daemon.ts:143-164`
