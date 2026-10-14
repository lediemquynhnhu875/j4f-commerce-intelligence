"use client";
import { useState, type FormEvent } from "react";
import { api, allPages, actionLabels } from "@/lib/api-client";
import type { Dataset, Action, History, Account } from "@/types/api";
import { Badge, Empty, Modal, Panel, Stat } from "@/components/ui";

const nextStates: Record<string, string[]> = { proposed: ["accepted", "rejected", "cancelled"], accepted: ["in_progress", "cancelled"], in_progress: ["completed", "cancelled"], completed: [], rejected: [], cancelled: [] };
export function LiveActions({ data, actor, refresh }: { data: Dataset; actor: Account; refresh: () => Promise<void> }) {
  const [filter, setFilter] = useState(""); const [search, setSearch] = useState(""); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  const [editor, setEditor] = useState<Action | null>(null); const [adding, setAdding] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [audit, setAudit] = useState<{ action: Action; rows: History[] } | null>(null);
  async function mutate(action: Action, fields: Record<string, unknown>) {
    setPending(true); setError("");
    try { await api(`actions/${action.id}`, { method: "PATCH", body: JSON.stringify({ ...fields, expected_updated_at: action.updated_at }) }); setEditor(null); await refresh(); }
    catch (err) { setError((err as Error).message); } finally { setPending(false); }
  }
  async function change(action: Action, status: string) {
    if (status === "rejected") { setRejecting(true); setEditor(action); return; }
    await mutate(action, { status });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const fields: Record<string, unknown> = { title: String(form.get("title")), description: String(form.get("description")), information_needed: String(form.get("information_needed")), outcome_note: String(form.get("outcome_note")) };
    if (form.get("reject") === "on") { fields.status = "rejected"; fields.decision_reason = String(form.get("decision_reason")); }
    await mutate(editor!, fields);
  }
  async function history(action: Action) {
    setPending(true); setError("");
    try { setAudit({ action, rows: await allPages<History>(`actions/${action.id}/history`) }); }
    catch (err) { setError((err as Error).message); } finally { setPending(false); }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setPending(true); setError("");
    const title = String(form.get("title")); const description = String(form.get("description"));
    try {
      await api("actions", { method: "POST", body: JSON.stringify({ analysis_id: String(form.get("analysis_id")), type: "other", title, description, assigned_to: actor.id,
        original_suggestion_json: { source: "manual_user_work", title, description, limitation: "Công việc do người dùng tạo; không phải đề xuất mô hình." } }) });
      setAdding(false); await refresh();
    } catch (err) { setError((err as Error).message); } finally { setPending(false); }
  }
  const rows = data.actions.filter(row => (!filter || row.status === filter) && `${row.title} ${row.id}`.toLowerCase().includes(search.toLowerCase()));
  return <><div className="stats-grid">{["proposed", "accepted", "in_progress", "completed"].map(status => <Stat key={status} label={actionLabels[status]} value={data.actions.filter(row => row.status === status).length} note="Tiến độ công việc, không phải số bán tăng" />)}</div>
    <Panel className="filters"><div className="filter-row"><input aria-label="Tìm công việc" value={search} placeholder="Tìm công việc…" onChange={event => setSearch(event.target.value)} /><select aria-label="Trạng thái công việc" value={filter} onChange={event => setFilter(event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(actionLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select><button className="button primary" disabled={!data.analyses.length} onClick={() => { setAdding(true); setError(""); }}>Thêm công việc</button></div></Panel>
    {error && !editor && !adding && <p className="form-error" role="alert">{error}</p>}
    <div className="grid-two">{rows.map(action => <Panel key={action.id} title={action.title} subtitle={`#${action.id} · Phân tích #${action.analysis_id}`} action={<Badge tone="gray">{actionLabels[action.status] ?? action.status}</Badge>}>
      <p>{action.description}</p><p>Sản phẩm: {data.analyses.find(row => row.id === action.analysis_id)?.product.name ?? "Chưa biết"}</p><p>Người thực hiện: {action.assigned_to === actor.id ? actor.full_name : action.assigned_to ?? "Chưa giao"}</p>
      {action.decision_reason && <p>Lý do: {action.decision_reason}</p>}{action.outcome_note && <p>Ghi chú thực hiện: {action.outcome_note}</p>}
      <details><summary>Đề xuất gốc và bằng chứng (không sửa)</summary><pre className="connected-json">{JSON.stringify(action.original_suggestion_json, null, 2)}</pre></details>
      <div className="filter-row">{nextStates[action.status]?.map(status => <button key={status} className="button subtle small" disabled={pending} onClick={() => change(action, status)}>{actionLabels[status]}</button>)}
        <button className="button subtle small" disabled={pending} onClick={() => { setRejecting(false); setEditor(action); setError(""); }}>Sửa công việc</button><button className="button subtle small" disabled={pending} onClick={() => history(action)}>Lịch sử</button>
        <button className="button subtle small" disabled={pending || action.assigned_to === actor.id} onClick={() => mutate(action, { assigned_to: actor.id })}>Giao cho tôi</button></div>
    </Panel>)}</div>{!rows.length && <Empty title="Chưa có công việc phù hợp" />}
    {editor && <Modal title="Sửa / quyết định công việc" onClose={() => !pending && setEditor(null)}><form className="connected-form" onSubmit={save}>
      <label>Tiêu đề<input name="title" required maxLength={255} defaultValue={editor.title} /></label><label>Mô tả<textarea name="description" defaultValue={editor.description ?? ""} /></label><label>Thông tin cần bổ sung<textarea name="information_needed" defaultValue={editor.information_needed ?? ""} /></label><label>Ghi chú thực hiện<textarea name="outcome_note" defaultValue={editor.outcome_note ?? ""} /></label>
      {editor.status === "proposed" && <><label><input type="checkbox" name="reject" checked={rejecting} onChange={event => setRejecting(event.target.checked)} /> Từ chối công việc</label><label>Lý do từ chối<textarea name="decision_reason" required={rejecting} /></label></>}
      {error && <p className="form-error" role="alert">{error}</p>}<button className="button primary" disabled={pending}>{pending ? "Đang lưu…" : "Lưu công việc"}</button></form></Modal>}
    {adding && <Modal title="Thêm công việc từ kết quả đã lưu" onClose={() => !pending && setAdding(false)}><form className="connected-form" onSubmit={create}><label>Phân tích<select name="analysis_id" required>{data.analyses.map(row => <option value={row.id} key={row.id}>#{row.id} · {row.product.name}</option>)}</select></label><label>Tiêu đề<input name="title" maxLength={255} required /></label><label>Mô tả<textarea name="description" /></label><p className="muted">Công việc thủ công được ghi rõ nguồn; không tự tạo kết luận mô hình.</p>{error && <p role="alert" className="form-error">{error}</p>}<button className="button primary" disabled={pending}>Tạo công việc</button></form></Modal>}
    {audit && <Modal title={`Lịch sử công việc #${audit.action.id}`} onClose={() => setAudit(null)}>{audit.rows.map(row => <Panel key={row.id} title={`${row.event_type} · ${new Date(row.created_at).toLocaleString("vi-VN")}`}><p>{row.comment}</p><details><summary>Thay đổi đã ghi nhận</summary><pre className="connected-json">{JSON.stringify({ before: row.before_json, after: row.after_json }, null, 2)}</pre></details></Panel>)}{!audit.rows.length && <Empty title="Chưa có lịch sử" />}</Modal>}
  </>;
}
