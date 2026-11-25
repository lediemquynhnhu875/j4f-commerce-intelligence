import {test,expect,type Page} from '@playwright/test';

async function fixtures(page:Page){
 const requests:string[]=[],patches:Record<string,unknown>[]=[];
 const store={id:'3',owner_user_id:'1',name:'J4F store',is_active:true};
 const product={id:'1',store_id:'3',name:'Example product',category_id:null,price:'100',currency:'VND',quantity_sold:'99',thumbnail_url:null};
 const analysis={id:'1',product_id:'1',status:'performing_well',status_schema_version:'ml_v2',product_type:'shoe',analyzed_at:'2026-10-12T16:25:18Z',reference_sold:'10',sales_gap:'-5',priority_score:'1',pipeline_version:'test',input_snapshot_json:{product_name:'Example product',quantity_sold:5,price:100},comparison_json:{},evidence_json:{items:[]},config_json:{prediction_origin:'unavailable'},product:{id:'1',name:'Example product'}};
 const actions=Array.from({length:30},(_,i)=>({id:String(i+1),analysis_id:'1',title:'Action '+(i+1),description:'Hypothesis',type:'review_price',origin:'ml_rule',status:'proposed',updated_at:'2026-11-17T12:00:00.000Z',original_suggestion_json:{evidence:'Saved evidence',validation_needed:'Check after testing'}}));
 await page.route('**/api/backend/**',async route=>{
  const url=new URL(route.request().url()),name=url.pathname.replace('/api/backend/','');requests.push(name+url.search);
  if(name==='auth/me')return route.fulfill({json:{data:{id:'1',role:'user',full_name:'Owner A',email:'a@example.test',is_active:true}}});
  if(name==='stores/me/summary')return route.fulfill({json:{store,summary:{total:55,analyzed_products:54,no_reference:4,has_ml:true,review_products:40,active_actions:45,in_progress:2,proposed:43,global_proposed:45,status_counts:{performing_well:54},categories:[{id:'none',name:'Chưa phân loại',count:55}]},data:{products:[product],analyses:[analysis],actions:[actions[0]],categories:[]}}});
  if(name==='products/options'||name==='analyses/options')return route.fulfill({json:{data:[name==='products/options'?product:analysis],pagination:{page:1,limit:20,total:1}}});
  if(name==='analyses/workspace')return route.fulfill({json:{store,proposed_actions:30,data:{products:[product],analyses:[analysis],actions:actions.slice(0,20),categories:[],accounts:[]},history:[analysis],history_pagination:{page:1,limit:20,total:1},actions_pagination:{page:1,limit:20,total:30}}});
  if(name==='actions/workspace'){
   const p=Number(url.searchParams.get('page')||1),states:Record<string,number>={};for(const a of actions)states[a.status]=(states[a.status]||0)+1;
   return route.fulfill({json:{store,data:{products:[product],analyses:[analysis],actions:actions.slice((p-1)*12,p*12)},pagination:{page:p,limit:12,total:30},summary:{total:30,states},facets:{types:['review_price']},filtered_states:states}});
  }
  const match=name.match(/^actions\/(\d+)$/);
  if(match&&route.request().method()==='PATCH'){
   const input=route.request().postDataJSON();patches.push(input);const action=actions.find(a=>a.id===match[1])!;
   expect(input.expected_updated_at).toBe(action.updated_at);
   Object.assign(action,input,{updated_at:'2026-11-17T12:30:00.000Z'});return route.fulfill({json:{data:action}});
  }
  if(/^actions\/\d+\/history$/.test(name))return route.fulfill({json:{data:[{id:'1',event_type:'created',created_at:'2026-11-17T12:00:00Z'},{id:'2',event_type:'accepted',created_at:'2026-11-17T12:30:00Z'}],pagination:{page:1,limit:20,total:2}}});
  return route.fulfill({status:503,json:{error:{message:'Unexpected bulk request '+name}}});
 });
 return {requests,patches};
}

test('overview uses global aggregates while detail loads just the selected profile',async({page})=>{
 const {requests}=await fixtures(page);
 await page.goto('/user/overview');
 await expect(page.getByText('55 sản phẩm trong catalog')).toBeVisible();
 await expect(page.getByText('40 sản phẩm có đề xuất đang mở · Hiển thị tối đa 8 sản phẩm theo điểm ưu tiên đã lưu')).toBeVisible();
 await page.goto('/user/analysis?product=1');
 await expect(page.getByText('Lịch sử kết quả',{exact:true})).toBeVisible();
 expect(requests.some(r=>r.startsWith('analyses/workspace?')&&r.includes('product_id=1'))).toBe(true);
 expect(requests.some(r=>/^(products|analyses|actions|categories|stores)(\?|$)/.test(r))).toBe(false);
});

test('paged work preserves acceptance, required rejection reason and audit',async({page})=>{
 const {requests,patches}=await fixtures(page);
 await page.goto('/user/suggestions');await expect(page.locator('.suggestion-card')).toHaveCount(12);
 const card=(n:number)=>page.locator('.suggestion-card').filter({has:page.getByRole('heading',{name:'Action '+n,exact:true})});
 await card(1).getByRole('button',{name:'Chấp nhận',exact:true}).click();
 await page.getByRole('button',{name:'Đã hiểu',exact:true}).click();await expect(card(1).getByText('Đã chấp nhận',{exact:true})).toBeVisible();
 await card(2).getByRole('button',{name:'Từ chối',exact:true}).click();
 const reason=page.locator('textarea[name=decision_reason]');await expect(reason).toHaveAttribute('required','');
 await page.getByRole('button',{name:'Lưu công việc',exact:true}).click();expect(patches).toHaveLength(1);
 await reason.fill('Not suitable for this store');await page.getByRole('button',{name:'Lưu công việc',exact:true}).click();
 await page.getByRole('button',{name:'Đã hiểu',exact:true}).click();expect(patches[1].decision_reason).toBe('Not suitable for this store');
 await card(1).getByText('Quản lý công việc & lịch sử',{exact:true}).click();await card(1).getByRole('button',{name:'Lịch sử',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Lịch sử công việc #1'})).toBeVisible();expect(requests.some(r=>r==='actions/1/history?page=1&limit=20')).toBe(true);
 await page.getByRole('button',{name:'Đóng',exact:true}).click();await page.getByRole('button',{name:'Kanban',exact:true}).click();
 await expect(page.locator('.suggestion-card')).toHaveCount(12);
 await page.getByRole('button',{name:'Trang đề xuất sau',exact:true}).click();await expect(card(13)).toBeVisible();
 expect(requests.some(r=>/^(products|analyses|actions|categories|stores)(\?|$)/.test(r))).toBe(false);
});
