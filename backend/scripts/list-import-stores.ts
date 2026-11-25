/** Read-only ownership inventory for an explicitly reviewed offline import. */
import {pool} from '../src/server/db';
try {
  const result=await pool().query(`SELECT s.id::text AS store_id,s.name AS store_name,s.is_active,
    u.id::text AS owner_id,u.full_name AS owner_name,u.role,u.is_active AS owner_active,
    (SELECT count(*)::int FROM products p WHERE p.store_id=s.id) AS products
    FROM stores s JOIN users u ON u.id=s.owner_user_id ORDER BY s.id`);
  console.log(JSON.stringify(result.rows,null,2));
} catch { console.error('Could not list stores; check DATABASE_URL and applied migrations locally.');process.exitCode=1; }
finally {try {await pool().end();}catch { /* No initialized pool. */ }}
