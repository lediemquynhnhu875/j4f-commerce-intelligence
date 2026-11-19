import { pool, transaction } from "../db";
import { ApiError, missing } from "../errors";
import { type Account, accountFields, accountDto, hashPassword } from "../auth";

import { productScope, ownStore } from "./stores";

type Table = "products" | "categories" | "users";
export async function insert(
  client: Pick<import("pg").PoolClient, "query">,
  table: string,
  data: Record<string, unknown>,
) {
  // Identifiers only come from validated schemas and internal table constants.
  const fields = Object.keys(data);
  const result = await client.query(
    `INSERT INTO ${table} (${fields.join(",")}) VALUES (${fields.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`,
    Object.entries(data).map(([field, value]) => field === "image_urls" && Array.isArray(value) ? JSON.stringify(value) : value),
  );
  return result.rows[0];
}
export async function update(
  client: import("pg").PoolClient | import("pg").Pool,
  table: Table | "improvement_actions",
  recordId: string,
  data: Record<string, unknown>,
) {
  const fields = Object.keys(data);
  const result = await client.query(
    `UPDATE ${table} SET ${fields.map((f, i) => `${f}=$${i + 2}`).join(",")},updated_at=now() WHERE id=$1 RETURNING *`,
    [recordId, ...Object.entries(data).map(([field, value]) => field === "image_urls" && Array.isArray(value) ? JSON.stringify(value) : value)],
  );
  if (!result.rows[0]) missing();
  return result.rows[0];
}
export async function getRecord(table: Table, recordId: string) {
  const { rows } = await pool().query(
    `SELECT ${table === "users" ? accountFields : "*"} FROM ${table} WHERE id=$1`,
    [recordId],
  );
  if (!rows[0]) missing();
  return table === "users" ? accountDto(rows[0]) : rows[0];
}
export async function listAccounts(
  page: number,
  limit: number,
  search: string,
  active: boolean | null,
) {
  const filter = `($1='' OR strpos(lower(full_name), lower($1)) > 0 OR
      strpos(lower(email), lower($1)) > 0)
    AND ($2::boolean IS NULL OR is_active=$2)`;
  const { rows: [result] } = await pool().query(
    `WITH matched AS MATERIALIZED (
      SELECT ${accountFields} FROM users WHERE ${filter}
    ), current_page AS (
      SELECT * FROM matched ORDER BY id LIMIT $3 OFFSET $4
    )
    SELECT coalesce((SELECT jsonb_agg(to_jsonb(u) || jsonb_build_object('id', u.id::text)
      ORDER BY u.id) FROM current_page u), '[]'::jsonb) AS data,
      (SELECT count(*)::int FROM matched) AS total`,
    [search, active, limit, (page - 1) * limit],
  );
  return {
    data: result.data.map(accountDto),
    pagination: { page, limit, total: result.total },
  };
}
export async function createProduct(
  data: Record<string, unknown>,
  actor: Account,
) {
  const store = await ownStore(actor);
  return insert(pool(), "products", { ...data, imported_by: actor.id, store_id: store.id });
}
export async function createCategory(data: Record<string, unknown>) {
  return insert(pool(), "categories", data);
}
export async function patchCategory(
  recordId: string,
  data: Record<string, unknown>,
) {
  const fields = Object.keys(data);
  const result = await pool().query(
    `UPDATE categories SET ${fields.map((f, i) => `${f}=$${i + 2}`).join(",")} WHERE id=$1 RETURNING *`,
    [recordId, ...Object.entries(data).map(([field, value]) => field === "image_urls" && Array.isArray(value) ? JSON.stringify(value) : value)],
  );
  if (!result.rows[0]) missing();
  return result.rows[0];
}
export async function deleteRecord(
  table: "products" | "categories",
  recordId: string,
) {
  const result = await pool().query(
    `DELETE FROM ${table} WHERE id=$1 RETURNING id`,
    [recordId],
  );
  if (!result.rows[0]) missing();
  return { id: recordId, deleted: true };
}
export async function createAccount(data: Record<string, unknown>) {
  const { password, ...fields } = data;
  const row = await insert(pool(), "users", {
    ...fields,
    role: fields.role === "admin" ? "admin" : "reviewer",
    password_hash: await hashPassword(password as string),
  });
  const { password_hash: _hash, ...safe } = row;
  void _hash;
  return accountDto(safe);
}
export async function patchAccount(
  recordId: string,
  data: Record<string, unknown>,
) {
  return transaction(async (client) => {
    // Serialize role/state changes to prevent concurrent last-admin removal.
    await client.query("SELECT pg_advisory_xact_lock(736551002)");
    const found = await client.query(
      "SELECT * FROM users WHERE id=$1 FOR UPDATE",
      [recordId],
    );
    if (!found.rows[0]) missing();
    const old = found.rows[0];
    const fields = { ...data };
    if (fields.role)
      fields.role = fields.role === "admin" ? "admin" : "reviewer";
    if (
      old.role === "admin" &&
      old.is_active &&
      (fields.role === "reviewer" || fields.is_active === false)
    ) {
      const count = await client.query(
        "SELECT count(*)::int AS n FROM users WHERE role='admin' AND is_active=true",
      );
      if (count.rows[0].n <= 1)
        throw new ApiError(
          409,
          "LAST_ADMIN",
          "The last active administrator cannot be suspended or demoted",
        );
    }
    if (fields.password) {
      fields.password_hash = await hashPassword(fields.password as string);
      delete fields.password;
    }
    const result = await update(client, "users", recordId, fields);
    if (fields.is_active === false || fields.password_hash || fields.role)
      await client.query("DELETE FROM sellens_sessions WHERE user_id=$1", [
        recordId,
      ]);
    const { password_hash: _hash, ...safe } = result;
    void _hash;
    return accountDto(safe);
  });
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  minSold?: number;
  minRating?: number;
}

function productFilters(filters: ProductFilters, actor: Account, catalogSearch = false) {
  const conditions: string[] = ["$1::bigint IS NOT NULL",productScope(actor)];
  const args: unknown[] = [actor.id];
  let idx = 2;

  if (filters.search) {
    conditions.push(catalogSearch
      ? `strpos(lower(name || ' ' || id::text || ' ' ||
          CASE WHEN coalesce(nullif(trim(source_product_id), ''), id::text) ~* '^SP-'
            THEN trim(source_product_id) ELSE 'SP-' || coalesce(nullif(trim(source_product_id), ''), id::text)
          END), lower($${idx})) > 0`
      : `(name ILIKE $${idx} OR brand ILIKE $${idx})`);
    args.push(catalogSearch ? filters.search : `%${filters.search}%`);
    idx++;
  }
  if (filters.categoryId) {
    conditions.push(`category_id = $${idx}`);
    args.push(filters.categoryId);
    idx++;
  }
  if (filters.minPrice !== undefined) {
    conditions.push(`price >= $${idx}`);
    args.push(filters.minPrice);
    idx++;
  }
  if (filters.maxPrice !== undefined) {
    conditions.push(`price <= $${idx}`);
    args.push(filters.maxPrice);
    idx++;
  }
  if (filters.minSold !== undefined) {
    conditions.push(`quantity_sold >= $${idx}`);
    args.push(filters.minSold);
    idx++;
  }
  if (filters.minRating !== undefined) {
    conditions.push(`rating_average >= $${idx}`);
    args.push(filters.minRating);
    idx++;
  }

  return { where: conditions.join(" AND "), args, idx };
}

export async function listProducts(page: number, limit: number, filters: ProductFilters, actor: Account) {
  const { where, args, idx } = productFilters(filters, actor);
  const whereClause = `WHERE ${where}`;
  const result = await pool().query(
    `SELECT * FROM products ${whereClause} ORDER BY id LIMIT $${idx} OFFSET $${idx+1}`,
    [...args,limit,(page-1)*limit],
  );

  const count = await pool().query(
    `SELECT count(*)::int AS total FROM products ${whereClause}`,
    args,
  );

  return {
    data: result.rows,
    pagination: { page, limit, total: count.rows[0].total },
  };
}

export async function listStoreCategories(actor:Account,page:number,limit:number) {
  const filter=actor.role === "admin" ? "$1::bigint IS NOT NULL" : `EXISTS (SELECT 1 FROM products p WHERE p.category_id=c.id AND ${productScope(actor,"p")})`;
  const rows=await pool().query(`SELECT c.* FROM categories c WHERE ${filter} ORDER BY c.id LIMIT $2 OFFSET $3`,[actor.id,limit,(page-1)*limit]);
  const count=await pool().query(`SELECT count(*)::int AS total FROM categories c WHERE ${filter}`,[actor.id]);
  return {data:rows.rows,pagination:{page,limit,total:count.rows[0].total}};
}

export async function listCatalog(
  page: number,
  limit: number,
  filters: ProductFilters & { status?: string; sort?: "price" | "sales"; concludedOnly: boolean },
  actor: Account,
) {
  const { where, args } = productFilters(filters, actor, true);
  args.push(filters.status ?? null, filters.concludedOnly, limit, (page - 1) * limit);
  const statusArg = args.length - 3, concludedArg = args.length - 2;
  const order = filters.sort === "price" ? "price ASC NULLS LAST, id"
    : filters.sort === "sales" ? "quantity_sold DESC NULLS LAST, id"
      : "concluded DESC, id";
  const { rows } = await pool().query(
    `WITH scoped AS (
      SELECT id, price, quantity_sold FROM products WHERE ${where}
    ), latest AS MATERIALIZED (
      SELECT p.*, a.id AS analysis_id, a.status AS latest_status, a.product_type,
        coalesce(a.status <> 'insufficient_data', false) AS concluded
      FROM scoped p LEFT JOIN LATERAL (
        SELECT id, status, product_type FROM product_analyses
        WHERE product_id=p.id ORDER BY analyzed_at DESC, id DESC LIMIT 1
      ) a ON true
    ), matched AS MATERIALIZED (
      SELECT * FROM latest WHERE
        ($${statusArg}::text IS NULL OR coalesce(latest_status, 'no_analysis')=$${statusArg})
        AND (NOT $${concludedArg}::boolean OR concluded)
    ), page_rows AS (
      SELECT *, row_number() OVER (ORDER BY ${order}) AS position FROM (
        SELECT * FROM matched ORDER BY ${order} LIMIT $${args.length - 1} OFFSET $${args.length}
      ) window_rows
    )
    SELECT
      coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id',p.id::text,'store_id',p.store_id::text,'name',p.name,
        'category_id',p.category_id::text,'price',p.price::text,'currency',p.currency,
        'source_product_id',p.source_product_id,'thumbnail_url',p.thumbnail_url,
        'quantity_sold',p.quantity_sold::text,'rating_average',p.rating_average::text,
        'review_count',p.review_count,'latest_status',m.latest_status,
        'product_type',m.product_type,'action_titles',w.titles
      ) ORDER BY m.position)
      FROM page_rows m JOIN products p ON p.id=m.id
      CROSS JOIN LATERAL (
        SELECT coalesce(array_agg(title ORDER BY id), ARRAY[]::text[]) AS titles
        FROM improvement_actions WHERE analysis_id=m.analysis_id
      ) w), '[]'::jsonb) AS data,
      (SELECT count(*)::int FROM matched) AS total,
      (SELECT count(*)::int FROM latest WHERE NOT concluded) AS undecided_count`,
    args,
  );
  const row = rows[0];
  return { data: row.data, pagination: { page, limit, total: row.total }, undecided_count: row.undecided_count };
}
