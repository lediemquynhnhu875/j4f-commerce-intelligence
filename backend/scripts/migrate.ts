import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pool, transaction } from "../src/server/db";

try {
  const sql = await readFile(new URL("../db/migrations/001_shared_catalog.sql", import.meta.url), "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  await transaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(736551001)");
    const existing = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    const names = existing.rows.map(r => r.table_name);
    if (names.includes("sellens_migrations")) {
      const applied = await client.query("SELECT checksum FROM sellens_migrations WHERE version=$1", ["001_shared_catalog"]);
      if (applied.rows[0]) {
        if (applied.rows[0].checksum !== checksum) throw new Error("Migration checksum changed; do not edit applied migrations");
        console.log("Migration 001_shared_catalog already applied; no changes.");
        return;
      }
    }
    const reserved = ["users","categories","products","product_analyses","improvement_actions","action_history",
      "sellens_sessions","sellens_login_limits","sellens_seed_records"];
    if (names.some(n => reserved.includes(n))) throw new Error("Unmanaged architecture tables already exist; schema reconciliation required before migration");
    await client.query("CREATE TABLE IF NOT EXISTS sellens_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
    await client.query(sql);
    await client.query("INSERT INTO sellens_migrations(version,checksum) VALUES ($1,$2)", ["001_shared_catalog",checksum]);
    console.log("Applied migration 001_shared_catalog (additive, transactional).");
  });
} catch (error) {
  // Only locally generated migration diagnoses are emitted; driver errors may contain secrets.
  const safe = error instanceof Error && /^(Migration checksum|Unmanaged architecture)/.test(error.message);
  console.error(safe ? (error as Error).message : "Migration failed; no transaction committed. Check environment/connectivity and schema locally.");
  process.exitCode = 1;
} finally { await pool().end().catch(() => {}); }
