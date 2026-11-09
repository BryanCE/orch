// `orch host`: the other machines orch runs agents on, and the SSH link orchd holds
// to each. `serve` is the far end of that link; orchd starts it over ssh and nobody
// types it.
import { confirm, isCancel } from "@clack/prompts";
import { readRpc } from "./daemon.ts";
import { parseCommand } from "./registry.ts";
import { whoAmI } from "./self.ts";
import { die } from "./target.ts";
import { usageError } from "../cli/usage.ts";
import { requiredWord, writeEmptyOrJson } from "./panes.ts";
import { renderTable } from "../table.ts";
import { formatAge } from "../format.ts";
import { installedCodeHash, serveHostLink } from "../hosts/serve.ts";
import { spawnSync } from "node:child_process";
import { orchPublicKey, scanHostKeys, trustHostKeys, type HostScan } from "../hosts/keys.ts";
import { announcesWindows, authorizeArgv, authorizeStep, reportedOrch } from "../hosts/authorize.ts";
import { promptSelect } from "../setup/io.ts";
import { writeSettingsValue } from "../settings/write.ts";
import { errorMessage } from "../util.ts";
import { HOST_SHELLS, type HostLinkView, type HostShell } from "../types/host.ts";
import type { Invocation } from "../cli/spec.ts";
import type { HostSettings, OrchSettings } from "../types/settings.ts";
import type { Services } from "../types/services.ts";

/** A host name is one settings key: no dots, nothing a shell or a table would mangle. */
const HOST_NAME = /^[A-Za-z0-9_-]+$/;

/** How long `host check` waits: ssh's own connect timeout, then the far side's greeting. */
function checkTimeoutMs(services: Services): number {
  const links = services.settings.current().links;
  return links.connect_timeout_s * 1_000 + links.request_timeout_ms;
}

function lastSeenCell(view: HostLinkView): string {
  return view.lastSeen === null ? "never" : `${formatAge(view.lastSeen)} ago`;
}

/** Whether the far side runs a different orch build from this one. */
function skewed(view: HostLinkView, localHash: string | null): boolean {
  const remote = view.greeting?.codeHash ?? null;
  return remote !== null && localHash !== null && remote !== localHash;
}

async function listHosts(services: Services, json: boolean): Promise<void> {
  const { hosts } = await readRpc(services, "hosts", undefined);
  if (writeEmptyOrJson(hosts, json, "No hosts configured. Add one under hosts in settings.json.")) return;
  const rows = hosts.map((view) => [view.name, view.dest, view.state, view.greeting?.host.name ?? "-", lastSeenCell(view), view.reason ?? ""]);
  process.stdout.write(renderTable(["NAME", "DEST", "LINK", "HOST", "LAST SEEN", "REASON"], rows, [16, 32, 10, 24, 12, 80]) + "\n");
}

async function checkHost(services: Services, name: string, json: boolean): Promise<void> {
  const view = await readRpc(services, "host-check", { name }, checkTimeoutMs(services));
  if (json) {
    process.stdout.write(JSON.stringify(view, null, 2) + "\n");
    return;
  }
  const greeting = view.greeting;
  if (greeting === null) {
    process.stdout.write(`${view.name}: ${view.state}\n`);
    return;
  }
  process.stdout.write(`${view.name}: up. Host ${greeting.host.name}, ${greeting.host.os}, id ${greeting.host.id}. orch ${greeting.version}.\n`);
  if (skewed(view, installedCodeHash())) {
    process.stdout.write(`warning: ${view.name} runs a different orch build from this machine. Install the same build there.\n`);
  }
}

async function forgetHost(services: Services, name: string, json: boolean): Promise<void> {
  const result = await readRpc(services, "host-forget", { name });
  process.stdout.write(json ? JSON.stringify(result) + "\n" : `Forgot which machine ${name} was. The next host to answer on its route takes the name.\n`);
}

function isHostShell(value: string): value is HostShell {
  return HOST_SHELLS.some((shell) => shell === value);
}

/** The host entry `add` writes, from its flags. */
function hostFromFlags(invocation: Invocation): HostSettings {
  const dest = invocation.flags.value("--dest");
  if (dest === undefined) throw usageError(invocation);
  const port = invocation.flags.value("--port");
  const shell = invocation.flags.value("--shell");
  if (port !== undefined && !/^[1-9][0-9]*$/.test(port)) die(`--port ${port} is not a port number`);
  if (shell !== undefined && !isHostShell(shell)) die(`--shell ${shell} is not one of ${HOST_SHELLS.join(", ")}`);
  return { dest, ...(port === undefined ? {} : { port: Number(port) }), ...(shell === undefined ? {} : { shell }) };
}

/** The line to put in authorized_keys on a host, and where it goes. */
function authorizeInstructions(name: string, host: HostSettings, publicKey: string): string {
  const step = authorizeStep(host, publicKey);
  return [
    `On ${name}, in ${step.where}, paste:`,
    "",
    `  ${step.command}`,
    "",
    "Then, here:",
    "",
    `  orch host check ${name}`,
    "",
  ].join("\n");
}

/** What a host presents, or a refusal that says why no key came back. */
function presentedKeys(host: HostSettings, links: OrchSettings["links"]): HostScan {
  try {
    const scan = scanHostKeys(host, links);
    if (scan.keys.length > 0) return scan;
  } catch (error: unknown) {
    die(`could not fetch ${host.dest}'s host key: ${errorMessage(error)}`);
  }
  die(`${host.dest} presented no host key`);
}

/** Log in once as the person and put orch's key in place there. What the host printed,
 *  shown as it arrives; null when the login failed. */
function installKey(services: Services, host: HostSettings, publicKey: string): string | null {
  const links = services.settings.current().links;
  // ssh asks for a password on the terminal itself, so only stdout is taken.
  const login = spawnSync(links.ssh_command, authorizeArgv(services.orchDir, host, links, publicKey), { stdio: ["inherit", "pipe", "inherit"], encoding: "utf8" });
  process.stdout.write(login.stdout);
  return login.status === 0 ? login.stdout : null;
}

/** Where orch runs on a Windows host. The person says; WSL first, the way orch is usually run there. */
async function askWindowsShell(name: string): Promise<HostShell> {
  const answer = await promptSelect<HostShell>(`${name} runs Windows. Where is the orch you want it to run?`, [
    { value: "wsl", label: "Inside WSL" },
    { value: "windows", label: "On Windows" },
  ], "wsl");
  if (answer === null) die(`${name} was not added.`);
  return answer;
}

/** Where on a host the orch is that its shell found, for the person reading. */
function placeOn(name: string, host: HostSettings): string {
  if (host.shell === "wsl") return `inside WSL on ${name}`;
  if (host.shell === "windows") return `on Windows on ${name}`;
  return `on ${name}`;
}

/** Why the orch a host reported cannot answer the link; null when it can. */
function unusableOrch(name: string, host: HostSettings, orch: string | null): string | null {
  const place = placeOn(name, host);
  if (orch === null) return `orch's key is in place, but there is no orch ${place}. Install orch there, then run: orch host check ${name}`;
  // WSL sees the Windows PATH under /mnt; an orch there is Windows' install, not WSL's.
  if (host.shell === "wsl" && orch.startsWith("/mnt/")) {
    return `orch's key is in place, but the only orch ${place} is ${orch}, which is Windows' install. Install orch inside WSL there, then run: orch host check ${name}`;
  }
  return null;
}

/** Add a host: confirm the key it presents, trust it, log in once to put orch's key in
 *  place, and check that the orch it will start answers.
 *  The human's alone, at a terminal: it decides which machines orch may reach. */
async function addHost(services: Services, invocation: Invocation): Promise<void> {
  if ((await whoAmI(services)).kind !== "operator") die("orch host add is the human's to run: it decides which machines orch may reach.");
  if (!process.stdin.isTTY) die("orch host add asks you to confirm the host's key; run it in a terminal.");
  const name = requiredWord(invocation, 0);
  if (!HOST_NAME.test(name)) die(`host name ${name} must be letters, digits, - and _`);
  const stated = hostFromFlags(invocation);
  const links = services.settings.current().links;
  const scan = presentedKeys(stated, links);
  process.stdout.write(`\n${stated.dest} presents:\n\n${scan.keys.map((key) => `  ${key.fingerprint}`).join("\n")}\n\n`);
  const answer = await confirm({ message: `Trust these keys for ${name}?`, initialValue: false });
  if (isCancel(answer) || answer !== true) die(`${name} was not added.`);
  const shell = stated.shell ?? (announcesWindows(scan.banner) ? await askWindowsShell(name) : "posix");
  const host: HostSettings = { ...stated, ...(shell === "posix" ? {} : { shell }) };
  trustHostKeys(services.orchDir, host, links, scan.keys);
  const publicKey = orchPublicKey(services.orchDir, links);
  writeSettingsValue(services.settings, `hosts.${name}`, host);
  process.stdout.write(`\nLogging in to ${name} once, as ${host.dest}, to install orch's key. Type that account's password if ssh asks.\n\n`);
  const output = installKey(services, host, publicKey);
  if (output === null) {
    process.stdout.write(`\nThat login did not install it. Do it by hand instead:\n\n${authorizeInstructions(name, host, publicKey)}`);
    return;
  }
  const orch = reportedOrch(output);
  const problem = unusableOrch(name, host, orch);
  if (problem !== null) die(problem);
  process.stdout.write(`\nThe link will run ${orch ?? ""} ${placeOn(name, host)}.\n\nChecking the link...\n\n`);
  await checkHost(services, name, false);
}

/** Print the authorized_keys line for a configured host again. */
function printHostKey(services: Services, name: string): void {
  const settings = services.settings.current();
  const host = settings.hosts[name];
  if (host === undefined) die(`no host named ${name} in settings.hosts; add it with orch host add ${name} --dest user@host`);
  process.stdout.write(authorizeInstructions(name, host, orchPublicKey(services.orchDir, settings.links)));
}

export async function cmdHost(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("host", args);
  const json = invocation.flags.has("--json");
  switch (invocation.command.name) {
    case "add": return addHost(services, invocation);
    case "key": return printHostKey(services, requiredWord(invocation, 0));
    case "check": return checkHost(services, requiredWord(invocation, 0), json);
    case "forget": return forgetHost(services, requiredWord(invocation, 0), json);
    case "serve": return serveHostLink(process.stdin, process.stdout);
    default:
      if (invocation.positional.length) throw usageError(invocation);
      return listHosts(services, json);
  }
}
