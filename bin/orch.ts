#!/usr/bin/env bun
// orch — unified controller for pi agents running in herdr panes.

import { runCommand } from "../src/commands.ts";

runCommand(process.argv.slice(2));
