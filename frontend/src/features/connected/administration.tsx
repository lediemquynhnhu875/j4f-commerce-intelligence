"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { analysisColor } from "@/lib/status-colors";
import { useSearchParams } from "next/navigation";
import { Donut } from "@/components/charts/donut";
import { ProductIdentity } from "@/components/products/product-identity";
import { Badge,Empty,Icon,Panel,Stat } from "@/components/ui";
import { api,analysisLabels } from "@/lib/api-client";
import { actionTypeLabels,exportSaved,quantity,productCode } from "@/lib/analysis-presentation";
import type { Dataset } from "@/types/api";

export function LiveAdminOverview({data}:{data:Dataset}) {
 const [connection,setConnection]=useState<"checking"|"ready"|"unavailable">("checking");
 useEffect(()=>{let active=true;void api<{status:string}>("ready").then(()=>{if(active)setConnection("ready");}).catch(()=>{if(active)setConnection("unavailable");});return()=>{active=false;};},[]);
 const groups=Object.entries(analysisLabels).map(([status,label])=>({status,label,count:data.analyses.filter(a=>a.status===status).length})).filter(g=>g.count);
 const colors=["#8b5cf6","#3b82f6","#14b8a6","#f43f5e","#a78bfa","#f59e0b"];
 const days=Array.from({length:7},(_,index)=>{const day=new Date();day.setHours(0,0,0,0);day.setDate(day.getDate()-6+index);const next=new Date(day);next.setDate(next.getDate()+1);return {key:day.toISOString(),label:day.toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit"}),count:data.analyses.filter(a=>new Date(a.analyzed_at)>=day&&new Date(a.analyzed_at)<next).length};});
 const max=Math.max(1,...days.map(day=>day.count));
 const categories=data.categories.map(c=>({...c,count:data.products.filter(p=>p.category_id===c.id).length})).filter(c=>c.count);
 return <>
  <div className="stats-grid four">
   <Stat label="Tổng tài khoản" value={data.accounts.length} note="Tài khoản đã lưu trong hệ thống" icon="users"/>
   <Stat label="Tài khoản hoạt động" value={data.accounts.filter(a=>a.is_active).length} note="Theo trạng thái tài khoản" tone="blue" icon="shield"/>
   <Stat label="Tổng cửa hàng" value="—" note="Chưa thiết lập cửa hàng" icon="store"/>
   <Stat label="Catalog sản phẩm" value={data.products.length} suffix="SKU" note="Sản phẩm hiện có" icon="box"/>
   <Stat label="Kết quả phân tích" value={data.analyses.length} note="Bao gồm lịch sử đã lưu"/>
   <Stat label="Đề xuất đã lưu" value={data.actions.length} note="Gắn với đúng lần phân tích" tone="green" icon="check"/>
   <Stat label="Đang thực hiện" value={data.actions.filter(a=>a.status==="in_progress").length} note="Tiến độ công việc" tone="pink" icon="clock"/>
   <Stat label="Chưa có tham chiếu" value={data.analyses.filter(a=>a.reference_sold===null).length} note="Không tự thay giá trị thiếu bằng 0" tone="gray" icon="info"/>
  </div>
  <div className="admin-chart-grid">
   <Panel title="Kết quả được phân tích 7 ngày qua" subtitle="Theo thời điểm phân tích đã lưu"><div className="bar-chart">{days.map(day=><div key={day.key}><strong>{day.count}</strong><span style={{height:`${day.count/max*145}px`}}/><small>{day.label}</small></div>)}</div><div className="tinted chart-note"><Icon name="info" size={16}/>Số bản ghi theo ngày phân tích, không phải log tác vụ trực tiếp.</div></Panel>
   <Panel title="Phân bố kết quả DSS" subtitle={`${data.analyses.length} kết quả đã lưu`}>{data.analyses.length?<><Donut total={data.analyses.length} label="KẾT QUẢ" segments={groups.map(g=>({value:g.count,color:analysisColor(g.status)}))}/><div className="compact-legend">{groups.map(g=><div key={g.status}><span><i className="legend-dot" style={{background:analysisColor(g.status)}}/>{g.label}</span><strong>{g.count}</strong></div>)}</div></>:<Empty title="Chưa có kết quả"/>}</Panel>
   <Panel title="Cơ cấu danh mục" subtitle="Phân bố sản phẩm trong catalog"><div className="distribution">{categories.map((c,i)=><div key={c.id}><div className="distribution-label"><span>{c.name}</span><strong>{data.products.length?(c.count/data.products.length*100).toFixed(1):0}%</strong></div><div className="progress"><span style={{width:`${data.products.length?c.count/data.products.length*100:0}%`,background:colors[i%colors.length]}}/></div></div>)}</div>{!categories.length&&<Empty/>}</Panel>
  </div>
  <Panel title="Tình trạng hệ thống" action={<Link className="button subtle small" href="/admin/monitor">Xem giám sát <Icon name="arrow" size={15}/></Link>}><div className="context-grid">{[{name:"Web API",text:connection==="ready"?"Đang hoạt động":connection==="checking"?"Đang kiểm tra":"Chưa xác nhận"},{name:"PostgreSQL trên Neon",text:connection==="ready"?"Đã kết nối":connection==="checking"?"Đang kiểm tra":"Chưa xác nhận"},{name:"Phân tích theo yêu cầu",text:"Chưa khả dụng"},{name:"Kết quả ML đã lưu",text:`${data.analyses.filter(a=>a.status_schema_version==="ml_v2").length} kết quả`}].map(row=><div className="tinted" key={row.name}><strong>{row.name}</strong><Badge tone={row.text==="Đã kết nối"||row.text==="Đang hoạt động"?"green":"gray"}>{row.text}</Badge></div>)}</div></Panel>
  <Panel title="Kết quả gần nhất" subtitle="Các bản phân tích đã lưu, không phải sự kiện kỹ thuật giả lập"><div className="table-card"><div className="table-scroll"><table><thead><tr><th>THỜI GIAN</th><th>SẢN PHẨM</th><th>PHIÊN BẢN</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>{[...data.analyses].sort((a,b)=>b.analyzed_at.localeCompare(a.analyzed_at)).slice(0,8).map(a=><tr key={a.id}><td>{new Date(a.analyzed_at).toLocaleString("vi-VN")}</td><td>{a.product.name}</td><td>{a.model_version??"Chưa có"}</td><td><StatusBadge status={a.status}/></td><td><Link className="text-link" href={`/admin/analysis?product=${a.product_id}&analysis=${a.id}`}>Xem</Link></td></tr>)}</tbody></table></div></div></Panel>
 </>;
}

export function LiveSavedMonitor({data}:{data:Dataset;role?:"user"|"admin"}) {
 const params=useSearchParams();
 const [selected,setSelected]=useState<string|null>(null),[status,setStatus]=useState(""),[search,setSearch]=useState("");
 const [page,setPage]=useState(1);
 const rows=[...data.analyses].filter(a=>(!status||a.status===status)&&a.product.name.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.analyzed_at.localeCompare(a.analyzed_at));
 const pages=Math.max(1,Math.ceil(rows.length/10));const activePage=Math.min(page,pages);const visible=rows.slice((activePage-1)*10,activePage*10);
 const current=rows.find(a=>a.id===(selected??params.get("analysis")))??rows[0];
 const product=data.products.find(p=>p.id===current?.product_id);
 return <>
  <div className="stats-grid four"><Stat label="Kết quả đã lưu" value={data.analyses.length} note="Phân tích từ snapshot"/><Stat label="Có tham chiếu" value={data.analyses.filter(a=>a.reference_sold!==null).length} note="Giữ nguyên giá trị từ nguồn" tone="blue"/><Stat label="Kết quả ML" value={data.analyses.filter(a=>a.status_schema_version==="ml_v2").length} note="Kết quả thử nghiệm" tone="green"/><Stat label="Tác vụ trực tiếp" value="—" note="Chưa có dữ liệu tác vụ đang chạy" tone="gray"/></div>
  <Panel className="filters"><div className="filter-row"><div className="search-field"><Icon name="search" size={17}/><input aria-label="Tìm kết quả phân tích" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Tìm sản phẩm…"/></div><select aria-label="Trạng thái kết quả" style={status?{color:analysisColor(status)}:undefined} value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">Trạng thái: Tất cả</option>{Object.entries(analysisLabels).map(([key,label])=><option key={key} value={key} style={{color:analysisColor(key)}}>{label}</option>)}</select><button className="button subtle" onClick={()=>{setSearch("");setStatus("");}}><Icon name="refresh" size={16}/>Đặt lại</button></div></Panel>
  <div className="monitor-grid"><Panel title="Danh sách lượt phân tích" subtitle="Chọn kết quả để xem dữ liệu gốc" action={<Badge>{rows.length} kết quả</Badge>}><div className="table-scroll"><table><thead><tr><th>MÃ</th><th>SẢN PHẨM</th><th>THỜI GIAN</th><th>TRẠNG THÁI</th></tr></thead><tbody>{visible.map(a=><tr key={a.id} className={a.id===current?.id?"selected-row":""}><td><button className="text-link" onClick={()=>setSelected(a.id)}>#{a.id}</button><small>{a.model_version??"Chưa có mô hình"}</small></td><td>{a.product.name}</td><td>{new Date(a.analyzed_at).toLocaleString("vi-VN")}</td><td><StatusBadge status={a.status}/></td></tr>)}</tbody></table></div>{!rows.length&&<Empty/>}<div className="table-footer"><span>{rows.length?`${(activePage-1)*10+1}–${Math.min(activePage*10,rows.length)}`:"0"} / {rows.length} kết quả</span><div className="pagination"><button aria-label="Trang kết quả trước" disabled={activePage<=1} onClick={()=>setPage(activePage-1)}>‹</button><button aria-label="Trang kết quả sau" disabled={activePage>=pages} onClick={()=>setPage(activePage+1)}>›</button></div></div></Panel>
  <Panel title={current?`Chi tiết kết quả #${current.id}`:"Chi tiết kết quả"} className="log-panel" action={<button className="icon-button" disabled={!current} aria-label="Tải kết quả đã lưu" onClick={()=>exportSaved(`analysis-${current!.id}`,current)}><Icon name="download" size={18}/></button>}>
   {!current?<Empty/>:<>{product&&<ProductIdentity name={product.name} image={product.thumbnail_url} detail={current.product_type} code={productCode(product)}/>}<div className="log-step"><span className="eyebrow">01 · INPUT SNAPSHOT</span><pre>{JSON.stringify(current.input_snapshot_json,null,2)}</pre></div><div className="log-step"><span className="eyebrow">02 · NHÓM ĐỐI CHIẾU</span><div className="tinted"><h3>{current.product_type??"Chưa có nhãn"}</h3><p>{quantity(current.comparison_json?.peer_count)} sản phẩm tương đồng</p></div></div><div className="log-step"><span className="eyebrow">03 · THAM CHIẾU VS QUAN SÁT</span><div className="log-metrics"><div><small>Tham chiếu</small><strong>{quantity(current.reference_sold)}</strong></div><div><small>Quan sát</small><strong>{quantity(current.input_snapshot_json.quantity_sold)}</strong></div><div><small>Quan sát − tham chiếu</small><strong>{quantity(current.sales_gap)}</strong></div></div></div><div className="notice"><Icon name="info"/><span>{current.limitation_note??"Kết quả từ snapshot đã lưu."}</span></div><Link className="button primary" href={`/admin/analysis?product=${current.product_id}&analysis=${current.id}`}><Icon name="eye" size={17}/>Xem bằng chứng</Link></>}
  </Panel></div>
 </>;
}

export function LiveSavedConfiguration({data}:{data:Dataset}) {
 const versions=[...new Map(data.analyses.map(a=>[`${a.model_version}|${a.pipeline_version}|${a.taxonomy_version}`,a])).values()];
 const [selected,setSelected]=useState("");
 const analysis=versions.find(a=>a.id===selected)??versions.find(a=>a.status_schema_version==="ml_v2")??versions[0];
 const peer=analysis?.config_json.peer_config as Record<string,unknown>|undefined;
 const rules=[...new Map(data.actions.filter(w=>data.analyses.some(a=>a.id===w.analysis_id&&a.pipeline_version===analysis?.pipeline_version)).map(w=>[w.rule_id??w.type,w])).values()];
 return <>
  <div className="model-banner"><div className="model-info"><span className="tile-icon"><Icon name="sliders"/></span><div><small>PHIÊN BẢN TRONG KẾT QUẢ ĐÃ LƯU</small><strong>{analysis?.model_version??"Chưa có phiên bản mô hình"}</strong></div><Badge>{analysis?.pipeline_version??"Chưa có quy tắc"}</Badge></div><div className="notice"><Icon name="shield"/><span>Đây là cấu hình của kết quả đã lưu. Thay đổi hoặc triển khai cấu hình mới hiện chưa khả dụng.</span></div></div>
  <Panel><label>Phiên bản kết quả <select aria-label="Phiên bản cấu hình" value={analysis?.id??""} onChange={e=>setSelected(e.target.value)}>{versions.map(a=><option key={a.id} value={a.id}>{a.model_version??"Không có mô hình"} · {a.pipeline_version}</option>)}</select></label></Panel>
  {!analysis?<Empty title="Chưa có cấu hình đã lưu"/>:<><div className="grid-two config-grid">
   <Panel title="Ghép nhóm đối chiếu" subtitle="KHỐI 01 · COHORT MATCHING" action={<span className="tile-icon"><Icon name="users"/></span>}><div className="tinted"><small>Phiên bản taxonomy</small><strong>{analysis.taxonomy_version??"Chưa có"}</strong></div>{[["Số sản phẩm đối chiếu","peer_count"],["Số mẫu tối thiểu","minimum_peer_count"],["Độ tương đồng tối thiểu","minimum_mean_peer_similarity"]].map(([label,key])=><label key={key}>{label}<input readOnly value={String(peer?.[key]??"Chưa có trong kết quả")}/></label>)}</Panel>
   <Panel title="Ngưỡng chênh lệch & tham chiếu" subtitle="KHỐI 02 · DISCREPANCY" action={<span className="tile-icon blue"><Icon name="chart"/></span>}><label>Nguồn dự đoán<input readOnly value={String(analysis.config_json.prediction_origin??"Chưa có")}/></label><label>Bộ quy tắc<input readOnly value={analysis.pipeline_version}/></label><p className="field-help">Các ngưỡng chưa được lưu trong cấu hình không được suy ra từ giá trị của giao diện mẫu.</p></Panel>
   <Panel title="Quy tắc xử lý dữ liệu thiếu" subtitle="KHỐI 03 · DATA HYGIENE" action={<span className="tile-icon"><Icon name="info"/></span>}><div className="tinted"><strong>Giữ giá trị không khả dụng</strong><p>Không chuyển tham chiếu thiếu thành 0. Diễn giải kết quả theo lý do trạng thái đã lưu.</p></div><label>Trạng thái nghiệm thu<input readOnly value={analysis.config_json.quality_acceptance===true?"Đã được đánh dấu chấp nhận":"Thử nghiệm, cần rà soát"}/></label></Panel>
   <Panel title="Quy tắc sinh đề xuất hành động" subtitle="KHỐI 04 · RECOMMENDATIONS" action={<span className="tile-icon pink"><Icon name="sparkles"/></span>}>{rules.map(w=><div className="rule-card tinted" key={w.rule_id??w.type}><h3>{actionTypeLabels[w.type]??w.type}<Badge>Đã lưu</Badge></h3><p>{w.rule_id??"Công việc thủ công"}</p></div>)}{!rules.length&&<Empty title="Chưa có đề xuất cho phiên bản này"/>}</Panel>
  </div><div className="config-save-bar"><span>Cấu hình đã lưu · Chỉ đọc</span><button className="button primary" disabled>Lưu phiên bản (chưa khả dụng)</button></div><Panel title="Các phiên bản cấu hình đã lưu"><div className="table-scroll"><table><thead><tr><th>MÔ HÌNH</th><th>QUY TẮC</th><th>TAXONOMY</th><th>THỜI ĐIỂM</th></tr></thead><tbody>{versions.map(a=><tr key={a.id}><td>{a.model_version??"—"}</td><td>{a.pipeline_version}</td><td>{a.taxonomy_version??"—"}</td><td>{new Date(a.analyzed_at).toLocaleString("vi-VN")}</td></tr>)}</tbody></table></div></Panel></>}
 </>;
}

export function LiveStoresUnavailable({data}:{data:Dataset}) {
 return <><div className="stats-grid four"><Stat label="Tổng số cửa hàng" value="—" note="Chưa thiết lập cửa hàng" icon="store"/><Stat label="SKU đã phân phối" value="—" note={`${data.products.length} sản phẩm đang ở catalog chung`} icon="box"/><Stat label="Lượt phân tích DSS" value={data.analyses.length} note="Kết quả của catalog chung"/><Stat label="Cải thiện cần xử lý" value={data.actions.filter(a=>["proposed","accepted","in_progress"].includes(a.status)).length} note="Chưa phân theo cửa hàng" tone="pink" icon="check"/></div><Panel className="filters"><div className="filter-row"><div className="search-field"><Icon name="search" size={17}/><input aria-label="Tìm cửa hàng" placeholder="Tìm tên cửa hàng, chủ sở hữu…" disabled/></div><button className="button primary" disabled><Icon name="plus" size={17}/>Thêm cửa hàng</button></div></Panel><Panel title="Danh sách cửa hàng đối tác"><div className="table-scroll"><table><thead><tr><th>MÃ STORE</th><th>TÊN CỬA HÀNG</th><th>CHỦ SỞ HỮU</th><th>SKU</th><th>DSS RUN</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody/></table></div><Empty title="Cửa hàng chưa được thiết lập" description="Sản phẩm hiện được quản lý trong catalog chung. Chức năng tạo và gán cửa hàng chưa khả dụng."/></Panel></>;
}
