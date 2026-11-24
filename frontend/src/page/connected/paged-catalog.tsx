"use client";
import {useEffect,useState} from 'react';
import {LiveShell} from '@/components/live-shell';
import {ErrorPopup} from '@/components/popup';
import {Panel,Icon} from '@/components/ui';
import {api} from '@/lib/api-client';
import {exportSaved} from '@/lib/analysis-presentation';
import type {Account,CatalogQuery,CatalogResponse} from '@/types/api';
import {LiveCatalog} from './catalog';

const initial:CatalogQuery={q:'',category_id:'',status:'',type:'',sort:'',analysable_only:false,page:1,limit:20};
export function PagedCatalog({account}:{account:Account}){
  const [query,setQuery]=useState<CatalogQuery>(initial);
  const [search,setSearch]=useState('');
  const [revision,setRevision]=useState(0);
  const [result,setResult]=useState<{key:string;response?:CatalogResponse;error?:string}|null>(null);
  useEffect(()=>{
    const timer=setTimeout(()=>setSearch(query.q),300);
    return ()=>clearTimeout(timer);
  },[query.q]);
  const params=new URLSearchParams({page:String(query.page),limit:String(query.limit)});
  if(search)params.set('q',search);
  for(const key of ['category_id','status','type','sort'] as const)if(query[key])params.set(key,query[key]);
  if(query.analysable_only)params.set('analysable_only','true');
  const path='products/catalog?'+params.toString();
  const key=account.id+':'+revision+':'+path;
  useEffect(()=>{
    const controller=new AbortController();
    void api<CatalogResponse>(path,{signal:controller.signal}).then(response=>{
      if(!controller.signal.aborted)setResult({key,response});
    }).catch((error:Error)=>{
      if(!controller.signal.aborted)setResult({key,error:error.message});
    });
    return ()=>controller.abort();
  },[path,key]);
  const loading=result?.key!==key || query.q!==search;
  const error=!loading?result?.error:undefined;
  const response=result?.response;
  const ready=!loading&&!error&&Boolean(response);
  const refresh=async()=>{setRevision(n=>n+1);};
  const changeQuery=(patch:Partial<CatalogQuery>)=>setQuery(current=>({...current,...patch,page:patch.page??1}));
  const pagination=response?.pagination??{page:query.page,limit:query.limit,total:0};
  return <LiveShell account={account} page="products" storeName={response?.store.name} suggestionCount={response?.summary.proposed_actions??0}>
    <div className="page-breadcrumb"><span>Trang chủ</span><Icon name="chevron" size={13}/><span>Danh mục sản phẩm</span></div>
    <section className="page-hero"><div><span className="eyebrow">SELLENS · WORKSPACE</span><h1>Danh mục sản phẩm</h1><p>Quản lý danh mục và đối chiếu tín hiệu quan sát từ snapshot.</p></div>
      <div className="hero-actions"><button className="button primary" disabled={!ready} onClick={()=>exportSaved(`sellens-products-page-${pagination.page}`,{products:response.data,pagination:response.pagination})}><Icon name="download" size={16}/>Xuất trang hiện tại</button><button className="button subtle" disabled={loading} onClick={()=>void refresh()}><Icon name="refresh"/>Tải lại</button></div>
    </section>
    {loading&&<Panel><p role="status">Đang tải trang sản phẩm…</p></Panel>}
    {error&&<Panel><ErrorPopup message={error}/><button className="button primary" onClick={()=>void refresh()}>Thử lại</button></Panel>}
    <LiveCatalog role="user" refresh={refresh} query={query} changeQuery={changeQuery} loading={!ready}
      data={{products:ready?response.data:[],categories:response?.categories??[],analyses:ready?response.analyses:[],actions:ready?response.actions:[]}}
      pagination={pagination} facets={response?.facets??{statuses:[],types:[]}}
      summary={response?.summary??{total:0,undecided_count:0,proposed_actions:0}}/>
  </LiveShell>;
}
