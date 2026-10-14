"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, allPages, analysisLabels, display, price } from "@/lib/api-client";
import type { Dataset, Product, Analysis } from "@/types/api";
import { Badge, Empty, Icon, Modal, Panel, Stat } from "@/components/ui";

function latest(data: Dataset, productId: string) {
  return data.analyses.filter(row => row.product_id === productId).sort((a, b) => b.analyzed_at.localeCompare(a.analyzed_at) || (BigInt(a.id) > BigInt(b.id) ? -1 : 1))[0];
}
export function LiveOverview({ data, role }: { data: Dataset; role: "user" | "admin" }) {
  const current = data.products.map(product => latest(data, product.id)).filter(Boolean);
  const groups = Object.entries(analysisLabels).map(([status, label]) => ({ status, label, count: current.filter(row => row.status === status).length })).filter(row => row.count);
  const stats = [
    ["Tổng số sản phẩm", data.products.length], ["Có kết quả đã lưu", current.length],
    ["Cần rà soát", current.filter(row => row.needs_review).length], ["Chưa đủ cơ sở", current.filter(row => row.status === "insufficient_basis").length],
    ["Đang thực hiện", data.actions.filter(row => row.status === "in_progress").length], [role === "admin" ? "Tài khoản hoạt động" : "Đề xuất cần duyệt", role === "admin" ? data.accounts.filter(row => row.is_active).length : data.actions.filter(row => row.status === "proposed").length],
  ] as const;
  return <><div className="stats-grid six">{stats.map(([label, value]) => <Stat key={label} label={label} value={value} note="Theo dữ liệu hiện có" />)}</div>
    <div className="grid-two"><Panel title="Phân bố trạng thái đã lưu" subtitle={`${current.length}/${data.products.length} sản phẩm có kết quả`}>
      {!groups.length && <Empty title="Chưa có kết quả phân tích" />}
      {groups.map(row => <div className="distribution-label" key={row.status}><span>{row.label}</span><strong>{row.count} SKU ({((row.count / current.length) * 100).toFixed(1)}%)</strong></div>)}
      <p className="muted">{data.products.length - current.length} sản phẩm chưa có phân tích; không tự gán trạng thái.</p>
    </Panel><Panel title="Cơ cấu danh mục" subtitle="Catalog dùng chung">{data.categories.map(category => <div className="distribution-label" key={category.id}><span>{category.name}</span><strong>{data.products.filter(row => row.category_id === category.id).length} SKU</strong></div>)}</Panel></div>
    <Panel title="Kết quả cần rà soát" subtitle="Giả thuyết từ snapshot; không đảm bảo tăng số bán"><LiveMonitor data={{ ...data, analyses: current.filter(row => row.needs_review) }} role={role} /></Panel>
  </>;
}

export function LiveCatalog({ data, role, refresh }: { data: Dataset; role: "user" | "admin"; refresh: () => Promise<void> }) {
  const [search, setSearch] = useState(""); const [category, setCategory] = useState(""); const [status, setStatus] = useState(""); const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<Product | "new" | null>(null); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  const rows = data.products.filter(row => `${row.name} ${row.id}`.toLowerCase().includes(search.toLowerCase()) && (!category || row.category_id === category) && (!status || (latest(data, row.id)?.status ?? "no_analysis") === status));
  const pages = Math.max(1, Math.ceil(rows.length / 4)); const activePage = Math.min(page, pages); const visible = rows.slice((activePage - 1) * 4, activePage * 4);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget); const value = { name: String(form.get("name")), description: String(form.get("description")), category_id: form.get("category_id") || null,
      price: form.get("price") === "" ? null : Number(form.get("price")) };
    try { await api(editor === "new" ? "products" : `products/${(editor as Product).id}`, { method: editor === "new" ? "POST" : "PATCH", body: JSON.stringify(value) }); setEditor(null); await refresh(); }
    catch (err) { setError((err as Error).message); } finally { setPending(false); }
  }
  async function remove(product: Product) {
    if (!confirm(`Xóa sản phẩm “${product.name}”? Sản phẩm đã có phân tích sẽ không thể xóa.`)) return;
    setPending(true); setError("");
    try { await api(`products/${product.id}`, { method: "DELETE" }); await refresh(); }
    catch (err) { setError((err as Error).message); } finally { setPending(false); }
  }
  return <>{error && !editor && <p role="alert" className="form-error">{error}</p>}<Panel className="filters"><div className="filter-search-row"><div className="search-field"><Icon name="search" /><input aria-label="Tìm sản phẩm" placeholder="Tìm theo mã, tên sản phẩm…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></div>
    {role === "admin" && <button className="button primary" onClick={() => { setEditor("new"); setError(""); }}>Thêm sản phẩm</button>}</div>
    <div className="filter-row"><select aria-label="Danh mục sản phẩm" value={category} onChange={event => { setCategory(event.target.value); setPage(1); }}><option value="">Danh mục: Tất cả</option>{data.categories.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
      <select aria-label="Trạng thái phân tích" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Trạng thái: Tất cả</option><option value="no_analysis">Chưa có phân tích</option>{Object.entries(analysisLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <button className="button subtle" onClick={() => { setSearch(""); setCategory(""); setStatus(""); setPage(1); }}>Đặt lại</button></div></Panel>
    <div className="table-card"><div className="table-scroll"><table><thead><tr><th>SẢN PHẨM</th><th>DANH MỤC</th><th>GIÁ</th><th>SỐ BÁN</th><th>ĐÁNH GIÁ</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>{visible.map(product => <tr key={product.id}><td><div className="product-cell"><span className="tile-icon"><Icon name="box" /></span><div><strong>{product.name}</strong><small>{product.brand ?? "Chưa có thương hiệu"}</small></div></div><code className="sku-code">{product.id}</code></td>
      <td>{data.categories.find(row => row.id === product.category_id)?.name ?? "Chưa phân loại"}</td><td>{price(product.price, product.currency)}</td><td>{display(product.quantity_sold)}</td><td>{display(product.rating_average)} ({display(product.review_count)})</td><td><Badge tone="gray">{analysisLabels[latest(data, product.id)?.status] ?? "Chưa có phân tích"}</Badge></td>
      <td><Link className="button subtle small" href={`/${role}/analysis?product=${product.id}`}>Xem</Link>{role === "admin" && <><button className="button subtle small" onClick={() => { setEditor(product); setError(""); }}>Sửa</button><button className="button subtle small" disabled={pending} onClick={() => remove(product)}>Xóa</button></>}</td></tr>)}</tbody></table></div>{!visible.length && <Empty />}
      <div className="table-footer"><span>Hiển thị {visible.length ? `${(activePage - 1) * 4 + 1}–${Math.min(activePage * 4, rows.length)}` : "0"} / {rows.length} sản phẩm</span><div className="pagination"><button aria-label="Trang trước" disabled={activePage <= 1} onClick={() => setPage(activePage - 1)}>‹</button>{Array.from({ length: pages }, (_, index) => <button key={index} aria-label={`Trang ${index + 1}`} aria-current={activePage === index + 1 ? "page" : undefined} onClick={() => setPage(index + 1)}>{index + 1}</button>)}<button aria-label="Trang sau" disabled={activePage >= pages} onClick={() => setPage(activePage + 1)}>›</button></div></div>
    </div>{editor && <Modal title={editor === "new" ? "Thêm sản phẩm" : "Sửa sản phẩm"} onClose={() => !pending && setEditor(null)}><form className="connected-form" onSubmit={save}><label>Tên sản phẩm<input name="name" required maxLength={500} defaultValue={editor === "new" ? "" : editor.name} /></label><label>Giá<input name="price" type="number" min="0" step="0.01" defaultValue={editor === "new" ? "" : editor.price ?? ""} /></label><label>Danh mục<select name="category_id" defaultValue={editor === "new" ? "" : editor.category_id ?? ""}><option value="">Chưa phân loại</option>{data.categories.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label>Mô tả<textarea name="description" defaultValue={editor === "new" ? "" : editor.description ?? ""} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button primary" disabled={pending}>{pending ? "Đang lưu…" : "Lưu sản phẩm"}</button></form></Modal>}</>;
}

export function LiveAnalysis({ data, role, productId, analysisId }: { data: Dataset; role: "user" | "admin"; productId: string | null; analysisId: string | null }) {
  const router = useRouter(); const selectedId = productId ?? data.analyses.find(row => row.id === analysisId)?.product_id ?? data.products[0]?.id;
  const [product, setProduct] = useState<Product | null>(null); const [rows, setRows] = useState<Analysis[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => {
    let active = true; const controller = new AbortController();
    async function load() {
      setLoading(true); setError(""); setProduct(null); setRows([]);
      try {
        if (!selectedId) return;
        const [detail, analyses] = await Promise.all([api<{ data: Product }>(`products/${encodeURIComponent(selectedId)}`, { signal: controller.signal }), allPages<Analysis>(`products/${encodeURIComponent(selectedId)}/analyses`, controller.signal)]);
        if (active) { setProduct(detail.data); setRows(analyses); }
      } catch (err) { if (active && (err as Error).name !== "AbortError") setError((err as Error).message); }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; controller.abort(); };
  }, [selectedId]);
  const analysis = analysisId ? rows.find(row => row.id === analysisId) : [...rows].sort((a, b) => b.analyzed_at.localeCompare(a.analyzed_at) || (BigInt(a.id) > BigInt(b.id) ? -1 : 1))[0];
  return <><Panel><label>Sản phẩm phân tích <select aria-label="Sản phẩm phân tích" value={selectedId ?? ""} onChange={event => router.push(`/${role}/analysis?product=${event.target.value}`)}>{data.products.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label></Panel>
    {loading ? <p role="status">Đang tải phân tích…</p> : error ? <p className="form-error" role="alert">{error}</p> : !product ? <Empty title="Catalog chưa có sản phẩm" /> : <>
      <Panel title={product.name} subtitle={`Mã sản phẩm ${product.id}`}><p>{product.description}</p><p>Giá hiện tại: {price(product.price, product.currency)} · Số bán hiện tại: {display(product.quantity_sold)}</p><p>Phạm vi số bán: {product.sales_scope} · {product.sales_label_verified ? "Đã xác minh" : "Chưa xác minh"}</p></Panel>
      {!analysis ? <Empty title={analysisId ? "Không tìm thấy kết quả cho sản phẩm này" : "Chưa có phân tích"} description="Chưa có kết quả đã lưu. Chạy mô hình chưa được hỗ trợ; không dùng mock thay thế." /> : <>
        <Panel title="Kết quả từ đầu vào đã đóng băng" subtitle={`Phân tích #${analysis.id} · ${new Date(analysis.analyzed_at).toLocaleString("vi-VN")}`}><Badge tone="gray">{analysisLabels[analysis.status] ?? analysis.status}</Badge>
          <div className="stats-grid"><Stat label="Số bán khi phân tích" value={display(analysis.input_snapshot_json.quantity_sold)} note="Từ snapshot đã lưu" /><Stat label="Tham chiếu" value={display(analysis.reference_sold)} note="Null nghĩa là chưa có cơ sở" /><Stat label="Chênh lệch" value={display(analysis.sales_gap)} note="Quan sát trừ tham chiếu" /></div>
          <div className="notice"><Icon name="info" /><span>{analysis.limitation_note ?? "Không có ghi chú giới hạn."}</span></div><p>Người phân tích: {analysis.analyst?.full_name ?? "Hệ thống"} · Mô hình: {analysis.model_version ?? "Chưa có"} · Pipeline: {analysis.pipeline_version}</p>
        </Panel><div className="grid-two"><Panel title="Bằng chứng đã lưu"><pre className="connected-json">{JSON.stringify(analysis.evidence_json, null, 2)}</pre></Panel><Panel title="So sánh / nguồn tham chiếu"><pre className="connected-json">{JSON.stringify(analysis.comparison_json, null, 2)}</pre></Panel></div>
        <Panel title="Đề xuất liên quan">{data.actions.filter(row => row.analysis_id === analysis.id).map(row => <p key={row.id}>{row.title}</p>)}<Link className="text-link" href={role === "user" ? "/user/suggestions" : "/admin/monitor"}>Theo dõi công việc</Link></Panel>
      </>}
      <Panel title="Lịch sử kết quả">{rows.map(row => <p key={row.id}><Link className="text-link" href={`/${role}/analysis?product=${product.id}&analysis=${row.id}`}>#{row.id} · {new Date(row.analyzed_at).toLocaleString("vi-VN")} · {analysisLabels[row.status] ?? row.status}</Link></p>)}</Panel>
    </>}
  </>;
}
export function LiveMonitor({ data, role }: { data: Dataset; role: "user" | "admin" }) {
  return <div className="table-card"><div className="table-scroll"><table><thead><tr><th>PHÂN TÍCH</th><th>SẢN PHẨM</th><th>TRẠNG THÁI</th><th>THỜI ĐIỂM</th><th>THAO TÁC</th></tr></thead><tbody>{data.analyses.map(row => <tr key={row.id}><td>#{row.id}</td><td>{row.product.name}</td><td><Badge tone="gray">{analysisLabels[row.status] ?? row.status}</Badge></td><td>{new Date(row.analyzed_at).toLocaleString("vi-VN")}</td><td><Link className="button subtle small" href={`/${role}/analysis?product=${row.product_id}&analysis=${row.id}`}>Xem bằng chứng</Link></td></tr>)}</tbody></table></div>{!data.analyses.length && <Empty title="Chưa có kết quả đã lưu" />}<p className="muted">Chỉ hiển thị kết quả đã lưu; chưa có API theo dõi job hoặc chạy ML.</p></div>;
}
export function LiveConfiguration({ data }: { data: Dataset }) {
  return <><Panel title="Cấu hình của kết quả đã lưu" subtitle="Chỉ đọc; chưa có API triển khai mô hình hoặc lưu cấu hình mới"><div className="notice"><Icon name="info" /><span>Các giá trị sau thuộc từng phân tích đã lưu. Chúng không phải cấu hình đang triển khai.</span></div><button className="button primary" disabled>Lưu cấu hình (chưa hỗ trợ)</button></Panel>
    {data.analyses.map(row => <Panel key={row.id} title={`Phân tích #${row.id} · ${row.pipeline_version}`}><pre className="connected-json">{JSON.stringify(row.config_json, null, 2)}</pre></Panel>)}{!data.analyses.length && <Empty title="Chưa có cấu hình đã lưu" />}</>;
}
