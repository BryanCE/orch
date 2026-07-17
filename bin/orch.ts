#!/usr/bin/env bun
// orch — unified controller for pi agents running in herdr panes.

import { runCommand } from "../src/commands/index.ts";

runCommand(process.argv.slice(2));
