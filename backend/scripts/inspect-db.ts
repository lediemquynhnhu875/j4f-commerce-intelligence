import { pool } from "../src/server/db";

try {
  const tables = await pool().query(`SELECT table_schema,table_name FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog','information_schema') AND table_type='BASE TABLE'
    ORDER BY table_schema,table_name`);
  const columns = await pool().query(`SELECT table_schema,table_name,column_name,data_type,is_nullable
    FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY table_schema,table_name,ordinal_position`);
  const constraints = await pool().query(`SELECT table_schema,table_name,constraint_name,constraint_type
    FROM information_schema.table_constraints WHERE table_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY table_schema,table_name,constraint_name`);
  console.log(JSON.stringify({ tables: tables.rows, columns: columns.rows, constraints: constraints.rows }, null, 2));
} catch { console.error("Database inspection failed; check DATABASE_URL and connectivity locally."); process.exitCode = 1; }
finally { await pool().end().catch(() => {}); }
