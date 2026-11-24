export function validateTransfers(list,mapping,source){
 if(!Array.isArray(list)||!list.length)throw Error('Invalid transfer list');
 const seen=new Set();
 for(const t of list){
  if(!['product_id','source_product_id','from_store','to_store'].every(k=>typeof t[k]==='string'&&/^[1-9]\d*$/.test(t[k]))||t.from_store===t.to_store||seen.has(t.product_id))throw Error('Invalid or duplicate transfer identity');
  if(source.get(t.source_product_id)!==t.seller||mapping.seller_to_store?.[t.seller]!==t.to_store)throw Error('Transfer seller/mapping mismatch');
  seen.add(t.product_id);
 }
}
export function classify(list,products){
 const byId=new Map(products.map(p=>[p.id,p]));const pending=[],done=[];
 for(const t of list){const p=byId.get(t.product_id);if(!p||p.source_system!=='tiki'||p.source_product_id!==t.source_product_id)throw Error('Database product identity mismatch');if(p.store_id===t.to_store)done.push(t);else if(p.store_id===t.from_store)pending.push(t);else throw Error('Product belongs to unexpected store');}
 return {pending,done};
}
