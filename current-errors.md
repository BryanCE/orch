
  x typescript(consistent-type-definitions): Use `interface` instead of `type`.
   ,-[test/tiling.test.ts:5:1]
 4 | 
 5 | type LayoutPane = { handle: string; rect: BackendRect };
   : ^^^^
 6 | 
   `----
  help: Replace `type LayoutPane = { handle: string; rect: BackendRect };` with `interface LayoutPane { handle: string; rect: BackendRect }`.

Found 0 warnings and 1 error.
Finished in 5.3s on 198 files with 65 rules using 8 threads.
