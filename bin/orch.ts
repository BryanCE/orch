#!/usr/bin/env bun
// orch — unified controller for pi agents running in herdr panes.

import "../src/store/suppress-sqlite-warning.ts";
import { runCommand } from "../src/commands/index.ts";
import { closeAllStores } from "../src/store/sqlite.ts";

// Release this process's cached SQLite (WAL) handles when it ends. A spawned
// `orch work` child otherwise leaves its WAL -shm mapping held past exit, and on
// Windows that blocks the parent from removing the dir. Closing on exit frees it
// deterministically. Node-safe and idempotent; the daemon closes cleanly too.
process.on("exit", closeAllStores);

runCommand(process.argv.slice(2));
