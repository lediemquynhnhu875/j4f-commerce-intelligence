import {createHash} from 'node:crypto';
export const sha=x=>createHash('sha256').update(x).digest('hex');
export const emailFor=seller=>`shop-${sha(seller).slice(0,24)}@sellens.test`;
export const accountName=seller=>Array.from(seller.trim()).slice(0,150).join('');
export const storeName=seller=>Array.from(seller.trim()).slice(0,200).join('');
export function makePlan(records,stores,products,users){
 const source=new Map(),sellers=new Set();
 for(const r of records){if(typeof r.seller_id!=='string'||!r.seller_id.trim()||source.has(r.source_id))throw Error('Invalid source identity');source.set(r.source_id,r.seller_id);sellers.add(r.seller_id);}
 const ss=new Map(),ps=new Map(),seen=new Set();
 for(const p of products){const seller=source.get(p.source_product_id);if(seller===undefined)continue;if(seen.has(p.source_product_id))throw Error('Duplicate database source product');seen.add(p.source_product_id);if(!ss.has(seller))ss.set(seller,new Set());ss.get(seller).add(p.store_id);if(!ps.has(p.store_id))ps.set(p.store_id,new Set());ps.get(p.store_id).add(seller);}
 const byId=new Map(stores.map(s=>[s.id,s]));const byEmail=new Map(users.map(u=>[u.email.toLowerCase(),u]));
 const targets=[];
 for(const seller of [...sellers].sort()){
  const ids=[...(ss.get(seller)??[])];
  const existing=ids.length===1&&ps.get(ids[0]).size===1?byId.get(ids[0]):null;
  const email=emailFor(seller),user=byEmail.get(email);
  let store=existing;
  if(user){const generated=stores.find(s=>s.owner_user_id===user.id);if(!generated||user.role!=='reviewer'||!user.is_active||user.full_name!==accountName(seller)||generated.name!==storeName(seller))throw Error('Generated account identity conflict');if(store&&store.id!==generated.id)throw Error('Ambiguous seller target');store=generated;}
  if(store&&(!store.is_active||!store.owner_active||store.role!=='reviewer'))throw Error('Inactive seller store');
  targets.push({seller,email:store?null:email,store_id:store?.id??null,operation:store?'reuse':'create'});
 }
 const target=new Map(targets.map(t=>[t.seller,t]));
 const transfers=products.filter(p=>source.has(p.source_product_id)&&target.get(source.get(p.source_product_id)).store_id!==p.store_id).map(p=>({product_id:p.id,source_product_id:p.source_product_id,from_store:p.store_id,seller:source.get(p.source_product_id),to_store:target.get(source.get(p.source_product_id)).store_id}));
 return {targets,transfers,products:source.size,sellers:sellers.size,existing_source_products:seen.size};
}
