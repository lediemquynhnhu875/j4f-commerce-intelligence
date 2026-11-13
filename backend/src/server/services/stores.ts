import { pool } from "../db";
import type { Account } from "../auth";
import { ApiError, missing } from "../errors";
type DB = Pick<import("pg").PoolClient, "query">;

// Parameters and fixed SQL identifiers only; no ownership is accepted from clients.
export function productScope(actor: Account, alias = "products") {
  return actor.role === "admin" ? "true" : `EXISTS (SELECT 1 FROM stores scope_store
    WHERE scope_store.id=${alias}.store_id AND scope_store.owner_user_id=$1 AND scope_store.is_active)`;
}
export async function ownStore(actor: Account, db: DB = pool()) {
  if (actor.role !== "reviewer") throw new ApiError(403,"FORBIDDEN","Only store owners can manage products");
  const { rows } = await db.query("SELECT * FROM stores WHERE owner_user_id=$1 AND is_active",[actor.id]);
  if (!rows[0]) throw new ApiError(403,"STORE_UNAVAILABLE","No active store assigned");
  return rows[0];
}
export async function listStores(actor: Account,page:number,limit:number) {
  const filter = actor.role === "admin" ? "$1::bigint IS NOT NULL" : "s.owner_user_id=$1 AND s.is_active";
  const rows=await pool().query(`SELECT s.*, jsonb_build_object('id',u.id::text,'full_name',u.full_name) AS owner,
    (SELECT count(*)::int FROM products p WHERE p.store_id=s.id) AS product_count
    FROM stores s JOIN users u ON u.id=s.owner_user_id WHERE ${filter}
    ORDER BY s.id LIMIT $2 OFFSET $3`,[actor.id,limit,(page-1)*limit]);
  const count=await pool().query(`SELECT count(*)::int AS total FROM stores s WHERE ${filter}`,
    [actor.id]);
  return {data:rows.rows,pagination:{page,limit,total:count.rows[0].total}};
}
export async function assertRecord(actor:Account,kind:"products"|"analyses"|"actions"|"categories"|"stores",id:string,db:DB=pool()) {
  if (actor.role === "admin") return;
  let sql:string;
  if(kind === "stores") sql="SELECT 1 FROM stores WHERE id=$2 AND owner_user_id=$1 AND is_active";
  else if(kind === "products") sql=`SELECT 1 FROM products p WHERE p.id=$2 AND ${productScope(actor,"p")}`;
  else if(kind === "analyses") sql=`SELECT 1 FROM product_analyses a JOIN products p ON p.id=a.product_id WHERE a.id=$2 AND ${productScope(actor,"p")}`;
  else if(kind === "actions") sql=`SELECT 1 FROM improvement_actions a JOIN product_analyses pa ON pa.id=a.analysis_id JOIN products p ON p.id=pa.product_id WHERE a.id=$2 AND ${productScope(actor,"p")}`;
  else sql=`SELECT 1 FROM products p WHERE p.category_id=$2 AND ${productScope(actor,"p")}`;
  if (!(await db.query(sql,[actor.id,id])).rows[0]) missing();
}
export async function assertAssignee(actor:Account,analysisId:string,value:unknown,db:DB) {
  if(value == null) return;
  const row=await db.query(`SELECT 1 FROM product_analyses a JOIN products p ON p.id=a.product_id
    JOIN stores s ON s.id=p.store_id JOIN users u ON u.id=s.owner_user_id
    WHERE a.id=$1 AND u.id=$2 AND u.role='reviewer' AND u.is_active AND s.is_active`,[analysisId,value]);
  if(!row.rows[0]) throw new ApiError(422,"INVALID_ASSIGNEE","Assignee must be the active owner of this store");
}
