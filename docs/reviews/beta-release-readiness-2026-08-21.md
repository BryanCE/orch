# Beta release readiness audit

Date: 2026-08-21

## Verdict

**Do not publish a public npm beta yet.**

The core design is much better than the release state suggests. The adapter and backend split is real, the control dispatcher exists, configuration is strict, and the product already has a wide command set. The weak point is proof and packaging. The current test record has 15 failures, core daemon workflows have known operator-facing bugs, the npm name is unavailable, and the built CLI currently contradicts the Node runtime claim.

A trusted-user alpha on the author's known machine is reasonable. A public beta is not.

### Rough distance

- **CLI-only closed beta:** about 3 to 7 focused engineering days after the daemon failures are understood.
- **CLI-only public npm beta:** roughly 1 to 3 focused weeks, including cross-platform smoke tests and release work.
- **CLI plus web beta:** farther away. The web app calls a daemon method that does not exist and its control actions are placeholders.

These are rough ranges, not promises. A single Windows RPC root cause may clear many failures at once. If the daemon transport needs redesign, the range grows.

## Readiness scorecard

| Area | State | Notes |
| --- | --- | --- |
| Product idea and feature breadth | Strong | The CLI covers the full fleet loop: spawn, dispatch, steer, observe, results, lifecycle, queue, review, doctor, and notifications. |
| Core architecture | Good, with gaps | Ports, capabilities, registries, and a dispatcher exist. Mixed-fleet and lifecycle paths still bypass parts of the intended design. |
| Static quality | Good | `current-errors.md` reports 0 warnings, 0 errors, and a passing bridge check. |
| Runtime reliability | Not ready | `test-results.md` contains 15 failures, mostly around daemon RPC and events on Windows. |
| Cross-platform behavior | Not ready | Native Windows paths still use Bash, `sleep`, and `pgrep`; Node 18 and 20 cannot provide the current SQLite driver. |
| Packaging | Blocked | The npm name is taken. The current built entrypoint uses Bun despite the README's Node promise. |
| Security and local privacy | Needs work | The daemon TCP endpoint has no authentication and state file permissions rely mostly on the user's umask. |
| Documentation and specs | Needs work | README, reference docs, OpenSpec, and source disagree on schemas and supported commands. |
| Web application | Prototype | Fleet RPC and control actions are not wired. |
| Overall public beta readiness | **No** | Close enough for a hardening milestone, not for strangers to install. |

## How this audit was done

I read the repository, release metadata, source, tests, current result files, OpenSpec state, architecture records, and the official npm registry record. I did not run tests, checks, or builds. Per repository policy, these files are ground truth:

- `current-errors.md`
- `test-results.md`
- `specview.md`

The working tree already had 11 modified files before this report was added. The audit did not change application code.

## What is already good

### The main architecture is no longer fake

The strongest part of the project is the harness by multiplexer design.

- Adapter and backend identifiers and ports are explicit in `src/adapters/adapter.ts:5` and `src/backends/backend.ts:6`.
- Normal control traffic has one dispatcher in `src/control/dispatch.ts:11-15` and `src/control/dispatch.ts:198-209`.
- The dispatcher gates behavior on capabilities and produces clear failures in `src/control/dispatch.ts:98-145`.
- Provider registries live in `src/adapters/registry.ts` and `src/backends/registry.ts`.
- The presence writer is centralized in `src/presence/writer.ts:1-12`.
- `current-errors.md` says the bridge check scanned 412 files successfully.

That is a real base for adding harnesses and backends without pair-specific code.

### Configuration and diagnosis are thoughtful

- `settings.json` is schema-validated with strict Zod objects in `src/config.ts:69-130`.
- Writes use a temporary file and rename in `src/config.ts:541-550`.
- Invalid configuration errors name the file and repair command in `src/config.ts:209-245`.
- Doctor derives checks from installed providers in `src/doctor/runner.ts:66-120`.
- The daemon checks code skew and process identity before signalling a process in `src/daemon/lifecycle.ts:113-133`.

### There is broad automated test investment

The repository has 98 top-level `*.test.ts` files for 108 source and extension TypeScript files. Test presence alone is not proof, but this is much better than a prototype with only happy-path smoke tests.

### The command set is useful

The README and CLI help show a coherent operator loop. Queueing, ownership, workspace walls, worktrees, review, remote hosts, model policy, and notifier adapters go beyond a thin pane wrapper. The product has enough capability for a beta once the core loop becomes reliable.

## Public beta blockers

### 1. The current test gate is failed

`current-errors.md` is clean, but `test-results.md` contains 15 failures:

- 5 daemon RPC failures
- 3 daemon presence event failures
- 3 answer-over-socket failures
- 2 broker CLI routing failures
- 1 headless identity failure
- 1 OMP Windows path failure

The daemon failures include basic round trips, unknown-method responses, pushed events, stale socket recovery, and slow-daemon classification. See `test-results.md:74-102`, `test-results.md:476-506`, and `test-results.md:610-694`.

These are not peripheral tests. They cover the control plane used by dispatch, answer, events, status, and recovery.

**Beta gate:** the user reruns the full Windows suite and records zero failures. Add Linux and supported Node-version runs before public release.

### 2. The npm package name cannot be published

`package.json:2-3` declares `orch@0.1.0`. The official npm registry already has an unrelated `orch@0.1.4`, maintained by other owners:

- <https://registry.npmjs.org/orch/latest>

Publishing the current package name will fail or target the wrong project identity.

**Fix:** use a scope such as `@bryance/orch` or choose another package name. The executable can still be named `orch`. Publish prereleases with a beta dist-tag.

### 3. The release artifact is not reproducible and currently needs Bun

The README promises an npm-installed Node entrypoint in `README.md:18-29`. The current artifact starts with:

```text
#!/usr/bin/env bun
```

at `dist/bin/orch.js:1`.

The build is machine-dependent. `scripts/build-bin.ts:7-17` reads the publisher's personal `$ORCH_DIR/settings.json` and writes that runtime into the package entrypoint. Two maintainers can build different tarballs from the same commit.

`dist/` is also ignored by `.gitignore:3`, so the exact release artifact is neither reviewed nor represented by the commit.

**Fix:** make release builds deterministic. For the npm package, always emit a Node entrypoint. If runtime switching remains a feature, apply it after installation, not while creating the public tarball. Generate and inspect the tarball in CI or commit a documented artifact strategy.

### 4. The Node support claim is false

`package.json:59-62` claims Node `>=18`. The database layer loads only `node:sqlite` or guarded `bun:sqlite` in `src/store/sqlite.ts:91-100`.

Node added `node:sqlite` in 22.5.0:

- <https://nodejs.org/api/sqlite.html>

On Node 18 or 20 without Bun, the first database operation throws that neither driver exists.

**Fix:** either raise the Node engine to a tested 22.5+ floor, preferably a supported LTS floor, or ship a portable SQLite dependency. Test the copied npm installation under every declared runtime.

### 5. Known core-loop bugs remain open

`bug-report.md` records current operator failures:

- A dead daemon was reported as merely slow, while `spawn` still reported success: `bug-report.md:5-29`.
- `orch result` returned a steer acknowledgement instead of the substantive report: `bug-report.md:32-44`.
- `orch tail` read an empty or wrong session despite status showing work and cost: `bug-report.md:46-56`.
- The `status --json` shape is undocumented and caused a watcher to run past completed agents: `bug-report.md:58-72`.

Those commands are the promised core loop. A beta can have rough edges, but it cannot regularly say work succeeded when the control plane is dead or hide the result users launched the agent to produce.

**Beta gate:** close each report with a regression test and a manual copied-install smoke scenario.

### 6. The daemon blocks its own event loop during queue dispatch

`src/daemon/work-loop.ts:44-58` implements polling with synchronous `execFileSync("sleep", ...)`. `dispatchTask` can perform that loop twice in `src/daemon/work-loop.ts:61-74`.

Because the work loop runs inside orchd, this can block RPC handling and signal processing for the dispatch acknowledgement window. It also depends on a POSIX `sleep` executable.

**Fix:** use asynchronous timers and one delivery ID. Never block the daemon process while waiting for an agent state change.

### 7. Public packaging lacks legal and release basics

`package.json` says MIT and the README repeats it, but there is no `LICENSE` file. The repository also lacks `SECURITY.md`, `CHANGELOG.md`, and `CONTRIBUTING.md`.

The README links `docs/reference/files-and-data-layout.md`, while `package.json:49-57` excludes `docs/` from the npm package. Installed users will get a broken relative link.

The package metadata has no `repository`, `homepage`, or `bugs` fields. Its description at `package.json:4` contains spelling and grammar errors.

**Fix:** add the actual license text, support/security reporting instructions, release notes, complete registry metadata, and package every document linked from the README.

## High-priority product and correctness issues

### Mixed fleets do not always keep their spawn-time composition

The binding architecture says changing defaults must not break live agents. Several paths still use the current default:

- `currentWorkspace()` and `selfActor()` resolve the configured backend in `src/entities.ts:85-92`.
- `callerWorkspace()` does the same in `src/commands/target.ts:106-111`.
- `cmdNew` selects one current-default adapter/model before iterating all targets in `src/commands/lifecycle.ts:94-125`.
- `cmdRestart` rebuilds launch commands from current configuration in `src/commands/lifecycle.ts:293-313`.

A mixed Pi, Claude, or OMP fleet can therefore receive the wrong model or become incorrectly scoped after the default changes.

**Fix:** resolve adapter, backend, model, and workspace per target from presence and the spawn registry. Add a test that changes defaults while old and new pairings remain live.

### Explicit provider overrides ignore the installed sets

`pickAdapter()` validates that an adapter exists but not that setup installed it in `src/commands/spawn.ts:153-158`. Backend resolution similarly accepts registered explicit backends in `src/commands/spawn.ts:185-203` and `src/backends/registry.ts:41-47`.

This contradicts the documented rule that `--agent` and `--backend` may select any installed provider, not any provider compiled into orch.

**Fix:** reject overrides outside `config.installed.adapters` and `config.installed.backends`, with setup guidance.

### Lifecycle control is not fully behind the dispatcher

The dispatcher supports lifecycle actions, but reload and restart still call adapter lifecycle methods and backend delivery directly in `src/commands/lifecycle.ts:167-214` and `src/commands/lifecycle.ts:245-313`.

The static dispatcher rule checks steer, answer, and model calls, but not `lifecycleCmd`, in `scripts/check-bridge.ts:287-300`.

**Fix:** route every lifecycle action through the daemon dispatcher and extend the static rule. This closes the last meaningful L5 gap.

### Preferred and allowed models are not independent in setup

The README says these are three independent settings in `README.md:165-175`. The implementation task says `models.preferred` must not be merged into `models.allowed` in `preferred-models-task-list.md:7-18`.

Current setup asks once, then assigns the same list to both:

- `src/commands/setup.ts:102-108`

That makes the documentation and completed task boxes false. It also turns a convenience picker list into a permission list.

**Fix:** restore separate choices and complete every unchecked verification item in `preferred-models-task-list.md:302-343`.

### Model policy fails open on malformed settings

`allowedModelPatterns()` catches every config error and returns an empty list in `src/config.ts:510-515`. Empty means allow every model in `src/policy/model.ts:39-44`.

A malformed settings edit therefore disables a configured model restriction. That is the wrong failure mode for a setting described as a security and launch gate.

**Fix:** keep the daemon's last known good policy or fail closed for writes until configuration becomes valid.

### Close can signal an unverified PID and then erase records

If backend close fails, `cmdClose` signals the PID from presence directly, then always removes the registry and presence directory in `src/commands/lifecycle.ts:399-410`.

This bypasses the safer identity checks in the headless backend at `src/backends/headless/index.ts:214-236`. PID reuse could target the wrong process, and a failed close can still erase the metadata needed for recovery.

**Fix:** make each backend the only process-control authority. Reap records only after verified termination or an explicit force-clean operation.

### Review approval does not enforce ownership

`review approve` merges and deletes a discovered worktree without an ownership check in `src/commands/review.ts:52-59`. Reject goes through governed daemon steering, but approve does not.

**Fix:** apply the same owner and workspace policy before merge or deletion.

### Spawn failure cleanup is incomplete

Pane/process launch happens before all registration and verification steps. Failure paths in `src/commands/spawn.ts:464-525` and `src/backends/headless/index.ts:190-211` do not consistently roll back the pane, process, registry entry, log, or worktree.

**Fix:** make spawn transactional from the caller's view. If verification fails, terminate what was created and remove only the state minted by that attempt.

## Security and privacy baseline

### Local RPC has no authentication

The daemon opens loopback TCP in `src/daemon/rpc.ts:426-449`. Requests are selected by method name without an authentication step in `src/daemon/rpc.ts:166-181`. Handlers include `spawn-detached`, `ack`, and `reload` in `src/daemon/orchd.ts:280-297`.

Loopback is not an authorization boundary on shared machines. Any local process that can connect can invoke control methods. The Unix socket path also relies on directory and umask behavior rather than an explicit permission check.

**Before public beta:** either disable TCP unless explicitly needed, or add a random local token and require it on every RPC. Create `$ORCH_DIR` as `0700`, sensitive files as `0600`, and verify socket permissions.

### State files may expose prompts and results

Settings and presence creation does not set restrictive modes in `src/config.ts:547-550` and `src/presence/writer.ts:47-90`. Presence records can contain tasks, model data, session paths, and result text.

**Fix:** enforce private directory and file modes on POSIX, document the Windows ACL expectation, and add doctor checks.

### Setup runs remote shell scripts

The prerequisite table includes `curl | bash` commands in `src/adapters/prerequisites.ts:15-21`, executed through Bash in `src/commands/setup.ts:216-224`.

**Fix:** prefer official package-manager instructions. If automatic install remains, show the exact URL and command, require explicit consent, and document the trust consequence. The Herdr prerequisite URL currently points back to this repository rather than Herdr installation docs.

## Cross-platform gaps

The test record shows Windows paths, but runtime code still assumes POSIX tools:

- Bash-only `pif`: `bin/pif:1-24`
- `bash -c` setup execution: `src/commands/setup.ts:216-224`
- synchronous `sleep`: `src/daemon/work-loop.ts:44-48`
- `pgrep`: `src/commands/lifecycle.ts:414-421`
- Bash launch paths in the Herdr backend: `src/backends/herdr/index.ts:152-157`

Choose and document one of these positions:

1. Native Windows is supported, so remove these assumptions and pass the Windows suite.
2. Windows requires WSL, so say that at the top of the install guide and stop implying a generic npm install works natively.

A beta needs an explicit support matrix for Linux, macOS, WSL, native Windows, Node version, and each external harness/backend.

## Documentation and specification drift

Several examples are guaranteed to mislead a new user:

- README sample uses `schemaVersion: 1`; code requires 2: `README.md:128`, `src/config.ts:20`.
- Presence docs say v1 and `schemaVersion`; code uses `schema: 2`: `docs/reference/files-and-data-layout.md:17,29`, `src/presence/schema.ts:10`.
- README's detached example omits the required prompt: `README.md:47-53`, `src/backends/headless/index.ts:173-176`.
- README advertises `events --notify`: `README.md:198`. The parser treats unknown flags as targets in `src/commands/events.ts:98-108`.
- README omits the registered OMP adapter: `README.md:3`, `src/adapters/adapter.ts:5`.
- The OpenSpec dashboard says zero active changes in `specview.md`, while the preferred-model task list still has uncompleted test, smoke, fallow, and final verification gates.
- Thirteen main OpenSpec files still contain `TBD` purpose text. Several main specs describe old config names and formats.

**Fix:** generate one user-facing support matrix and one canonical config example from the current source constants. Sync OpenSpec before calling the implementation complete.

## Static architecture guard gaps

The guard is valuable, but its closed provider list omits OMP in `scripts/check-bridge.ts:133-139`. OMP also imports many Pi implementation helpers directly in `src/adapters/omp.ts:5-22`, which conflicts with the rule that one provider family does not import another.

The presence filename guard omits `question.json` and `control.json`, and the dispatcher rule omits lifecycle methods.

**Fix:** derive guard IDs and filenames from shared constants where possible. Move genuinely shared Pi/OMP behavior into neutral modules rather than importing one provider from another.

## Web application decision

The web app should not be part of the first CLI beta unless it is finished.

- It calls daemon RPC method `presence` in `packages/web/src/server/orch.ts:171-179`.
- The daemon exposes `status`, not `presence`, in `src/daemon/orchd.ts:265-297`.
- Steer and message controls are TODOs and show success without sending anything in `packages/web/src/routes/ws/$slug.tsx:120-124`.
- Queue and event views are described as placeholders in `packages/web/RUNBOOK.md:35`.
- The root publish build includes `build:web` in `package.json:22-35`, even though the root package does not ship or document the web app.

**Recommendation:** exclude web from the first beta release build and call it experimental in the repository. Finish it as a separate milestone using a shared RPC client rather than a second protocol implementation.

## Release plan

### Milestone 1: make a beta candidate

1. Fix all 15 failures in the current Windows test record.
2. Close the four core issues in `bug-report.md`.
3. Replace synchronous daemon polling with timers.
4. Fix mixed-fleet reset, restart, workspace, and lifecycle routing.
5. Enforce installed provider sets.
6. Separate preferred and allowed model setup; make policy config fail safely.
7. Make close and spawn cleanup identity-safe.
8. Add local RPC authentication or disable default TCP; lock down state permissions.
9. Decide the native Windows versus WSL support promise.

### Milestone 2: make a publishable package

1. Choose a scoped or new npm name.
2. Make the npm entrypoint deterministically Node-based.
3. Set and test the real Node engine floor.
4. Add LICENSE, security/support, changelog, uninstall, and contributing docs.
5. Add npm repository, homepage, and bug metadata.
6. Make the Pi peer dependency optional or remove it from the root package.
7. Include linked docs in the tarball.
8. Exclude unfinished web work from the CLI release build.
9. Use `0.1.0-beta.1` and the `beta` dist-tag.

### Milestone 3: prove the copied artifact

The user should run the gates on Windows and record the outputs:

1. Full static check with zero findings.
2. Full test suite with exact pass, fail, and skip counts.
3. Build the release tarball from a clean tagged commit.
4. Inspect tarball contents, entrypoint shebang, metadata, and size.
5. Install the tarball globally into a clean Node environment.
6. Run `orch setup`, `orch doctor`, daemon start/status/reload/stop.
7. Smoke one supported adapter across each promised backend.
8. Exercise spawn, dispatch, steer, answer where supported, wait, result, tail, reset, restart, close, queue, and worktree review.
9. Uninstall and verify hooks, extensions, daemon files, and user data behavior match the docs.

Do not publish until these results come from the exact tarball being published.

## What beta should promise

Keep the first promise narrow:

- CLI only
- local machine only
- named operating environments only
- explicit adapter/backend support matrix
- beta data format may change, with a stated upgrade policy
- no web UI promise yet

Before the first update after beta, replace `src/store/sqlite.ts:164-181` database deletion on schema mismatch with a migration or a clearly documented beta reset flow. Once strangers have queued work, silently reaping the database is no longer a pre-publication convenience.

## Final answer

orch is **good enough for an internal alpha, but not a public beta today**.

The project is not far away because of missing product vision or a bad core design. It is held back by release blockers, cross-platform daemon failures, and several places where the CLI reports more confidence than the system has earned. Fix the beta-candidate milestone, publish a copied-artifact release candidate to trusted testers, then move to a public npm beta after that exact artifact passes the support matrix.
