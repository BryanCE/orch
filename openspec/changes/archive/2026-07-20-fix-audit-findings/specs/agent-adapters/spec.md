# agent-adapters — delta

## ADDED Requirements

### Requirement: Each harness's transcript decoding exists in exactly one module

The logic that decodes a harness's transcript/session text (content extraction, assistant-text extraction, JSONL tail scanning) SHALL exist in exactly one shared, node-safe module imported by both the adapter and any shim that reads the same format. A shim SHALL NOT carry its own copy of a parser the adapter also implements; two readers of the same wire format SHALL be the same code.

#### Scenario: Shim and adapter read a transcript identically

- **WHEN** a claude agent's transcript contains an entry with empty-string content parts, and both the claude shim (writing presence) and the claude adapter (reading the session as fallback) decode it
- **THEN** both produce the identical extracted text, because both call the one shared transcript module

#### Scenario: Core session tail goes through the adapter port

- **WHEN** the user runs `orch tail <claude-target>` (or against a codex target)
- **THEN** the session entries are produced by that target's resolved adapter through the port's session-view surface, not by another harness's parser, and a pi-format parser is never applied to a non-pi session
