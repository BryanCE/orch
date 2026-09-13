import { envOrchDir } from "../../src/services.ts";

/** The store every `bun db:*` command acts on: the real one, so development runs against
 *  the same file a published install would. It is wherever this install's home is —
 *  Windows, WSL, or a machine running both — and ORCH_DIR names one outright. */
export function targetStoreDir(): string {
  return envOrchDir();
}
