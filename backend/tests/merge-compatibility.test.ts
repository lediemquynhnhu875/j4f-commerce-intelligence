import {test} from 'node:test';
import assert from 'node:assert/strict';
import {routes,handle} from '../src/server/api';
test('current model/workspace routes and additive compatibility reads coexist',async()=>{
 const reads=['workspace/summary','workspace/overview','analysis-workspace','products/1/analyses/1','products/catalog','products/options','stores/me/summary','analyses/options','analyses/workspace','actions/workspace'];
 for(const path of reads){const pattern=path==='products/1/analyses/1'?'products/:id/analyses/:analysisId':path;assert.equal(routes['GET /api/v1/'+pattern]?.access,'user',path);assert.equal((await handle(new Request('http://localhost/api/v1/'+path),path.split('/'))).status,401,path);}
 assert.equal(routes['POST /api/v1/products/:id/analyses']?.access,'user');
 assert.equal((await handle(new Request('http://localhost/api/v1/products/1/analyses',{method:'POST'}),['products','1','analyses'])).status,401);
});
test('compatibility names precede dynamic ID routes',()=>{
 const keys=Object.keys(routes);
 for(const [staticPath,dynamic]of [['products/catalog','products/:id'],['products/options','products/:id'],['analyses/workspace','analyses/:id'],['analyses/options','analyses/:id'],['actions/workspace','actions/:id']])assert(keys.indexOf('GET /api/v1/'+staticPath)<keys.indexOf('GET /api/v1/'+dynamic),staticPath);
});
