import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pool, transaction } from "../src/server/db";

try {
  const directory = new URL("../db/migrations/", import.meta.url);
  const files = (await readdir(directory)).filter(name => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
  const outcomes = await transaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(736551001)");
    const existing = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    const names = existing.rows.map(row => row.table_name);
    if (!names.includes("sellens_migrations") && names.some(name => ["users","products","categories","product_analyses","improvement_actions","action_history"].includes(name)))
      throw new Error("Unmanaged architecture tables already exist; schema reconciliation required");
    await client.query("CREATE TABLE IF NOT EXISTS sellens_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
    const messages: string[] = [];
    for (const file of files) {
      const version = file.slice(0,-4);
      const sql = await readFile(new URL(file,directory),"utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const applied = await client.query("SELECT checksum FROM sellens_migrations WHERE version=$1",[version]);
      if (applied.rows[0]) {
        if (applied.rows[0].checksum !== checksum) throw new Error("Migration checksum changed; do not edit applied migrations");
        messages.push(`${version}: already applied`); continue;
      }
      await client.query(sql);
      await client.query("INSERT INTO sellens_migrations(version,checksum) VALUES($1,$2)",[version,checksum]);
      messages.push(`${version}: applied`);
    }
    return messages;
  });
  outcomes.forEach(message=>console.log(message));
} catch (error) {
  const safe = error instanceof Error && /^(Migration checksum|Unmanaged architecture)/.test(error.message);
  console.error(safe ? (error as Error).message : "Migration failed; transaction rolled back. Check connectivity/schema locally.");
  process.exitCode = 1;
} finally { await pool().end().catch(()=>{}); }
