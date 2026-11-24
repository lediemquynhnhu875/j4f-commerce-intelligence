import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runMatrix} from '../scripts/test-three-stores.mjs';
const users=[1,2,3].map(i=>({email:`u${i}@example.test`,password:'local-fixture-only'}));
function pair(left,right){
 const l=users.indexOf(left)+1,r=users.indexOf(right)+1;
 const row=i=>({store_id:String(i),products:20+i,analyses:20+i,actions:30+i});
 return {result:'PASS',mode:'business-read-only',both_stores_populated:true,user1:row(l),user2:row(r),sql_assignee_rejections:2,requests:80,
 cross_store_directions:[[l,r],[r,l]].map(([owner,reader])=>({owner_store:String(owner),reader_store:String(reader),products:true,analyses:true,actions:true}))};
}
test('three account pairs give six directions without leaking credentials',()=>{
 const out=runMatrix(users,pair);assert.equal(out.stores.length,3);assert.equal(out.pairs.length,3);assert.equal(out.cross_store_directions.length,6);assert.equal(out.sql_assignee_rejections,6);assert.equal(out.requests,240);assert(!JSON.stringify(out).includes(users[0].password));assert(!JSON.stringify(out).includes('@'));
});
test('repeated account configuration is rejected before tests run',()=>{
 let calls=0;assert.throws(()=>runMatrix([users[0],users[0],users[2]],()=>{calls++;}),/distinct/);assert.equal(calls,0);
});
test('failed or writable child report is never accepted',()=>{
 for(const change of [{result:'FAIL'},{mode:'temporary-product-crud'},{both_stores_populated:false}])assert.throws(()=>runMatrix(users,(l,r)=>({...pair(l,r),...change})));
});
test('missing read-isolation coverage fails',()=>{
 assert.throws(()=>runMatrix(users,(l,r)=>{const report=pair(l,r);report.cross_store_directions[0].actions=false;return report;}),/Incomplete/);
});
test('counts changing between pairs fail rather than hiding concurrency',()=>{
 let n=0;assert.throws(()=>runMatrix(users,(l,r)=>{const out=pair(l,r);if(++n===2)out.user1.products++;return out;}),/counts changed/);
});
test('missing assignee rejection fails',()=>assert.throws(()=>runMatrix(users,(l,r)=>({...pair(l,r),sql_assignee_rejections:0})),/assignee/));

test('account-to-store assignment cannot drift between pairs',()=>{let n=0;assert.throws(()=>runMatrix(users,(l,r)=>{const out=pair(l,r);if(++n===2)out.user1.store_id='8';return out;}),/different store/);});
