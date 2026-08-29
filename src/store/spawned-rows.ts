import { asc, eq } from "drizzle-orm";
import { isAdapterId, type AdapterId } from "../adapters/adapter.ts";
import { isBackendId, type BackendId } from "../backends/backend.ts";
import { orm } from "./connection.ts";
import { spawned, ownership } from "./tables.ts";
import { setNonNullField } from "./row-values.ts";
import { isRecord } from "../util.ts";
export interface SpawnedRecord { pane:string;ts?:number;adapter?:AdapterId;model?:string;backend?:BackendId;space?:string;handle?:string;name?:string;cwd?:string;worktree?:string;branch?:string;owner?:string;spawnedBy?:string;spawnedByLabel?:string }
type SpawnedRow=typeof spawned.$inferSelect & { owner:string|null };
function isNullableString(value:unknown):value is string|null{return value===null||typeof value==="string";}
function isNullableInstant(value:unknown):boolean{return value===null||(typeof value==="number"&&Number.isFinite(value))||(typeof value==="string"&&Number.isFinite(Number(value)));}
export function isSpawnedRow(value:unknown):value is SpawnedRow {if(!isRecord(value)||typeof value.pane!=="string"||!isNullableInstant(value.ts))return false;return ["adapter","model","backend","space","handle","name","cwd","worktree","branch","spawnedBy","spawnedByLabel","owner"].every((field)=>isNullableString(value[field]));}
function rowToSpawned(row:SpawnedRow):SpawnedRecord{const r:SpawnedRecord={pane:row.pane};if(row.ts!==null)r.ts=Number(row.ts);if(isAdapterId(row.adapter))r.adapter=row.adapter;setNonNullField(r,"model",row.model);if(isBackendId(row.backend))r.backend=row.backend;setNonNullField(r,"space",row.space);setNonNullField(r,"handle",row.handle);setNonNullField(r,"name",row.name);setNonNullField(r,"cwd",row.cwd);setNonNullField(r,"worktree",row.worktree);setNonNullField(r,"branch",row.branch);setNonNullField(r,"spawnedBy",row.spawnedBy);setNonNullField(r,"spawnedByLabel",row.spawnedByLabel);setNonNullField(r,"owner",row.owner);return r;}
export function insertSpawnedRecord(d:string,r:SpawnedRecord):void{orm(d).insert(spawned).values({pane:r.pane,ts:r.ts??null,adapter:r.adapter??null,model:r.model??null,backend:r.backend??null,space:r.space??null,handle:r.handle??null,name:r.name??null,cwd:r.cwd??null,worktree:r.worktree??null,branch:r.branch??null,spawnedBy:r.spawnedBy??null,spawnedByLabel:r.spawnedByLabel??null}).onConflictDoUpdate({target:spawned.pane,set:{ts:r.ts??null,adapter:r.adapter??null,model:r.model??null,backend:r.backend??null,space:r.space??null,handle:r.handle??null,name:r.name??null,cwd:r.cwd??null,worktree:r.worktree??null,branch:r.branch??null,spawnedBy:r.spawnedBy??null,spawnedByLabel:r.spawnedByLabel??null}}).run();}
function joined(d:string){return orm(d).select({pane:spawned.pane,ts:spawned.ts,adapter:spawned.adapter,model:spawned.model,backend:spawned.backend,space:spawned.space,handle:spawned.handle,name:spawned.name,cwd:spawned.cwd,worktree:spawned.worktree,branch:spawned.branch,spawnedBy:spawned.spawnedBy,spawnedByLabel:spawned.spawnedByLabel,owner:ownership.owner}).from(spawned).leftJoin(ownership,eq(ownership.agentKey,spawned.pane));}
export function selectSpawnedRecords(d:string):SpawnedRecord[]{return joined(d).orderBy(asc(spawned.ts),asc(spawned.pane)).all().filter(isSpawnedRow).map(rowToSpawned);}
export function selectSpawnedRecord(d:string,pane:string):SpawnedRecord|null{const row=joined(d).where(eq(spawned.pane,pane)).get();return row&&isSpawnedRow(row)?rowToSpawned(row):null;}
export function writeSpawnedHandle(d:string,pane:string,handle:string):boolean{return orm(d).update(spawned).set({handle}).where(eq(spawned.pane,pane)).run().changes===1;}
export function deleteSpawnedRecord(d:string,pane:string):void{orm(d).delete(spawned).where(eq(spawned.pane,pane)).run();}
