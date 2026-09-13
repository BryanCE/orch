# 5-02-extension-roots

Model: luna:low
Owns: `extensions/pi/index.ts`, `extensions/omp/index.ts`

Requires 3a-agent and its 3b callers landed (`registerHarnessBridge` options now carry `orchDir`).

Goal: each in-process extension is a root that builds services once at registration.

Do, in each file: at the top of the registration function, `const services = createServices();` importing from `../../src/services.ts`. Replace `orchDir()` in the `registerOrchSeat(harness, { orchDir: orchDir(), ownKey })` call with `services.orchDir`, and pass `orchDir: services.orchDir` (and `settings: services.settings` if 3a-agent made `registerHarnessBridge` take a manager) into `registerHarnessBridge`. Remove the `orchDir` import.

Check: lint, tc, `bun --filter @bryance/orch check:bridge`. Tests: `grep -l "extensions/pi\|extensions/omp" test/*.ts`.
