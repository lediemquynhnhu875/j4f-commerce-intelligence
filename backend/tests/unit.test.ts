import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/server/auth";
import { productSchema, id, parse, pagination } from "../src/server/validation";
import { handle } from "../src/server/api";
import { ApiError } from "../src/server/errors";

test("scrypt salts passwords and rejects incorrect credentials", async()=>{
 const first=await hashPassword("Test-password-42"),second=await hashPassword("Test-password-42");
 assert.notEqual(first,second);assert.equal(await verifyPassword("Test-password-42",first),true);
 assert.equal(await verifyPassword("different",first),false);assert.equal(await verifyPassword("test","not-a-hash"),false);
});
test("catalog validation rejects unknown fields, negative prices and invalid ratings",()=>{
 assert.throws(()=>parse(productSchema,{name:"Test",price:-1}));
 assert.throws(()=>parse(productSchema,{name:"Test",rating_average:5.1}));
 assert.throws(()=>parse(productSchema,{name:"Test",imported_by:"1"}));
 assert.throws(()=>parse(productSchema,{name:"Test",thumbnail_url:"javascript:alert(1)"}));
 assert.equal(parse(productSchema,{name:"Test",quantity_sold:null}).quantity_sold,null);
});
test("IDs and pagination are bounded",()=>{
 assert.throws(()=>parse(id,"9223372036854775808"),ApiError);assert.throws(()=>parse(id,"1 OR 1=1"),ApiError);
 assert.throws(()=>pagination(new URL("http://localhost/?limit=101")));
 assert.deepEqual(pagination(new URL("http://localhost/?page=2&limit=5")),{page:2,limit:5});
});
test("health, origin rejection and authentication responses require no mock database",async()=>{
 const health=await handle(new Request("http://localhost/api/v1/health"),["health"]);assert.equal(health.status,200);
 const denied=await handle(new Request("http://localhost/api/v1/products"),["products"]);assert.equal(denied.status,401);
 const cors=await handle(new Request("http://localhost/api/v1/health",{headers:{Origin:"https://forbidden.invalid"}}),["health"]);assert.equal(cors.status,403);
 assert.equal(JSON.stringify(await denied.json()).includes("password_hash"),false);
});

test("route matching preserves aliases, nested guards, 404 and 405 responses",async()=>{
 for(const path of ["products/1/analyses","analyses/1/actions","analysis-results/1/actions","actions/1/history","admin/accounts/1","accounts/1"]){
   const response=await handle(new Request(`http://localhost/api/v1/${path}`),path.split("/"));
   assert.equal(response.status,401,`${path} must match a protected route`);
 }
 const mutation=await handle(new Request("http://localhost/api/v1/products",{method:"POST"}),["products"]);
 assert.equal(mutation.status,401);
 const wrongMethod=await handle(new Request("http://localhost/api/v1/health",{method:"POST"}),["health"]);
 assert.equal(wrongMethod.status,405);
 const extraPath=await handle(new Request("http://localhost/api/v1/health/extra"),["health","extra"]);
 assert.equal(extraPath.status,404);
 const unknown=await handle(new Request("http://localhost/api/v1/sql",{method:"POST"}),["sql"]);
 assert.equal(unknown.status,404);
});
