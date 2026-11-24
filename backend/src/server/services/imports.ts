import type { PoolClient } from "pg";
import type { Account } from "../auth";
import { pool, transaction } from "../db";
import { ApiError } from "../errors";
import { insert, update } from "./catalog";
import { ownStore } from "./stores";
import { normalizeImportRow, normalizeKey } from "./import-normalize";
import { createHash } from "node:crypto";

type DB = Pick<PoolClient, "query">;
async function prepare(items: unknown, actor: Account, db: DB) {
  if (!Array.isArray(items) || !items.length || items.length > 1000)
    throw new ApiError(
      422,
      "IMPORT_INVALID",
      "Mỗi lần nhập cần từ 1 đến 1.000 sản phẩm.",
    );
  const store = await ownStore(actor, db);
  const existing = await db.query(
    "SELECT id,source_product_id,name FROM products WHERE store_id=$1",
    [store.id],
  );
  const categories = await db.query("SELECT id,name FROM categories");
  const seen = new Set<string>();
  const rows = items.map((raw, index) => {
    const row = normalizeImportRow(raw);
    const matches = existing.rows.filter(
      (product) =>
        product.source_product_id === row.key ||
        (row.key.startsWith("auto:") &&
          String(product.name).trim().toLocaleLowerCase("vi") ===
            String(row.fields.name).trim().toLocaleLowerCase("vi")),
    );
    if (matches.length > 1)
      row.errors.push(
        "Có nhiều sản phẩm hiện có trùng mã hoặc tên. Cần kiểm tra trước khi cập nhật.",
      );
    const target = matches.length === 1 ? String(matches[0].id) : undefined;
    if (target && !row.fields.name) row.fields.name = matches[0].name;
    if (!target && !row.fields.name)
      row.errors.push("Sản phẩm mới cần có tên sản phẩm.");
    if (!row.key) row.errors.push("Cần có mã sản phẩm hoặc tên để nhận diện.");
    if (row.categoryName && row.categoryName.length > 150)
      row.errors.push("Tên danh mục tối đa 150 ký tự.");
    const identity = target ? `id:${target}` : `key:${row.key}`;
    if (seen.has(identity)) row.errors.push("Sản phẩm bị lặp trong file.");
    seen.add(identity);
    if (
      row.fields.category_id &&
      !categories.rows.some(
        (category) => String(category.id) === row.fields.category_id,
      )
    )
      row.errors.push("Danh mục được chỉ định không tồn tại.");
    if (row.categoryName) {
      const category = categories.rows.find(
        (category) =>
          normalizeKey(category.name) === normalizeKey(row.categoryName!),
      );
      if (category) row.fields.category_id = String(category.id);
    }
    return {
      ...row,
      row: index + 1,
      target,
      operation: target ? "update" : "create",
    };
  });
  return { store, rows };
}

export async function previewImport(items: unknown, actor: Account) {
  const { rows } = await prepare(items, actor, pool());
  return {
    total: rows.length,
    create_count: rows.filter(
      (row) => row.operation === "create" && !row.errors.length,
    ).length,
    update_count: rows.filter(
      (row) => row.operation === "update" && !row.errors.length,
    ).length,
    invalid_count: rows.filter((row) => row.errors.length).length,
    ignored_columns: [...new Set(rows.flatMap((row) => row.ignored))],
    rows: rows.map((row) => ({
      row: row.row,
      operation: row.operation,
      name: row.fields.name ?? "Thiếu tên",
      price: row.fields.price ?? null,
      errors: row.errors,
      warnings: row.warnings,
    })),
  };
}

export async function commitImport(items: unknown, actor: Account) {
  return transaction(async (client) => {
    const store = await ownStore(actor, client);
    // Serialize repeated/concurrent imports into the same store before resolving identities.
    await client.query("SELECT id FROM stores WHERE id=$1 FOR UPDATE", [
      store.id,
    ]);
    const { rows } = await prepare(items, actor, client);
    const errors = rows.flatMap((row) =>
      row.errors.map((message) => ({ field: `Dòng ${row.row}`, message })),
    );
    if (errors.length)
      throw new ApiError(
        422,
        "IMPORT_INVALID",
        "File có dữ liệu cần kiểm tra. Hãy sửa các dòng được báo trước khi nhập.",
        errors,
      );
    const saved = [];
    for (const row of rows) {
      if (row.categoryName && !row.fields.category_id) {
        const code = `import_${createHash("sha256").update(normalizeKey(row.categoryName)).digest("hex").slice(0, 24)}`;
        const category = await client.query(
          "INSERT INTO categories(code,name) VALUES($1,$2) ON CONFLICT(code) DO UPDATE SET code=EXCLUDED.code RETURNING id",
          [code, row.categoryName],
        );
        row.fields.category_id = String(category.rows[0].id);
      }
      const record = row.target
        ? await update(client, "products", row.target, row.fields)
        : await insert(client, "products", {
            ...row.fields,
            source_system: "seller_upload",
            source_product_id: row.key,
            imported_by: actor.id,
            store_id: store.id,
          });
      saved.push(record);
    }
    return {
      imported_count: saved.length,
      items: saved,
      created_count: rows.filter((row) => !row.target).length,
      updated_count: rows.filter((row) => row.target).length,
    };
  });
}
