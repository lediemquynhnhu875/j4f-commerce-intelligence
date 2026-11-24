"use client";
import { usePopup } from "@/components/popup";
import { ErrorPopup } from "@/components/popup";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ProductIdentity } from "@/components/products/product-identity";
import { actionColor } from "@/lib/status-colors";
import { actionTypeLabels } from "@/lib/analysis-presentation";
import { api, actionLabels } from "@/lib/api-client";
import type { WorkData, WorkQuery, WorkResponse, Action, History, Account, List, AnalysisOption } from "@/types/api";
import { PageControls } from "@/components/page-controls";
import { useWorkspaceRead, useDebouncedSearch } from "@/lib/use-workspace-read";
import { Badge, Empty, Icon, Modal, Panel, Stat } from "@/components/ui";

const nextStates: Record<string, string[]> = {
  proposed: ["accepted", "rejected", "cancelled"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  rejected: [],
  cancelled: [],
};
export function LiveActions({
  data,
  actor,
  refresh, query, changeQuery, remote, loading,
}: {
  data: WorkData;
  query: WorkQuery;
  changeQuery:(patch:Partial<WorkQuery>)=>void;
  remote: Pick<WorkResponse,"pagination"|"summary"|"facets"|"filtered_states">;
  loading:boolean;
  actor: Account;
  refresh: () => Promise<void>;
}) {
  const params = useSearchParams();
  const setPage=(page:number)=>changeQuery({page});
  const [kanban, setKanban] = useState(false);
  const {type:category,status:filter,q:search}=query;
  const setCategory=(type:string)=>changeQuery({type});
  const setFilter=(status:string)=>changeQuery({status});
  const setSearch=(q:string)=>changeQuery({q});
  const [pending, setPending] = useState(false);
  const popup = usePopup();
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<Action | null>(null);
  const [adding, setAdding] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [audit, setAudit] = useState<{
    action: Action;
    rows: History[];
    pagination: List<History>["pagination"];
  } | null>(null);
  async function mutate(action: Action, fields: Record<string, unknown>) {
    setPending(true);
    setError("");
    try {
      await api(`actions/${action.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...fields,
          expected_updated_at: action.updated_at,
        }),
      });
      setEditor(null);
      popup.notify("Đã cập nhật công việc.");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function change(action: Action, status: string) {
    if (status === "rejected") {
      setRejecting(true);
      setEditor(action);
      return;
    }
    await mutate(action, { status });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields: Record<string, unknown> = {
      title: String(form.get("title")),
      description: String(form.get("description")),
      information_needed: String(form.get("information_needed")),
      outcome_note: String(form.get("outcome_note")),
    };
    if (form.get("reject") === "on") {
      fields.status = "rejected";
      fields.decision_reason = String(form.get("decision_reason"));
    }
    await mutate(editor!, fields);
  }
  async function history(action: Action, page=1) {
    setPending(true);
    setError("");
    try {
      const result=await api<List<History>>(`actions/${action.id}/history?page=${page}&limit=20`);
      setAudit({action,rows:result.data,pagination:result.pagination});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    const title = String(form.get("title"));
    const description = String(form.get("description"));
    try {
      await api("actions", {
        method: "POST",
        body: JSON.stringify({
          analysis_id: String(form.get("analysis_id")),
          type: "other",
          title,
          description,
          assigned_to: actor.id,
          original_suggestion_json: {
            source: "manual_user_work",
            title,
            description,
            limitation:
              "Công việc do người dùng tạo; không phải đề xuất mô hình.",
          },
        }),
      });
      setAdding(false);
      popup.notify("Đã tạo công việc.");
      setPage(1);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }
  const [manualSearch,setManualSearch]=useState("");
  const [manualPage,setManualPage]=useState(1);
  const [manualId,setManualId]=useState("");
  const debouncedManual=useDebouncedSearch(manualSearch);
  const choices=useWorkspaceRead<List<AnalysisOption>>(adding?`analyses/options?page=${manualPage}&limit=20&q=${encodeURIComponent(debouncedManual)}`:null);
  const rows=loading?[]:data.actions;
  const visible=rows;
  const states=remote.summary.states;
  const renderCard = (action: Action) => {
    const analysis = data.analyses.find((row) => row.id === action.analysis_id);
    const product = data.products.find(
      (row) => row.id === analysis?.product_id,
    );
    return (
      <article className="suggestion-card" key={action.id}>
        <div className="suggestion-heading">
          <Badge>#{action.id}</Badge>
          <Badge tone={action.origin === "ml_rule" ? "amber" : "blue"}>
            {actionTypeLabels[action.type] ?? action.type}
          </Badge>
        </div>
        <h3>{action.title}</h3>
        <div className="suggestion-product">
          <ProductIdentity
            name={analysis?.product.name ?? product?.name ?? "Chưa biết"}
            image={product?.thumbnail_url}
            detail={`Phân tích #${action.analysis_id}`}
          />
        </div>
        <p>{action.description}</p>
        <div className="evidence">
          <span>
            <Icon name="info" size={15} />
            BẰNG CHỨNG ĐÃ LƯU
          </span>
          <p>
            Bằng chứng:{" "}
            {String(
              action.original_suggestion_json.evidence ??
                action.information_needed ??
                "Chưa có bằng chứng chi tiết",
            )}
          </p>
        </div>
        {action.origin === "ml_rule" && (
          <>
            <p className="muted">Đề xuất thử nghiệm từ ML, cần rà soát.</p>
            <p>
              Cần xác minh:{" "}
              {String(action.original_suggestion_json.validation_needed ?? "—")}
            </p>
          </>
        )}
        {action.decision_reason && (
          <p className="rejection-note">Lý do: {action.decision_reason}</p>
        )}
        {action.outcome_note && <p>Ghi chú thực hiện: {action.outcome_note}</p>}
        <div className="suggestion-actions">
          <StatusBadge kind="action" status={action.status} />
          <div>
            {nextStates[action.status]
              ?.filter((status) => status !== "cancelled")
              .map((status) => (
                <button
                  key={status}
                  className={`button ${status === "rejected" ? "subtle" : "primary"} small`}
                  disabled={pending}
                  onClick={() => change(action, status)}
                >
                  {status === "accepted"
                    ? "Chấp nhận"
                    : status === "rejected"
                      ? "Từ chối"
                      : status === "in_progress"
                        ? "Bắt đầu thực hiện"
                        : status === "completed"
                          ? "Đánh dấu hoàn thành"
                          : actionLabels[status]}
                </button>
              ))}
          </div>
        </div>
        <details className="audit-details">
          <summary>Quản lý công việc & lịch sử</summary>
          <p>
            Người thực hiện:{" "}
            {action.assigned_to === actor.id
              ? actor.full_name
              : (action.assigned_to ?? "Chưa giao")}
          </p>
          <div className="filter-row">
            <button
              className="button subtle small"
              disabled={pending}
              onClick={() => {
                setRejecting(false);
                setEditor(action);
                setError("");
              }}
            >
              Sửa công việc
            </button>
            <button
              className="button subtle small"
              disabled={pending}
              onClick={() => history(action)}
            >
              Lịch sử
            </button>
            <button
              className="button subtle small"
              disabled={pending || action.assigned_to === actor.id}
              onClick={() => mutate(action, { assigned_to: actor.id })}
            >
              Giao cho tôi
            </button>
            {nextStates[action.status]?.includes("cancelled") && (
              <button
                className="button subtle small"
                disabled={pending}
                onClick={() => change(action, "cancelled")}
              >
                Hủy công việc
              </button>
            )}
          </div>
          <details>
            <summary>Đề xuất gốc (không sửa)</summary>
            <pre className="connected-json">
              {JSON.stringify(action.original_suggestion_json, null, 2)}
            </pre>
          </details>
        </details>
      </article>
    );
  };
  return (
    <>
      <div className="stats-grid five">
        <Stat
          label="Tổng đề xuất"
          value={remote.summary.total}
          note="Công việc và đề xuất đã lưu"
          icon="sparkles"
        />
        <Stat
          label="Mới phát hiện"
          value={states.proposed ?? 0}
          note="Chờ duyệt hành động"
          tone="pink"
        />
        <Stat
          label="Đang theo dõi"
          value={
            (states.accepted ?? 0)+(states.in_progress ?? 0)
          }
          note="Đã chấp nhận / đang làm"
          tone="blue"
          icon="clock"
        />
        <Stat
          label="Đã hoàn thành"
          value={states.completed ?? 0}
          note="Hoàn thành việc, chưa đo hiệu quả"
          tone="green"
          icon="check"
        />
        <Stat
          label="Đã từ chối"
          value={states.rejected ?? 0}
          note="Giữ nguyên bằng chứng"
          tone="gray"
        />
      </div>
      <Panel className="filters">
        <div className="filter-row">
          <div className="search-field">
            <Icon name="search" size={17} />
            <input
              aria-label="Tìm công việc"
              value={search}
              placeholder="Tìm đề xuất, mã công việc…"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label="Trạng thái công việc"
            style={filter ? { color: actionColor(filter) } : undefined}
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(actionLabels).map(([key, label]) => (
              <option key={key} value={key} style={{ color: actionColor(key) }}>
                {label}
              </option>
            ))}
          </select>
          <div className="segmented">
            <button
              aria-pressed={!kanban}
              className={!kanban ? "selected" : ""}
              onClick={() => setKanban(false)}
            >
              <Icon name="grid" size={16} />
              Danh sách
            </button>
            <button
              aria-pressed={kanban}
              className={kanban ? "selected" : ""}
              onClick={() => setKanban(true)}
            >
              <Icon name="chart" size={16} />
              Kanban
            </button>
          </div>
          <button
            className="button primary"
            disabled={pending}
            onClick={() => {
              setManualSearch("");setManualPage(1);setManualId("");
              setAdding(true);
              setError("");
            }}
          >
            <Icon name="plus" size={16} />
            Thêm công việc
          </button>
        </div>
        <div className="filter-chips live-category-chips">
          <button
            className={!category ? "selected" : ""}
            onClick={() => {
              setCategory("");
              setPage(1);
            }}
          >
            Tất cả
          </button>
          {remote.facets.types.map((type) => (
            <button
              key={type}
              className={category === type ? "selected" : ""}
              onClick={() => {
                setCategory(type);
                setPage(1);
              }}
            >
              {actionTypeLabels[type] ?? type}
            </button>
          ))}
        </div>
      </Panel>
      {params.get("analysis") && (
        <p className="notice">
          Đang xem đề xuất của phân tích #{params.get("analysis")}.{" "}
          <Link className="text-link" href={`/${actor.role}/suggestions`}>
            Xem tất cả
          </Link>
        </p>
      )}
      {error && !editor && !adding && (
        <ErrorPopup message={error} />
      )}
      {loading ? <Panel><p role="status">Đang tải trang đề xuất…</p></Panel> : !rows.length ? (
        <Panel>
          <Empty title="Chưa có công việc phù hợp" />
        </Panel>
      ) : kanban ? (
        <div className="kanban">
          {Object.entries(actionLabels).map(([status, label]) => (
            <section
              className="kanban-column"
              key={status}
              style={{ borderTop: `3px solid ${actionColor(status)}` }}
            >
              <h3 style={{ color: actionColor(status) }}>
                {label}
                <span>
                  {rows.filter((row) => row.status === status).length} / {remote.filtered_states[status] ?? 0}
                </span>
              </h3>
              {rows.filter((row) => row.status === status).map(renderCard)}
            </section>
          ))}
        </div>
      ) : (
        <>
          <div className="grid-two">{visible.map(renderCard)}</div>
        </>
      )}
      {kanban && <p className="muted">Kanban hiển thị các đề xuất của trang hiện tại; số ở mỗi cột là đang xem / tổng phù hợp.</p>}
      <PageControls pagination={remote.pagination} onPage={setPage} label="đề xuất" disabled={loading||pending}/>
      <div className="opportunity-banner">
        <span className="brand-mark">
          <Icon name="sparkles" size={26} />
        </span>
        <div>
          <h2>Biến bằng chứng thành hành động phù hợp</h2>
          <p>
            Rà soát thông tin, kiểm chứng giả thuyết và theo dõi công việc. Hoàn
            thành đề xuất không đồng nghĩa tăng doanh số.
          </p>
        </div>
      </div>
      {editor && (
        <Modal
          title="Sửa / quyết định công việc"
          onClose={() => !pending && setEditor(null)}
        >
          <form className="connected-form" onSubmit={save}>
            <label>
              Tiêu đề
              <input
                name="title"
                required
                maxLength={255}
                defaultValue={editor.title}
              />
            </label>
            <label>
              Mô tả
              <textarea
                name="description"
                defaultValue={editor.description ?? ""}
              />
            </label>
            <label>
              Thông tin cần bổ sung
              <textarea
                name="information_needed"
                defaultValue={editor.information_needed ?? ""}
              />
            </label>
            <label>
              Ghi chú thực hiện
              <textarea
                name="outcome_note"
                defaultValue={editor.outcome_note ?? ""}
              />
            </label>
            {editor.status === "proposed" && (
              <>
                <label>
                  <input
                    type="checkbox"
                    name="reject"
                    checked={rejecting}
                    onChange={(event) => setRejecting(event.target.checked)}
                  />{" "}
                  Từ chối công việc
                </label>
                <label>
                  Lý do từ chối
                  <textarea name="decision_reason" required={rejecting} />
                </label>
              </>
            )}
            {error && (
              <ErrorPopup message={error} />
            )}
            <button className="button primary" disabled={pending}>
              {pending ? "Đang lưu…" : "Lưu công việc"}
            </button>
          </form>
        </Modal>
      )}
      {adding && (
        <Modal
          title="Thêm công việc từ kết quả đã lưu"
          onClose={() => !pending && setAdding(false)}
        >
          <form className="connected-form" onSubmit={create}>
            <label>
              Phân tích
              <input aria-label="Tìm phân tích cho công việc" placeholder="Tên sản phẩm hoặc mã phân tích…" value={manualSearch} onChange={e=>{setManualSearch(e.currentTarget.value);setManualPage(1);setManualId("");}}/>
              <select name="analysis_id" required value={manualId || choices.data?.data[0]?.id || ""} onChange={e=>setManualId(e.currentTarget.value)}>
                {(choices.data?.data ?? []).map((row) => (
                  <option value={row.id} key={row.id}>
                    #{row.id} · {row.product.name}
                  </option>
                ))}
              </select>
            </label>
            {choices.loading && <p role="status">Đang tải lựa chọn phân tích…</p>}
            {choices.error && <ErrorPopup message={choices.error}/>}
            {choices.data && <PageControls pagination={choices.data.pagination} label="lựa chọn phân tích" disabled={choices.loading} onPage={p=>{setManualPage(p);setManualId("");}}/>}
            <label>
              Tiêu đề
              <input name="title" maxLength={255} required />
            </label>
            <label>
              Mô tả
              <textarea name="description" />
            </label>
            <p className="muted">
              Công việc thủ công được ghi rõ nguồn; không tự tạo kết luận mô
              hình.
            </p>
            {error && (
              <ErrorPopup message={error} />
            )}
            <button className="button primary" disabled={pending||choices.loading||manualSearch!==debouncedManual||!choices.data?.data.length}>
              Tạo công việc
            </button>
          </form>
        </Modal>
      )}
      {audit && (
        <Modal
          title={`Lịch sử công việc #${audit.action.id}`}
          onClose={() => setAudit(null)}
        >
          {audit.rows.map((row) => (
            <Panel
              key={row.id}
              title={`${row.event_type} · ${new Date(row.created_at).toLocaleString("vi-VN")}`}
            >
              <p>{row.comment}</p>
              <details>
                <summary>Thay đổi đã ghi nhận</summary>
                <pre className="connected-json">
                  {JSON.stringify(
                    { before: row.before_json, after: row.after_json },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </Panel>
          ))}
          {!audit.rows.length && <Empty title="Chưa có lịch sử" />}
          <PageControls pagination={audit.pagination} label="lịch sử" disabled={pending} onPage={p=>void history(audit.action,p)}/>
        </Modal>
      )}
    </>
  );
}
