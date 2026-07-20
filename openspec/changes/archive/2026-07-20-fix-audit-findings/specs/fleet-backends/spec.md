# fleet-backends — delta

## ADDED Requirements

### Requirement: The backend port reports workspace display names

The backend port SHALL expose a workspace-name surface returning a mapping from workspace id to human display name for the workspaces the backend can enumerate. A backend with no name concept (headless) SHALL return an empty mapping. Consumers (CLI status, web server) SHALL resolve display names only through this port surface — never by importing a concrete backend module — and SHALL fall back to the workspace id when no name is returned.

#### Scenario: Herdr names resolve through the port

- **WHEN** the herdr backend is active with named workspaces and a consumer (web fleet view or `orch status`) renders workspace labels
- **THEN** the labels come from the backend port's workspace-name surface, and the consumer contains no herdr-specific import

#### Scenario: A nameless backend falls back to ids

- **WHEN** the headless backend is active and a consumer renders workspace labels
- **THEN** the port returns an empty mapping and the consumer displays workspace ids without error
