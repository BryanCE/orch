#!/usr/bin/env node
// orch — unified controller for pi agents running in herdr panes.
// The shebang is node like every other entrypoint: a bun shebang here makes `bun build`
// emit its `// @bun` pragma into dist/bin/orch.js, and bun decodes a pragma'd file as
// Latin-1, so every non-ASCII literal (the setup wizard's box glyphs) prints double-encoded.
// The runtime a user actually runs under is stamped onto the built bin by `orch setup`.

import "../src/store/suppress-sqlite-warning.ts";
import { runCommand } from "../src/commands/index.ts";
import { closeAllStores } from "../src/store/connection.ts";

// Release this process's cached SQLite (WAL) handles when it ends. A spawned
// `orch work` child otherwise leaves its WAL -shm mapping held past exit, and on
// Windows that blocks the parent from removing the dir. Closing on exit frees it
// deterministically. Node-safe and idempotent; the daemon closes cleanly too.
process.on("exit", closeAllStores);

runCommand(process.argv.slice(2));
