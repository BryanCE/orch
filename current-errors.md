
  x typescript(no-redundant-type-constituents): 'unknown' overrides all other types in this union type.
     ,-[src/commands/panes.ts:258:18]
 257 |     const groupId = newTab ? null : resolveTab(tab!).id;
 258 |     let against: BackendHandle | undefined;
     :                  ^^^^^^^^^^^^^
 259 |     if (!newTab && !splitExplicit && groupId !== null) {
     `----

Found 0 warnings and 1 error.
Finished in 2.1s on 193 files with 65 rules using 8 threads.
