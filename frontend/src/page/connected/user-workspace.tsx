"use client";
import {useState,type ReactNode} from 'react';
import {useSearchParams} from 'next/navigation';
import type {Account,OverviewResponse,DetailResponse,WorkResponse,WorkQuery,List,ProductOption} from '@/types/api';
import {LiveShell} from '@/components/live-shell';
import {Panel,Icon} from '@/components/ui';
import {PageControls} from '@/components/page-controls';
import {ErrorPopup} from '@/components/popup';
import {useWorkspaceRead,useDebouncedSearch} from '@/lib/use-workspace-read';
import {exportSaved} from '@/lib/analysis-presentation';
import {LiveOverview} from './overview';
import {LiveAnalysis} from './evidence';
import {LiveActions} from './actions';

type ShellProps={account:Account;page:string;storeName?:string;count?:number;loading:boolean;error?:string;refresh:()=>Promise<void>;exportData?:unknown;children:ReactNode};
function Shell({account,page,storeName,count,loading,error,refresh,exportData,children}:ShellProps){
 const title=({overview:'Tổng quan',analysis:'Kết quả phân tích',suggestions:'Đề xuất cải thiện'} as Record<string,string>)[page]??'Không gian cửa hàng';
 return <LiveShell account={account} page={page} storeName={storeName} suggestionCount={count??0}>
  <div className="page-breadcrumb"><span>Trang chủ</span><Icon name="chevron" size={13}/><span>{title}</span></div>
  <section className="page-hero"><div><span className="eyebrow">SELLENS · WORKSPACE</span><h1>{page==='overview'?`Xin chào ${account.full_name}`:title}</h1><p>Đọc dữ liệu đã lưu, rà soát bằng chứng và theo dõi quyết định.</p></div>
   <div className="hero-actions"><button className="button primary" disabled={loading||!exportData} onClick={()=>exportSaved(`sellens-${page}-current`,exportData)}><Icon name="download" size={16}/>{page==='overview'?'Xuất tổng hợp':page==='analysis'?'Xuất hồ sơ đang xem':'Xuất trang hiện tại'}</button><button className="button subtle" disabled={loading} onClick={()=>void refresh()}><Icon name="refresh"/>Tải lại</button></div>
  </section>
  {loading&&<Panel><p role="status">Đang tải dữ liệu…</p></Panel>}
  {error&&<Panel><ErrorPopup message={error}/><button className="button primary" onClick={()=>void refresh()}>Thử lại</button></Panel>}
  {children}
 </LiveShell>;
}
function OverviewWorkspace({account}:{account:Account}){
 const result=useWorkspaceRead<OverviewResponse>('stores/me/summary');
 return <Shell account={account} page="overview" storeName={result.cached?.store.name} count={result.cached?.summary.global_proposed} loading={result.loading} error={result.error} refresh={result.refresh} exportData={result.data}>
  {result.data&&<LiveOverview role="user" data={result.data.data} summary={result.data.summary}/>}
 </Shell>;
}
function AnalysisWorkspace({account,productId,analysisId}:{account:Account;productId:string|null;analysisId:string|null}){
 const [historyPage,setHistoryPage]=useState(1),[actionPage,setActionPage]=useState(1);
 const [search,setSearch]=useState(''),[choicePage,setChoicePage]=useState(1);
 const debounced=useDebouncedSearch(search);
 const choices=useWorkspaceRead<List<ProductOption>>(`products/options?page=${choicePage}&limit=20&q=${encodeURIComponent(debounced)}`);
 const params=new URLSearchParams({history_page:String(historyPage),actions_page:String(actionPage)});
 if(productId)params.set('product_id',productId);if(analysisId)params.set('analysis_id',analysisId);
 const result=useWorkspaceRead<DetailResponse>('analyses/workspace?'+params.toString());
 const refresh=async()=>{await result.refresh();await choices.refresh();};
 return <Shell account={account} page="analysis" storeName={result.cached?.store.name} count={result.cached?.proposed_actions} loading={result.loading} error={result.error} refresh={refresh} exportData={result.data}>
  <Panel title="Chọn hồ sơ sản phẩm"><div className="search-field"><Icon name="search"/><input aria-label="Tìm hồ sơ sản phẩm" placeholder="Tìm tên hoặc mã sản phẩm rồi chọn trong danh sách bên dưới…" value={search} onChange={e=>{setSearch(e.currentTarget.value);setChoicePage(1);}}/></div>
   {choices.loading&&<p role="status">Đang tải lựa chọn sản phẩm…</p>}{choices.error&&<ErrorPopup message={choices.error}/>}
   {choices.data&&<PageControls pagination={choices.data.pagination} label="lựa chọn sản phẩm" onPage={setChoicePage} disabled={choices.loading||search!==debounced}/>}
  </Panel>
  {result.data&&<>
   <LiveAnalysis role="user" data={result.data.data} productId={productId} analysisId={analysisId} history={result.data.history} suggestionPagination={result.data.actions_pagination} options={choices.data?.data??[]}/>
   <PageControls pagination={result.data.history_pagination} label="kết quả đã lưu" onPage={setHistoryPage} disabled={result.loading}/>
   <PageControls pagination={result.data.actions_pagination} label="đề xuất của hồ sơ" onPage={setActionPage} disabled={result.loading}/>
  </>}
 </Shell>;
}
function WorkWorkspace({account,analysisId}:{account:Account;analysisId:string|null}){
 const [query,setQuery]=useState<WorkQuery>({q:'',status:'',type:'',page:1,limit:12});
 const debounced=useDebouncedSearch(query.q);
 const params=new URLSearchParams({page:String(query.page),limit:String(query.limit)});
 if(debounced)params.set('q',debounced);if(query.status)params.set('status',query.status);if(query.type)params.set('type',query.type);if(analysisId)params.set('analysis_id',analysisId);
 const result=useWorkspaceRead<WorkResponse>('actions/workspace?'+params.toString());
 const cached=result.data??result.cached;
 const loading=result.loading||query.q!==debounced;
 const changeQuery=(patch:Partial<WorkQuery>)=>setQuery(old=>({...old,...patch,page:patch.page??1}));
 return <Shell account={account} page="suggestions" storeName={cached?.store.name} count={cached?.summary.states.proposed} loading={loading} error={result.error} refresh={result.refresh} exportData={result.data}>
  {cached&&<LiveActions actor={account} data={result.data?.data??{products:[],analyses:[],actions:[]}} remote={cached} loading={loading||Boolean(result.error)} query={query} changeQuery={changeQuery} refresh={result.refresh}/>}
 </Shell>;
}
export function UserWorkspace({account,page}:{account:Account;page:string}){
 const params=useSearchParams(),productId=params.get('product'),analysisId=params.get('analysis');
 if(page==='overview')return <OverviewWorkspace account={account}/>;
 if(page==='analysis')return <AnalysisWorkspace key={`${productId}:${analysisId}`} account={account} productId={productId} analysisId={analysisId}/>;
 if(page==='suggestions')return <WorkWorkspace key={analysisId??'all'} account={account} analysisId={analysisId}/>;
 return <Panel>Không tìm thấy trang.</Panel>;
}
