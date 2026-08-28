# Build + reinstall audit

Date: 2026-08-28  
Tree: `refactor` at `7c1a0c7` plus current working changes

## Findings and fixes

| Step | Verdict | Evidence | Smallest fix / note |
|---|---|---|---|
| Clean build artifacts first | PASS (fixed) | `package.json:39`; `scripts/reset.ts:21-24,242-254` | `build:dev` now runs `scripts/reset.ts --build`; build cleanup removes repo `dist/` without deleting the configured store. |
| Remove stale package tarballs | PASS (fixed) | `scripts/reset.ts:23-24,89-94,246` | Cleanup removes only `bryance-orch-*.tgz` in the repo before `npm pack`; unrelated tarballs are untouched. |
| Remove the previously installed global package | PASS (fixed) | `scripts/reset.ts:74-86` | Detection now checks the scoped npm path `@bryance/orch` (the old `root/orch` check missed this package), then runs scoped uninstall. |
| Remove stale bins and harness bundles | PASS | `scripts/reset.ts:96-132,247-248` | Removes `~/.local/bin/{orch,pif}`, known `pi-bridge.js`/`omp-bridge.js`, and any symlink into an orch package under both `~/.pi/agent/extensions` and `~/.omp/agent/extensions`. `doctor -y` relinks configured shims after install. |
| Build chain and stable output names | PASS | `package.json:28-36`; `src/bridge-bundle.ts:13-39` | CLI chain builds extensions, CLI, daemon, hooks, and notify outputs. Source dirs (`pi`, `omp`) are decoupled from stable output names (`pi-bridge`, `omp-bridge`). |
| Real copied global npm install | PASS | `package.json:38`; `package.json:46-55` | `install:global` builds, packs, installs with `npm install -g`, then removes the just-created tarball. The package bin points to `./dist/bin/orch.js`, not `bin/orch.ts`. |
| Entrypoint shebang and mode | FAIL in installed artifact; PASS in source (fixed) | Installed `/home/bryan/.local/lib/node_modules/@bryance/orch/dist/bin/orch.js:1` currently says `#!/usr/bin/env bun` (mode `755`). `scripts/build-bin.ts:3-17` now always stamps `node` and `chmod 755`; `test/build-bin.test.ts` covers both. A focused temp-file invocation returned `build-bin stamp ok`. | User rebuild is required to replace the currently installed stale artifact; no publishing/install command was run here. |
| Bridge deps (`effect` + `pi-tui`) | PASS | `extensions/pi/index.ts:12-20`; `extensions/omp/index.ts:20-27`; `src/seat/*`; temporary builds below | Both bridge entries import the seat, which bundles Effect and pi-tui into each output. Temporary pi and omp bundles each bundled 760 modules and node-imported successfully. |
| pi-tui pin and resolution | PASS with stale cache noted | `package.json:66`; `bun.lock:9,194`; root symlink resolves to `node_modules/.bun/@earendil-works+pi-tui@0.80.6`; build metafile resolved pi-tui from that 0.80.6 path. A stale, unused `.bun/@earendil-works+pi-tui@0.84.3` directory remains in node_modules. | Keep manifest/lock at 0.80.6; a clean dependency install may reap the old cache. |
| Seat runtime node safety | PASS | `src/seat/index.ts`, `domain.ts`, `manager.ts`, `runtime.ts`, `source.ts`; grep found no `Bun.*` or `bun:` in `src/seat`. Guarded `bun:sqlite` remains only in store/doctor fallback code, behind `node:sqlite`. |
| Store schema stamp | PASS | `src/store/schema.ts:5-7`; `src/store/connection.ts:140-164`; `src/doctor/store.ts:88-101`; `src/daemon/orchd.ts:18,55` | CLI and daemon both import the one connection/schema path; `STORE_SCHEMA` is 6 and doctor checks the same constant. |
| Lifecycle does not rebuild bundles | PASS | `src/adapters/pi.ts:363-375`; `src/bridge-bundle.ts:41-54`; `test/reload-no-bundle-write.test.ts` | Bundle writing is confined to build tooling and the checkout fallback in the adapter; lifecycle/reload paths do not invoke a bundle writer. |
| Doctor verifies laid-down artifacts | PASS | `src/doctor/extensions.ts:28-59`; adapter diagnostics in `src/adapters/pi.ts:365-375` and `src/adapters/omp.ts:190-198`; `src/doctor/runner.ts:84-119` | Doctor hashes shipped bundles, diagnoses missing/stale links for enabled adapters, and applies non-destructive shim fixes with `-y`. |
| No live-store deletion (H10) | PASS (fixed) | `scripts/reset.ts:65-71,219-239,267-269` | Daemon retirement now waits up to 5 seconds; normal reset refuses to remove `$ORCH_DIR` when a live daemon lock or live presence remains. `--build` deliberately preserves the store so doctor can relink shims. |

## Temporary bundle proof

Command run against the current tree (outputs under `/tmp`, not `dist/`):

```text
bun build extensions/pi/index.ts --target=node --format=esm --outdir /tmp/orch-build-audit-y1HOWE/pi
bun build extensions/omp/index.ts --target=node --format=esm --outdir /tmp/orch-build-audit-y1HOWE/omp
```

Output:

```text
Bundled 760 modules in 88ms
  index.js  2.0 MB  (entry point)
Bundled 760 modules in 91ms
  index.js  2.0 MB  (entry point)
```

Node imports:

```text
pi import ok
omp import ok
```

A second pi build with a Bun metafile resolved pi-tui to:

```text
node_modules/.bun/@earendil-works+pi-tui@0.80.6/node_modules/@earendil-works/pi-tui/dist/index.js
```

One initial auxiliary metafile invocation used an invalid Bun argument combination; its verbatim error was:

```text
error: Must use --outdir when specifying more than one entry point.
```
The corrected metafile build succeeded and produced the resolution above.

## Commands intentionally not run

No `bun run build:dev`, `npm pack`, `npm install -g`, `orch setup`, `orch doctor`, full suite, or `bun run check` was run. The installed package was inspected read-only, as required.
