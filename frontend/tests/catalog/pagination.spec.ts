import {test,expect} from '@playwright/test';

test('catalog requests only the visible page and ignores stale searches',async({page})=>{
  const requests:string[]=[],unexpected:string[]=[],errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/backend/**',async route=>{
    const url=new URL(route.request().url()),name=url.pathname.replace('/api/backend/','');
    requests.push(url.pathname+url.search);
    if(name==='auth/me')return route.fulfill({json:{data:{id:'1',role:'user',full_name:'Owner A',email:'a@example.test',is_active:true}}});
    if(name!=='products/catalog'){
      unexpected.push(name);
      return route.fulfill({status:503,json:{error:{code:'UNEXPECTED_REQUEST',message:name}}});
    }
    const q=url.searchParams.get('q')||'',limit=Number(url.searchParams.get('limit')||20),current=Number(url.searchParams.get('page')||1);
    if(q==='error')return route.fulfill({status:503,json:{error:{code:'TEST_ERROR',message:'Temporary test error'}}});
    let list=Array.from({length:55},(_,i)=>({id:String(i+1),store_id:'3',name:'Product '+(i+1),source_product_id:String(100+i),category_id:'1',price:String(i+1),currency:'VND',quantity_sold:String(i),rating_average:'4.5',review_count:1,thumbnail_url:null}));
    if(q)list=list.filter(p=>p.name.toLowerCase().includes(q.toLowerCase()));
    if(url.searchParams.get('status')==='no_analysis')list=[];
    if(url.searchParams.get('sort')==='sales')list.reverse();
    const data=list.slice((current-1)*limit,current*limit);
    if(q==='Product 1')await new Promise(resolve=>setTimeout(resolve,700));
    await route.fulfill({json:{data,pagination:{page:current,limit,total:list.length},
      analyses:data.map(p=>({id:p.id,product_id:p.id,status:'performing_well',product_type:'shoe',analyzed_at:'2026-10-12T16:25:18Z'})),
      actions:data.map(p=>({id:p.id,analysis_id:p.id,title:'Action '+p.id})),categories:[{id:'1',code:'shoe',name:'Shoes'}],
      store:{id:'3',owner_user_id:'1',name:'J4F store',is_active:true},facets:{statuses:['performing_well','monitor_gap'],types:['shoe']},summary:{total:55,undecided_count:0,proposed_actions:55}}});
  });
  await page.goto('/user/products');
  const rows=page.locator('tbody tr');
  await expect(rows).toHaveCount(20);
  await expect(page.getByRole('link',{name:'Action 1',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Trang sau',exact:true}).click();
  await expect(page.getByText('Product 21',{exact:true})).toBeVisible();
  await page.getByLabel('Số sản phẩm mỗi trang').selectOption('10');
  await expect(rows).toHaveCount(10);await expect(page.getByText('Product 1',{exact:true})).toBeVisible();
  const search=page.getByLabel('Tìm sản phẩm');
  await search.fill('Product 1');
  await expect.poll(()=>requests.some(r=>r.includes('q=Product+1'))).toBe(true);
  await search.fill('Product 55');
  await expect(page.getByText('Product 55',{exact:true})).toBeVisible();
  await page.waitForTimeout(900);await expect(rows).toHaveCount(1);
  await search.fill('not-present');
  await expect.poll(()=>requests.some(r=>r.includes('q=not-present'))).toBe(true);
  await expect(page.getByText('Đang tải trang sản phẩm…')).toHaveCount(0);await expect(rows).toHaveCount(0);
  await page.getByRole('button',{name:'Đặt lại',exact:true}).click();await expect(rows).toHaveCount(10);
  await page.getByLabel('Trạng thái phân tích').selectOption('no_analysis');await expect(rows).toHaveCount(0);
  await page.getByRole('button',{name:'Đặt lại',exact:true}).click();await expect(rows).toHaveCount(10);
  await page.getByLabel('Loại sản phẩm ML').selectOption('shoe');
  await page.getByLabel('Sắp xếp sản phẩm').selectOption('sales');
  await expect(page.getByText('Product 55',{exact:true})).toBeVisible();
  expect(requests.some(r=>r.includes('type=shoe')&&r.includes('sort=sales'))).toBe(true);
  await search.fill('error');await expect(page.getByText('Temporary test error',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Đã hiểu',exact:true}).click();
  await search.fill('Product 29');await expect(page.getByText('Product 29',{exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  expect(unexpected).toEqual([]);expect(errors).toEqual([]);
});
