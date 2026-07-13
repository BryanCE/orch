import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from "node:child_process";

function herdr(args: string[]): any | null {
  try {
    const output = execFileSync("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const value = JSON.parse(output);
    return value && value.result !== undefined ? value.result : value;
  } catch {
    return null;
  }
}

export function herdrJSON(args: string[]): any {
  let output: string;
  try {
    output = execFileSync("herdr", args, { timeout: 5000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error: any) {
    const detail = (error?.stderr ?? error?.stdout ?? error?.message ?? "").toString().trim();
    throw new Error(`herdr ${args.join(" ")} failed: ${detail}`);
  }
  try {
    const value = JSON.parse(output);
    return value && value.result !== undefined ? value.result : value;
  } catch {
    throw new Error(`herdr ${args.join(" ")} returned non-JSON: ${output.slice(0, 200)}`);
  }
}

/** True only when the herdr control socket responds. */
export function herdrReachable(): boolean {
  return herdr(["pane", "list"]) !== null;
}

export function herdrPanes(): any[] {
  const result = herdr(["pane", "list"]);
  return result && Array.isArray(result.panes) ? result.panes : [];
}

export function paneStatus(pane: string): string | null {
  const found = herdrPanes().find((item) => item.pane_id === pane);
  return found ? found.agent_status ?? null : null;
}

export function herdrNames(): Map<string, string> {
  const result = herdr(["agent", "list"]);
  const names = new Map<string, string>();
  if (result && Array.isArray(result.agents)) {
    for (const agent of result.agents) if (agent.pane_id && agent.name) names.set(agent.pane_id, agent.name);
  }
  return names;
}

export function herdrTabs(): Map<string, any> {
  const result = herdr(["tab", "list"]);
  const tabs = new Map<string, any>();
  if (result && Array.isArray(result.tabs)) {
    for (const tab of result.tabs) tabs.set(tab.tab_id, tab);
  }
  return tabs;
}

export function herdrBestEffort(args: string[]): boolean {
  try {
    execFileSync("herdr", args, { timeout: 8000, stdio: ["ignore", "pipe", "pipe"] });
    return true;
  } catch (error: any) {
    process.stderr.write(`warning: herdr ${args.join(" ")} failed: ${(error?.stderr ?? error?.message ?? error).toString().trim()}\n`);
    return false;
  }
}

export function herdrExec(args: string[], options: ExecFileSyncOptionsWithStringEncoding = { encoding: "utf8" }): string {
  return execFileSync("herdr", args, options);
}
