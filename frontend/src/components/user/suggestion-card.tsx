"use client";
import { useState } from "react";
import {
  products,
  type Suggestion,
  type SuggestionState,
} from "@/lib/preview-fixtures";
import { Badge, Icon, Modal } from "@/components/ui";

export const workflowLabels: Record<SuggestionState, string> = {
  pending: "Chờ duyệt",
  accepted: "Đã chấp nhận",
  in_progress: "Đang thực hiện",
  completed: "Đã hoàn thành",
  rejected: "Đã từ chối",
};
export function SuggestionCard({
  suggestion: s,
  onUpdate,
}: {
  suggestion: Suggestion;
  onUpdate: (state: SuggestionState, reason?: string) => void;
}) {
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const product = products.find((p) => p.id === s.productId)!;
  return (
    <article className="suggestion-card">
      <div className="suggestion-heading">
        <Badge>{s.id}</Badge>
        <Badge tone={s.priority === "high" ? "red" : "amber"}>
          {s.priority === "high" ? "Ưu tiên cao" : "Ưu tiên vừa"}
        </Badge>
      </div>
      <h3>{s.title}</h3>
      <p className="suggestion-product">
        <Icon name="box" size={15} />
        {product.name} · {s.productId}
      </p>
      <p>{s.description}</p>
      <div className="evidence">
        <span>
          <Icon name="info" size={15} />
          BẰNG CHỨNG MINH HỌA
        </span>
        <p>{s.evidence}</p>
      </div>
      {s.reason && <p className="rejection-note">Lý do từ chối: {s.reason}</p>}
      <div className="suggestion-actions">
        <Badge
          tone={
            s.state === "completed"
              ? "green"
              : s.state === "rejected"
                ? "gray"
                : "purple"
          }
        >
          {workflowLabels[s.state]}
        </Badge>
        <div>
          {s.state === "pending" && (
            <>
              <button
                className="button subtle small"
                onClick={() => setReject(true)}
              >
                Từ chối
              </button>
              <button
                className="button primary small"
                onClick={() => onUpdate("accepted")}
              >
                <Icon name="check" size={15} />
                Chấp nhận
              </button>
            </>
          )}
          {s.state === "accepted" && (
            <button
              className="button primary small"
              onClick={() => onUpdate("in_progress")}
            >
              Bắt đầu thực hiện
              <Icon name="arrow" size={15} />
            </button>
          )}
          {s.state === "in_progress" && (
            <button
              className="button primary small"
              onClick={() => onUpdate("completed")}
            >
              <Icon name="check" size={15} />
              Đánh dấu hoàn thành
            </button>
          )}
        </div>
      </div>
      {reject && (
        <Modal title="Từ chối đề xuất demo" onClose={() => setReject(false)}>
          <p className="muted">
            Bằng chứng gốc vẫn được giữ lại. Vui lòng ghi rõ lý do.
          </p>
          <label htmlFor={`reason-${s.id}`}>Lý do từ chối</label>
          <textarea
            id={`reason-${s.id}`}
            required
            maxLength={2000}
            rows={4}
            placeholder="Ví dụ: cần kiểm chứng thêm dữ liệu…"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError("");
            }}
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button className="button subtle" onClick={() => setReject(false)}>
              Hủy
            </button>
            <button
              className="button primary"
              onClick={() => {
                if (!reason.trim()) {
                  setError("Vui lòng nhập lý do từ chối.");
                  return;
                }
                onUpdate("rejected", reason.trim());
                setReject(false);
              }}
            >
              Xác nhận từ chối
            </button>
          </div>
        </Modal>
      )}
    </article>
  );
}
