import { buildStore, reportStore } from "./build.ts";
import { targetStoreDir } from "./store.ts";

// Bring the store up to the migrations in `drizzle/`, creating it when absent.
// Additive: existing rows are kept, and a store already at the newest migration
// runs no DDL at all. `db:reset` is the one that starts over.
const storeDir = targetStoreDir();
reportStore("db:mig", storeDir, buildStore(storeDir));
