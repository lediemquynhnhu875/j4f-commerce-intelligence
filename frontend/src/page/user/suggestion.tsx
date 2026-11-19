"use client";
import { usePopup } from "@/components/popup";
import { ErrorPopup } from "@/components/popup";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ProductIdentity } from "@/components/products/product-identity";
import { actionColor } from "@/lib/status-colors";
import { actionTypeLabels } from "@/lib/analysis-presentation";
import { api, allPages, actionLabels } from "@/lib/api-client";
import type { List, Action, History, Account } from "@/types/api";
import { ActionAnalysisPicker } from "@/components/analysis/action-analysis-picker";
import { Badge, Empty, Icon, Modal, Panel, Stat } from "@/components/ui";

import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { useAuth } from "@/page/auth";
import { useWorkspaceData } from "@/lib/use-workspace-data";
import { loadWorkspaceSummary } from "@/lib/workspace-data";

export default function UserSuggestion() {
  const params = useSearchParams();
  const { account } = useAuth();
  const { data, loading, error, refresh, refreshVersion } =
    useWorkspaceData(loadWorkspaceSummary);
  return (
    <WorkspaceLayout
      page="suggestions"
      description="Rà soát đề xuất và chủ động theo dõi tiến độ thực hiện."
      storeName={data?.store_name}
      suggestionCount={data?.proposed_count}
      latestResult={data?.latest_analyzed_at ?? null}
      loading={loading}
      error={error}
      canExport={Boolean(data)}
      onExport={() => allPages<Action>("actions", undefined, 100)}
      onRefresh={refresh}
    >
      <SuggestionList
        key={params.get("analysis") ?? ""}
        actor={account}
        refresh={refresh}
        refreshVersion={refreshVersion}
      />
    </WorkspaceLayout>
  );
}

const nextStates: Record<string, string[]> = {
  proposed: ["accepted", "rejected", "cancelled"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  rejected: [],
  cancelled: [],
};
const pageSize = 20;
type ActionCard = Action & {
  product: { name: string; thumbnail_url: string | null };
};
type ActionCardPage = List<ActionCard> & {
  status_counts: Record<string, number>;
  matched_status_counts: Record<string, number>;
  has_analyses: boolean;
  types: string[];
};

function SuggestionList({
  actor,
  refresh,
  refreshVersion,
}: {
  actor: Account;
  refresh: () => void;
  refreshVersion: number;
}) {
  const params = useSearchParams();
  const [page, setPage] = useState(1);
  const [kanban, setKanban] = useState(false);
  const [category, setCategory] = useState("");
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);
  const popup = usePopup();
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<Action | null>(null);
  const [adding, setAdding] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [audit, setAudit] = useState<{
    action: Action;
    rows: History[];
  } | null>(null);
  const filters = new URLSearchParams({
    view: "cards",
    page: String(page),
    limit: String(pageSize),
  });
  const analysisId = params.get("analysis");
  if (analysisId) filters.set("analysis_id", analysisId);
  if (category) filters.set("type", category);
  if (filter) filters.set("status", filter);
  if (search.trim()) filters.set("search", search.trim());
  const path = `actions?${filters}`;
  const [result, setResult] = useState<{
    path: string;
    value: ActionCardPage;
  }>();
  const [failure, setFailure] = useState<{ path: string; message: string }>();

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => {
        void api<ActionCardPage>(path, { signal: controller.signal })
          .then((value) => {
            if (controller.signal.aborted) return;
            const lastPage = Math.max(
              1,
              Math.ceil(value.pagination.total / pageSize),
            );
            if (page > lastPage) {
              setPage(lastPage);
              return;
            }
            setResult({ path, value });
            setFailure(undefined);
          })
          .catch((err: Error) => {
            if (!controller.signal.aborted)
              setFailure({ path, message: err.message });
          });
      },
      search ? 250 : 0,
    );
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [path, page, search, refreshVersion]);

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
      refresh();
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
  async function history(action: Action) {
    setPending(true);
    setError("");
    try {
      setAudit({
        action,
        rows: await allPages<History>(`actions/${action.id}/history`),
      });
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
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }
  const current = result?.path === path ? result.value : undefined;
  const listError = failure?.path === path ? failure.message : "";
  const summary = result?.value;
  const counts = summary?.status_counts;
  const total = current?.pagination.total ?? 0;
  const visible = current?.data ?? [];
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const renderCard = (action: ActionCard) => {
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
            name={action.product.name}
            image={action.product.thumbnail_url}
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
          value={
            counts
              ? Object.values(counts).reduce((sum, count) => sum + count, 0)
              : "—"
          }
          note="Công việc và đề xuất đã lưu"
          icon="sparkles"
        />
        <Stat
          label="Mới phát hiện"
          value={counts ? (counts.proposed ?? 0) : "—"}
          note="Chờ duyệt hành động"
          tone="pink"
        />
        <Stat
          label="Đang theo dõi"
          value={
            counts ? (counts.accepted ?? 0) + (counts.in_progress ?? 0) : "—"
          }
          note="Đã chấp nhận / đang làm"
          tone="blue"
          icon="clock"
        />
        <Stat
          label="Đã hoàn thành"
          value={counts ? (counts.completed ?? 0) : "—"}
          note="Hoàn thành việc, chưa đo hiệu quả"
          tone="green"
          icon="check"
        />
        <Stat
          label="Đã từ chối"
          value={counts ? (counts.rejected ?? 0) : "—"}
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
              maxLength={200}
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
            disabled={!summary?.has_analyses}
            onClick={() => {
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
          {(summary?.types ?? []).map((type) => (
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
      {error && !editor && !adding && <ErrorPopup message={error} />}
      {listError && <ErrorPopup message={listError} />}
      {!current && !listError && (
        <Panel>
          <p role="status">Đang tải đề xuất…</p>
        </Panel>
      )}
      {current &&
        (visible.length === 0 ? (
          <Panel>
            <Empty title="Chưa có công việc phù hợp" />
          </Panel>
        ) : (
          <>
            <div className="table-footer">
              <span>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} /{" "}
                {total} đề xuất
              </span>
              <div className="filter-row">
                <button
                  className="button subtle small"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Trang trước
                </button>
                <span>
                  Trang {page} / {pageCount}
                </span>
                <button
                  type="button"
                  className="button subtle small"
                  disabled={page >= pageCount}
                  onClick={() => setPage(page + 1)}
                >
                  Trang sau
                </button>
              </div>
            </div>
            {kanban ? (
              <div className="kanban">
                {Object.entries(actionLabels).map(([status, label]) => {
                  const column = visible.filter((row) => row.status === status);
                  return (
                    <section
                      className="kanban-column"
                      key={status}
                      style={{ borderTop: `3px solid ${actionColor(status)}` }}
                    >
                      <h3 style={{ color: actionColor(status) }}>
                        {label}
                        <span>
                          {column.length} /{" "}
                          {current.matched_status_counts[status] ?? 0}
                        </span>
                      </h3>
                      {column.map(renderCard)}
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="grid-two">{visible.map(renderCard)}</div>
            )}
          </>
        ))}
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
            {error && <ErrorPopup message={error} />}
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
            <ActionAnalysisPicker />
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
            {error && <ErrorPopup message={error} />}
            <button className="button primary" disabled={pending}>
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
        </Modal>
      )}
    </>
  );
}
