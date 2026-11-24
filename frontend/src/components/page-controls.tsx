"use client";
import type {List} from '@/types/api';
export function PageControls({pagination,onPage,label,disabled=false}:{pagination:List<never>['pagination'];onPage:(page:number)=>void;label:string;disabled?:boolean}){
 const {page,limit,total}=pagination;
 return <div className="table-footer"><span>{total?`${(page-1)*limit+1}–${Math.min(page*limit,total)}`:'0'} / {total} {label}</span>
  <div className="pagination"><button type="button" aria-label={`Trang ${label} trước`} disabled={disabled||page<=1} onClick={()=>onPage(page-1)}>‹</button><span>Trang {page} / {Math.max(1,Math.ceil(total/limit))}</span><button type="button" aria-label={`Trang ${label} sau`} disabled={disabled||page*limit>=total} onClick={()=>onPage(page+1)}>›</button></div>
 </div>;
}
