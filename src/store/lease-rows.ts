import { and, asc, eq, isNull } from "drizzle-orm";
import { orm, withTransaction } from "./connection.ts";
import { agentLeases } from "../db/schema.ts";

export type LeaseReleaseReason = "released" | "handoff" | "adopted" | "expired";
export interface Lease { readonly id:number; readonly agentId:string; readonly orchId:string; readonly since:number; readonly until:number|null; readonly releaseReason:LeaseReleaseReason|null; }
type LeaseRow = typeof agentLeases.$inferSelect;
function isLeaseReleaseReason(value: string | null): value is LeaseReleaseReason | null { return value === null || value === "released" || value === "handoff" || value === "adopted" || value === "expired"; }
function toLease(row: LeaseRow): Lease { if (!isLeaseReleaseReason(row.releaseReason)) throw new Error("invalid lease release reason"); return { id: row.id, agentId: row.agentId, orchId: row.orchId, since: row.since, until: row.until, releaseReason: row.releaseReason }; }
function openLease(orchDir:string, agentId:string): LeaseRow|undefined { return orm(orchDir).select().from(agentLeases).where(and(eq(agentLeases.agentId,agentId),isNull(agentLeases.until))).get(); }
function insertLease(orchDir:string, agentId:string, orchId:string, since:number):number { const row=orm(orchDir).insert(agentLeases).values({agentId,orchId,since}).returning({id:agentLeases.id}).get(); if(!row) throw new Error("lease insert did not produce a row"); return row.id; }
export function acquireLease(orchDir:string,agentId:string,orchId:string,since=Date.now()):number{return withTransaction(orchDir,()=>{if(openLease(orchDir,agentId))throw new Error("one_lease");return insertLease(orchDir,agentId,orchId,since);});}
function closeLease(orchDir:string,agentId:string,orchId:string|null,until:number,reason:LeaseReleaseReason):void { const where=orchId==null?and(eq(agentLeases.agentId,agentId),isNull(agentLeases.until)):and(eq(agentLeases.agentId,agentId),eq(agentLeases.orchId,orchId),isNull(agentLeases.until)); if(orm(orchDir).update(agentLeases).set({until,releaseReason:reason}).where(where).run().changes!==1)throw new Error(orchId==null?"no_lease":"lease_holder"); }
export function releaseLease(d:string,a:string,o:string,u=Date.now()):void{withTransaction(d,()=>closeLease(d,a,o,u,"released"));}
export function expireLease(d:string,a:string,u=Date.now()):void{withTransaction(d,()=>closeLease(d,a,null,u,"expired"));}
export function handoffLease(d:string,a:string,f:string,t:string,s=Date.now()):number{return withTransaction(d,()=>{closeLease(d,a,f,s,"handoff");return insertLease(d,a,t,s);});}
export function adoptLease(d:string,a:string,o:string,s=Date.now()):number{return withTransaction(d,()=>{if(openLease(d,a))closeLease(d,a,null,s,"adopted");return insertLease(d,a,o,s);});}
export function currentLease(d:string,a:string):Lease|null{const row=openLease(d,a);return row?toLease(row):null;}
export function leasesByOrch(d:string,o:string):Lease[]{return orm(d).select().from(agentLeases).where(and(eq(agentLeases.orchId,o),isNull(agentLeases.until))).orderBy(asc(agentLeases.id)).all().map(toLease);}
