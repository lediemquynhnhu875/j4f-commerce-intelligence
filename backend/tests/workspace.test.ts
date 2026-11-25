import {test} from 'node:test';
import assert from 'node:assert/strict';
import {choiceQuery,detailQuery,workQuery} from '../src/server/services/workspace';
import {handle,routes} from '../src/server/api';
test('workspace rejects invalid paging, owner spoofing and mismatched query vocabulary',()=>{
 for(const q of [{page:'0'},{limit:'101'},{type:'invented'},{status:'invented'},{owner_user_id:'2'},{analysis_id:'1 OR 1=1'}])assert(!workQuery.safeParse(q).success);
 assert(!detailQuery.safeParse({history_page:'0'}).success);
 assert(!detailQuery.safeParse({actions_page:'Infinity'}).success);
 assert(!choiceQuery.safeParse({q:'x'.repeat(201)}).success);
 assert(!choiceQuery.safeParse({store_id:'3'}).success);
 assert.equal(workQuery.parse({}).limit,12);assert.equal(choiceQuery.parse({}).limit,20);
});
test('all workspace endpoints are centrally declared protected routes',async()=>{
 for(const path of ['stores/me/summary','products/options','analyses/options','analyses/workspace','actions/workspace']){
  assert.equal(routes['GET /api/v1/'+path].access,'user');
  const response=await handle(new Request('http://localhost/api/v1/'+path),path.split('/'));
  assert.equal(response.status,401,path);
 }
});
