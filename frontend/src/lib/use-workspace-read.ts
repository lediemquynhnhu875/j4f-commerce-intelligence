"use client";
import {useEffect,useState} from 'react';
import {api} from './api-client';
export function useWorkspaceRead<T>(path:string|null){
 const [revision,setRevision]=useState(0);
 const [state,setState]=useState<{key:string;data?:T;error?:string}|null>(null);
 const key=path+':'+revision;
 useEffect(()=>{
  if(!path)return;
  const controller=new AbortController();
  void api<T>(path,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setState({key,data});})
   .catch((error:Error)=>{if(!controller.signal.aborted)setState(previous=>({key,data:previous?.data,error:error.message}));});
  return ()=>controller.abort();
 },[path,key]);
 const loading=Boolean(path)&&state?.key!==key;
 return {loading,cached:state?.data,data:path&&state?.key===key&&!state.error?state.data:undefined,error:path&&!loading?state?.error:undefined,refresh:async()=>{setRevision(n=>n+1);}};
}
export function useDebouncedSearch(value:string){
 const [search,setSearch]=useState(value);
 useEffect(()=>{const timer=setTimeout(()=>setSearch(value),300);return ()=>clearTimeout(timer);},[value]);
 return search;
}
