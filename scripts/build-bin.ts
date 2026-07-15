const output = "dist/bin/orch.js";
const source = await Bun.file(output).text();
const fixed = source.replace(/^#![^\r\n]*/, "#!/usr/bin/env node");
await Bun.write(output, fixed);

const chmod = Bun.spawnSync(["chmod", "+x", output], { stdout: "inherit", stderr: "inherit" });
if (chmod.exitCode !== 0) {
  process.exit(chmod.exitCode ?? 1);
}
