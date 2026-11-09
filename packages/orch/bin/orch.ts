#!/usr/bin/env node
// orch — unified controller for pi agents running in herdr panes.
// The shebang is node like every other entrypoint: a bun shebang here makes `bun build`
// emit its `// @bun` pragma into dist/bin/orch.js, and bun decodes a pragma'd file as
// Latin-1, so every non-ASCII literal (the setup wizard's box glyphs) prints double-encoded.
// The runtime a user actually runs under is stamped onto the built bin by `orch setup`.
// The CLI is a client of orchd (Rule 21): it never opens the store, so the store's
// handle cleanup and sqlite warning filter live in orchd's entry, not here.

import { runCommand } from "../src/commands/index.ts";

runCommand(process.argv.slice(2));
