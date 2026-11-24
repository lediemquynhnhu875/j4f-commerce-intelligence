/** Resumable media-only enrichment, bounded batches, missing URLs only. */
import {readFile,writeFile,mkdir,rename,open,unlink} from 'node:fs/promises';
const args=process.argv.slice(2);let apply=false,limit=200;
for(let i=0;i<args.length;i++){if(args[i]==='--apply')apply=true;else if(args[i]==='--limit'&&/^\d+$/.test(args[i+1]??''))limit=Number(args[++i]);else throw Error('Use --limit 1..1000 and optional --apply');}
if(limit<1||limit>1000)throw Error('Batch limit must be 1..1000');
const dir='../tmp/all-media',path=dir+'/checkpoint.json',lockPath=dir+'/runner.lock';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
export function safeImage(value){
 if(typeof value!=='string')return null;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&(u.hostname==='tikicdn.com'||u.hostname.endsWith('.tikicdn.com'))?u.href:null;}catch{return null;}
}
let db,lock;
const summary={mode:apply?'applied':'dry-run',checked:0,resolved:0,not_found_404:0,failed:0,rows_updated:0,stopped_for_rate_limit:false};
try{
 await mkdir(dir,{recursive:true});lock=await open(lockPath,'wx');await lock.writeFile(String(process.pid));
 const manifest=JSON.parse(await readFile('../data/processed/ml-import-v1/manifest.json','utf8'));
 const mapping=JSON.parse(await readFile('../tmp/seller-provision/store-mapping-all.json','utf8')).seller_to_store;
 const stores=[...new Set(Object.values(mapping))];
 let checkpoint={source_sha256:manifest.source_sha256,items:{}};
 try{checkpoint=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(checkpoint.source_sha256!==manifest.source_sha256)throw Error('Checkpoint belongs to a different source bundle');
 const save=async()=>{await writeFile(path+'.next',JSON.stringify(checkpoint));await rename(path+'.next',path);};
 db=(await import('../src/server/db.ts')).pool();
 const candidates=(await db.query(`SELECT id::text,source_product_id,store_id::text FROM products WHERE source_system='tiki' AND store_id=ANY($1::bigint[]) AND nullif(trim(thumbnail_url),'') IS NULL ORDER BY id`,[stores])).rows;
 const now=Date.now();
 const pending=candidates.filter(p=>{
  const old=checkpoint.items[p.source_product_id];
  if(!old)return true;
  if(old.status==='404')return false;
  if(old.status==='stored')return true; // DB URL was cleared: try again.
  return now-old.checked_at>=24*60*60*1000;
 });
 summary.missing_urls=candidates.length;summary.eligible_now=pending.length;summary.skipped_checkpoint=candidates.length-pending.length;
 console.error(`Missing URLs ${candidates.length}; eligible ${pending.length}; batch ${Math.min(limit,pending.length)}`);
 for(const p of pending.slice(0,limit)){
  let record={status:'failed',checked_at:Date.now()};
  try{
   const res=await fetch(`https://tiki.vn/api/v2/products/${encodeURIComponent(p.source_product_id)}?platform=web&version=3`,{headers:{Accept:'application/json','User-Agent':'Mozilla/5.0'},redirect:'error',signal:AbortSignal.timeout(20000)});
   if(res.status===429||res.status===403){summary.stopped_for_rate_limit=true;console.error(`Source returned ${res.status}; stopping batch. Retry later.`);break;}
   if(res.status===404){record.status='404';summary.not_found_404++;}
   else if(res.ok){
    const body=await res.json();
    if(String(body.id)!==p.source_product_id)throw Error('Product ID mismatch');
    const first=Array.isArray(body.images)?body.images[0]:null;
    const urls=[first?.large_url,first?.base_url,first?.medium_url,body.thumbnail_url].map(safeImage).filter(Boolean);
    for(const url of [...new Set(urls)]){
     if(/\/f5\/15\/2228f38cf84d1b8451bb49e2c4537081\.png$/.test(url))continue;
     const image=await fetch(url,{method:'HEAD',redirect:'error',signal:AbortSignal.timeout(10000)});
     if(image.ok&&image.headers.get('content-type')?.startsWith('image/')){record={status:'resolved',checked_at:Date.now(),url};summary.resolved++;break;}
    }
   }
  }catch{/* Failed requests remain eligible after a one-day cooldown. */}
  if(record.status==='failed')summary.failed++;
  if(apply&&record.status==='resolved'){
   // Each row commits independently; reruns skip URLs already in DB.
   const changed=await db.query(`UPDATE products SET thumbnail_url=$2,updated_at=now() WHERE id=$1 AND source_product_id=$3 AND store_id=$4 AND nullif(trim(thumbnail_url),'') IS NULL`,[p.id,record.url,p.source_product_id,p.store_id]);
   summary.rows_updated+=changed.rowCount??0;record.status='stored';
  }
  // Dry-run leaves checkpoints untouched so the same batch remains available for apply.
  if(apply){checkpoint.items[p.source_product_id]=record;await save();}
  summary.checked++;
  if(summary.checked%25===0)console.error(`${summary.checked}: images=${summary.resolved}, 404=${summary.not_found_404}, failed=${summary.failed}`);
  await delay(300);
 }
 console.log(JSON.stringify({...summary,checkpoint:apply?path:null,next:'Run another batch to continue; 404 entries are skipped, failures cool down for 24 hours'},null,2));
}catch(e){console.error(`Media batch stopped (${e?.code==='EEXIST'?'another runner or stale lock':e?.name??'Error'}). Previously committed rows are retained. Check local connectivity, files and schema.`);process.exitCode=1;}
finally{if(db)await db.end().catch(()=>{});if(lock){await lock.close();await unlink(lockPath).catch(()=>{});}}
