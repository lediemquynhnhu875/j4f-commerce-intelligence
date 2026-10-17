import { mkdir, open } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../src/server/db";
import { CleanupError, planHash, productSeedKeys, retirementKey, validatePlan, type CleanupPlan } from "./lib/sample-cleanup";

const args = process.argv.slice(2);
const apply = args[0] === "--apply";
let client: PoolClient | undefined;
let active = false;
try {
  if (process.env.APP_ENV !== "development") throw new CleanupError("Cleanup requires APP_ENV=development.");
  if (args.length && !(args.length === 3 && apply && args[1] === "--confirm" && /^[a-f0-9]{64}$/.test(args[2])))
    throw new CleanupError("Use no arguments to preview, or --apply --confirm PLAN_HASH from that preview.");
  client = await pool().connect();
  await client.query(apply ? "BEGIN" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");active = true;
  await client.query("SET LOCAL search_path TO public, pg_catalog");
  if (apply) {
    await client.query("SET LOCAL lock_timeout TO '5s'");
    await client.query("SELECT pg_advisory_xact_lock(736551003)");
    await client.query("LOCK TABLE products, product_analyses, improvement_actions, action_history, sellens_seed_records IN SHARE ROW EXCLUSIVE MODE");
  }
  const registered = await client.query("SELECT * FROM sellens_seed_records WHERE seed_key=ANY($1::text[]) ORDER BY seed_key", [productSeedKeys]);
  const retired = await client.query("SELECT 1 FROM sellens_seed_records WHERE seed_key=$1 AND entity='retired_seed_set'", [retirementKey]);
  const products = (await client.query(`SELECT p.* FROM products p JOIN sellens_seed_records r ON r.entity='products' AND r.record_id=p.id AND r.seed_key=p.source_data_json->>'seed_key' WHERE r.seed_key=ANY($1::text[]) ORDER BY p.id`, [productSeedKeys])).rows;
  if (retired.rowCount && !registered.rowCount && !products.length) {
    await client.query("ROLLBACK");active = false;
    console.log(JSON.stringify({status:"already-cleaned",changed:false}));
  } else {
    if (retired.rowCount || registered.rowCount !== 10) throw new CleanupError("Sample retirement/registry state is inconsistent; no changes applied.");
    const productIds = products.map(p => p.id);
    const analyses = (await client.query("SELECT * FROM product_analyses WHERE product_id=ANY($1::bigint[]) ORDER BY id", [productIds])).rows;
    const actions = (await client.query("SELECT * FROM improvement_actions WHERE analysis_id=ANY($1::bigint[]) ORDER BY id", [analyses.map(a => a.id)])).rows;
    const history = (await client.query("SELECT * FROM action_history WHERE action_id=ANY($1::bigint[]) ORDER BY id", [actions.map(a => a.id)])).rows;
    const registry = (await client.query(`SELECT * FROM sellens_seed_records WHERE (entity='products' AND record_id=ANY($1::bigint[])) OR (entity='product_analyses' AND record_id=ANY($2::bigint[])) OR (entity='improvement_actions' AND record_id=ANY($3::bigint[])) OR (entity='action_history' AND record_id=ANY($4::bigint[])) ORDER BY seed_key`, [productIds,analyses.map(a => a.id),actions.map(a => a.id),history.map(h => h.id)])).rows;
    const plan: CleanupPlan = {products,analyses,actions,history,registry};validatePlan(plan);
    const hash = planHash(plan);
    const triggers = (await client.query(`SELECT c.relname,t.tgname,t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND (c.relname,t.tgname) IN (('product_analyses','immutable_analyses'),('action_history','immutable_history')) ORDER BY c.relname`)).rows;
    if (triggers.length !== 2 || triggers.some(t => t.tgenabled !== "O")) throw new CleanupError("Expected history protections are missing or disabled.");
    const counts = async () => (await client!.query(`SELECT (SELECT count(*)::int FROM products) products,(SELECT count(*)::int FROM product_analyses) analyses,(SELECT count(*)::int FROM improvement_actions) actions,(SELECT count(*)::int FROM action_history) history,(SELECT count(*)::int FROM users) accounts,(SELECT count(*)::int FROM categories) categories,(SELECT count(*)::int FROM analysis_runs) runs`)).rows[0] as Record<string,number>;
    const before = await counts();
    const summary = {products:products.length,analyses:analyses.length,actions:actions.length,history:history.length};
    if (!apply) {
      await client.query("ROLLBACK");active = false;
      console.log(JSON.stringify({status:"preview-only",changed:false,targets:products.map(p => ({id:p.id,name:p.name})),delete:summary,products_remaining:before.products-products.length,preserve:{accounts:before.accounts,categories:before.categories,ml_runs:before.runs},plan_hash:hash,apply_command:`npm run db:cleanup-samples -- --apply --confirm ${hash}`},null,2));
    } else {
      if (args[2] !== hash) throw new CleanupError("Data changed since preview; run the preview again and review the new plan.");
      const directory = resolve(process.cwd(),"../tmp/seed-cleanup");await mkdir(directory,{recursive:true});
      const backup = resolve(directory,`sample-catalog-${new Date().toISOString().replace(/[:.]/g,"-")}-${randomUUID()}.json`);
      const file = await open(backup,"wx",0o600);
      try {await file.writeFile(JSON.stringify({version:1,created_at:new Date().toISOString(),plan_hash:hash,...plan},null,2));await file.sync();} finally {await file.close();}
      // The only history exception is this explicit, locked development cleanup.
      // PostgreSQL rolls these ALTERs back too if any later step fails.
      await client.query("ALTER TABLE action_history DISABLE TRIGGER immutable_history");
      await client.query("ALTER TABLE product_analyses DISABLE TRIGGER immutable_analyses");
      const removed = {
        history:(await client.query("DELETE FROM action_history WHERE id=ANY($1::bigint[])",[history.map(h => h.id)])).rowCount,
        actions:(await client.query("DELETE FROM improvement_actions WHERE id=ANY($1::bigint[])",[actions.map(a => a.id)])).rowCount,
        analyses:(await client.query("DELETE FROM product_analyses WHERE id=ANY($1::bigint[])",[analyses.map(a => a.id)])).rowCount,
        products:(await client.query("DELETE FROM products WHERE id=ANY($1::bigint[])",[productIds])).rowCount,
      };
      await client.query("ALTER TABLE product_analyses ENABLE TRIGGER immutable_analyses");
      await client.query("ALTER TABLE action_history ENABLE TRIGGER immutable_history");
      for (const key of Object.keys(summary) as (keyof typeof summary)[]) if (removed[key] !== summary[key]) throw new CleanupError("Deleted counts did not match the preview; rolling back.");
      const pruned = await client.query("DELETE FROM sellens_seed_records WHERE seed_key=ANY($1::text[])",[registry.map(r => r.seed_key)]);
      if (pruned.rowCount !== registry.length) throw new CleanupError("Seed registry changed; rolling back.");
      await client.query("INSERT INTO sellens_seed_records(seed_key,entity,record_id) VALUES ($1,'retired_seed_set',0)",[retirementKey]);
      const after = await counts();
      for (const key of Object.keys(before)) if (after[key] !== before[key]-(summary[key as keyof typeof summary]??0)) throw new CleanupError("Unexpected remaining counts; rolling back.");
      await client.query("COMMIT");active = false;
      console.log(JSON.stringify({status:"cleaned",deleted:removed,remaining:after,backup},null,2));
    }
  }
} catch (error) {
  if (active && client) await client.query("ROLLBACK").catch(()=>{});
  console.error(error instanceof CleanupError ? error.message : "Cleanup failed; transaction was not confirmed. Inspect the database state before retrying; no database credentials are logged.");
  process.exitCode = 1;
} finally {client?.release();await pool().end().catch(()=>{});}
