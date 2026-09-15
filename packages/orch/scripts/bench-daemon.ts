// Load-test one orchd in a temp orch dir and print latency and throughput per
// workload. Tooling, not runtime: it runs under bun and may pass bun flags to
// the daemon it spawns (`--profile`).
//
//   bun packages/orch/scripts/bench-daemon.ts [--agents 64] [--concurrency 32] [--requests 2000]
//                                             [--subscribers 10] [--phase <name>]... [--profile] [--json]
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { mintAgentId } from "../src/backends/identity.ts";
import { rpcCall } from "../src/daemon/client/rpc.ts";
import { daemonRuntimeFiles } from "../src/daemon/client/runtime-files.ts";
import { terminateDaemon } from "../src/daemon/client/process.ts";
import { encodeRequest } from "../src/daemon/client/wire.ts";
import { openJsonLineLink, readPortFile, type JsonLineLink } from "../src/presence/socket-client.ts";
import { ORCH_ENV_VARS } from "../src/policy/spawner.ts";
import { HARNESS_SESSION_ENV } from "../src/adapters/session-env.ts";
import { orchDirAt } from "../src/services.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { isRecord } from "../src/util.ts";
import { settingsFixtureText } from "../test/helpers/settings.ts";
import { settingsPath } from "../src/settings/schema.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { AgentState } from "../src/agent-state.ts";

interface BenchOptions {
  agents: number;
  concurrency: number;
  requests: number;
  subscribers: number;
  phases: readonly string[];
  profile: boolean;
  json: boolean;
}

interface PhaseResult {
  phase: string;
  requests: number;
  errors: number;
  /** How many failures each error name or code produced. */
  errorKinds: Record<string, number>;
  elapsedMs: number;
  perSecond: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  /** Event fan-out, when the phase publishes events to subscribers. */
  fanout?: { expected: number; received: number; p50Ms: number; p99Ms: number; maxMs: number };
}

interface Fleet {
  orchDir: OrchDir;
  discoveryDir: string;
  agentIds: readonly string[];
}

const DEFAULTS: BenchOptions = { agents: 64, concurrency: 32, requests: 2_000, subscribers: 10, phases: [], profile: false, json: false };
const DAEMON_ENTRYPOINT = join(import.meta.dir, "../src/daemon/server/orchd.ts");
const DAEMON_BOOT_TIMEOUT_MS = 20_000;
const DAEMON_STOP_GRACE_MS = 10_000;
const FANOUT_SETTLE_MS = 500;
const RPC_TIMEOUT_MS = 5_000;
const PROGRESS_EVERY = 100;
/** A random loopback port so the bench daemon never contends with a live orchd on 3716. */
const TCP_PORT = 30_000 + Math.floor(Math.random() * 20_000);

function parseArgs(argv: readonly string[]): BenchOptions {
  const options: BenchOptions = { ...DEFAULTS, phases: [] };
  const phases: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const next = (): number => Number(argv[++index]);
    if (flag === "--agents") options.agents = next();
    else if (flag === "--concurrency") options.concurrency = next();
    else if (flag === "--requests") options.requests = next();
    else if (flag === "--subscribers") options.subscribers = next();
    else if (flag === "--phase") phases.push(String(argv[++index]));
    else if (flag === "--profile") options.profile = true;
    else if (flag === "--json") options.json = true;
    else throw new Error(`unknown flag ${flag}`);
  }
  options.phases = phases;
  return options;
}

function seedFleet(agents: number): Fleet {
  const orchDir = orchDirAt(mkdtempSync(join(tmpdir(), "orch-bench-")));
  const discoveryDir = mkdtempSync(join(tmpdir(), "orch-bench-discovery-"));
  writeFileSync(settingsPath(orchDir), settingsFixtureText({ daemon: { tcp_port: TCP_PORT, idle_shutdown_minutes: 1 } }));
  const agentIds: string[] = [];
  for (let index = 0; index < agents; index += 1) {
    const id = mintAgentId();
    // The bench's own pid is the agent's process, so orchd reads every agent as alive.
    registerSpawnedAgent(orchDir, {
      key: id, harnessId: "pi", placed: false, cwd: orchDir, name: `bench-${index}`, model: "", spawner: null,
      process: { pid: process.pid, startToken: null },
    });
    agentIds.push(id);
  }
  closeAllStores();
  return { orchDir, discoveryDir, agentIds };
}

/** The daemon's env: this process's, minus every var that would make orchd read the bench as an agent. */
function daemonEnv(fleet: Fleet): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  const harnessVars = Object.values(HARNESS_SESSION_ENV).flatMap((vars) => Object.values(vars));
  for (const name of [...ORCH_ENV_VARS, ...harnessVars]) delete env[name];
  env.ORCH_DIR = fleet.orchDir;
  env.ORCH_DAEMON_DISCOVERY_DIR = fleet.discoveryDir;
  env.ORCHD_ENTRYPOINT = DAEMON_ENTRYPOINT;
  return env;
}

function spawnDaemon(fleet: Fleet, profileDir: string | undefined): ChildProcess {
  const flags = profileDir === undefined ? [] : ["--cpu-prof-md", "--cpu-prof-dir", profileDir];
  return spawn(process.execPath, [...flags, DAEMON_ENTRYPOINT], { env: daemonEnv(fleet), stdio: ["ignore", "inherit", "inherit"] });
}

async function awaitDaemon(orchDir: OrchDir): Promise<void> {
  const deadline = Date.now() + DAEMON_BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await rpcCall(orchDir, "daemon-status", undefined, 500);
      return;
    } catch {
      await sleep(50);
    }
  }
  throw new Error("orchd did not answer within the boot budget");
}

function daemonEndpoint(orchDir: OrchDir): string | number {
  const files = daemonRuntimeFiles(orchDir);
  if (existsSync(files.socket)) return files.socket;
  const port = readPortFile(orchDir);
  if (port === undefined) throw new Error("orchd advertised no endpoint");
  return port;
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[Math.max(0, index)] ?? 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function errorKind(error: unknown): string {
  if (!isRecord(error)) return String(error);
  const code = error.code;
  if (typeof code === "string") return code;
  return typeof error.name === "string" ? error.name : "Error";
}

/** Run `requests` calls through `concurrency` sequential workers; worker `w` gets every call where `i % concurrency === w`. */
async function runPhase(phase: string, options: BenchOptions, call: (index: number, worker: number) => Promise<void>): Promise<PhaseResult> {
  process.stderr.write(`phase: ${phase}\n`);
  const latencies: number[] = [];
  const errorKinds: Record<string, number> = {};
  let errors = 0;
  const startedAt = performance.now();
  const worker = async (id: number): Promise<void> => {
    for (let index = id; index < options.requests; index += options.concurrency) {
      const began = performance.now();
      try {
        await call(index, id);
      } catch (error: unknown) {
        errors += 1;
        const kind = errorKind(error);
        errorKinds[kind] = (errorKinds[kind] ?? 0) + 1;
      }
      latencies.push(performance.now() - began);
      if (latencies.length % PROGRESS_EVERY === 0) process.stderr.write(`  ${latencies.length}/${options.requests} after ${round(performance.now() - startedAt)}ms\n`);
    }
  };
  await Promise.all(Array.from({ length: options.concurrency }, (_, id) => worker(id)));
  const elapsedMs = performance.now() - startedAt;
  process.stderr.write(`  done in ${round(elapsedMs)}ms, ${errors} errors${errors === 0 ? "" : ` ${JSON.stringify(errorKinds)}`}\n`);
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    phase,
    requests: options.requests,
    errors,
    errorKinds,
    elapsedMs: round(elapsedMs),
    perSecond: round(options.requests / (elapsedMs / 1000)),
    p50Ms: round(percentile(sorted, 0.5)),
    p95Ms: round(percentile(sorted, 0.95)),
    p99Ms: round(percentile(sorted, 0.99)),
    maxMs: round(sorted.at(-1) ?? 0),
  };
}

/** One socket with many requests in flight: replies match requests by id. */
interface PipelinedClient {
  call(method: "daemon-status", params: undefined): Promise<void>;
  close(): void;
}

async function openPipelinedClient(orchDir: OrchDir): Promise<PipelinedClient> {
  const waiting = new Map<number, { resolve: () => void; reject: (error: Error) => void }>();
  let nextId = 1;
  const link = await openJsonLineLink(daemonEndpoint(orchDir), {
    onLine: (line) => {
      const parsed: unknown = JSON.parse(line);
      if (!isRecord(parsed) || typeof parsed.id !== "number") return;
      const pending = waiting.get(parsed.id);
      if (pending === undefined) return;
      waiting.delete(parsed.id);
      if ("error" in parsed) pending.reject(new Error(JSON.stringify(parsed.error)));
      else pending.resolve();
    },
    onClose: () => {
      for (const pending of waiting.values()) pending.reject(new Error("pipelined socket closed"));
      waiting.clear();
    },
  });
  if (link === undefined) throw new Error("could not open the pipelined socket");
  return {
    call: (method, params) => new Promise<void>((resolve, reject) => {
      const id = nextId++;
      waiting.set(id, { resolve, reject });
      if (!link.send(JSON.parse(encodeRequest(id, method, params)))) reject(new Error("send failed"));
    }),
    close: () => link.close(),
  };
}

/** Subscribers record when each published transition arrives; the transition's `task` carries its send time. */
interface FanoutMeter {
  arrivals: number[];
  close(): void;
}

function fanoutLatency(line: string): number | undefined {
  const parsed: unknown = JSON.parse(line);
  if (!isRecord(parsed) || !isRecord(parsed.event) || parsed.event.type !== "transition") return undefined;
  const sentAt = Number(parsed.event.task);
  return Number.isFinite(sentAt) ? Date.now() - sentAt : undefined;
}

async function openSubscribers(orchDir: OrchDir, count: number): Promise<FanoutMeter> {
  const arrivals: number[] = [];
  const links: JsonLineLink[] = [];
  for (let index = 0; index < count; index += 1) {
    const link = await openJsonLineLink(daemonEndpoint(orchDir), {
      onLine: (line) => {
        const latency = fanoutLatency(line);
        if (latency !== undefined) arrivals.push(latency);
      },
      onClose: () => undefined,
    });
    if (link === undefined) throw new Error("subscriber could not connect");
    link.send(JSON.parse(encodeRequest(index + 1, "subscribe-events", {})));
    links.push(link);
  }
  return { arrivals, close: () => { for (const link of links) link.close(); } };
}

function fanoutSummary(meter: FanoutMeter, expected: number): NonNullable<PhaseResult["fanout"]> {
  const sorted = [...meter.arrivals].sort((a, b) => a - b);
  return { expected, received: sorted.length, p50Ms: round(percentile(sorted, 0.5)), p99Ms: round(percentile(sorted, 0.99)), maxMs: round(sorted.at(-1) ?? 0) };
}

async function phaseDaemonStatus(fleet: Fleet, options: BenchOptions): Promise<PhaseResult> {
  return runPhase("rpc daemon-status (connect per call)", options, async () => {
    await rpcCall(fleet.orchDir, "daemon-status", undefined, RPC_TIMEOUT_MS);
  });
}

async function phaseFleetStatus(fleet: Fleet, options: BenchOptions): Promise<PhaseResult> {
  return runPhase("rpc status (fleet rows)", options, async () => {
    await rpcCall(fleet.orchDir, "status", undefined, RPC_TIMEOUT_MS);
  });
}

async function phasePeerView(fleet: Fleet, options: BenchOptions): Promise<PhaseResult> {
  return runPhase("rpc peer-view", options, async (index) => {
    const ownKey = fleet.agentIds[index % fleet.agentIds.length];
    if (ownKey === undefined) throw new Error("no agents seeded");
    await rpcCall(fleet.orchDir, "peer-view", { ownKey, allSpaces: true }, RPC_TIMEOUT_MS);
  });
}

async function phaseReportStatus(fleet: Fleet, options: BenchOptions): Promise<PhaseResult> {
  const subscribers = await openSubscribers(fleet.orchDir, options.subscribers);
  // Worker `w` owns agents `w, w + concurrency, ...`, so each agent's state flips in order.
  const states = new Map<string, AgentState>();
  const result = await runPhase("rpc report-status (transition + fan-out)", options, async (index, worker) => {
    const key = fleet.agentIds[worker % fleet.agentIds.length];
    if (key === undefined) throw new Error("no agents seeded");
    const state: AgentState = states.get(key) === "working" ? "idle" : "working";
    states.set(key, state);
    await rpcCall(fleet.orchDir, "report-status", { key, status: { state, task: String(Date.now()), dispatchId: `d-${index}` } }, RPC_TIMEOUT_MS);
  });
  await sleep(FANOUT_SETTLE_MS);
  result.fanout = fanoutSummary(subscribers, options.requests * options.subscribers);
  subscribers.close();
  return result;
}

async function phasePipelined(fleet: Fleet, options: BenchOptions): Promise<PhaseResult> {
  const client = await openPipelinedClient(fleet.orchDir);
  try {
    return await runPhase("pipelined daemon-status (one socket)", options, () => client.call("daemon-status", undefined));
  } finally {
    client.close();
  }
}

const PHASES: Record<string, (fleet: Fleet, options: BenchOptions) => Promise<PhaseResult>> = {
  "daemon-status": phaseDaemonStatus,
  status: phaseFleetStatus,
  "peer-view": phasePeerView,
  "report-status": phaseReportStatus,
  pipelined: phasePipelined,
};

function printTable(results: readonly PhaseResult[]): void {
  const header = ["phase", "req", "err", "ms", "req/s", "p50", "p95", "p99", "max"];
  const rows = results.map((r) => [r.phase, r.requests, r.errors, r.elapsedMs, r.perSecond, r.p50Ms, r.p95Ms, r.p99Ms, r.maxMs].map(String));
  const widths = header.map((title, column) => Math.max(title.length, ...rows.map((row) => row[column]?.length ?? 0)));
  const line = (cells: readonly string[]): string => cells.map((cell, column) => column === 0 ? cell.padEnd(widths[column] ?? 0) : cell.padStart(widths[column] ?? 0)).join("  ");
  process.stdout.write(`${line(header)}\n`);
  for (const row of rows) process.stdout.write(`${line(row)}\n`);
  for (const r of results) {
    if (r.fanout === undefined) continue;
    process.stdout.write(`fan-out: ${r.fanout.received}/${r.fanout.expected} events, p50 ${r.fanout.p50Ms}ms, p99 ${r.fanout.p99Ms}ms, max ${r.fanout.maxMs}ms\n`);
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const selected = options.phases.length === 0 ? Object.keys(PHASES) : options.phases;
  for (const name of selected) if (PHASES[name] === undefined) throw new Error(`unknown phase ${name}; known: ${Object.keys(PHASES).join(", ")}`);
  const fleet = seedFleet(options.agents);
  const profileDir = options.profile ? join(fleet.orchDir, "profile") : undefined;
  if (profileDir !== undefined) mkdirSync(profileDir);
  const daemon = spawnDaemon(fleet, profileDir);
  const results: PhaseResult[] = [];
  try {
    await awaitDaemon(fleet.orchDir);
    process.stderr.write(`orchd pid ${daemon.pid}, ${options.agents} agents, concurrency ${options.concurrency}, ${options.requests} requests/phase\n`);
    process.stderr.write(`orch dir ${fleet.orchDir}, log ${daemonRuntimeFiles(fleet.orchDir).log}\n`);
    for (const name of selected) {
      const phase = PHASES[name];
      if (phase === undefined) continue;
      results.push(await phase(fleet, options));
    }
  } finally {
    if (daemon.pid !== undefined) await terminateDaemon(daemon.pid, DAEMON_STOP_GRACE_MS);
  }
  if (options.json) process.stdout.write(`${JSON.stringify({ options, results }, null, 2)}\n`);
  else printTable(results);
  if (profileDir !== undefined) process.stderr.write(`cpu profile: ${profileDir}\n`);
  else {
    rmSync(fleet.orchDir, { recursive: true, force: true });
    rmSync(fleet.discoveryDir, { recursive: true, force: true });
  }
}

void main();
