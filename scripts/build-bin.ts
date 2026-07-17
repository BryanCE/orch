import { chmodSync, readFileSync, writeFileSync } from "node:fs";

const output = "dist/bin/orch.js";
const source = readFileSync(output, "utf8");
const fixed = source.replace(/^#![^\r\n]*/, "#!/usr/bin/env node");
writeFileSync(output, fixed);
chmodSync(output, 0o755);
