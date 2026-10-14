import { pool, transaction } from "../db";
import { ApiError, missing } from "../errors";
import { type Account, accountFields, accountDto, hashPassword } from "../auth";

type Table = "products" | "categories" | "users";
export async function insert(client: Pick<import("pg").PoolClient, "query">, table: string, data: Record<string, unknown>) {
  // Identifiers only come from validated schemas and internal table constants.
  const fields = Object.keys(data);
  const result = await client.query(`INSERT INTO ${table} (${fields.join(",")}) VALUES (${fields.map((_,i)=>`$${i+1}`).join(",")}) RETURNING *`, Object.values(data));
  return result.rows[0];
}
export async function update(client: import("pg").PoolClient | import("pg").Pool, table: Table | "improvement_actions", recordId: string, data: Record<string,unknown>) {
  const fields = Object.keys(data);
  const result = await client.query(`UPDATE ${table} SET ${fields.map((f,i)=>`${f}=$${i+2}`).join(",")},updated_at=now() WHERE id=$1 RETURNING *`,[recordId,...Object.values(data)]);
  if (!result.rows[0]) missing();
  return result.rows[0];
}
export async function getRecord(table: Table, recordId: string) {
  const { rows } = await pool().query(`SELECT ${table === "users" ? accountFields : "*"} FROM ${table} WHERE id=$1`,[recordId]);
  if (!rows[0]) missing();
  return table === "users" ? accountDto(rows[0]) : rows[0];
}
export async function listRecords(table: Table, page: number, limit: number, search?: string) {
  const filter = search && table === "products" ? "WHERE name ILIKE $3" : "";
  const args: unknown[] = [limit,(page-1)*limit];
  if (filter) args.push(`%${search}%`);
  const result = await pool().query(`SELECT ${table === "users" ? accountFields : "*"} FROM ${table} ${filter} ORDER BY id LIMIT $1 OFFSET $2`,args);
  const count = await pool().query(`SELECT count(*)::int AS total FROM ${table} ${filter.replace("$3","$1")}`,filter ? [args[2]] : []);
  return { data: table === "users" ? result.rows.map(accountDto) : result.rows, pagination:{ page,limit,total:count.rows[0].total } };
}
export async function createProduct(data: Record<string,unknown>, actor: Account) { return insert(pool(),"products",{...data,imported_by:actor.id}); }
export async function createCategory(data: Record<string,unknown>) { return insert(pool(),"categories",data); }
export async function patchCategory(recordId: string, data: Record<string,unknown>) {
  const fields=Object.keys(data);
  const result=await pool().query(`UPDATE categories SET ${fields.map((f,i)=>`${f}=$${i+2}`).join(",")} WHERE id=$1 RETURNING *`,[recordId,...Object.values(data)]);
  if (!result.rows[0]) missing(); return result.rows[0];
}
export async function deleteRecord(table: "products" | "categories", recordId: string) {
  const result=await pool().query(`DELETE FROM ${table} WHERE id=$1 RETURNING id`,[recordId]);
  if (!result.rows[0]) missing(); return { id:recordId,deleted:true };
}
export async function createAccount(data: Record<string,unknown>) {
  const { password, ...fields } = data;
  const row=await insert(pool(),"users",{...fields,role: fields.role === "admin" ? "admin" : "reviewer",password_hash:await hashPassword(password as string)});
  const { password_hash:_hash,...safe }=row; void _hash; return accountDto(safe);
}
export async function patchAccount(recordId: string, data: Record<string,unknown>) {
  return transaction(async client=>{
    // Serialize role/state changes to prevent concurrent last-admin removal.
    await client.query("SELECT pg_advisory_xact_lock(736551002)");
    const found=await client.query("SELECT * FROM users WHERE id=$1 FOR UPDATE",[recordId]);
    if (!found.rows[0]) missing();
    const old=found.rows[0];
    const fields={...data};
    if (fields.role) fields.role=fields.role === "admin" ? "admin" : "reviewer";
    if (old.role === "admin" && old.is_active && (fields.role === "reviewer" || fields.is_active === false)) {
      const count=await client.query("SELECT count(*)::int AS n FROM users WHERE role='admin' AND is_active=true");
      if (count.rows[0].n <= 1) throw new ApiError(409,"LAST_ADMIN","The last active administrator cannot be suspended or demoted");
    }
    if (fields.password) { fields.password_hash=await hashPassword(fields.password as string); delete fields.password; }
    const result=await update(client,"users",recordId,fields);
    if (fields.is_active === false || fields.password_hash || fields.role) await client.query("DELETE FROM sellens_sessions WHERE user_id=$1",[recordId]);
    const { password_hash:_hash,...safe }=result; void _hash; return accountDto(safe);
  });
}
