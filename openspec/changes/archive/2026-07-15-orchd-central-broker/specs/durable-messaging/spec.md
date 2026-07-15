## ADDED Requirements

### Requirement: Steers and dispatches are delivered at least once

A steer or dispatch accepted by the daemon SHALL be persisted to the durable store before it is sent to the agent, marked delivered only after the agent acknowledges consumption, and retried on failure. An accepted message SHALL survive a daemon restart and be delivered when the agent is next reachable.

#### Scenario: Message survives a daemon restart

- **WHEN** a steer is accepted for an agent, then orchd is restarted before the agent consumes it
- **THEN** after restart the daemon still delivers the steer, and the agent processes it exactly the effect of one steer

#### Scenario: Undelivered message is retried, not dropped

- **WHEN** a dispatch is accepted but the first send fails
- **THEN** the daemon retries delivery and the message remains in the store marked undelivered until an acknowledgement is recorded

### Requirement: Clients replay missed events on reconnect

The daemon SHALL assign a monotonic sequence number to each emitted event and persist recent events. A client reconnecting to the socket SHALL be able to present the last sequence number it received and receive every event emitted after it, with no gap and no duplication of already-acknowledged events.

#### Scenario: Reconnect after a dropped connection

- **WHEN** a subscribed client's socket drops, three transitions occur, and the client reconnects presenting its last sequence number
- **THEN** the daemon streams exactly those three missed transitions before resuming live push

#### Scenario: Fresh subscriber gets live stream

- **WHEN** a client connects with no prior sequence number
- **THEN** it receives live events from the moment of subscription without a replay flood of historical events
