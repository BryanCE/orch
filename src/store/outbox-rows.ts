import { and, asc, eq, lte, lt } from "drizzle-orm";
import { orm } from "./connection.ts";
import { outbox } from "./tables.ts";
export interface OutboxMessageInput{id:string;target:string;payload:unknown;createdAt?:number}
export interface OutboxMessage{id:string;target:string;payload:unknown;state:"pending"|"delivered";attempts:number;createdAt:number;nextAttemptAt:number}
type OutboxRow=typeof outbox.$inferSelect;
function isState(value:string):value is OutboxMessage["state"] { return value === "pending" || value === "delivered"; }
function toMessage(row:OutboxRow):OutboxMessage { if(!isState(row.state)) throw new Error("invalid outbox state"); return {id:row.id,target:row.target,payload:JSON.parse(row.payload),state:row.state,attempts:Number(row.attempts),createdAt:row.createdAt,nextAttemptAt:Number(row.nextAttemptAt)}; }
export function insertOutboxMessage(d:string,m:OutboxMessageInput):void{orm(d).insert(outbox).values({id:m.id,target:m.target,payload:JSON.stringify(m.payload),state:"pending",createdAt:m.createdAt??Date.now(),nextAttemptAt:0}).run();}
export function selectPendingOutbox(d:string,now:number):OutboxMessage[]{return orm(d).select().from(outbox).where(and(eq(outbox.state,"pending"),lte(outbox.nextAttemptAt,now))).orderBy(asc(outbox.createdAt)).all().map(toMessage);}
export function outboxMessagePending(d:string,id:string):boolean{return orm(d).select({id:outbox.id}).from(outbox).where(and(eq(outbox.id,id),eq(outbox.state,"pending"))).limit(1).get()!==undefined;}
export function markOutboxDelivered(d:string,id:string):void{orm(d).update(outbox).set({state:"delivered"}).where(and(eq(outbox.id,id),eq(outbox.state,"pending"))).run();}
export function bumpOutboxAttempt(d:string,id:string,nextAttemptAt:number):void{const row=orm(d).select({attempts:outbox.attempts}).from(outbox).where(eq(outbox.id,id)).get();if(!row)return;orm(d).update(outbox).set({attempts:Number(row.attempts)+1,nextAttemptAt}).where(and(eq(outbox.id,id),eq(outbox.state,"pending"))).run();}
export function deleteDeliveredBefore(d:string,cutoff:number):number{return Number(orm(d).delete(outbox).where(and(eq(outbox.state,"delivered"),lt(outbox.createdAt,cutoff))).run().changes);}
