// orchd holds one store connection for its whole life. A reset or a rebuild
// replaces the file under it, and orchd must follow the new file, not the old one.
import { closeAllStores, databasePath } from "../../store/connection.ts";
import { dropBridges } from "../../control/bridge-links.ts";
import type { Logger, OrchDir } from "../../types/core.ts";

/** Close the connection to a replaced store, so the next read opens the new file,
 *  and drop every bridge link, so each bridge attaches again to the new rows. */
export function reopenReplacedStore(orchDir: OrchDir, logger: Logger): void {
  closeAllStores();
  logger.warn("store.replaced", { path: databasePath(orchDir), bridgesDropped: dropBridges() });
}
