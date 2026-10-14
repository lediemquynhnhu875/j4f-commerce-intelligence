import { pool, transaction } from "../db";
import { type Account } from "../auth";
import { ApiError, missing } from "../errors";
import { insert } from "./catalog";

const transitions: Record<string,string[]> = {
 proposed:["accepted","rejected","cancelled"], accepted:["in_progress","cancelled"],
 in_progress:["completed","cancelled"], completed:[],rejected:[],cancelled:[],
};
export async function listActions(page:number,limit:number,analysisId?:string) {
  const filter=analysisId ? "WHERE analysis_id=$3" : "";
  const result=await pool().query(`SELECT * FROM improvement_actions ${filter} ORDER BY id LIMIT $1 OFFSET $2`,analysisId ? [limit,(page-1)*limit,analysisId] : [limit,(page-1)*limit]);
  const count=await pool().query(`SELECT count(*)::int AS total FROM improvement_actions ${analysisId ? "WHERE analysis_id=$1" : ""}`,analysisId ? [analysisId] : []);
  return {data:result.rows,pagination:{page,limit,total:count.rows[0].total}};
}
export async function getAction(recordId:string) {
  const result=await pool().query("SELECT * FROM improvement_actions WHERE id=$1",[recordId]);
  if (!result.rows[0]) missing(); return result.rows[0];
}
export async function history(recordId:string,page:number,limit:number) {
  await getAction(recordId);
  const result=await pool().query("SELECT * FROM action_history WHERE action_id=$1 ORDER BY id LIMIT $2 OFFSET $3",[recordId,limit,(page-1)*limit]);
  const count=await pool().query("SELECT count(*)::int AS total FROM action_history WHERE action_id=$1",[recordId]);
  return {data:result.rows,pagination:{page,limit,total:count.rows[0].total}};
}
async function assignee(client:import("pg").PoolClient,value:unknown) {
  if (value == null) return;
  const row=await client.query("SELECT id FROM users WHERE id=$1 AND is_active=true FOR SHARE",[value]);
  if (!row.rows[0]) throw new ApiError(422,"VALIDATION_ERROR","assigned_to must identify an active account");
}
export async function createAction(data:Record<string,unknown>,actor:Account) {
  return transaction(async client=>{
    await assignee(client,data.assigned_to);
    const row=await insert(client,"improvement_actions",{...data,created_by:actor.id});
    await insert(client,"action_history",{action_id:row.id,changed_by:actor.id,event_type:"created",after_json:row});
    return row;
  });
}
export async function patchAction(recordId:string,data:Record<string,unknown>,actor:Account) {
  return transaction(async client=>{
    const found=await client.query("SELECT * FROM improvement_actions WHERE id=$1 FOR UPDATE",[recordId]);
    if (!found.rows[0]) missing();
    const old=found.rows[0];
    if (old.updated_at.toISOString() !== new Date(data.expected_updated_at as string).toISOString())
      throw new ApiError(409,"STALE_VERSION","Action changed; reload and retry with the current updated_at");
    const {expected_updated_at:_expected,...fields}=data; void _expected;
    if (!Object.keys(fields).length) throw new ApiError(422,"VALIDATION_ERROR","Provide at least one editable field");
    await assignee(client,fields.assigned_to);
    const next=fields.status as string | undefined;
    if (next && next !== old.status && !transitions[old.status].includes(next)) throw new ApiError(409,"INVALID_TRANSITION","Action status transition is not permitted");
    if ((next ?? old.status) === "rejected" && !String(fields.decision_reason ?? old.decision_reason ?? "").trim())
      throw new ApiError(422,"VALIDATION_ERROR","decision_reason is required when rejecting an action");
    if (next === "completed" && old.status !== "completed") fields.completed_at=new Date().toISOString();
    const keys=Object.keys(fields);
    const result=await client.query(`UPDATE improvement_actions SET ${keys.map((f,i)=>`${f}=$${i+2}`).join(",")},
      updated_at=GREATEST(date_trunc('milliseconds',clock_timestamp()),updated_at+interval '1 millisecond') WHERE id=$1 RETURNING *`,[recordId,...Object.values(fields)]);
    const row=result.rows[0];
    const event=next && next !== old.status ? (next === "in_progress" ? "edited" : next) : fields.assigned_to !== undefined ? "assigned" : "edited";
    await insert(client,"action_history",{action_id:recordId,changed_by:actor.id,event_type:event,before_json:old,after_json:row,comment:fields.decision_reason ?? null});
    return row;
  });
}
