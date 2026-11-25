import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogFilters,catalogQuerySchema} from '../src/server/services/catalog-page';
import {handle} from '../src/server/api';
test('catalog rejects unbounded, invalid and unknown filters',()=>{
  for(const input of [{limit:'101'},{page:'0'},{sort:'price; DROP TABLE products'},{store:'0'},{status:'invented'},{analysable_only:'yes'},{q:'x'.repeat(201)},{owner_user_id:'2'}])assert.equal(catalogQuerySchema.safeParse(input).success,false);
});
test('catalog query binds literal search and store; sorting uses fixed SQL',()=>{
  const q=catalogQuerySchema.parse({q:"50%_\\'",status:'no_analysis',sort:'price',type:'túi',category_id:'3'});
  const built=catalogFilters('12',q);
  assert.equal(built.args[0],'12');
  assert.equal(built.args[1],"%50\\%\\_\\\\'%");
  assert(!built.where.includes("50%"));assert(built.where.includes('a.id IS NULL'));
  assert.equal(built.order,'p.price ASC NULLS LAST,p.id ASC');
});
test('catalog route requires a session rather than matching a product ID',async()=>{
  const r=await handle(new Request('http://localhost/api/v1/products/catalog'),['products','catalog']);
  assert.equal(r.status,401);
});
