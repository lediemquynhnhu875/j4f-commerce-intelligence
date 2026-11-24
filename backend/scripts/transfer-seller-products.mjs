/** Offline one-time legacy ownership correction. Dry-run default. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {validateTransfers,classify} from './lib/transfer-plan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const args=process.argv.slice(2),apply=args[0]==='--apply';
const out=fileURLToPath(new URL('../../tmp/seller-transfer/',import.meta.url));
let db,c,committed=false;
try{
 if(!(args.length===0||(args.length===3&&apply&&args[1]==='--confirm'&&/^[a-f0-9]{64}$/.test(args[2]))))throw Error('Use dry-run or --apply --confirm HASH');
 const mapBytes=await readFile('../tmp/seller-provision/store-mapping-all.json'),listBytes=await readFile('../tmp/seller-provision/pending-transfers.json');
 const mapping=JSON.parse(mapBytes),list=JSON.parse(listBytes);
 const manifest=JSON.parse(await readFile('../data/processed/ml-import-v1/manifest.json','utf8'));
 const bytes=await readFile('../data/processed/ml-import-v1/records.ndjson');
 if(sha(bytes)!==manifest.records_sha256)throw Error('Bundle checksum mismatch');
 const source=new Map(bytes.toString('utf8').trim().split(/\r?\n/).map(l=>{const p=JSON.parse(l);return[p.source_id,p.seller_id];}));
 validateTransfers(list,mapping,source);
 db=(await import('../src/server/db.ts')).pool();c=await db.connect();
 await c.query(apply?'BEGIN':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 if(apply){await c.query('SELECT pg_advisory_xact_lock(736551004)');await c.query('LOCK TABLE users, stores, products, product_analyses, improvement_actions, action_history IN ACCESS EXCLUSIVE MODE');}
 const products=(await c.query('SELECT * FROM products WHERE id=ANY($1::bigint[]) ORDER BY id',[list.map(t=>t.product_id)])).rows.map(p=>({...p,id:String(p.id),store_id:String(p.store_id)}));
 const {pending,done}=classify(list,products);
 const targets=(await c.query(`SELECT s.id::text,s.owner_user_id::text,s.is_active,u.role,u.is_active AS owner_active FROM stores s JOIN users u ON u.id=s.owner_user_id WHERE s.id=ANY($1::bigint[]) ORDER BY s.id`,[[...new Set(list.map(t=>t.to_store))]])).rows;
 const owners=new Map(targets.map(s=>[s.id,s.owner_user_id]));
 if(targets.length!==new Set(list.map(t=>t.to_store)).size||targets.some(s=>!s.is_active||!s.owner_active||s.role!=='reviewer'))throw Error('Invalid destination store');
 const analyses=(await c.query('SELECT * FROM product_analyses WHERE product_id=ANY($1::bigint[]) ORDER BY id',[list.map(t=>t.product_id)])).rows;
 const actions=(await c.query('SELECT * FROM improvement_actions WHERE analysis_id=ANY($1::bigint[]) ORDER BY id',[analyses.map(a=>a.id)])).rows;
 const history=(await c.query('SELECT * FROM action_history WHERE action_id=ANY($1::bigint[]) ORDER BY id',[actions.map(a=>a.id)])).rows;
 const trigger=(await c.query(`SELECT t.tgenabled,pg_get_triggerdef(t.oid) AS definition,pg_get_functiondef(t.tgfoid) AS function FROM pg_trigger t WHERE t.tgrelid='products'::regclass AND t.tgname='immutable_product_store' AND NOT t.tgisinternal`)).rows;
 if(trigger.length!==1||trigger[0].tgenabled!=='O')throw Error('Ownership trigger missing or not enabled normally');
 const byProduct=new Map(list.map(t=>[t.product_id,t])),byAnalysis=new Map(analyses.map(a=>[String(a.id),byProduct.get(String(a.product_id))]));
 const reassigned=actions.filter(a=>a.assigned_to!=null&&String(a.assigned_to)!==owners.get(byAnalysis.get(String(a.analysis_id)).to_store));
 const fingerprint=sha(JSON.stringify({mapping:sha(mapBytes),list:sha(listBytes),bundle:manifest.records_sha256,products,targets,analyses,actions,history,trigger}));
 const report={mode:pending.length||reassigned.length?apply?'transferred':'dry-run':'already-transferred',products_pending:pending.length,products_already_correct:done.length,destination_stores:targets.length,analyses_preserved:analyses.length,actions_preserved:actions.length,existing_history_preserved:history.length,non_null_assignees_to_reassign:reassigned.length,fingerprint};
 await mkdir(out,{recursive:true});
 // Persist the exact affected rows locally before changes. No passwords/session tokens are selected.
 await writeFile(resolve(out,`snapshot-${fingerprint}.json`),JSON.stringify({report,transfers:list,products,analyses,actions,history,targets,trigger},null,2),{mode:0o600});
 if(apply){
  if(args[2]!==fingerprint)throw Error('Plan changed; run dry-run again');
  if(pending.length){
   await c.query('ALTER TABLE products DISABLE TRIGGER immutable_product_store');
   const rows=pending.map(t=>({id:t.product_id,old_store:t.from_store,new_store:t.to_store}));
   const changed=await c.query(`UPDATE products p SET store_id=x.new_store FROM jsonb_to_recordset($1::jsonb) AS x(id bigint,old_store bigint,new_store bigint) WHERE p.id=x.id AND p.store_id=x.old_store RETURNING p.id`,[JSON.stringify(rows)]);
   if(changed.rowCount!==pending.length)throw Error('Transfer row count mismatch');
   await c.query('ALTER TABLE products ENABLE TRIGGER immutable_product_store');
  }
  for(const a of reassigned){
   const t=byAnalysis.get(String(a.analysis_id)),newOwner=owners.get(t.to_store);
   const after=(await c.query('UPDATE improvement_actions SET assigned_to=$1,updated_at=now() WHERE id=$2 RETURNING *',[newOwner,a.id])).rows[0];
   await c.query(`INSERT INTO action_history(action_id,event_type,before_json,after_json,comment) VALUES($1,'store_owner_reassigned',$2,$3,$4)`,[a.id,JSON.stringify(a),JSON.stringify(after),`Legacy seller split: product ${t.product_id}, store ${t.from_store} -> ${t.to_store}; fingerprint ${fingerprint}`]);
  }
  // Existing immutable records must survive byte-for-byte as JSON values.
  const verifyAnalyses=(await c.query('SELECT * FROM product_analyses WHERE product_id=ANY($1::bigint[]) ORDER BY id',[list.map(t=>t.product_id)])).rows;
  const verifyHistory=(await c.query('SELECT * FROM action_history WHERE id=ANY($1::bigint[]) ORDER BY id',[history.map(h=>h.id)])).rows;
  if(JSON.stringify(analyses)!==JSON.stringify(verifyAnalyses)||JSON.stringify(history)!==JSON.stringify(verifyHistory))throw Error('Historical data changed');
  const verifyProducts=(await c.query('SELECT * FROM products WHERE id=ANY($1::bigint[]) ORDER BY id',[list.map(t=>t.product_id)])).rows;
  for(const p of verifyProducts){const before=products.find(x=>x.id===String(p.id)),t=byProduct.get(String(p.id));if(String(p.store_id)!==t.to_store)throw Error('Target verification failed');const normalized={...p,id:String(p.id),store_id:before.store_id};if(JSON.stringify(normalized)!==JSON.stringify(before))throw Error('Unexpected product change');}
  const verifyActions=(await c.query('SELECT * FROM improvement_actions WHERE analysis_id=ANY($1::bigint[]) ORDER BY id',[analyses.map(a=>a.id)])).rows;
  const reassignedIds=new Set(reassigned.map(a=>String(a.id)));
  if(verifyActions.length!==actions.length)throw Error('Action count changed');
  for(let i=0;i<actions.length;i++){const a=actions[i],after=verifyActions[i];if(reassignedIds.has(String(a.id))){if(String(after.assigned_to)!==owners.get(byAnalysis.get(String(a.analysis_id)).to_store))throw Error('Assignee verification failed');after.assigned_to=a.assigned_to;after.updated_at=a.updated_at;}if(JSON.stringify(after)!==JSON.stringify(a))throw Error('Unexpected action change');}
  const enabled=await c.query(`SELECT tgenabled FROM pg_trigger WHERE tgrelid='products'::regclass AND tgname='immutable_product_store'`);
  if(enabled.rows[0]?.tgenabled!=='O')throw Error('Ownership trigger not restored');
  await c.query('COMMIT');committed=true;
 }else await c.query('ROLLBACK');
 await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,report:resolve(out,'report.json')},null,2));
}catch(e){if(c)await c.query('ROLLBACK').catch(()=>{});const safe=/^(Use dry|Bundle |Invalid |Transfer |Database product|Product belongs|Ownership trigger|Plan changed|Historical data|Target verification|Unexpected |Action count|Assignee verification)/.test(e?.message??'');console.error(safe?e.message:`Transfer failed (${e?.name??'Error'}); check schema/connectivity locally.`);if(committed)console.error('Database committed; report output failed. Rerun dry-run to verify.');process.exitCode=1;
}finally{c?.release();if(db)await db.end();}
