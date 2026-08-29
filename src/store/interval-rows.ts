import { openStore, transaction, type DatabaseLike } from "./connection.ts";

 type Satellite = "agent_processes" | "agent_handles" | "agent_spaces" | "agent_tunings";
type StoreRef = DatabaseLike | string;
function resolveStore(ref: StoreRef): DatabaseLike { return typeof ref === "string" ? openStore(ref) : ref; }
const columns: Record<Satellite, string> = { agent_processes: "host_id, pid, start_token", agent_handles: "handle", agent_spaces: "space_id", agent_tunings: "model, thinking" };
export function closeThenOpen<T extends Satellite>(db: DatabaseLike, table: T, agentId: string, now: number, values: Record<string, unknown>): void { const cols=columns[table]; const names=cols.split(", "); const params=names.map((name)=>values[name]); transaction(db,()=>{db.query(`UPDATE ${table} SET until = ? WHERE agent_id = ? AND until IS NULL`).run(now,agentId);db.query(`INSERT INTO ${table} (agent_id, since, until, ${cols}) VALUES (?, ?, NULL, ${names.map(()=>"?").join(", ")})`).run(agentId,now,...params);}); }
export interface ProcessValues { hostId:string; pid:number; startToken?:string|null }
export interface TuningValues { model:string; thinking?:string|null }
export function recordProcess(ref:StoreRef,agentId:string,now:number,v:ProcessValues):void{closeThenOpen(resolveStore(ref),"agent_processes",agentId,now,{host_id:v.hostId,pid:v.pid,start_token:v.startToken??null});}
export function endProcess(ref:StoreRef,agentId:string,now:number):void{const db=resolveStore(ref);transaction(db,()=>{db.query("UPDATE agent_processes SET until = ? WHERE agent_id = ? AND until IS NULL").run(now,agentId);});}
export function setHandle(ref:StoreRef,agentId:string,now:number,handle:string):void{closeThenOpen(resolveStore(ref),"agent_handles",agentId,now,{handle});}
export function setSpace(ref:StoreRef,agentId:string,now:number,spaceId:string):void{closeThenOpen(resolveStore(ref),"agent_spaces",agentId,now,{space_id:spaceId});}
export function clearSpace(ref:StoreRef,agentId:string,now:number):void{const db=resolveStore(ref);transaction(db,()=>{db.query("UPDATE agent_spaces SET until = ? WHERE agent_id = ? AND until IS NULL").run(now,agentId);});}
export function setTuning(ref:StoreRef,agentId:string,now:number,v:TuningValues):void{closeThenOpen(resolveStore(ref),"agent_tunings",agentId,now,{model:v.model,thinking:v.thinking??null});}
export function setAgentPlexer(ref:StoreRef,agentId:string,plexerId:string):void{resolveStore(ref).query("INSERT INTO agent_plexers (agent_id, plexer_id) VALUES (?, ?)").run(agentId,plexerId);}
type Row = Record<string, unknown>;
function isRow(value: unknown): value is Row { return value !== null && typeof value === "object" && !Array.isArray(value); }
function current(db:DatabaseLike,table:string,agentId:string):Row|null{const value=db.query(`SELECT * FROM ${table} WHERE agent_id = ? AND until IS NULL`).get(agentId); return isRow(value) ? value : null;}
export function currentProcess(ref:StoreRef,agentId:string):Row|null{return current(resolveStore(ref),"agent_processes",agentId);}
export function currentHandle(ref:StoreRef,agentId:string):Row|null{return current(resolveStore(ref),"agent_handles",agentId);}
export function currentSpace(ref:StoreRef,agentId:string):Row|null{return current(resolveStore(ref),"agent_spaces",agentId);}
export function currentTuning(ref:StoreRef,agentId:string):Row|null{return current(resolveStore(ref),"agent_tunings",agentId);}
