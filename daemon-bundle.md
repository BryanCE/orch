# Bundle Analysis Report

This report helps identify bundle size issues, dependency bloat, and optimization opportunities.

## Table of Contents

- [Quick Summary](#quick-summary)
- [Largest Modules by Output Contribution](#largest-modules-by-output-contribution)
- [Entry Point Analysis](#entry-point-analysis)
- [Dependency Chains](#dependency-chains)
- [Full Module Graph](#full-module-graph)
- [Raw Data for Searching](#raw-data-for-searching)

---

## Quick Summary

| Metric | Value |
|--------|-------|
| Total output size | 0.69 MB |
| Input modules | 139 |
| Entry points | 1 |
| node_modules contribution | 79 files (0.48 MB) |
| ESM modules | 139 |
| External imports | 76 |

## Largest Modules by Output Contribution

Modules sorted by bytes contributed to the output bundle. Large modules may indicate bloat.

| Output Bytes | % of Total | Module | Format |
|--------------|------------|--------|--------|
| 65.41 KB | 9.5% | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js` | esm |
| 45.25 KB | 6.6% | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js` | esm |
| 19.94 KB | 2.9% | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js` | esm |
| 19.82 KB | 2.9% | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` | esm |
| 16.78 KB | 2.4% | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js` | esm |
| 16.27 KB | 2.4% | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js` | esm |
| 16.25 KB | 2.4% | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js` | esm |
| 13.77 KB | 2.0% | `src/config.ts` | esm |
| 12.89 KB | 1.9% | `src/adapters/pi.ts` | esm |
| 12.39 KB | 1.8% | `src/daemon/orchd.ts` | esm |
| 12.10 KB | 1.8% | `src/daemon/rpc.ts` | esm |
| 11.31 KB | 1.6% | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js` | esm |
| 9.99 KB | 1.5% | `src/backends/herdr/index.ts` | esm |
| 9.71 KB | 1.4% | `src/adapters/codex.ts` | esm |
| 9.68 KB | 1.4% | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/he.js` | esm |
| 9.16 KB | 1.3% | `src/adapters/claude.ts` | esm |
| 9.1 KB | 1.3% | `src/store/sqlite.ts` | esm |
| 8.87 KB | 1.3% | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` | esm |
| 8.38 KB | 1.2% | `src/daemon/events.ts` | esm |
| 7.58 KB | 1.1% | `src/daemon/work-loop.ts` | esm |

*...and 112 more modules with output contribution*

## Entry Point Analysis

Each entry point and the total code it loads (including shared chunks).

### Entry: `src/daemon/orchd.ts`

**Output file**: `./orchd.js`
**Bundle size**: 0.69 MB
**Exports**: `governWrite`, `idleShutdownDue`, `optionalEnvRecord`, `optionalModelSpecs`, `validateWriteParams`

**Bundled modules** (sorted by contribution):

| Bytes | Module |
|-------|--------|
| 65.41 KB | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js` |
| 45.25 KB | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js` |
| 19.94 KB | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js` |
| 19.82 KB | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` |
| 16.78 KB | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js` |
| 16.27 KB | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js` |
| 16.25 KB | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js` |
| 13.77 KB | `src/config.ts` |
| 12.89 KB | `src/adapters/pi.ts` |
| 12.39 KB | `src/daemon/orchd.ts` |
| 12.10 KB | `src/daemon/rpc.ts` |
| 11.31 KB | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js` |
| 9.99 KB | `src/backends/herdr/index.ts` |
| 9.71 KB | `src/adapters/codex.ts` |
| 9.68 KB | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/he.js` |

*...and 124 more modules*

## Dependency Chains

For each module, shows what files import it. Use this to understand why a module is included.

### Most Commonly Imported Modules

Modules imported by many files. Extracting these to shared chunks may help.

| Import Count | Module | Imported By |
|--------------|--------|-------------|
| 60 | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js`, `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js`, `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js`+57 more |
| 41 | `src/util.ts` | `src/daemon/orchd.ts`, `src/daemon/rpc.ts`, `src/daemon/lifecycle.ts`+38 more |
| 17 | `src/presence/store.ts` | `src/daemon/orchd.ts`, `src/daemon/lifecycle.ts`, `src/backends/identity.ts`+14 more |
| 13 | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js`, `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js`, `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js`+10 more |
| 11 | `src/config.ts` | `src/daemon/orchd.ts`, `src/control/dispatch.ts`, `src/policy/workspace.ts`+8 more |
| 9 | `src/presence/schema.ts` | `src/daemon/events.ts`, `src/presence/store.ts`, `src/backends/tmux/index.ts`+6 more |
| 8 | `src/policy/workspace.ts` | `src/daemon/orchd.ts`, `src/daemon/events.ts`, `src/daemon/work-loop.ts`+5 more |
| 6 | `src/backends/identity.ts` | `src/daemon/orchd.ts`, `src/control/dispatch.ts`, `src/policy/workspace.ts`+3 more |
| 6 | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js` | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js`, `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js`, `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js`+3 more |
| 5 | `src/notify/format.ts` | `src/daemon/events.ts`, `src/notify/router.ts`, `src/notify/sinks.ts`+2 more |
| 5 | `src/presence/writer.ts` | `src/daemon/events.ts`, `src/presence/store.ts`, `src/adapters/model-catalogue.ts`+2 more |
| 5 | `src/adapters/registry.ts` | `src/daemon/orchd.ts`, `src/control/dispatch.ts`, `src/daemon/work-loop.ts`+2 more |
| 5 | `src/daemon/lifecycle.ts` | `src/daemon/orchd.ts`, `src/daemon/rpc.ts`, `src/adapters/pi.ts`+2 more |
| 4 | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js` | `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js`, `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/coerce.js`, `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js`+1 more |
| 4 | `src/store/sqlite.ts` | `src/daemon/orchd.ts`, `src/daemon/outbox.ts`, `src/presence/store.ts`+1 more |

## Full Module Graph

Complete dependency information for each module.

### `node_modules/.bun/zod@4.4.3/node_modules/zod/index.js`

- **Format**: esm
- **Imported by** (1 files): `src/config.ts`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js` (import-statement, contributes 6.91 KB, specifier: `./v4/classic/external.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js` (import-statement, contributes 6.91 KB, specifier: `./v4/classic/external.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js`

- **Output contribution**: 0.86 KB
- **Format**: esm
- **Imported by** (3 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` (import-statement, contributes 8.87 KB, specifier: `../core/index.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/coerce.js`

- **Output contribution**: 0.54 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` (import-statement, contributes 8.87 KB, specifier: `../core/index.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js` (import-statement, contributes 45.25 KB, specifier: `./schemas.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/compat.js`

- **Output contribution**: 0.62 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` (import-statement, contributes 8.87 KB, specifier: `../core/index.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` (import-statement, contributes 8.87 KB, specifier: `../core/index.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js`

- **Output contribution**: 0.88 KB
- **Format**: esm
- **Imported by** (2 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` (import-statement, contributes 8.87 KB, specifier: `../core/index.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` (import-statement, contributes 8.87 KB, specifier: `../core/index.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js`

- **Output contribution**: 6.91 KB
- **Format**: esm
- **Imported by** (2 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/index.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` (import-statement, contributes 8.87 KB, specifier: `../core/index.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js` (import-statement, contributes 45.25 KB, specifier: `./schemas.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js` (import-statement, contributes 0.86 KB, specifier: `./checks.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js` (import-statement, contributes 0.88 KB, specifier: `./errors.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js` (import-statement, contributes 0.74 KB, specifier: `./parse.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/compat.js` (import-statement, contributes 0.62 KB, specifier: `./compat.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` (import-statement, contributes 8.87 KB, specifier: `../core/index.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/en.js` (import-statement, contributes 3.94 KB, specifier: `../locales/en.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` (import-statement, contributes 8.87 KB, specifier: `../core/index.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js` (import-statement, contributes 16.78 KB, specifier: `../core/json-schema-processors.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js` (import-statement, contributes 16.27 KB, specifier: `./from-json-schema.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js` (import-statement, contributes 1.32 KB, specifier: `../locales/index.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js` (import-statement, contributes 1.19 KB, specifier: `./iso.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js` (import-statement, contributes 1.19 KB, specifier: `./iso.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/coerce.js` (import-statement, contributes 0.54 KB, specifier: `./coerce.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js`

- **Output contribution**: 16.27 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js` (import-statement, contributes 1.21 KB, specifier: `../core/registries.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js` (import-statement, contributes 0.86 KB, specifier: `./checks.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js` (import-statement, contributes 1.19 KB, specifier: `./iso.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js` (import-statement, contributes 45.25 KB, specifier: `./schemas.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js`

- **Output contribution**: 1.19 KB
- **Format**: esm
- **Imported by** (4 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` (import-statement, contributes 8.87 KB, specifier: `../core/index.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js` (import-statement, contributes 45.25 KB, specifier: `./schemas.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js`

- **Output contribution**: 0.74 KB
- **Format**: esm
- **Imported by** (2 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` (import-statement, contributes 8.87 KB, specifier: `../core/index.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js` (import-statement, contributes 0.88 KB, specifier: `./errors.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js`

- **Output contribution**: 45.25 KB
- **Format**: esm
- **Imported by** (4 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/coerce.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` (import-statement, contributes 8.87 KB, specifier: `../core/index.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` (import-statement, contributes 8.87 KB, specifier: `../core/index.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js` (import-statement, contributes 16.78 KB, specifier: `../core/json-schema-processors.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js` (import-statement, contributes 11.31 KB, specifier: `../core/to-json-schema.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js` (import-statement, contributes 0.86 KB, specifier: `./checks.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js` (import-statement, contributes 1.19 KB, specifier: `./iso.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js` (import-statement, contributes 0.74 KB, specifier: `./parse.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js`

- **Output contribution**: 19.94 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js` (import-statement, contributes 16.25 KB, specifier: `./checks.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js` (import-statement, contributes 1.21 KB, specifier: `./registries.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js` (import-statement, contributes 65.41 KB, specifier: `./schemas.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `./util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js`

- **Output contribution**: 16.25 KB
- **Format**: esm
- **Imported by** (3 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js` (import-statement, contributes 2.0 KB, specifier: `./core.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js` (import-statement, contributes 7.52 KB, specifier: `./regexes.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `./util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js`

- **Output contribution**: 2.0 KB
- **Format**: esm
- **Imported by** (6 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js` +1 more

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/doc.js`

- **Output contribution**: 0.92 KB
- **Format**: esm
- **Imported by** (2 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js`

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js`

- **Output contribution**: 4.64 KB
- **Format**: esm
- **Imported by** (2 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js` (import-statement, contributes 2.0 KB, specifier: `./core.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `./util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js`

- **Output contribution**: 8.87 KB
- **Format**: esm
- **Imported by** (13 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/compat.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/compat.js` +8 more
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js` (import-statement, contributes 2.0 KB, specifier: `./core.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js` (import-statement, contributes 3.79 KB, specifier: `./parse.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js` (import-statement, contributes 4.64 KB, specifier: `./errors.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js` (import-statement, contributes 65.41 KB, specifier: `./schemas.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js` (import-statement, contributes 16.25 KB, specifier: `./checks.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/versions.js` (import-statement, contributes 54 bytes, specifier: `./versions.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `./util.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js` (import-statement, contributes 7.52 KB, specifier: `./regexes.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js` (import-statement, contributes 1.32 KB, specifier: `../locales/index.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js` (import-statement, contributes 1.21 KB, specifier: `./registries.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/doc.js` (import-statement, contributes 0.92 KB, specifier: `./doc.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js` (import-statement, contributes 19.94 KB, specifier: `./api.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js` (import-statement, contributes 11.31 KB, specifier: `./to-json-schema.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js` (import-statement, contributes 16.78 KB, specifier: `./json-schema-processors.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-generator.js` (import-statement, contributes 1.59 KB, specifier: `./json-schema-generator.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema.js` (import-statement, contributes 30 bytes, specifier: `./json-schema.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-generator.js`

- **Output contribution**: 1.59 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js` (import-statement, contributes 16.78 KB, specifier: `./json-schema-processors.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js` (import-statement, contributes 11.31 KB, specifier: `./to-json-schema.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js`

- **Output contribution**: 16.78 KB
- **Format**: esm
- **Imported by** (4 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-generator.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js` (import-statement, contributes 11.31 KB, specifier: `./to-json-schema.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `./util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema.js`

- **Output contribution**: 30 bytes
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js`

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js`

- **Output contribution**: 3.79 KB
- **Format**: esm
- **Imported by** (2 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js` (import-statement, contributes 2.0 KB, specifier: `./core.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js` (import-statement, contributes 4.64 KB, specifier: `./errors.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `./util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js`

- **Output contribution**: 7.52 KB
- **Format**: esm
- **Imported by** (3 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `./util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js`

- **Output contribution**: 1.21 KB
- **Format**: esm
- **Imported by** (4 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js`

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js`

- **Output contribution**: 65.41 KB
- **Format**: esm
- **Imported by** (2 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js` (import-statement, contributes 16.25 KB, specifier: `./checks.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js` (import-statement, contributes 2.0 KB, specifier: `./core.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/doc.js` (import-statement, contributes 0.92 KB, specifier: `./doc.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js` (import-statement, contributes 3.79 KB, specifier: `./parse.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js` (import-statement, contributes 7.52 KB, specifier: `./regexes.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `./util.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/versions.js` (import-statement, contributes 54 bytes, specifier: `./versions.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `./util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js`

- **Output contribution**: 11.31 KB
- **Format**: esm
- **Imported by** (4 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-generator.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js` (import-statement, contributes 1.21 KB, specifier: `./registries.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js`

- **Output contribution**: 19.82 KB
- **Format**: esm
- **Imported by** (60 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/en.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/km.js` +55 more
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js` (import-statement, contributes 2.0 KB, specifier: `./core.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/versions.js`

- **Output contribution**: 54 bytes
- **Format**: esm
- **Imported by** (2 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js`

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ar.js`

- **Output contribution**: 4.57 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/az.js`

- **Output contribution**: 3.90 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/be.js`

- **Output contribution**: 5.73 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/bg.js`

- **Output contribution**: 5.1 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ca.js`

- **Output contribution**: 4.0 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/cs.js`

- **Output contribution**: 4.13 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/da.js`

- **Output contribution**: 4.14 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/de.js`

- **Output contribution**: 3.96 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/el.js`

- **Output contribution**: 4.92 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/en.js`

- **Output contribution**: 3.94 KB
- **Format**: esm
- **Imported by** (2 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/eo.js`

- **Output contribution**: 3.98 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/es.js`

- **Output contribution**: 4.72 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fa.js`

- **Output contribution**: 4.46 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fi.js`

- **Output contribution**: 4.17 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr-CA.js`

- **Output contribution**: 3.94 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr.js`

- **Output contribution**: 4.45 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/he.js`

- **Output contribution**: 9.68 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hr.js`

- **Output contribution**: 4.37 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hu.js`

- **Output contribution**: 4.1 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hy.js`

- **Output contribution**: 5.55 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/id.js`

- **Output contribution**: 3.96 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`

- **Output contribution**: 1.32 KB
- **Format**: esm
- **Imported by** (2 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ar.js` (import-statement, contributes 4.57 KB, specifier: `./ar.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/az.js` (import-statement, contributes 3.90 KB, specifier: `./az.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/be.js` (import-statement, contributes 5.73 KB, specifier: `./be.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/bg.js` (import-statement, contributes 5.1 KB, specifier: `./bg.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ca.js` (import-statement, contributes 4.0 KB, specifier: `./ca.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/cs.js` (import-statement, contributes 4.13 KB, specifier: `./cs.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/da.js` (import-statement, contributes 4.14 KB, specifier: `./da.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/de.js` (import-statement, contributes 3.96 KB, specifier: `./de.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/el.js` (import-statement, contributes 4.92 KB, specifier: `./el.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/en.js` (import-statement, contributes 3.94 KB, specifier: `./en.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/eo.js` (import-statement, contributes 3.98 KB, specifier: `./eo.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/es.js` (import-statement, contributes 4.72 KB, specifier: `./es.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fa.js` (import-statement, contributes 4.46 KB, specifier: `./fa.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fi.js` (import-statement, contributes 4.17 KB, specifier: `./fi.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr.js` (import-statement, contributes 4.45 KB, specifier: `./fr.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr-CA.js` (import-statement, contributes 3.94 KB, specifier: `./fr-CA.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/he.js` (import-statement, contributes 9.68 KB, specifier: `./he.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hr.js` (import-statement, contributes 4.37 KB, specifier: `./hr.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hu.js` (import-statement, contributes 4.1 KB, specifier: `./hu.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hy.js` (import-statement, contributes 5.55 KB, specifier: `./hy.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/id.js` (import-statement, contributes 3.96 KB, specifier: `./id.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/is.js` (import-statement, contributes 4.0 KB, specifier: `./is.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/it.js` (import-statement, contributes 3.96 KB, specifier: `./it.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ja.js` (import-statement, contributes 4.24 KB, specifier: `./ja.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ka.js` (import-statement, contributes 5.56 KB, specifier: `./ka.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/kh.js` (import-statement, contributes 49 bytes, specifier: `./kh.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/km.js` (import-statement, contributes 5.61 KB, specifier: `./km.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ko.js` (import-statement, contributes 4.28 KB, specifier: `./ko.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/lt.js` (import-statement, contributes 6.84 KB, specifier: `./lt.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/mk.js` (import-statement, contributes 4.53 KB, specifier: `./mk.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ms.js` (import-statement, contributes 3.87 KB, specifier: `./ms.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/nl.js` (import-statement, contributes 4.12 KB, specifier: `./nl.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/no.js` (import-statement, contributes 3.88 KB, specifier: `./no.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ota.js` (import-statement, contributes 3.90 KB, specifier: `./ota.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ps.js` (import-statement, contributes 4.24 KB, specifier: `./ps.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pl.js` (import-statement, contributes 4.34 KB, specifier: `./pl.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pt.js` (import-statement, contributes 3.95 KB, specifier: `./pt.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ro.js` (import-statement, contributes 4.12 KB, specifier: `./ro.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ru.js` (import-statement, contributes 5.82 KB, specifier: `./ru.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sl.js` (import-statement, contributes 3.94 KB, specifier: `./sl.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sv.js` (import-statement, contributes 4.0 KB, specifier: `./sv.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ta.js` (import-statement, contributes 5.73 KB, specifier: `./ta.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/th.js` (import-statement, contributes 5.66 KB, specifier: `./th.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/tr.js` (import-statement, contributes 3.85 KB, specifier: `./tr.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ua.js` (import-statement, contributes 49 bytes, specifier: `./ua.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uk.js` (import-statement, contributes 4.81 KB, specifier: `./uk.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ur.js` (import-statement, contributes 4.64 KB, specifier: `./ur.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uz.js` (import-statement, contributes 4.11 KB, specifier: `./uz.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/vi.js` (import-statement, contributes 4.15 KB, specifier: `./vi.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-CN.js` (import-statement, contributes 3.83 KB, specifier: `./zh-CN.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-TW.js` (import-statement, contributes 3.88 KB, specifier: `./zh-TW.js`)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/yo.js` (import-statement, contributes 4.0 KB, specifier: `./yo.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/is.js`

- **Output contribution**: 4.0 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/it.js`

- **Output contribution**: 3.96 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ja.js`

- **Output contribution**: 4.24 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ka.js`

- **Output contribution**: 5.56 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/kh.js`

- **Output contribution**: 49 bytes
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/km.js` (import-statement, contributes 5.61 KB, specifier: `./km.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/km.js`

- **Output contribution**: 5.61 KB
- **Format**: esm
- **Imported by** (2 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/kh.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ko.js`

- **Output contribution**: 4.28 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/lt.js`

- **Output contribution**: 6.84 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/mk.js`

- **Output contribution**: 4.53 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ms.js`

- **Output contribution**: 3.87 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/nl.js`

- **Output contribution**: 4.12 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/no.js`

- **Output contribution**: 3.88 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ota.js`

- **Output contribution**: 3.90 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pl.js`

- **Output contribution**: 4.34 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ps.js`

- **Output contribution**: 4.24 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pt.js`

- **Output contribution**: 3.95 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ro.js`

- **Output contribution**: 4.12 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ru.js`

- **Output contribution**: 5.82 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sl.js`

- **Output contribution**: 3.94 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sv.js`

- **Output contribution**: 4.0 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ta.js`

- **Output contribution**: 5.73 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/th.js`

- **Output contribution**: 5.66 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/tr.js`

- **Output contribution**: 3.85 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ua.js`

- **Output contribution**: 49 bytes
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uk.js` (import-statement, contributes 4.81 KB, specifier: `./uk.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uk.js`

- **Output contribution**: 4.81 KB
- **Format**: esm
- **Imported by** (2 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js` `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ua.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ur.js`

- **Output contribution**: 4.64 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uz.js`

- **Output contribution**: 4.11 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/vi.js`

- **Output contribution**: 4.15 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/yo.js`

- **Output contribution**: 4.0 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-CN.js`

- **Output contribution**: 3.83 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-TW.js`

- **Output contribution**: 3.88 KB
- **Format**: esm
- **Imported by** (1 files): `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js`
- **Imports**:
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js` (import-statement, contributes 19.82 KB, specifier: `../core/util.js`)

### `src/adapters/adapter.ts`

- **Output contribution**: 312 bytes
- **Format**: esm
- **Imported by** (3 files): `src/daemon/orchd.ts` `src/store/sqlite.ts` `src/config.ts`

### `src/adapters/catalogue-store.ts`

- **Output contribution**: 1.18 KB
- **Format**: esm
- **Imported by** (1 files): `src/adapters/model-catalogue.ts`
- **Imports**:
  - `node:fs` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `src/presence/writer.ts` (import-statement, contributes 0.99 KB, specifier: `../presence/writer.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)

### `src/adapters/claude-hooks.ts`

- **Output contribution**: 482 bytes
- **Format**: esm
- **Imported by** (1 files): `src/adapters/claude.ts`
- **Imports**:
  - `node:os` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `src/runtime.ts` (import-statement, contributes 0.64 KB, specifier: `../runtime.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)

### `src/adapters/claude.ts`

- **Output contribution**: 9.16 KB
- **Format**: esm
- **Imported by** (1 files): `src/adapters/registry.ts`
- **Imports**:
  - `node:fs` (import-statement, **external**)
  - `node:os` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `src/config.ts` (import-statement, contributes 13.77 KB, specifier: `../config.ts`)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `../presence/store.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)
  - `src/adapters/claude-hooks.ts` (import-statement, contributes 482 bytes, specifier: `./claude-hooks.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)
  - `src/adapters/transcript.ts` (import-statement, contributes 1.54 KB, specifier: `./transcript.ts`)

### `src/adapters/codex-notify.ts`

- **Output contribution**: 2.29 KB
- **Format**: esm
- **Imported by** (1 files): `src/adapters/codex.ts`
- **Imports**:
  - `node:path` (import-statement, **external**)
  - `src/runtime.ts` (import-statement, contributes 0.64 KB, specifier: `../runtime.ts`)

### `src/adapters/codex.ts`

- **Output contribution**: 9.71 KB
- **Format**: esm
- **Imported by** (1 files): `src/adapters/registry.ts`
- **Imports**:
  - `node:fs` (import-statement, **external**)
  - `node:os` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)
  - `src/config.ts` (import-statement, contributes 13.77 KB, specifier: `../config.ts`)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `../presence/store.ts`)
  - `src/adapters/codex-notify.ts` (import-statement, contributes 2.29 KB, specifier: `./codex-notify.ts`)
  - `src/adapters/transcript.ts` (import-statement, contributes 1.54 KB, specifier: `./transcript.ts`)

### `src/adapters/model-catalogue.ts`

- **Output contribution**: 2.69 KB
- **Format**: esm
- **Imported by** (3 files): `src/adapters/registry.ts` `src/adapters/omp.ts` `src/adapters/pi.ts`
- **Imports**:
  - `node:child_process` (import-statement, **external**)
  - `node:util` (import-statement, **external**)
  - `src/retry.ts` (import-statement, contributes 1.21 KB, specifier: `../retry.ts`)
  - `src/presence/writer.ts` (import-statement, contributes 0.99 KB, specifier: `../presence/writer.ts`)
  - `src/adapters/catalogue-store.ts` (import-statement, contributes 1.18 KB, specifier: `./catalogue-store.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)

### `src/adapters/omp.ts`

- **Output contribution**: 2.92 KB
- **Format**: esm
- **Imported by** (1 files): `src/adapters/registry.ts`
- **Imports**:
  - `node:os` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `src/adapters/model-catalogue.ts` (import-statement, contributes 2.69 KB, specifier: `./model-catalogue.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)
  - `src/adapters/pi.ts` (import-statement, contributes 12.89 KB, specifier: `./pi.ts`)

### `src/adapters/pi.ts`

- **Output contribution**: 12.89 KB
- **Format**: esm
- **Imported by** (2 files): `src/adapters/registry.ts` `src/adapters/omp.ts`
- **Imports**:
  - `node:fs` (import-statement, **external**)
  - `node:os` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `src/adapters/model-catalogue.ts` (import-statement, contributes 2.69 KB, specifier: `./model-catalogue.ts`)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `../presence/store.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)
  - `src/session.ts` (import-statement, contributes 5.20 KB, specifier: `../session.ts`)
  - `src/bridge-bundle.ts` (import-statement, contributes 1.1 KB, specifier: `../bridge-bundle.ts`)
  - `src/daemon/lifecycle.ts` (import-statement, contributes 4.46 KB, specifier: `../daemon/lifecycle.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)
  - `src/presence/schema.ts` (import-statement, contributes 191 bytes, specifier: `../presence/schema.ts`)

### `src/adapters/registry.ts`

- **Output contribution**: 477 bytes
- **Format**: esm
- **Imported by** (5 files): `src/daemon/orchd.ts` `src/control/dispatch.ts` `src/daemon/work-loop.ts` `src/commands/status.ts` `src/policy/spawner.ts`
- **Imports**:
  - `src/adapters/model-catalogue.ts` (import-statement, contributes 2.69 KB, specifier: `./model-catalogue.ts`)
  - `src/adapters/pi.ts` (import-statement, contributes 12.89 KB, specifier: `./pi.ts`)
  - `src/adapters/omp.ts` (import-statement, contributes 2.92 KB, specifier: `./omp.ts`)
  - `src/adapters/codex.ts` (import-statement, contributes 9.71 KB, specifier: `./codex.ts`)
  - `src/adapters/claude.ts` (import-statement, contributes 9.16 KB, specifier: `./claude.ts`)

### `src/adapters/transcript.ts`

- **Output contribution**: 1.54 KB
- **Format**: esm
- **Imported by** (2 files): `src/adapters/claude.ts` `src/adapters/codex.ts`
- **Imports**:
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)

### `src/backends/backend.ts`

- **Output contribution**: 177 bytes
- **Format**: esm
- **Imported by** (3 files): `src/store/sqlite.ts` `src/config.ts` `src/backends/herdr/notify.ts`

### `src/backends/headless/index.ts`

- **Output contribution**: 6.0 KB
- **Format**: esm
- **Imported by** (1 files): `src/backends/registry.ts`
- **Imports**:
  - `node:fs` (import-statement, **external**)
  - `node:os` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `node:child_process` (import-statement, **external**)
  - `src/presence/schema.ts` (import-statement, contributes 191 bytes, specifier: `../../presence/schema.ts`)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `../../presence/store.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../../util.ts`)

### `src/backends/herdr/cli.ts`

- **Output contribution**: 3.11 KB
- **Format**: esm
- **Imported by** (2 files): `src/backends/herdr/index.ts` `src/backends/herdr/notify.ts`
- **Imports**:
  - `node:child_process` (import-statement, **external**)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../../util.ts`)

### `src/backends/herdr/index.ts`

- **Output contribution**: 9.99 KB
- **Format**: esm
- **Imported by** (1 files): `src/backends/registry.ts`
- **Imports**:
  - `src/notify/sinks.ts` (import-statement, contributes 4.94 KB, specifier: `../../notify/sinks.ts`)
  - `src/backends/herdr/notify.ts` (import-statement, contributes 394 bytes, specifier: `./notify.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../../util.ts`)
  - `src/backends/herdr/cli.ts` (import-statement, contributes 3.11 KB, specifier: `./cli.ts`)

### `src/backends/herdr/notify.ts`

- **Output contribution**: 394 bytes
- **Format**: esm
- **Imported by** (1 files): `src/backends/herdr/index.ts`
- **Imports**:
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../../util.ts`)
  - `src/backends/herdr/cli.ts` (import-statement, contributes 3.11 KB, specifier: `./cli.ts`)
  - `src/backends/backend.ts` (import-statement, contributes 177 bytes, specifier: `../backend.ts`)

### `src/backends/identity.ts`

- **Output contribution**: 2.72 KB
- **Format**: esm
- **Imported by** (6 files): `src/daemon/orchd.ts` `src/control/dispatch.ts` `src/policy/workspace.ts` `src/entities.ts` `src/commands/target.ts` +1 more
- **Imports**:
  - `node:crypto` (import-statement, **external**)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `../presence/store.ts`)

### `src/backends/registry.ts`

- **Output contribution**: 348 bytes
- **Format**: esm
- **Imported by** (4 files): `src/daemon/orchd.ts` `src/control/dispatch.ts` `src/entities.ts` `src/commands/target.ts`
- **Imports**:
  - `src/backends/headless/index.ts` (import-statement, contributes 6.0 KB, specifier: `./headless/index.ts`)
  - `src/backends/herdr/index.ts` (import-statement, contributes 9.99 KB, specifier: `./herdr/index.ts`)
  - `src/backends/tmux/index.ts` (import-statement, contributes 7.54 KB, specifier: `./tmux/index.ts`)

### `src/backends/tiling.ts`

- **Output contribution**: 61 bytes
- **Format**: esm
- **Imported by** (1 files): `src/config.ts`

### `src/backends/tmux/cli.ts`

- **Output contribution**: 2.25 KB
- **Format**: esm
- **Imported by** (1 files): `src/backends/tmux/index.ts`
- **Imports**:
  - `node:child_process` (import-statement, **external**)

### `src/backends/tmux/index.ts`

- **Output contribution**: 7.54 KB
- **Format**: esm
- **Imported by** (1 files): `src/backends/registry.ts`
- **Imports**:
  - `node:child_process` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../../util.ts`)
  - `src/presence/schema.ts` (import-statement, contributes 191 bytes, specifier: `../../presence/schema.ts`)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `../../presence/store.ts`)
  - `src/backends/tmux/cli.ts` (import-statement, contributes 2.25 KB, specifier: `./cli.ts`)

### `src/bridge-bundle.ts`

- **Output contribution**: 1.1 KB
- **Format**: esm
- **Imported by** (2 files): `src/adapters/pi.ts` `src/doctor/extensions.ts`
- **Imports**:
  - `node:child_process` (import-statement, **external**)
  - `node:fs` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `./util.ts`)

### `src/commands/daemon.ts`

- **Format**: esm
- **Imported by** (1 files): `src/commands/status.ts`
- **Imports**:
  - `node:fs` (import-statement, **external**)
  - `src/daemon/lifecycle.ts` (import-statement, contributes 4.46 KB, specifier: `../daemon/lifecycle.ts`)
  - `src/daemon/runtime-files.ts` (import-statement, contributes 264 bytes, specifier: `../daemon/runtime-files.ts`)
  - `src/daemon/rpc.ts` (import-statement, contributes 12.10 KB, specifier: `../daemon/rpc.ts`)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `../presence/store.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)
  - `src/commands/target.ts` (import-statement, contributes 213 bytes, specifier: `./target.ts`)

### `src/commands/status.ts`

- **Output contribution**: 5.0 KB
- **Format**: esm
- **Imported by** (1 files): `src/daemon/orchd.ts`
- **Imports**:
  - `src/config.ts` (import-statement, contributes 13.77 KB, specifier: `../config.ts`)
  - `src/doctor/extensions.ts` (import-statement, contributes 0.54 KB, specifier: `../doctor/extensions.ts`)
  - `src/adapters/registry.ts` (import-statement, contributes 477 bytes, specifier: `../adapters/registry.ts`)
  - `src/entities.ts` (import-statement, contributes 2.68 KB, specifier: `../entities.ts`)
  - `src/remote.ts` (import-statement, specifier: `../remote.ts`)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `../presence/store.ts`)
  - `src/table.ts` (import-statement, specifier: `../table.ts`)
  - `src/policy/workspace.ts` (import-statement, contributes 1.49 KB, specifier: `../policy/workspace.ts`)
  - `src/commands/daemon.ts` (import-statement, specifier: `./daemon.ts`)
  - `src/daemon/rpc.ts` (import-statement, contributes 12.10 KB, specifier: `../daemon/rpc.ts`)
  - `src/commands/target.ts` (import-statement, contributes 213 bytes, specifier: `./target.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)

### `src/commands/target.ts`

- **Output contribution**: 213 bytes
- **Format**: esm
- **Imported by** (2 files): `src/commands/status.ts` `src/commands/daemon.ts`
- **Imports**:
  - `src/config.ts` (import-statement, contributes 13.77 KB, specifier: `../config.ts`)
  - `src/backends/registry.ts` (import-statement, contributes 348 bytes, specifier: `../backends/registry.ts`)
  - `src/backends/identity.ts` (import-statement, contributes 2.72 KB, specifier: `../backends/identity.ts`)
  - `src/entities.ts` (import-statement, contributes 2.68 KB, specifier: `../entities.ts`)
  - `src/policy/spawner.ts` (import-statement, specifier: `../policy/spawner.ts`)
  - `src/policy/workspace.ts` (import-statement, contributes 1.49 KB, specifier: `../policy/workspace.ts`)
  - `src/remote.ts` (import-statement, specifier: `../remote.ts`)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `../presence/store.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)

### `src/config.ts`

- **Output contribution**: 13.77 KB
- **Format**: esm
- **Imported by** (11 files): `src/daemon/orchd.ts` `src/control/dispatch.ts` `src/policy/workspace.ts` `src/notify/router.ts` `src/daemon/work-loop.ts` +6 more
- **Imports**:
  - `node:fs` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `node_modules/.bun/zod@4.4.3/node_modules/zod/index.js` (import-statement, specifier: `zod`)
  - `src/adapters/adapter.ts` (import-statement, contributes 312 bytes, specifier: `./adapters/adapter.ts`)
  - `src/backends/backend.ts` (import-statement, contributes 177 bytes, specifier: `./backends/backend.ts`)
  - `src/backends/tiling.ts` (import-statement, contributes 61 bytes, specifier: `./backends/tiling.ts`)
  - `src/runtime.ts` (import-statement, contributes 0.64 KB, specifier: `./runtime.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `./util.ts`)

### `src/control/dispatch.ts`

- **Output contribution**: 6.1 KB
- **Format**: esm
- **Imported by** (2 files): `src/daemon/orchd.ts` `src/daemon/work-loop.ts`
- **Imports**:
  - `node:child_process` (import-statement, **external**)
  - `src/adapters/registry.ts` (import-statement, contributes 477 bytes, specifier: `../adapters/registry.ts`)
  - `src/backends/registry.ts` (import-statement, contributes 348 bytes, specifier: `../backends/registry.ts`)
  - `src/backends/identity.ts` (import-statement, contributes 2.72 KB, specifier: `../backends/identity.ts`)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `../presence/store.ts`)
  - `src/policy/model.ts` (import-statement, contributes 2.42 KB, specifier: `../policy/model.ts`)
  - `src/control/outcome.ts` (import-statement, contributes 1.59 KB, specifier: `./outcome.ts`)
  - `src/config.ts` (import-statement, contributes 13.77 KB, specifier: `../config.ts`)

### `src/control/outcome.ts`

- **Output contribution**: 1.59 KB
- **Format**: esm
- **Imported by** (1 files): `src/control/dispatch.ts`
- **Imports**:
  - `node:fs` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `src/presence/schema.ts` (import-statement, contributes 191 bytes, specifier: `../presence/schema.ts`)
  - `src/presence/inbox.ts` (import-statement, contributes 80 bytes, specifier: `../presence/inbox.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)

### `src/daemon/events.ts`

- **Output contribution**: 8.38 KB
- **Format**: esm
- **Imported by** (2 files): `src/daemon/orchd.ts` `src/daemon/work-loop.ts`
- **Imports**:
  - `node:fs` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `src/entities.ts` (import-statement, contributes 2.68 KB, specifier: `../entities.ts`)
  - `src/notify/router.ts` (import-statement, contributes 6.94 KB, specifier: `../notify/router.ts`)
  - `src/notify/format.ts` (import-statement, contributes 3.57 KB, specifier: `../notify/format.ts`)
  - `src/presence/schema.ts` (import-statement, contributes 191 bytes, specifier: `../presence/schema.ts`)
  - `src/presence/writer.ts` (import-statement, contributes 0.99 KB, specifier: `../presence/writer.ts`)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `../presence/store.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)
  - `src/policy/workspace.ts` (import-statement, contributes 1.49 KB, specifier: `../policy/workspace.ts`)
  - `src/worker-prompt.ts` (import-statement, contributes 1.40 KB, specifier: `../worker-prompt.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)

### `src/daemon/lifecycle.ts`

- **Output contribution**: 4.46 KB
- **Format**: esm
- **Imported by** (5 files): `src/daemon/orchd.ts` `src/daemon/rpc.ts` `src/adapters/pi.ts` `src/doctor/extensions.ts` `src/commands/daemon.ts`
- **Imports**:
  - `node:child_process` (import-statement, **external**)
  - `node:crypto` (import-statement, **external**)
  - `node:fs` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `../presence/store.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)
  - `src/daemon/runtime-files.ts` (import-statement, contributes 264 bytes, specifier: `./runtime-files.ts`)

### `src/daemon/orchd.ts`

- **Output contribution**: 12.39 KB
- **Format**: esm
- **Imported by**: (entry point or orphan)
- **Imports**:
  - `src/store/suppress-sqlite-warning.ts` (import-statement, contributes 293 bytes, specifier: `../store/suppress-sqlite-warning.ts`)
  - `src/daemon/lifecycle.ts` (import-statement, contributes 4.46 KB, specifier: `./lifecycle.ts`)
  - `src/daemon/rpc.ts` (import-statement, contributes 12.10 KB, specifier: `./rpc.ts`)
  - `src/config.ts` (import-statement, contributes 13.77 KB, specifier: `../config.ts`)
  - `src/notify/router.ts` (import-statement, contributes 6.94 KB, specifier: `../notify/router.ts`)
  - `src/daemon/work-loop.ts` (import-statement, contributes 7.58 KB, specifier: `./work-loop.ts`)
  - `src/daemon/events.ts` (import-statement, contributes 8.38 KB, specifier: `./events.ts`)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `../presence/store.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)
  - `node:fs` (import-statement, **external**)
  - `node:url` (import-statement, **external**)
  - `node:crypto` (import-statement, **external**)
  - `src/store/sqlite.ts` (import-statement, contributes 9.1 KB, specifier: `../store/sqlite.ts`)
  - `src/policy/workspace.ts` (import-statement, contributes 1.49 KB, specifier: `../policy/workspace.ts`)
  - `src/policy/model.ts` (import-statement, contributes 2.42 KB, specifier: `../policy/model.ts`)
  - `src/daemon/outbox.ts` (import-statement, contributes 1.16 KB, specifier: `./outbox.ts`)
  - `src/backends/identity.ts` (import-statement, contributes 2.72 KB, specifier: `../backends/identity.ts`)
  - `src/control/dispatch.ts` (import-statement, contributes 6.1 KB, specifier: `../control/dispatch.ts`)
  - `src/adapters/registry.ts` (import-statement, contributes 477 bytes, specifier: `../adapters/registry.ts`)
  - `src/adapters/adapter.ts` (import-statement, contributes 312 bytes, specifier: `../adapters/adapter.ts`)
  - `src/backends/registry.ts` (import-statement, contributes 348 bytes, specifier: `../backends/registry.ts`)
  - `src/commands/status.ts` (import-statement, contributes 5.0 KB, specifier: `../commands/status.ts`)

### `src/daemon/outbox.ts`

- **Output contribution**: 1.16 KB
- **Format**: esm
- **Imported by** (1 files): `src/daemon/orchd.ts`
- **Imports**:
  - `src/store/sqlite.ts` (import-statement, contributes 9.1 KB, specifier: `../store/sqlite.ts`)

### `src/daemon/rpc.ts`

- **Output contribution**: 12.10 KB
- **Format**: esm
- **Imported by** (3 files): `src/daemon/orchd.ts` `src/commands/status.ts` `src/commands/daemon.ts`
- **Imports**:
  - `node:net` (import-statement, **external**)
  - `node:fs` (import-statement, **external**)
  - `src/daemon/lifecycle.ts` (import-statement, contributes 4.46 KB, specifier: `./lifecycle.ts`)
  - `src/daemon/runtime-files.ts` (import-statement, contributes 264 bytes, specifier: `./runtime-files.ts`)
  - `src/presence/socket-client.ts` (import-statement, contributes 0.63 KB, specifier: `../presence/socket-client.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)

### `src/daemon/runtime-files.ts`

- **Output contribution**: 264 bytes
- **Format**: esm
- **Imported by** (4 files): `src/daemon/rpc.ts` `src/daemon/lifecycle.ts` `src/presence/socket-client.ts` `src/commands/daemon.ts`
- **Imports**:
  - `node:path` (import-statement, **external**)

### `src/daemon/work-loop.ts`

- **Output contribution**: 7.58 KB
- **Format**: esm
- **Imported by** (1 files): `src/daemon/orchd.ts`
- **Imports**:
  - `node:child_process` (import-statement, **external**)
  - `node:crypto` (import-statement, **external**)
  - `src/control/dispatch.ts` (import-statement, contributes 6.1 KB, specifier: `../control/dispatch.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)
  - `src/queue.ts` (import-statement, contributes 1.46 KB, specifier: `../queue.ts`)
  - `src/daemon/events.ts` (import-statement, contributes 8.38 KB, specifier: `./events.ts`)
  - `src/notify/router.ts` (import-statement, contributes 6.94 KB, specifier: `../notify/router.ts`)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `../presence/store.ts`)
  - `src/policy/workspace.ts` (import-statement, contributes 1.49 KB, specifier: `../policy/workspace.ts`)
  - `src/config.ts` (import-statement, contributes 13.77 KB, specifier: `../config.ts`)
  - `src/worker-prompt.ts` (import-statement, contributes 1.40 KB, specifier: `../worker-prompt.ts`)
  - `src/adapters/registry.ts` (import-statement, contributes 477 bytes, specifier: `../adapters/registry.ts`)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `../presence/store.ts`)

### `src/doctor/extensions.ts`

- **Output contribution**: 0.54 KB
- **Format**: esm
- **Imported by** (1 files): `src/commands/status.ts`
- **Imports**:
  - `node:fs` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `src/daemon/lifecycle.ts` (import-statement, contributes 4.46 KB, specifier: `../daemon/lifecycle.ts`)
  - `src/bridge-bundle.ts` (import-statement, contributes 1.1 KB, specifier: `../bridge-bundle.ts`)
  - `src/presence/schema.ts` (import-statement, contributes 191 bytes, specifier: `../presence/schema.ts`)
  - `src/doctor/shared.ts` (import-statement, specifier: `./shared.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)

### `src/doctor/shared.ts`

- **Format**: esm
- **Imported by** (1 files): `src/doctor/extensions.ts`
- **Imports**:
  - `node:fs` (import-statement, **external**)
  - `node:child_process` (import-statement, **external**)
  - `node:os` (import-statement, **external**)
  - `node:path` (import-statement, **external**)

### `src/entities.ts`

- **Output contribution**: 2.68 KB
- **Format**: esm
- **Imported by** (3 files): `src/daemon/events.ts` `src/commands/status.ts` `src/commands/target.ts`
- **Imports**:
  - `src/config.ts` (import-statement, contributes 13.77 KB, specifier: `./config.ts`)
  - `src/backends/registry.ts` (import-statement, contributes 348 bytes, specifier: `./backends/registry.ts`)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `./presence/store.ts`)
  - `src/backends/identity.ts` (import-statement, contributes 2.72 KB, specifier: `./backends/identity.ts`)
  - `src/policy/workspace.ts` (import-statement, contributes 1.49 KB, specifier: `./policy/workspace.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `./util.ts`)
  - `src/notify/format.ts` (import-statement, contributes 3.57 KB, specifier: `./notify/format.ts`)
  - `src/policy/workspace.ts` (import-statement, contributes 1.49 KB, specifier: `./policy/workspace.ts`)
  - `src/recipient.ts` (import-statement, specifier: `./recipient.ts`)

### `src/notify/format.ts`

- **Output contribution**: 3.57 KB
- **Format**: esm
- **Imported by** (5 files): `src/daemon/events.ts` `src/notify/router.ts` `src/notify/sinks.ts` `src/entities.ts` `src/recipient.ts`
- **Imports**:
  - `src/policy/workspace.ts` (import-statement, contributes 1.49 KB, specifier: `../policy/workspace.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)

### `src/notify/router.ts`

- **Output contribution**: 6.94 KB
- **Format**: esm
- **Imported by** (3 files): `src/daemon/orchd.ts` `src/daemon/events.ts` `src/daemon/work-loop.ts`
- **Imports**:
  - `src/config.ts` (import-statement, contributes 13.77 KB, specifier: `../config.ts`)
  - `src/notify/sinks.ts` (import-statement, contributes 4.94 KB, specifier: `./sinks.ts`)
  - `src/notify/format.ts` (import-statement, contributes 3.57 KB, specifier: `./format.ts`)

### `src/notify/sinks.ts`

- **Output contribution**: 4.94 KB
- **Format**: esm
- **Imported by** (2 files): `src/notify/router.ts` `src/backends/herdr/index.ts`
- **Imports**:
  - `node:child_process` (import-statement, **external**)
  - `node:fs` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)
  - `src/notify/format.ts` (import-statement, contributes 3.57 KB, specifier: `./format.ts`)

### `src/policy/model.ts`

- **Output contribution**: 2.42 KB
- **Format**: esm
- **Imported by** (2 files): `src/daemon/orchd.ts` `src/control/dispatch.ts`
- **Imports**:
  - `src/config.ts` (import-statement, contributes 13.77 KB, specifier: `../config.ts`)

### `src/policy/spawner.ts`

- **Format**: esm
- **Imported by** (1 files): `src/commands/target.ts`
- **Imports**:
  - `src/backends/identity.ts` (import-statement, contributes 2.72 KB, specifier: `../backends/identity.ts`)
  - `src/adapters/registry.ts` (import-statement, contributes 477 bytes, specifier: `../adapters/registry.ts`)
  - `src/presence/store.ts` (import-statement, contributes 1.47 KB, specifier: `../presence/store.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)

### `src/policy/workspace.ts`

- **Output contribution**: 1.49 KB
- **Format**: esm
- **Imported by** (8 files): `src/daemon/orchd.ts` `src/daemon/events.ts` `src/daemon/work-loop.ts` `src/commands/status.ts` `src/notify/format.ts` +3 more
- **Imports**:
  - `src/backends/identity.ts` (import-statement, contributes 2.72 KB, specifier: `../backends/identity.ts`)
  - `src/config.ts` (import-statement, contributes 13.77 KB, specifier: `../config.ts`)

### `src/presence/inbox.ts`

- **Output contribution**: 80 bytes
- **Format**: esm
- **Imported by** (1 files): `src/control/outcome.ts`
- **Imports**:
  - `node:fs` (import-statement, **external**)
  - `src/presence/schema.ts` (import-statement, contributes 191 bytes, specifier: `./schema.ts`)
  - `src/presence/writer.ts` (import-statement, contributes 0.99 KB, specifier: `./writer.ts`)

### `src/presence/schema.ts`

- **Output contribution**: 191 bytes
- **Format**: esm
- **Imported by** (9 files): `src/daemon/events.ts` `src/presence/store.ts` `src/backends/tmux/index.ts` `src/backends/headless/index.ts` `src/adapters/pi.ts` +4 more

### `src/presence/socket-client.ts`

- **Output contribution**: 0.63 KB
- **Format**: esm
- **Imported by** (1 files): `src/daemon/rpc.ts`
- **Imports**:
  - `node:net` (import-statement, **external**)
  - `node:fs` (import-statement, **external**)
  - `src/daemon/runtime-files.ts` (import-statement, contributes 264 bytes, specifier: `../daemon/runtime-files.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)

### `src/presence/store.ts`

- **Output contribution**: 1.47 KB
- **Format**: esm
- **Imported by** (17 files): `src/daemon/orchd.ts` `src/daemon/lifecycle.ts` `src/backends/identity.ts` `src/daemon/events.ts` `src/control/dispatch.ts` +12 more
- **Imports**:
  - `node:fs` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `src/presence/schema.ts` (import-statement, contributes 191 bytes, specifier: `./schema.ts`)
  - `src/presence/writer.ts` (import-statement, contributes 0.99 KB, specifier: `./writer.ts`)
  - `src/store/sqlite.ts` (import-statement, contributes 9.1 KB, specifier: `../store/sqlite.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)

### `src/presence/writer.ts`

- **Output contribution**: 0.99 KB
- **Format**: esm
- **Imported by** (5 files): `src/daemon/events.ts` `src/presence/store.ts` `src/adapters/model-catalogue.ts` `src/adapters/catalogue-store.ts` `src/presence/inbox.ts`
- **Imports**:
  - `node:os` (import-statement, **external**)
  - `node:fs` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `src/presence/schema.ts` (import-statement, contributes 191 bytes, specifier: `./schema.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `../util.ts`)

### `src/queue.ts`

- **Output contribution**: 1.46 KB
- **Format**: esm
- **Imported by** (1 files): `src/daemon/work-loop.ts`
- **Imports**:
  - `node:crypto` (import-statement, **external**)
  - `src/store/sqlite.ts` (import-statement, contributes 9.1 KB, specifier: `./store/sqlite.ts`)

### `src/recipient.ts`

- **Format**: esm
- **Imported by** (1 files): `src/entities.ts`
- **Imports**:
  - `src/notify/format.ts` (import-statement, contributes 3.57 KB, specifier: `./notify/format.ts`)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `./util.ts`)

### `src/remote.ts`

- **Format**: esm
- **Imported by** (2 files): `src/commands/status.ts` `src/commands/target.ts`
- **Imports**:
  - `node:child_process` (import-statement, **external**)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `./util.ts`)

### `src/retry.ts`

- **Output contribution**: 1.21 KB
- **Format**: esm
- **Imported by** (1 files): `src/adapters/model-catalogue.ts`
- **Imports**:
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `./util.ts`)

### `src/runtime.ts`

- **Output contribution**: 0.64 KB
- **Format**: esm
- **Imported by** (3 files): `src/config.ts` `src/adapters/codex-notify.ts` `src/adapters/claude-hooks.ts`
- **Imports**:
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `./util.ts`)

### `src/session.ts`

- **Output contribution**: 5.20 KB
- **Format**: esm
- **Imported by** (1 files): `src/adapters/pi.ts`
- **Imports**:
  - `node:fs` (import-statement, **external**)
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `./util.ts`)

### `src/store/sqlite.ts`

- **Output contribution**: 9.1 KB
- **Format**: esm
- **Imported by** (4 files): `src/daemon/orchd.ts` `src/daemon/outbox.ts` `src/presence/store.ts` `src/queue.ts`
- **Imports**:
  - `node:module` (import-statement, **external**)
  - `node:fs` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `src/adapters/adapter.ts` (import-statement, contributes 312 bytes, specifier: `../adapters/adapter.ts`)
  - `src/backends/backend.ts` (import-statement, contributes 177 bytes, specifier: `../backends/backend.ts`)

### `src/store/suppress-sqlite-warning.ts`

- **Output contribution**: 293 bytes
- **Format**: esm
- **Imported by** (1 files): `src/daemon/orchd.ts`

### `src/table.ts`

- **Format**: esm
- **Imported by** (1 files): `src/commands/status.ts`
- **Imports**:
  - `src/util.ts` (import-statement, contributes 2.31 KB, specifier: `./util.ts`)

### `src/util.ts`

- **Output contribution**: 2.31 KB
- **Format**: esm
- **Imported by** (41 files): `src/daemon/orchd.ts` `src/daemon/rpc.ts` `src/daemon/lifecycle.ts` `src/daemon/events.ts` `src/daemon/events.ts` +36 more
- **Imports**:
  - `node:fs` (import-statement, **external**)
  - `node:path` (import-statement, **external**)
  - `node:url` (import-statement, **external**)

### `src/worker-prompt.ts`

- **Output contribution**: 1.40 KB
- **Format**: esm
- **Imported by** (2 files): `src/daemon/events.ts` `src/daemon/work-loop.ts`

## Raw Data for Searching

This section contains raw, grep-friendly data. Use these patterns:
- `[MODULE:` - Find all modules
- `[OUTPUT_BYTES:` - Find output contribution for each module
- `[IMPORT:` - Find all import relationships
- `[IMPORTED_BY:` - Find reverse dependencies
- `[ENTRY:` - Find entry points
- `[EXTERNAL:` - Find external imports
- `[NODE_MODULES:` - Find node_modules files

### All Modules

```
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js = 65411 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js = 45253 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js = 19939 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js = 19815 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js = 16777 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js = 16267 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js = 16245 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js]
[MODULE: src/config.ts]
[OUTPUT_BYTES: src/config.ts = 13770 bytes]
[FORMAT: src/config.ts = esm]
[MODULE: src/adapters/pi.ts]
[OUTPUT_BYTES: src/adapters/pi.ts = 12890 bytes]
[FORMAT: src/adapters/pi.ts = esm]
[MODULE: src/daemon/orchd.ts]
[OUTPUT_BYTES: src/daemon/orchd.ts = 12386 bytes]
[FORMAT: src/daemon/orchd.ts = esm]
[MODULE: src/daemon/rpc.ts]
[OUTPUT_BYTES: src/daemon/rpc.ts = 12101 bytes]
[FORMAT: src/daemon/rpc.ts = esm]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js = 11306 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js]
[MODULE: src/backends/herdr/index.ts]
[OUTPUT_BYTES: src/backends/herdr/index.ts = 9987 bytes]
[FORMAT: src/backends/herdr/index.ts = esm]
[MODULE: src/adapters/codex.ts]
[OUTPUT_BYTES: src/adapters/codex.ts = 9712 bytes]
[FORMAT: src/adapters/codex.ts = esm]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/he.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/he.js = 9684 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/he.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/he.js]
[MODULE: src/adapters/claude.ts]
[OUTPUT_BYTES: src/adapters/claude.ts = 9162 bytes]
[FORMAT: src/adapters/claude.ts = esm]
[MODULE: src/store/sqlite.ts]
[OUTPUT_BYTES: src/store/sqlite.ts = 9099 bytes]
[FORMAT: src/store/sqlite.ts = esm]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js = 8866 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[MODULE: src/daemon/events.ts]
[OUTPUT_BYTES: src/daemon/events.ts = 8377 bytes]
[FORMAT: src/daemon/events.ts = esm]
[MODULE: src/daemon/work-loop.ts]
[OUTPUT_BYTES: src/daemon/work-loop.ts = 7581 bytes]
[FORMAT: src/daemon/work-loop.ts = esm]
[MODULE: src/backends/tmux/index.ts]
[OUTPUT_BYTES: src/backends/tmux/index.ts = 7544 bytes]
[FORMAT: src/backends/tmux/index.ts = esm]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js = 7519 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js]
[MODULE: src/notify/router.ts]
[OUTPUT_BYTES: src/notify/router.ts = 6943 bytes]
[FORMAT: src/notify/router.ts = esm]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js = 6908 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/lt.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/lt.js = 6838 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/lt.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/lt.js]
[MODULE: src/control/dispatch.ts]
[OUTPUT_BYTES: src/control/dispatch.ts = 6071 bytes]
[FORMAT: src/control/dispatch.ts = esm]
[MODULE: src/backends/headless/index.ts]
[OUTPUT_BYTES: src/backends/headless/index.ts = 6044 bytes]
[FORMAT: src/backends/headless/index.ts = esm]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ru.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ru.js = 5824 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ru.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ru.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ta.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ta.js = 5733 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ta.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ta.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/be.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/be.js = 5726 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/be.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/be.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/th.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/th.js = 5656 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/th.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/th.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/km.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/km.js = 5608 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/km.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/km.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ka.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ka.js = 5561 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ka.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ka.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hy.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hy.js = 5549 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hy.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hy.js]
[MODULE: src/session.ts]
[OUTPUT_BYTES: src/session.ts = 5196 bytes]
[FORMAT: src/session.ts = esm]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/bg.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/bg.js = 5057 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/bg.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/bg.js]
[MODULE: src/commands/status.ts]
[OUTPUT_BYTES: src/commands/status.ts = 5029 bytes]
[FORMAT: src/commands/status.ts = esm]
[MODULE: src/notify/sinks.ts]
[OUTPUT_BYTES: src/notify/sinks.ts = 4941 bytes]
[FORMAT: src/notify/sinks.ts = esm]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/el.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/el.js = 4915 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/el.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/el.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uk.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uk.js = 4809 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uk.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uk.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/es.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/es.js = 4717 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/es.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/es.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js = 4642 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ur.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ur.js = 4638 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ur.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ur.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ar.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ar.js = 4573 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ar.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ar.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/mk.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/mk.js = 4528 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/mk.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/mk.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fa.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fa.js = 4462 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fa.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fa.js]
[MODULE: src/daemon/lifecycle.ts]
[OUTPUT_BYTES: src/daemon/lifecycle.ts = 4460 bytes]
[FORMAT: src/daemon/lifecycle.ts = esm]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr.js = 4453 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hr.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hr.js = 4369 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hr.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hr.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pl.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pl.js = 4337 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pl.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pl.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ko.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ko.js = 4275 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ko.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ko.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ps.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ps.js = 4240 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ps.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ps.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ja.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ja.js = 4238 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ja.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ja.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fi.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fi.js = 4167 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fi.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fi.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/vi.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/vi.js = 4150 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/vi.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/vi.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/da.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/da.js = 4145 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/da.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/da.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/cs.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/cs.js = 4132 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/cs.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/cs.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/nl.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/nl.js = 4125 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/nl.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/nl.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ro.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ro.js = 4116 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ro.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ro.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uz.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uz.js = 4110 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uz.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uz.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hu.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hu.js = 4075 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hu.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hu.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/yo.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/yo.js = 4049 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/yo.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/yo.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sv.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sv.js = 4026 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sv.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sv.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/is.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/is.js = 4006 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/is.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/is.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ca.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ca.js = 4006 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ca.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ca.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/eo.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/eo.js = 3979 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/eo.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/eo.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/de.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/de.js = 3965 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/de.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/de.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/id.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/id.js = 3964 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/id.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/id.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/it.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/it.js = 3962 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/it.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/it.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pt.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pt.js = 3948 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pt.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pt.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/en.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/en.js = 3945 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/en.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/en.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sl.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sl.js = 3938 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sl.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sl.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr-CA.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr-CA.js = 3937 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr-CA.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr-CA.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/az.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/az.js = 3904 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/az.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/az.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ota.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ota.js = 3901 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ota.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ota.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/no.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/no.js = 3885 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/no.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/no.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-TW.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-TW.js = 3880 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-TW.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-TW.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ms.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ms.js = 3873 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ms.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ms.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/tr.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/tr.js = 3849 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/tr.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/tr.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-CN.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-CN.js = 3829 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-CN.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-CN.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js = 3790 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js]
[MODULE: src/notify/format.ts]
[OUTPUT_BYTES: src/notify/format.ts = 3570 bytes]
[FORMAT: src/notify/format.ts = esm]
[MODULE: src/backends/herdr/cli.ts]
[OUTPUT_BYTES: src/backends/herdr/cli.ts = 3106 bytes]
[FORMAT: src/backends/herdr/cli.ts = esm]
[MODULE: src/adapters/omp.ts]
[OUTPUT_BYTES: src/adapters/omp.ts = 2924 bytes]
[FORMAT: src/adapters/omp.ts = esm]
[MODULE: src/backends/identity.ts]
[OUTPUT_BYTES: src/backends/identity.ts = 2719 bytes]
[FORMAT: src/backends/identity.ts = esm]
[MODULE: src/adapters/model-catalogue.ts]
[OUTPUT_BYTES: src/adapters/model-catalogue.ts = 2689 bytes]
[FORMAT: src/adapters/model-catalogue.ts = esm]
[MODULE: src/entities.ts]
[OUTPUT_BYTES: src/entities.ts = 2679 bytes]
[FORMAT: src/entities.ts = esm]
[MODULE: src/policy/model.ts]
[OUTPUT_BYTES: src/policy/model.ts = 2421 bytes]
[FORMAT: src/policy/model.ts = esm]
[MODULE: src/util.ts]
[OUTPUT_BYTES: src/util.ts = 2306 bytes]
[FORMAT: src/util.ts = esm]
[MODULE: src/adapters/codex-notify.ts]
[OUTPUT_BYTES: src/adapters/codex-notify.ts = 2293 bytes]
[FORMAT: src/adapters/codex-notify.ts = esm]
[MODULE: src/backends/tmux/cli.ts]
[OUTPUT_BYTES: src/backends/tmux/cli.ts = 2255 bytes]
[FORMAT: src/backends/tmux/cli.ts = esm]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js = 2006 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-generator.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-generator.js = 1594 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-generator.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-generator.js]
[MODULE: src/control/outcome.ts]
[OUTPUT_BYTES: src/control/outcome.ts = 1587 bytes]
[FORMAT: src/control/outcome.ts = esm]
[MODULE: src/adapters/transcript.ts]
[OUTPUT_BYTES: src/adapters/transcript.ts = 1539 bytes]
[FORMAT: src/adapters/transcript.ts = esm]
[MODULE: src/policy/workspace.ts]
[OUTPUT_BYTES: src/policy/workspace.ts = 1493 bytes]
[FORMAT: src/policy/workspace.ts = esm]
[MODULE: src/presence/store.ts]
[OUTPUT_BYTES: src/presence/store.ts = 1467 bytes]
[FORMAT: src/presence/store.ts = esm]
[MODULE: src/queue.ts]
[OUTPUT_BYTES: src/queue.ts = 1463 bytes]
[FORMAT: src/queue.ts = esm]
[MODULE: src/worker-prompt.ts]
[OUTPUT_BYTES: src/worker-prompt.ts = 1404 bytes]
[FORMAT: src/worker-prompt.ts = esm]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js = 1322 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[MODULE: src/retry.ts]
[OUTPUT_BYTES: src/retry.ts = 1214 bytes]
[FORMAT: src/retry.ts = esm]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js = 1210 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js = 1193 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js]
[MODULE: src/adapters/catalogue-store.ts]
[OUTPUT_BYTES: src/adapters/catalogue-store.ts = 1180 bytes]
[FORMAT: src/adapters/catalogue-store.ts = esm]
[MODULE: src/daemon/outbox.ts]
[OUTPUT_BYTES: src/daemon/outbox.ts = 1160 bytes]
[FORMAT: src/daemon/outbox.ts = esm]
[MODULE: src/bridge-bundle.ts]
[OUTPUT_BYTES: src/bridge-bundle.ts = 1087 bytes]
[FORMAT: src/bridge-bundle.ts = esm]
[MODULE: src/presence/writer.ts]
[OUTPUT_BYTES: src/presence/writer.ts = 989 bytes]
[FORMAT: src/presence/writer.ts = esm]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/doc.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/doc.js = 915 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/doc.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/doc.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js = 883 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js = 858 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js = 736 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js]
[MODULE: src/runtime.ts]
[OUTPUT_BYTES: src/runtime.ts = 643 bytes]
[FORMAT: src/runtime.ts = esm]
[MODULE: src/presence/socket-client.ts]
[OUTPUT_BYTES: src/presence/socket-client.ts = 630 bytes]
[FORMAT: src/presence/socket-client.ts = esm]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/compat.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/compat.js = 624 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/compat.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/compat.js]
[MODULE: src/doctor/extensions.ts]
[OUTPUT_BYTES: src/doctor/extensions.ts = 544 bytes]
[FORMAT: src/doctor/extensions.ts = esm]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/coerce.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/coerce.js = 540 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/coerce.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/coerce.js]
[MODULE: src/adapters/claude-hooks.ts]
[OUTPUT_BYTES: src/adapters/claude-hooks.ts = 482 bytes]
[FORMAT: src/adapters/claude-hooks.ts = esm]
[MODULE: src/adapters/registry.ts]
[OUTPUT_BYTES: src/adapters/registry.ts = 477 bytes]
[FORMAT: src/adapters/registry.ts = esm]
[MODULE: src/backends/herdr/notify.ts]
[OUTPUT_BYTES: src/backends/herdr/notify.ts = 394 bytes]
[FORMAT: src/backends/herdr/notify.ts = esm]
[MODULE: src/backends/registry.ts]
[OUTPUT_BYTES: src/backends/registry.ts = 348 bytes]
[FORMAT: src/backends/registry.ts = esm]
[MODULE: src/adapters/adapter.ts]
[OUTPUT_BYTES: src/adapters/adapter.ts = 312 bytes]
[FORMAT: src/adapters/adapter.ts = esm]
[MODULE: src/store/suppress-sqlite-warning.ts]
[OUTPUT_BYTES: src/store/suppress-sqlite-warning.ts = 293 bytes]
[FORMAT: src/store/suppress-sqlite-warning.ts = esm]
[MODULE: src/daemon/runtime-files.ts]
[OUTPUT_BYTES: src/daemon/runtime-files.ts = 264 bytes]
[FORMAT: src/daemon/runtime-files.ts = esm]
[MODULE: src/commands/target.ts]
[OUTPUT_BYTES: src/commands/target.ts = 213 bytes]
[FORMAT: src/commands/target.ts = esm]
[MODULE: src/presence/schema.ts]
[OUTPUT_BYTES: src/presence/schema.ts = 191 bytes]
[FORMAT: src/presence/schema.ts = esm]
[MODULE: src/backends/backend.ts]
[OUTPUT_BYTES: src/backends/backend.ts = 177 bytes]
[FORMAT: src/backends/backend.ts = esm]
[MODULE: src/presence/inbox.ts]
[OUTPUT_BYTES: src/presence/inbox.ts = 80 bytes]
[FORMAT: src/presence/inbox.ts = esm]
[MODULE: src/backends/tiling.ts]
[OUTPUT_BYTES: src/backends/tiling.ts = 61 bytes]
[FORMAT: src/backends/tiling.ts = esm]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/versions.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/versions.js = 54 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/versions.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/versions.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/kh.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/kh.js = 49 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/kh.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/kh.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ua.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ua.js = 49 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ua.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ua.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema.js]
[OUTPUT_BYTES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema.js = 30 bytes]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema.js]
[MODULE: node_modules/.bun/zod@4.4.3/node_modules/zod/index.js]
[FORMAT: node_modules/.bun/zod@4.4.3/node_modules/zod/index.js = esm]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/index.js]
[MODULE: src/remote.ts]
[FORMAT: src/remote.ts = esm]
[MODULE: src/table.ts]
[FORMAT: src/table.ts = esm]
[MODULE: src/commands/daemon.ts]
[FORMAT: src/commands/daemon.ts = esm]
[MODULE: src/recipient.ts]
[FORMAT: src/recipient.ts = esm]
[MODULE: src/policy/spawner.ts]
[FORMAT: src/policy/spawner.ts = esm]
[MODULE: src/doctor/shared.ts]
[FORMAT: src/doctor/shared.ts = esm]
```

### All Imports

```
[IMPORT: src/daemon/orchd.ts -> src/store/suppress-sqlite-warning.ts]
[IMPORT: src/daemon/orchd.ts -> src/daemon/lifecycle.ts]
[IMPORT: src/daemon/orchd.ts -> src/daemon/rpc.ts]
[IMPORT: src/daemon/orchd.ts -> src/config.ts]
[IMPORT: src/daemon/orchd.ts -> src/notify/router.ts]
[IMPORT: src/daemon/orchd.ts -> src/daemon/work-loop.ts]
[IMPORT: src/daemon/orchd.ts -> src/daemon/events.ts]
[IMPORT: src/daemon/orchd.ts -> src/presence/store.ts]
[IMPORT: src/daemon/orchd.ts -> src/util.ts]
[EXTERNAL: src/daemon/orchd.ts imports node:fs]
[EXTERNAL: src/daemon/orchd.ts imports node:url]
[EXTERNAL: src/daemon/orchd.ts imports node:crypto]
[IMPORT: src/daemon/orchd.ts -> src/store/sqlite.ts]
[IMPORT: src/daemon/orchd.ts -> src/policy/workspace.ts]
[IMPORT: src/daemon/orchd.ts -> src/policy/model.ts]
[IMPORT: src/daemon/orchd.ts -> src/daemon/outbox.ts]
[IMPORT: src/daemon/orchd.ts -> src/backends/identity.ts]
[IMPORT: src/daemon/orchd.ts -> src/control/dispatch.ts]
[IMPORT: src/daemon/orchd.ts -> src/adapters/registry.ts]
[IMPORT: src/daemon/orchd.ts -> src/adapters/adapter.ts]
[IMPORT: src/daemon/orchd.ts -> src/backends/registry.ts]
[IMPORT: src/daemon/orchd.ts -> src/commands/status.ts]
[EXTERNAL: src/daemon/rpc.ts imports node:net]
[EXTERNAL: src/daemon/rpc.ts imports node:fs]
[IMPORT: src/daemon/rpc.ts -> src/daemon/lifecycle.ts]
[IMPORT: src/daemon/rpc.ts -> src/daemon/runtime-files.ts]
[IMPORT: src/daemon/rpc.ts -> src/presence/socket-client.ts]
[IMPORT: src/daemon/rpc.ts -> src/util.ts]
[IMPORT: src/daemon/outbox.ts -> src/store/sqlite.ts]
[EXTERNAL: src/daemon/lifecycle.ts imports node:child_process]
[EXTERNAL: src/daemon/lifecycle.ts imports node:crypto]
[EXTERNAL: src/daemon/lifecycle.ts imports node:fs]
[EXTERNAL: src/daemon/lifecycle.ts imports node:path]
[IMPORT: src/daemon/lifecycle.ts -> src/presence/store.ts]
[IMPORT: src/daemon/lifecycle.ts -> src/util.ts]
[IMPORT: src/daemon/lifecycle.ts -> src/daemon/runtime-files.ts]
[EXTERNAL: src/backends/identity.ts imports node:crypto]
[IMPORT: src/backends/identity.ts -> src/presence/store.ts]
[EXTERNAL: src/daemon/events.ts imports node:fs]
[EXTERNAL: src/daemon/events.ts imports node:path]
[IMPORT: src/daemon/events.ts -> src/entities.ts]
[IMPORT: src/daemon/events.ts -> src/notify/router.ts]
[IMPORT: src/daemon/events.ts -> src/notify/format.ts]
[IMPORT: src/daemon/events.ts -> src/presence/schema.ts]
[IMPORT: src/daemon/events.ts -> src/presence/writer.ts]
[IMPORT: src/daemon/events.ts -> src/presence/store.ts]
[IMPORT: src/daemon/events.ts -> src/util.ts]
[IMPORT: src/daemon/events.ts -> src/policy/workspace.ts]
[IMPORT: src/daemon/events.ts -> src/worker-prompt.ts]
[IMPORT: src/daemon/events.ts -> src/util.ts]
[EXTERNAL: src/control/dispatch.ts imports node:child_process]
[IMPORT: src/control/dispatch.ts -> src/adapters/registry.ts]
[IMPORT: src/control/dispatch.ts -> src/backends/registry.ts]
[IMPORT: src/control/dispatch.ts -> src/backends/identity.ts]
[IMPORT: src/control/dispatch.ts -> src/presence/store.ts]
[IMPORT: src/control/dispatch.ts -> src/policy/model.ts]
[IMPORT: src/control/dispatch.ts -> src/control/outcome.ts]
[IMPORT: src/control/dispatch.ts -> src/config.ts]
[EXTERNAL: src/util.ts imports node:fs]
[EXTERNAL: src/util.ts imports node:path]
[EXTERNAL: src/util.ts imports node:url]
[EXTERNAL: src/store/sqlite.ts imports node:module]
[EXTERNAL: src/store/sqlite.ts imports node:fs]
[EXTERNAL: src/store/sqlite.ts imports node:path]
[IMPORT: src/store/sqlite.ts -> src/adapters/adapter.ts]
[IMPORT: src/store/sqlite.ts -> src/backends/backend.ts]
[IMPORT: src/policy/workspace.ts -> src/backends/identity.ts]
[IMPORT: src/policy/workspace.ts -> src/config.ts]
[EXTERNAL: src/config.ts imports node:fs]
[EXTERNAL: src/config.ts imports node:path]
[IMPORT: src/config.ts -> node_modules/.bun/zod@4.4.3/node_modules/zod/index.js]
[IMPORT: src/config.ts -> src/adapters/adapter.ts]
[IMPORT: src/config.ts -> src/backends/backend.ts]
[IMPORT: src/config.ts -> src/backends/tiling.ts]
[IMPORT: src/config.ts -> src/runtime.ts]
[IMPORT: src/config.ts -> src/util.ts]
[IMPORT: src/notify/router.ts -> src/config.ts]
[IMPORT: src/notify/router.ts -> src/notify/sinks.ts]
[IMPORT: src/notify/router.ts -> src/notify/format.ts]
[EXTERNAL: src/daemon/work-loop.ts imports node:child_process]
[EXTERNAL: src/daemon/work-loop.ts imports node:crypto]
[IMPORT: src/daemon/work-loop.ts -> src/control/dispatch.ts]
[IMPORT: src/daemon/work-loop.ts -> src/util.ts]
[IMPORT: src/daemon/work-loop.ts -> src/queue.ts]
[IMPORT: src/daemon/work-loop.ts -> src/daemon/events.ts]
[IMPORT: src/daemon/work-loop.ts -> src/notify/router.ts]
[IMPORT: src/daemon/work-loop.ts -> src/presence/store.ts]
[IMPORT: src/daemon/work-loop.ts -> src/policy/workspace.ts]
[IMPORT: src/daemon/work-loop.ts -> src/config.ts]
[IMPORT: src/daemon/work-loop.ts -> src/worker-prompt.ts]
[IMPORT: src/daemon/work-loop.ts -> src/adapters/registry.ts]
[IMPORT: src/daemon/work-loop.ts -> src/presence/store.ts]
[EXTERNAL: src/presence/store.ts imports node:fs]
[EXTERNAL: src/presence/store.ts imports node:path]
[IMPORT: src/presence/store.ts -> src/presence/schema.ts]
[IMPORT: src/presence/store.ts -> src/presence/writer.ts]
[IMPORT: src/presence/store.ts -> src/store/sqlite.ts]
[IMPORT: src/presence/store.ts -> src/util.ts]
[IMPORT: src/policy/model.ts -> src/config.ts]
[IMPORT: src/adapters/registry.ts -> src/adapters/model-catalogue.ts]
[IMPORT: src/adapters/registry.ts -> src/adapters/pi.ts]
[IMPORT: src/adapters/registry.ts -> src/adapters/omp.ts]
[IMPORT: src/adapters/registry.ts -> src/adapters/codex.ts]
[IMPORT: src/adapters/registry.ts -> src/adapters/claude.ts]
[IMPORT: src/backends/registry.ts -> src/backends/headless/index.ts]
[IMPORT: src/backends/registry.ts -> src/backends/herdr/index.ts]
[IMPORT: src/backends/registry.ts -> src/backends/tmux/index.ts]
[IMPORT: src/commands/status.ts -> src/config.ts]
[IMPORT: src/commands/status.ts -> src/doctor/extensions.ts]
[IMPORT: src/commands/status.ts -> src/adapters/registry.ts]
[IMPORT: src/commands/status.ts -> src/entities.ts]
[IMPORT: src/commands/status.ts -> src/remote.ts]
[IMPORT: src/commands/status.ts -> src/presence/store.ts]
[IMPORT: src/commands/status.ts -> src/table.ts]
[IMPORT: src/commands/status.ts -> src/policy/workspace.ts]
[IMPORT: src/commands/status.ts -> src/commands/daemon.ts]
[IMPORT: src/commands/status.ts -> src/daemon/rpc.ts]
[IMPORT: src/commands/status.ts -> src/commands/target.ts]
[IMPORT: src/commands/status.ts -> src/util.ts]
[EXTERNAL: src/backends/tmux/index.ts imports node:child_process]
[EXTERNAL: src/backends/tmux/index.ts imports node:path]
[IMPORT: src/backends/tmux/index.ts -> src/util.ts]
[IMPORT: src/backends/tmux/index.ts -> src/presence/schema.ts]
[IMPORT: src/backends/tmux/index.ts -> src/presence/store.ts]
[IMPORT: src/backends/tmux/index.ts -> src/backends/tmux/cli.ts]
[EXTERNAL: src/backends/headless/index.ts imports node:fs]
[EXTERNAL: src/backends/headless/index.ts imports node:os]
[EXTERNAL: src/backends/headless/index.ts imports node:path]
[EXTERNAL: src/backends/headless/index.ts imports node:child_process]
[IMPORT: src/backends/headless/index.ts -> src/presence/schema.ts]
[IMPORT: src/backends/headless/index.ts -> src/presence/store.ts]
[IMPORT: src/backends/headless/index.ts -> src/util.ts]
[IMPORT: src/backends/herdr/index.ts -> src/notify/sinks.ts]
[IMPORT: src/backends/herdr/index.ts -> src/backends/herdr/notify.ts]
[IMPORT: src/backends/herdr/index.ts -> src/util.ts]
[IMPORT: src/backends/herdr/index.ts -> src/backends/herdr/cli.ts]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORT: src/runtime.ts -> src/util.ts]
[EXTERNAL: src/queue.ts imports node:crypto]
[IMPORT: src/queue.ts -> src/store/sqlite.ts]
[EXTERNAL: src/daemon/runtime-files.ts imports node:path]
[EXTERNAL: src/presence/socket-client.ts imports node:net]
[EXTERNAL: src/presence/socket-client.ts imports node:fs]
[IMPORT: src/presence/socket-client.ts -> src/daemon/runtime-files.ts]
[IMPORT: src/presence/socket-client.ts -> src/util.ts]
[EXTERNAL: src/adapters/claude.ts imports node:fs]
[EXTERNAL: src/adapters/claude.ts imports node:os]
[EXTERNAL: src/adapters/claude.ts imports node:path]
[IMPORT: src/adapters/claude.ts -> src/config.ts]
[IMPORT: src/adapters/claude.ts -> src/presence/store.ts]
[IMPORT: src/adapters/claude.ts -> src/util.ts]
[IMPORT: src/adapters/claude.ts -> src/adapters/claude-hooks.ts]
[IMPORT: src/adapters/claude.ts -> src/util.ts]
[IMPORT: src/adapters/claude.ts -> src/adapters/transcript.ts]
[EXTERNAL: src/adapters/model-catalogue.ts imports node:child_process]
[EXTERNAL: src/adapters/model-catalogue.ts imports node:util]
[IMPORT: src/adapters/model-catalogue.ts -> src/retry.ts]
[IMPORT: src/adapters/model-catalogue.ts -> src/presence/writer.ts]
[IMPORT: src/adapters/model-catalogue.ts -> src/adapters/catalogue-store.ts]
[IMPORT: src/adapters/model-catalogue.ts -> src/util.ts]
[EXTERNAL: src/adapters/omp.ts imports node:os]
[EXTERNAL: src/adapters/omp.ts imports node:path]
[IMPORT: src/adapters/omp.ts -> src/adapters/model-catalogue.ts]
[IMPORT: src/adapters/omp.ts -> src/util.ts]
[IMPORT: src/adapters/omp.ts -> src/adapters/pi.ts]
[EXTERNAL: src/adapters/codex.ts imports node:fs]
[EXTERNAL: src/adapters/codex.ts imports node:os]
[EXTERNAL: src/adapters/codex.ts imports node:path]
[IMPORT: src/adapters/codex.ts -> src/util.ts]
[IMPORT: src/adapters/codex.ts -> src/config.ts]
[IMPORT: src/adapters/codex.ts -> src/presence/store.ts]
[IMPORT: src/adapters/codex.ts -> src/adapters/codex-notify.ts]
[IMPORT: src/adapters/codex.ts -> src/adapters/transcript.ts]
[EXTERNAL: src/adapters/pi.ts imports node:fs]
[EXTERNAL: src/adapters/pi.ts imports node:os]
[EXTERNAL: src/adapters/pi.ts imports node:path]
[IMPORT: src/adapters/pi.ts -> src/adapters/model-catalogue.ts]
[IMPORT: src/adapters/pi.ts -> src/presence/store.ts]
[IMPORT: src/adapters/pi.ts -> src/util.ts]
[IMPORT: src/adapters/pi.ts -> src/session.ts]
[IMPORT: src/adapters/pi.ts -> src/bridge-bundle.ts]
[IMPORT: src/adapters/pi.ts -> src/daemon/lifecycle.ts]
[IMPORT: src/adapters/pi.ts -> src/util.ts]
[IMPORT: src/adapters/pi.ts -> src/presence/schema.ts]
[EXTERNAL: src/notify/sinks.ts imports node:child_process]
[EXTERNAL: src/notify/sinks.ts imports node:fs]
[EXTERNAL: src/notify/sinks.ts imports node:path]
[IMPORT: src/notify/sinks.ts -> src/util.ts]
[IMPORT: src/notify/sinks.ts -> src/notify/format.ts]
[IMPORT: src/notify/format.ts -> src/policy/workspace.ts]
[IMPORT: src/notify/format.ts -> src/util.ts]
[IMPORT: src/entities.ts -> src/config.ts]
[IMPORT: src/entities.ts -> src/backends/registry.ts]
[IMPORT: src/entities.ts -> src/presence/store.ts]
[IMPORT: src/entities.ts -> src/backends/identity.ts]
[IMPORT: src/entities.ts -> src/policy/workspace.ts]
[IMPORT: src/entities.ts -> src/util.ts]
[IMPORT: src/entities.ts -> src/notify/format.ts]
[IMPORT: src/entities.ts -> src/policy/workspace.ts]
[IMPORT: src/entities.ts -> src/recipient.ts]
[EXTERNAL: src/presence/writer.ts imports node:os]
[EXTERNAL: src/presence/writer.ts imports node:fs]
[EXTERNAL: src/presence/writer.ts imports node:path]
[IMPORT: src/presence/writer.ts -> src/presence/schema.ts]
[IMPORT: src/presence/writer.ts -> src/util.ts]
[EXTERNAL: src/control/outcome.ts imports node:fs]
[EXTERNAL: src/control/outcome.ts imports node:path]
[IMPORT: src/control/outcome.ts -> src/presence/schema.ts]
[IMPORT: src/control/outcome.ts -> src/presence/inbox.ts]
[IMPORT: src/control/outcome.ts -> src/util.ts]
[EXTERNAL: src/remote.ts imports node:child_process]
[IMPORT: src/remote.ts -> src/util.ts]
[IMPORT: src/table.ts -> src/util.ts]
[IMPORT: src/commands/target.ts -> src/config.ts]
[IMPORT: src/commands/target.ts -> src/backends/registry.ts]
[IMPORT: src/commands/target.ts -> src/backends/identity.ts]
[IMPORT: src/commands/target.ts -> src/entities.ts]
[IMPORT: src/commands/target.ts -> src/policy/spawner.ts]
[IMPORT: src/commands/target.ts -> src/policy/workspace.ts]
[IMPORT: src/commands/target.ts -> src/remote.ts]
[IMPORT: src/commands/target.ts -> src/presence/store.ts]
[IMPORT: src/commands/target.ts -> src/util.ts]
[EXTERNAL: src/doctor/extensions.ts imports node:fs]
[EXTERNAL: src/doctor/extensions.ts imports node:path]
[IMPORT: src/doctor/extensions.ts -> src/daemon/lifecycle.ts]
[IMPORT: src/doctor/extensions.ts -> src/bridge-bundle.ts]
[IMPORT: src/doctor/extensions.ts -> src/presence/schema.ts]
[IMPORT: src/doctor/extensions.ts -> src/doctor/shared.ts]
[IMPORT: src/doctor/extensions.ts -> src/util.ts]
[EXTERNAL: src/commands/daemon.ts imports node:fs]
[IMPORT: src/commands/daemon.ts -> src/daemon/lifecycle.ts]
[IMPORT: src/commands/daemon.ts -> src/daemon/runtime-files.ts]
[IMPORT: src/commands/daemon.ts -> src/daemon/rpc.ts]
[IMPORT: src/commands/daemon.ts -> src/presence/store.ts]
[IMPORT: src/commands/daemon.ts -> src/util.ts]
[IMPORT: src/commands/daemon.ts -> src/commands/target.ts]
[EXTERNAL: src/backends/herdr/cli.ts imports node:child_process]
[IMPORT: src/backends/herdr/cli.ts -> src/util.ts]
[IMPORT: src/backends/herdr/notify.ts -> src/util.ts]
[IMPORT: src/backends/herdr/notify.ts -> src/backends/herdr/cli.ts]
[IMPORT: src/backends/herdr/notify.ts -> src/backends/backend.ts]
[EXTERNAL: src/backends/tmux/cli.ts imports node:child_process]
[IMPORT: src/recipient.ts -> src/notify/format.ts]
[IMPORT: src/recipient.ts -> src/util.ts]
[EXTERNAL: src/adapters/catalogue-store.ts imports node:fs]
[EXTERNAL: src/adapters/catalogue-store.ts imports node:path]
[IMPORT: src/adapters/catalogue-store.ts -> src/presence/writer.ts]
[IMPORT: src/adapters/catalogue-store.ts -> src/util.ts]
[IMPORT: src/retry.ts -> src/util.ts]
[EXTERNAL: src/adapters/codex-notify.ts imports node:path]
[IMPORT: src/adapters/codex-notify.ts -> src/runtime.ts]
[IMPORT: src/adapters/transcript.ts -> src/util.ts]
[EXTERNAL: src/adapters/claude-hooks.ts imports node:os]
[EXTERNAL: src/adapters/claude-hooks.ts imports node:path]
[IMPORT: src/adapters/claude-hooks.ts -> src/runtime.ts]
[IMPORT: src/adapters/claude-hooks.ts -> src/util.ts]
[EXTERNAL: src/presence/inbox.ts imports node:fs]
[IMPORT: src/presence/inbox.ts -> src/presence/schema.ts]
[IMPORT: src/presence/inbox.ts -> src/presence/writer.ts]
[EXTERNAL: src/bridge-bundle.ts imports node:child_process]
[EXTERNAL: src/bridge-bundle.ts imports node:fs]
[EXTERNAL: src/bridge-bundle.ts imports node:path]
[IMPORT: src/bridge-bundle.ts -> src/util.ts]
[EXTERNAL: src/session.ts imports node:fs]
[IMPORT: src/session.ts -> src/util.ts]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/compat.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/en.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/coerce.js]
[IMPORT: src/policy/spawner.ts -> src/backends/identity.ts]
[IMPORT: src/policy/spawner.ts -> src/adapters/registry.ts]
[IMPORT: src/policy/spawner.ts -> src/presence/store.ts]
[IMPORT: src/policy/spawner.ts -> src/util.ts]
[EXTERNAL: src/doctor/shared.ts imports node:fs]
[EXTERNAL: src/doctor/shared.ts imports node:child_process]
[EXTERNAL: src/doctor/shared.ts imports node:os]
[EXTERNAL: src/doctor/shared.ts imports node:path]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/compat.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/compat.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/versions.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/doc.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-generator.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ar.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/az.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/be.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/bg.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ca.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/cs.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/da.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/de.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/el.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/en.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/eo.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/es.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fa.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fi.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr-CA.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/he.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hr.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hu.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hy.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/id.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/is.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/it.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ja.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ka.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/kh.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/km.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ko.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/lt.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/mk.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ms.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/nl.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/no.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ota.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ps.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pl.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pt.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ro.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ru.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sl.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sv.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ta.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/th.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/tr.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ua.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uk.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ur.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uz.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/vi.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-CN.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-TW.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/yo.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/coerce.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/coerce.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/en.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/km.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sv.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pt.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ta.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uz.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ka.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ms.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ur.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-CN.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/th.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/is.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ko.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ca.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hu.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/nl.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/kh.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/km.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/mk.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ro.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fi.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/tr.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sl.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/bg.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/es.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uk.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/id.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ja.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pl.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/eo.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/no.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/lt.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ps.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/el.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fa.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hr.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/be.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/de.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/az.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/he.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/it.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr-CA.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/da.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ota.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ua.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uk.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/vi.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-TW.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ru.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/cs.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ar.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/yo.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hy.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/doc.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/versions.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-generator.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-generator.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js]
[IMPORT: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js -> node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
```

### Reverse Dependencies (Imported By)

```
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ur.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/coerce.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/it.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hy.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pl.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/store/suppress-sqlite-warning.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/runtime.ts <- src/config.ts]
[IMPORTED_BY: src/runtime.ts <- src/adapters/codex-notify.ts]
[IMPORTED_BY: src/runtime.ts <- src/adapters/claude-hooks.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js]
[IMPORTED_BY: src/notify/format.ts <- src/daemon/events.ts]
[IMPORTED_BY: src/notify/format.ts <- src/notify/router.ts]
[IMPORTED_BY: src/notify/format.ts <- src/notify/sinks.ts]
[IMPORTED_BY: src/notify/format.ts <- src/entities.ts]
[IMPORTED_BY: src/notify/format.ts <- src/recipient.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fi.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/entities.ts <- src/daemon/events.ts]
[IMPORTED_BY: src/entities.ts <- src/commands/status.ts]
[IMPORTED_BY: src/entities.ts <- src/commands/target.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uk.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uk.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ua.js]
[IMPORTED_BY: src/daemon/outbox.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js]
[IMPORTED_BY: src/doctor/extensions.ts <- src/commands/status.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/en.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/km.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sv.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pt.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ta.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uz.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ka.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ms.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ur.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-CN.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/th.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/is.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ko.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ca.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hu.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/nl.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/mk.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ro.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fi.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/tr.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sl.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/bg.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/es.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uk.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/id.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ja.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pl.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/eo.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/no.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/lt.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ps.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/el.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fa.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hr.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/be.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/de.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/az.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/he.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/it.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr-CA.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/da.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ota.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/vi.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-TW.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ru.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/cs.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ar.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/yo.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hy.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js]
[IMPORTED_BY: src/adapters/claude.ts <- src/adapters/registry.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORTED_BY: src/presence/schema.ts <- src/daemon/events.ts]
[IMPORTED_BY: src/presence/schema.ts <- src/presence/store.ts]
[IMPORTED_BY: src/presence/schema.ts <- src/backends/tmux/index.ts]
[IMPORTED_BY: src/presence/schema.ts <- src/backends/headless/index.ts]
[IMPORTED_BY: src/presence/schema.ts <- src/adapters/pi.ts]
[IMPORTED_BY: src/presence/schema.ts <- src/presence/writer.ts]
[IMPORTED_BY: src/presence/schema.ts <- src/control/outcome.ts]
[IMPORTED_BY: src/presence/schema.ts <- src/doctor/extensions.ts]
[IMPORTED_BY: src/presence/schema.ts <- src/presence/inbox.ts]
[IMPORTED_BY: src/notify/sinks.ts <- src/notify/router.ts]
[IMPORTED_BY: src/notify/sinks.ts <- src/backends/herdr/index.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/coerce.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/mk.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/vi.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/retry.ts <- src/adapters/model-catalogue.ts]
[IMPORTED_BY: src/table.ts <- src/commands/status.ts]
[IMPORTED_BY: src/store/sqlite.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/store/sqlite.ts <- src/daemon/outbox.ts]
[IMPORTED_BY: src/store/sqlite.ts <- src/presence/store.ts]
[IMPORTED_BY: src/store/sqlite.ts <- src/queue.ts]
[IMPORTED_BY: src/doctor/shared.ts <- src/doctor/extensions.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-generator.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/is.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/daemon/events.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/daemon/events.ts <- src/daemon/work-loop.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/cs.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/backends/tiling.ts <- src/config.ts]
[IMPORTED_BY: src/notify/router.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/notify/router.ts <- src/daemon/events.ts]
[IMPORTED_BY: src/notify/router.ts <- src/daemon/work-loop.ts]
[IMPORTED_BY: src/adapters/transcript.ts <- src/adapters/claude.ts]
[IMPORTED_BY: src/adapters/transcript.ts <- src/adapters/codex.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/compat.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fa.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/backends/herdr/index.ts <- src/backends/registry.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/compat.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/compat.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/coerce.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr-CA.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/worker-prompt.ts <- src/daemon/events.ts]
[IMPORTED_BY: src/worker-prompt.ts <- src/daemon/work-loop.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/en.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/en.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-generator.js]
[IMPORTED_BY: src/bridge-bundle.ts <- src/adapters/pi.ts]
[IMPORTED_BY: src/bridge-bundle.ts <- src/doctor/extensions.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/nl.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/adapters/omp.ts <- src/adapters/registry.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/th.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/be.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/kh.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/daemon/rpc.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/daemon/rpc.ts <- src/commands/status.ts]
[IMPORTED_BY: src/daemon/rpc.ts <- src/commands/daemon.ts]
[IMPORTED_BY: src/presence/writer.ts <- src/daemon/events.ts]
[IMPORTED_BY: src/presence/writer.ts <- src/presence/store.ts]
[IMPORTED_BY: src/presence/writer.ts <- src/adapters/model-catalogue.ts]
[IMPORTED_BY: src/presence/writer.ts <- src/adapters/catalogue-store.ts]
[IMPORTED_BY: src/presence/writer.ts <- src/presence/inbox.ts]
[IMPORTED_BY: src/presence/store.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/presence/store.ts <- src/daemon/lifecycle.ts]
[IMPORTED_BY: src/presence/store.ts <- src/backends/identity.ts]
[IMPORTED_BY: src/presence/store.ts <- src/daemon/events.ts]
[IMPORTED_BY: src/presence/store.ts <- src/control/dispatch.ts]
[IMPORTED_BY: src/presence/store.ts <- src/daemon/work-loop.ts]
[IMPORTED_BY: src/presence/store.ts <- src/daemon/work-loop.ts]
[IMPORTED_BY: src/presence/store.ts <- src/commands/status.ts]
[IMPORTED_BY: src/presence/store.ts <- src/backends/tmux/index.ts]
[IMPORTED_BY: src/presence/store.ts <- src/backends/headless/index.ts]
[IMPORTED_BY: src/presence/store.ts <- src/adapters/claude.ts]
[IMPORTED_BY: src/presence/store.ts <- src/adapters/codex.ts]
[IMPORTED_BY: src/presence/store.ts <- src/adapters/pi.ts]
[IMPORTED_BY: src/presence/store.ts <- src/entities.ts]
[IMPORTED_BY: src/presence/store.ts <- src/commands/target.ts]
[IMPORTED_BY: src/presence/store.ts <- src/commands/daemon.ts]
[IMPORTED_BY: src/presence/store.ts <- src/policy/spawner.ts]
[IMPORTED_BY: src/presence/socket-client.ts <- src/daemon/rpc.ts]
[IMPORTED_BY: src/backends/backend.ts <- src/store/sqlite.ts]
[IMPORTED_BY: src/backends/backend.ts <- src/config.ts]
[IMPORTED_BY: src/backends/backend.ts <- src/backends/herdr/notify.ts]
[IMPORTED_BY: src/backends/herdr/cli.ts <- src/backends/herdr/index.ts]
[IMPORTED_BY: src/backends/herdr/cli.ts <- src/backends/herdr/notify.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ota.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/backends/identity.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/backends/identity.ts <- src/control/dispatch.ts]
[IMPORTED_BY: src/backends/identity.ts <- src/policy/workspace.ts]
[IMPORTED_BY: src/backends/identity.ts <- src/entities.ts]
[IMPORTED_BY: src/backends/identity.ts <- src/commands/target.ts]
[IMPORTED_BY: src/backends/identity.ts <- src/policy/spawner.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ar.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ca.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/backends/herdr/notify.ts <- src/backends/herdr/index.ts]
[IMPORTED_BY: src/commands/target.ts <- src/commands/status.ts]
[IMPORTED_BY: src/commands/target.ts <- src/commands/daemon.ts]
[IMPORTED_BY: src/backends/tmux/index.ts <- src/backends/registry.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/km.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/km.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/kh.js]
[IMPORTED_BY: src/daemon/work-loop.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ms.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ro.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORTED_BY: src/commands/daemon.ts <- src/commands/status.ts]
[IMPORTED_BY: src/adapters/codex.ts <- src/adapters/registry.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ru.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/control/outcome.ts <- src/control/dispatch.ts]
[IMPORTED_BY: src/adapters/adapter.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/adapters/adapter.ts <- src/store/sqlite.ts]
[IMPORTED_BY: src/adapters/adapter.ts <- src/config.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/es.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ps.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sl.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/no.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/backends/headless/index.ts <- src/backends/registry.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/yo.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/queue.ts <- src/daemon/work-loop.ts]
[IMPORTED_BY: src/presence/inbox.ts <- src/control/outcome.ts]
[IMPORTED_BY: src/policy/model.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/policy/model.ts <- src/control/dispatch.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/el.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/control/dispatch.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/control/dispatch.ts <- src/daemon/work-loop.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hr.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/config.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/config.ts <- src/control/dispatch.ts]
[IMPORTED_BY: src/config.ts <- src/policy/workspace.ts]
[IMPORTED_BY: src/config.ts <- src/notify/router.ts]
[IMPORTED_BY: src/config.ts <- src/daemon/work-loop.ts]
[IMPORTED_BY: src/config.ts <- src/policy/model.ts]
[IMPORTED_BY: src/config.ts <- src/commands/status.ts]
[IMPORTED_BY: src/config.ts <- src/adapters/claude.ts]
[IMPORTED_BY: src/config.ts <- src/adapters/codex.ts]
[IMPORTED_BY: src/config.ts <- src/entities.ts]
[IMPORTED_BY: src/config.ts <- src/commands/target.ts]
[IMPORTED_BY: src/adapters/model-catalogue.ts <- src/adapters/registry.ts]
[IMPORTED_BY: src/adapters/model-catalogue.ts <- src/adapters/omp.ts]
[IMPORTED_BY: src/adapters/model-catalogue.ts <- src/adapters/pi.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uz.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ka.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/recipient.ts <- src/entities.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ua.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/adapters/pi.ts <- src/adapters/registry.ts]
[IMPORTED_BY: src/adapters/pi.ts <- src/adapters/omp.ts]
[IMPORTED_BY: src/adapters/claude-hooks.ts <- src/adapters/claude.ts]
[IMPORTED_BY: src/adapters/registry.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/adapters/registry.ts <- src/control/dispatch.ts]
[IMPORTED_BY: src/adapters/registry.ts <- src/daemon/work-loop.ts]
[IMPORTED_BY: src/adapters/registry.ts <- src/commands/status.ts]
[IMPORTED_BY: src/adapters/registry.ts <- src/policy/spawner.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sv.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/he.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/lt.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ja.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/adapters/catalogue-store.ts <- src/adapters/model-catalogue.ts]
[IMPORTED_BY: src/remote.ts <- src/commands/status.ts]
[IMPORTED_BY: src/remote.ts <- src/commands/target.ts]
[IMPORTED_BY: src/backends/tmux/cli.ts <- src/backends/tmux/index.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/id.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-generator.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/eo.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hu.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/bg.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/doc.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/doc.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-TW.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-CN.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/session.ts <- src/adapters/pi.ts]
[IMPORTED_BY: src/policy/spawner.ts <- src/commands/target.ts]
[IMPORTED_BY: src/daemon/lifecycle.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/daemon/lifecycle.ts <- src/daemon/rpc.ts]
[IMPORTED_BY: src/daemon/lifecycle.ts <- src/adapters/pi.ts]
[IMPORTED_BY: src/daemon/lifecycle.ts <- src/doctor/extensions.ts]
[IMPORTED_BY: src/daemon/lifecycle.ts <- src/commands/daemon.ts]
[IMPORTED_BY: src/daemon/runtime-files.ts <- src/daemon/rpc.ts]
[IMPORTED_BY: src/daemon/runtime-files.ts <- src/daemon/lifecycle.ts]
[IMPORTED_BY: src/daemon/runtime-files.ts <- src/presence/socket-client.ts]
[IMPORTED_BY: src/daemon/runtime-files.ts <- src/commands/daemon.ts]
[IMPORTED_BY: src/adapters/codex-notify.ts <- src/adapters/codex.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/da.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/index.js <- src/config.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/tr.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/backends/registry.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/backends/registry.ts <- src/control/dispatch.ts]
[IMPORTED_BY: src/backends/registry.ts <- src/entities.ts]
[IMPORTED_BY: src/backends/registry.ts <- src/commands/target.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/de.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pt.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/commands/status.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/policy/workspace.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/policy/workspace.ts <- src/daemon/events.ts]
[IMPORTED_BY: src/policy/workspace.ts <- src/daemon/work-loop.ts]
[IMPORTED_BY: src/policy/workspace.ts <- src/commands/status.ts]
[IMPORTED_BY: src/policy/workspace.ts <- src/notify/format.ts]
[IMPORTED_BY: src/policy/workspace.ts <- src/entities.ts]
[IMPORTED_BY: src/policy/workspace.ts <- src/entities.ts]
[IMPORTED_BY: src/policy/workspace.ts <- src/commands/target.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/az.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ta.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
[IMPORTED_BY: src/util.ts <- src/daemon/orchd.ts]
[IMPORTED_BY: src/util.ts <- src/daemon/rpc.ts]
[IMPORTED_BY: src/util.ts <- src/daemon/lifecycle.ts]
[IMPORTED_BY: src/util.ts <- src/daemon/events.ts]
[IMPORTED_BY: src/util.ts <- src/daemon/events.ts]
[IMPORTED_BY: src/util.ts <- src/config.ts]
[IMPORTED_BY: src/util.ts <- src/daemon/work-loop.ts]
[IMPORTED_BY: src/util.ts <- src/presence/store.ts]
[IMPORTED_BY: src/util.ts <- src/commands/status.ts]
[IMPORTED_BY: src/util.ts <- src/backends/tmux/index.ts]
[IMPORTED_BY: src/util.ts <- src/backends/headless/index.ts]
[IMPORTED_BY: src/util.ts <- src/backends/herdr/index.ts]
[IMPORTED_BY: src/util.ts <- src/runtime.ts]
[IMPORTED_BY: src/util.ts <- src/presence/socket-client.ts]
[IMPORTED_BY: src/util.ts <- src/adapters/claude.ts]
[IMPORTED_BY: src/util.ts <- src/adapters/claude.ts]
[IMPORTED_BY: src/util.ts <- src/adapters/model-catalogue.ts]
[IMPORTED_BY: src/util.ts <- src/adapters/omp.ts]
[IMPORTED_BY: src/util.ts <- src/adapters/codex.ts]
[IMPORTED_BY: src/util.ts <- src/adapters/pi.ts]
[IMPORTED_BY: src/util.ts <- src/adapters/pi.ts]
[IMPORTED_BY: src/util.ts <- src/notify/sinks.ts]
[IMPORTED_BY: src/util.ts <- src/notify/format.ts]
[IMPORTED_BY: src/util.ts <- src/entities.ts]
[IMPORTED_BY: src/util.ts <- src/presence/writer.ts]
[IMPORTED_BY: src/util.ts <- src/control/outcome.ts]
[IMPORTED_BY: src/util.ts <- src/remote.ts]
[IMPORTED_BY: src/util.ts <- src/table.ts]
[IMPORTED_BY: src/util.ts <- src/commands/target.ts]
[IMPORTED_BY: src/util.ts <- src/doctor/extensions.ts]
[IMPORTED_BY: src/util.ts <- src/commands/daemon.ts]
[IMPORTED_BY: src/util.ts <- src/backends/herdr/cli.ts]
[IMPORTED_BY: src/util.ts <- src/backends/herdr/notify.ts]
[IMPORTED_BY: src/util.ts <- src/recipient.ts]
[IMPORTED_BY: src/util.ts <- src/adapters/catalogue-store.ts]
[IMPORTED_BY: src/util.ts <- src/retry.ts]
[IMPORTED_BY: src/util.ts <- src/adapters/transcript.ts]
[IMPORTED_BY: src/util.ts <- src/adapters/claude-hooks.ts]
[IMPORTED_BY: src/util.ts <- src/bridge-bundle.ts]
[IMPORTED_BY: src/util.ts <- src/session.ts]
[IMPORTED_BY: src/util.ts <- src/policy/spawner.ts]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/versions.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/versions.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js]
[IMPORTED_BY: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ko.js <- node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js]
```

### Entry Points

```
[ENTRY: src/daemon/orchd.ts -> ./orchd.js (688135 bytes)]
```

### node_modules Summary

```
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js (contributes 65411 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js (contributes 45253 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js (contributes 19939 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js (contributes 19815 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js (contributes 16777 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js (contributes 16267 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js (contributes 16245 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js (contributes 11306 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/he.js (contributes 9684 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js (contributes 8866 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js (contributes 7519 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js (contributes 6908 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/lt.js (contributes 6838 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ru.js (contributes 5824 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ta.js (contributes 5733 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/be.js (contributes 5726 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/th.js (contributes 5656 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/km.js (contributes 5608 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ka.js (contributes 5561 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hy.js (contributes 5549 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/bg.js (contributes 5057 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/el.js (contributes 4915 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uk.js (contributes 4809 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/es.js (contributes 4717 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js (contributes 4642 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ur.js (contributes 4638 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ar.js (contributes 4573 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/mk.js (contributes 4528 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fa.js (contributes 4462 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr.js (contributes 4453 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hr.js (contributes 4369 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pl.js (contributes 4337 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ko.js (contributes 4275 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ps.js (contributes 4240 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ja.js (contributes 4238 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fi.js (contributes 4167 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/vi.js (contributes 4150 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/da.js (contributes 4145 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/cs.js (contributes 4132 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/nl.js (contributes 4125 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ro.js (contributes 4116 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uz.js (contributes 4110 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hu.js (contributes 4075 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/yo.js (contributes 4049 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sv.js (contributes 4026 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/is.js (contributes 4006 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ca.js (contributes 4006 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/eo.js (contributes 3979 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/de.js (contributes 3965 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/id.js (contributes 3964 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/it.js (contributes 3962 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pt.js (contributes 3948 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/en.js (contributes 3945 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sl.js (contributes 3938 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr-CA.js (contributes 3937 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/az.js (contributes 3904 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ota.js (contributes 3901 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/no.js (contributes 3885 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-TW.js (contributes 3880 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ms.js (contributes 3873 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/tr.js (contributes 3849 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-CN.js (contributes 3829 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js (contributes 3790 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js (contributes 2006 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-generator.js (contributes 1594 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js (contributes 1322 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js (contributes 1210 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js (contributes 1193 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/doc.js (contributes 915 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js (contributes 883 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js (contributes 858 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js (contributes 736 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/compat.js (contributes 624 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/coerce.js (contributes 540 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/versions.js (contributes 54 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/kh.js (contributes 49 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ua.js (contributes 49 bytes)]
[NODE_MODULES: node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema.js (contributes 30 bytes)]
```
