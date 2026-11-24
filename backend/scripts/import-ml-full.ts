/** Offline CLI only. No routes or schema changes. Dry-run is the default. */
import { readFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { pool, transaction } from '../src/server/db';
import type { PoolClient } from 'pg';

type Row = Record<string, any>;
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const args = process.argv.slice(2);
function option(name: string, fallback?: string) {
  const at = args.indexOf(name);
  if (at < 0) return fallback;
  if (!args[at + 1] || args[at + 1].startsWith('--')) throw new Error('Missing CLI option value');
  return args[at + 1];
}
const sourceFields = ['store_id','source_system','source_product_id','name','description','brand','price','original_price','currency','quantity_sold','rating_average','review_count','number_of_images','has_video','thumbnail_url','observed_at','sales_scope','sales_label_verified','source_data_json'];
const analysisFields = ['product_id','run_id','status_schema_version','status','status_reason','product_type','taxonomy_version','reference_sold','probability_positive_sales','prediction_lower','prediction_upper','priority_score','sales_gap','is_eligible','needs_review','model_version','pipeline_version','input_snapshot_json','comparison_json','evidence_json','config_json','limitation_note','scored_at','analyzed_at'];
const actionFields = ['analysis_id','type','origin','rule_id','title','description','original_suggestion_json','information_needed'];
// Tables/columns are private fixed constants, never CLI-supplied identifiers.
async function bulk(client: PoolClient, table: string, fields: string[], rows: Row[]) {
  const result: Row[] = [];
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const values: unknown[] = [];
    const slots = batch.map(row => '(' + fields.map(key => {
      const value = row[key] ?? null;
      values.push(value !== null && typeof value === 'object' ? JSON.stringify(value) : value);
      return '$' + values.length;
    }).join(',') + ')').join(',');
    result.push(...(await client.query(`INSERT INTO ${table} (${fields.join(',')}) VALUES ${slots} RETURNING *`, values)).rows);
  }
  return result;
}

try {
  const allowed = new Set(['--bundle','--mapping','--confirm','--apply','--dry-run']);
  for (let i=0;i<args.length;i++) {
    if (!allowed.has(args[i])) throw new Error('Unknown CLI option');
    if (!['--apply','--dry-run'].includes(args[i])) i++;
  }
  if (args.includes('--apply') && args.includes('--dry-run')) throw new Error('Choose apply or dry-run');
  const applying = args.includes('--apply');
  const directory = resolve(option('--bundle', '../data/processed/ml-import-v1')!);
  const mapPath = option('--mapping');
  if (!mapPath) throw new Error('Provide --mapping with explicit source seller to existing store IDs');
  const manifestBytes = await readFile(join(directory, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const recordsPath=join(directory, 'records.ndjson');
  const hash=createHash('sha256');
  for await (const chunk of createReadStream(recordsPath)) hash.update(chunk);
  const bundleHash=hash.digest('hex');
  if (manifest.schema_version !== 'sellens-ml-import-v1' || bundleHash !== manifest.records_sha256)
    throw new Error('Bundle checksum/version mismatch');
  const mappingBytes = await readFile(resolve(mapPath));
  const mapping = JSON.parse(mappingBytes.toString('utf8'));
  if (typeof mapping.run_key !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(mapping.run_key)) throw new Error('Invalid run key');
  if (!mapping.seller_to_store || typeof mapping.seller_to_store !== 'object' || Array.isArray(mapping.seller_to_store)) throw new Error('Invalid seller mapping');
  const pairs = Object.entries(mapping.seller_to_store);
  if (!pairs.length || pairs.some(([seller, store]) => !seller.trim() || typeof store !== 'string' || !/^[1-9]\d*$/.test(store)))
    throw new Error('Map at least one seller to an existing positive store ID string');
  const known = new Set<string>(), identities=new Set<string>();
  const selected: Row[]=[];
  let total=0,recommendationCount=0;
  for await (const line of createInterface({input:createReadStream(recordsPath),crlfDelay:Infinity})) {
    if (!line.trim()) continue;
    const p=JSON.parse(line);
    if (identities.has(p.source_id) || p.analysis.config_json.source_sha256 !== manifest.source_sha256) throw new Error('Bundle record integrity mismatch');
    identities.add(p.source_id);known.add(p.seller_id);total++;recommendationCount+=p.recommendations.length;
    if (Object.hasOwn(mapping.seller_to_store,p.seller_id)) selected.push(p);
  }
  if (total !== manifest.products || recommendationCount !== manifest.recommendations) throw new Error('Bundle record count mismatch');
  if (pairs.some(([seller])=>!known.has(seller))) throw new Error('Mapping contains unknown seller');
  const selectedById = new Map(selected.map(p=>[p.source_id,p]));
  const ids = selected.map(p=>p.source_id);
  const storeIds = [...new Set(pairs.map(([,store])=>String(store)))];
  const selectionHash = sha(JSON.stringify(selected.map(p=>[p.source_id, mapping.seller_to_store[p.seller_id]])));
  const result = await transaction(async client => {
    if (!applying) await client.query('SET TRANSACTION READ ONLY');
    else {
      // Serialize against the existing imports and HTTP writes without modifying any row.
      await client.query('SELECT pg_advisory_xact_lock(736551004)');
      await client.query('LOCK TABLE users, stores, products, product_analyses, improvement_actions, action_history, analysis_runs IN SHARE ROW EXCLUSIVE MODE');
    }
    const owners = await client.query(`SELECT s.id::text FROM stores s JOIN users u ON u.id=s.owner_user_id WHERE s.id=ANY($1::bigint[]) AND s.is_active AND u.is_active AND u.role='reviewer'`,[storeIds]);
    if (owners.rows.length !== storeIds.length) throw new Error('Mapped store/owner is missing, inactive or not a User');
    const existing = (await client.query(`SELECT id::text,store_id::text,source_product_id FROM products WHERE source_system='tiki' AND source_product_id=ANY($1::text[]) ORDER BY id`,[ids])).rows;
    const productBySource = new Map<string,string>();
    for (const p of existing) {
      const item = selectedById.get(p.source_product_id)!;
      if (p.store_id !== mapping.seller_to_store[item.seller_id]) throw new Error('Existing source product belongs to another store; no ownership transfer allowed');
      if (productBySource.has(p.source_product_id)) throw new Error('Duplicate existing source identity; reconcile before import');
      productBySource.set(p.source_product_id,p.id);
    }
    const previous = (await client.query(`SELECT a.*,p.source_product_id FROM product_analyses a JOIN products p ON p.id=a.product_id WHERE p.id=ANY($1::bigint[]) ORDER BY a.id`,[[...productBySource.values()]])).rows;
    const previousBySource = new Map<string,Row[]>();
    for (const a of previous) previousBySource.set(a.source_product_id,[...(previousBySource.get(a.source_product_id) ?? []),a]);
    // Different source snapshots are separate immutable analysis versions.
    // Never reuse or overwrite an analysis from another source checksum.
    const preservedOtherSourceAnalyses = previous.filter(a => a.config_json?.source_sha256 !== manifest.source_sha256).length;
    const analysisBySource = new Map<string,string>();
    for (const item of selected) {
      const matches = (previousBySource.get(item.source_id) ?? []).filter(a=> a.config_json?.source_sha256 === manifest.source_sha256 && a.model_version === item.analysis.model_version && a.pipeline_version === item.analysis.pipeline_version && new Date(a.scored_at).getTime() === new Date(item.analysis.scored_at).getTime());
      if (matches.length > 1) throw new Error('Ambiguous existing analysis identity');
      if (matches.length) {
        const old=matches[0];
        if (old.config_json?.source_sha256 !== manifest.source_sha256 || old.status !== item.analysis.status || old.status_reason !== item.analysis.status_reason)
          throw new Error('Existing analysis provenance differs; existing evidence preserved');
        analysisBySource.set(item.source_id,String(old.id));
      }
    }
    const reusedIds = [...analysisBySource.values()];
    const existingActions = (await client.query(`SELECT * FROM improvement_actions WHERE analysis_id=ANY($1::bigint[]) AND origin='ml_rule' ORDER BY id`,[reusedIds])).rows;
    const actionsByAnalysis = new Map<string,Row[]>();
    for (const a of existingActions) actionsByAnalysis.set(String(a.analysis_id),[...(actionsByAnalysis.get(String(a.analysis_id)) ?? []),a]);
    for (const item of selected.filter(x=>analysisBySource.has(x.source_id))) {
      const actual = actionsByAnalysis.get(analysisBySource.get(item.source_id)!) ?? [];
      if (actual.length !== item.recommendations.length || item.recommendations.some((r: Row)=>!actual.some(a=>a.rule_id===r.rule_id && ['evidence','hypothesis','action','validation_needed'].every(k=>a.original_suggestion_json[k]===r[k]))))
        throw new Error('Existing suggestions differ; human work preserved');
    }
    const newProducts = selected.filter(p=>!productBySource.has(p.source_id));
    const newAnalyses = selected.filter(p=>!analysisBySource.has(p.source_id));
    const changes = {products:newProducts.length, analyses:newAnalyses.length, actions:newAnalyses.reduce((n,p)=>n+p.recommendations.length,0)};
    const priorRun = (await client.query('SELECT * FROM analysis_runs WHERE run_key=$1',[mapping.run_key])).rows[0];
    if (priorRun && (priorRun.source_sha256 !== manifest.source_sha256 || priorRun.selection_sha256 !== selectionHash || priorRun.manifest_json?.bundle_sha256 !== bundleHash)) throw new Error('Run key already belongs to different input');
    if (priorRun && Object.values(changes).some(n=>n!==0)) throw new Error('Existing run is incomplete; manual review required');
    // Fingerprint exact DB rows and action state, not just counts. A stale approval cannot apply.
    const fingerprint = sha(JSON.stringify({manifest:sha(manifestBytes), mapping:sha(mappingBytes), selectionHash, existing, previous, existingActions, changes}));
    const plan = {mode:priorRun?'already-imported':applying?'imported':'dry-run', selected_products:selected.length, unselected_products:total-selected.length, selected_recommendations:selected.reduce((n,p)=>n+p.recommendations.length,0), stores:storeIds, insert:changes, reused_analyses:analysisBySource.size, preserved_other_source_analyses:preservedOtherSourceAnalyses, fingerprint};
    if (!applying || priorRun) return plan;
    if (option('--confirm') !== fingerprint) throw new Error('Plan changed or --confirm missing; run dry-run and review again');
    const run = (await client.query(`INSERT INTO analysis_runs(run_key,source_sha256,selection_sha256,manifest_json,scored_at) VALUES($1,$2,$3,$4,$5) RETURNING id`,[mapping.run_key,manifest.source_sha256,selectionHash,JSON.stringify({...manifest,bundle_sha256:bundleHash,seller_to_store:mapping.seller_to_store,selected_products:selected.length,insert:changes,reused_analyses:Object.fromEntries(analysisBySource)}),selected[0].analysis.scored_at])).rows[0];
    const insertedProducts = await bulk(client,'products',sourceFields,newProducts.map(p=>({...p.product,store_id:mapping.seller_to_store[p.seller_id],source_system:'tiki',source_product_id:p.source_id,source_data_json:{source_product_id:p.source_id,seller_id:p.seller_id,product_type:p.analysis.product_type,taxonomy_version:p.analysis.taxonomy_version,import_run_key:mapping.run_key}})));
    for (const p of insertedProducts) productBySource.set(p.source_product_id,String(p.id));
    const insertedAnalyses = await bulk(client,'product_analyses',analysisFields,newAnalyses.map(p=>({...p.analysis,product_id:productBySource.get(p.source_id),run_id:run.id})));
    const sourceByProduct=new Map([...productBySource].map(([source,id])=>[id,source]));
    for (const a of insertedAnalyses) analysisBySource.set(sourceByProduct.get(String(a.product_id))!,String(a.id));
    const actionRows = newAnalyses.flatMap(p=>p.recommendations.map((r:Row)=>({analysis_id:analysisBySource.get(p.source_id),type:r.type,origin:'ml_rule',rule_id:r.rule_id,title:r.action,description:r.hypothesis,original_suggestion_json:Object.fromEntries(['rule_id','evidence','hypothesis','action','validation_needed'].map(k=>[k,r[k]])),information_needed:r.validation_needed})));
    const insertedActions=await bulk(client,'improvement_actions',actionFields,actionRows);
    await bulk(client,'action_history',['action_id','event_type','after_json','comment'],insertedActions.map(a=>({action_id:a.id,event_type:'created',after_json:a,comment:'Imported original ML hypothesis'})));
    return plan;
  });
  console.log(JSON.stringify(result,null,2));
} catch (error) {
  // Never print SQL/driver errors or input data that could contain credentials.
  const message = error instanceof Error ? error.message : '';
  const safe = /^(Missing CLI|Unknown CLI|Choose apply|Provide --mapping|Bundle |Invalid run|Invalid seller|Map at least|Mapping contains|Mapped store|Existing source|Duplicate existing|Ambiguous existing|Existing analysis|Existing suggestions|Run key|Existing run|Plan changed)/.test(message);
  console.error(safe ? message : 'Import stopped; check bundle, database schema and connectivity locally. Transaction rolled back if opened.');
  process.exitCode=1;
} finally { try { await pool().end(); } catch { /* Initialization may have failed before a pool existed. */ } }
