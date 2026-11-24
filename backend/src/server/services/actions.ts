import { pool, transaction } from "../db";
import { type Account } from "../auth";
import { ApiError, missing } from "../errors";
import { insert } from "./catalog";

import { productScope, assertRecord, assertAssignee } from "./stores";

const transitions: Record<string, string[]> = {
  proposed: ["accepted", "rejected", "cancelled"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  rejected: [],
  cancelled: [],
};
export async function listActions(page:number,limit:number,analysisId:string|undefined,actor:Account) {
  const filter=`$1::bigint IS NOT NULL AND ${productScope(actor,"p")}`+(analysisId?" AND a.analysis_id=$2":"");
  const args:unknown[]=[actor.id,...(analysisId?[analysisId]:[])];
  const from="FROM improvement_actions a JOIN product_analyses pa ON pa.id=a.analysis_id JOIN products p ON p.id=pa.product_id";
  const result=await pool().query(`SELECT a.* ${from} WHERE ${filter} ORDER BY a.id LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,limit,(page-1)*limit]);
  const count=await pool().query(`SELECT count(*)::int AS total ${from} WHERE ${filter}`,args);
  return {data:result.rows,pagination:{page,limit,total:count.rows[0].total}};
}
export async function getAction(recordId: string) {
  const result = await pool().query(
    "SELECT * FROM improvement_actions WHERE id=$1",
    [recordId],
  );
  if (!result.rows[0]) missing();
  return result.rows[0];
}
export async function history(recordId: string, page: number, limit: number) {
  await getAction(recordId);
  const result = await pool().query(
    "SELECT * FROM action_history WHERE action_id=$1 ORDER BY id LIMIT $2 OFFSET $3",
    [recordId, limit, (page - 1) * limit],
  );
  const count = await pool().query(
    "SELECT count(*)::int AS total FROM action_history WHERE action_id=$1",
    [recordId],
  );
  return {
    data: result.rows,
    pagination: { page, limit, total: count.rows[0].total },
  };
}
export async function createAction(
  data: Record<string, unknown>,
  actor: Account,
) {
  return transaction(async (client) => {
    await assertRecord(actor,"analyses",String(data.analysis_id),client);
    await assertAssignee(actor,String(data.analysis_id),data.assigned_to,client);
    const row = await insert(client, "improvement_actions", {
      ...data,
      created_by: actor.id,
    });
    await insert(client, "action_history", {
      action_id: row.id,
      changed_by: actor.id,
      event_type: "created",
      after_json: row,
    });
    return row;
  });
}
export async function patchAction(
  recordId: string,
  data: Record<string, unknown>,
  actor: Account,
) {
  return transaction(async (client) => {
    await assertRecord(actor,"actions",recordId,client);
    const found = await client.query(
      "SELECT * FROM improvement_actions WHERE id=$1 FOR UPDATE",
      [recordId],
    );
    if (!found.rows[0]) missing();
    const old = found.rows[0];
    if (
      old.updated_at.toISOString() !==
      new Date(data.expected_updated_at as string).toISOString()
    )
      throw new ApiError(
        409,
        "STALE_VERSION",
        "Action changed; reload and retry with the current updated_at",
      );
    const { expected_updated_at: _expected, ...fields } = data;
    void _expected;
    if (!Object.keys(fields).length)
      throw new ApiError(
        422,
        "VALIDATION_ERROR",
        "Provide at least one editable field",
      );
    await assertAssignee(actor,String(old.analysis_id),fields.assigned_to,client);
    const next = fields.status as string | undefined;
    if (next && next !== old.status && !transitions[old.status].includes(next))
      throw new ApiError(
        409,
        "INVALID_TRANSITION",
        "Action status transition is not permitted",
      );
    if (
      (next ?? old.status) === "rejected" &&
      !String(fields.decision_reason ?? old.decision_reason ?? "").trim()
    )
      throw new ApiError(
        422,
        "VALIDATION_ERROR",
        "decision_reason is required when rejecting an action",
      );
    if (next === "completed" && old.status !== "completed")
      fields.completed_at = new Date().toISOString();
    const keys = Object.keys(fields);
    const result = await client.query(
      `UPDATE improvement_actions SET ${keys.map((f, i) => `${f}=$${i + 2}`).join(",")},
      updated_at=GREATEST(date_trunc('milliseconds',clock_timestamp()),updated_at+interval '1 millisecond') WHERE id=$1 RETURNING *`,
      [recordId, ...Object.values(fields)],
    );
    const row = result.rows[0];
    const event =
      next && next !== old.status
        ? next === "in_progress"
          ? "edited"
          : next
        : fields.assigned_to !== undefined
          ? "assigned"
          : "edited";
    await insert(client, "action_history", {
      action_id: recordId,
      changed_by: actor.id,
      event_type: event,
      before_json: old,
      after_json: row,
      comment: fields.decision_reason ?? null,
    });
    return row;
  });
}
