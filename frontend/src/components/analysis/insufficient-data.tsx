"use client";
import { Icon, Panel } from "@/components/ui";
import { explainInsufficient, observedGaps } from "@/lib/insufficient-data";
import type { Analysis } from "@/types/api";

/**
 * Presentation for analyses the scoring run declined to conclude. It states the
 * recorded reason with its real numbers, keeps the observable comparison usable,
 * and names the step that would make the product analysable. It never turns an
 * undecided result into a recommendation.
 */

const ownerLabels: Record<string, string> = {
  seller: "Người bán xử lý được",
  data: "Phụ thuộc dữ liệu thu thập",
  model: "Thuộc phạm vi phát triển mô hình",
};

export function InsufficientReason({ analysis }: { analysis: Analysis }) {
  const explanation = explainInsufficient(analysis);
  return (
    <div className="insufficient-reason">
      <span className="tile-icon blue" aria-hidden="true">
        <Icon name="info" />
      </span>
      <div>
        <span className="eyebrow">VÌ SAO CHƯA KẾT LUẬN ĐƯỢC</span>
        <h3>{explanation.label}</h3>
        <p>{explanation.detail}</p>
      </div>
    </div>
  );
}

export function ObservableSummary({ analysis }: { analysis: Analysis }) {
  const gaps = observedGaps(analysis);
  return (
    <div className="observable-summary">
      <p>
        Chưa đủ cơ sở để kết luận về lượng bán, nhưng các chỉ số dưới đây vẫn là số liệu quan sát được
        của chính sản phẩm và nhóm đối chiếu — vẫn dùng để rà soát tin đăng.
      </p>
      {gaps.length > 0 ? (
        <ul className="observable-gaps">
          {gaps.map((gap) => (
            <li key={gap.metric} className={gap.concern ? "concern" : undefined}>
              <strong>{gap.label}</strong>
              <span>{gap.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">
          Không có chỉ số nào lệch đáng kể so với trung vị nhóm đối chiếu.
        </p>
      )}
      <p className="muted">
        Chênh lệch ở đây không chứng minh nguyên nhân và không thay cho mức bán tham chiếu.
      </p>
    </div>
  );
}

export function UnblockPanel({ analysis }: { analysis: Analysis }) {
  const explanation = explainInsufficient(analysis);
  return (
    <Panel
      title="Cần gì để phân tích được sản phẩm này"
      subtitle="Việc cụ thể giúp lần chạy sau có đủ cơ sở kết luận"
    >
      <div className="unblock-step">
        <span className="badge">{ownerLabels[explanation.owner]}</span>
        <p>{explanation.unblock}</p>
      </div>
      <p className="muted">
        Hệ thống không tự sinh đề xuất cải thiện khi chưa có căn cứ. Mục này mô tả điều kiện còn thiếu,
        không phải một khuyến nghị về doanh số.
      </p>
    </Panel>
  );
}
