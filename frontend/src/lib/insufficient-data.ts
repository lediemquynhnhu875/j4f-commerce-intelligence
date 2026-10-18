import type { Analysis } from "@/types/api";
import { quantity } from "./analysis-presentation";

/**
 * "Chưa đủ dữ liệu" is not an empty result. The scoring run records exactly why
 * it declined to conclude, in status_reason, and still stores the full peer
 * comparison. These helpers turn that stored reason into a readable explanation
 * with the real numbers behind it, and into the one step that would make the
 * product analysable.
 *
 * Nothing here invents a conclusion: every number comes from the saved analysis.
 */

export const metricLabels: Record<string, string> = {
  price: "Giá bán", discount_rate: "Giảm giá", image_count: "Số ảnh", has_video: "Video sản phẩm",
  description_length: "Độ dài mô tả", rating_average: "Điểm đánh giá", review_count: "Số đánh giá",
  observed_sales: "Số bán", quantity_sold: "Số bán", sale_probability: "Xác suất có số bán",
  reference_sales: "Mức tham chiếu", peer_quality: "Chất lượng nhóm đối chiếu",
};

export const insufficientReasonLabels: Record<string, string> = {
  peer_similarity_below_minimum: "Nhóm đối chiếu chưa đủ tương đồng",
  peer_count_below_minimum: "Quá ít sản phẩm cùng loại để so sánh",
  out_of_scope_product: "Nằm ngoài phạm vi phân tích",
  unresolved_product_type: "Chưa xác định được loại sản phẩm",
  insufficient_feedback_for_low_sales_interpretation: "Chưa đủ phản hồi để diễn giải",
  invalid_essential_data: "Thiếu dữ liệu cơ bản của tin đăng",
};

export type InsufficientExplanation = {
  reason: string;
  label: string;
  detail: string;
  unblock: string;
  /** Who can actually unblock this: the seller, a later data load, or the model team. */
  owner: "seller" | "data" | "model";
};

export function isInsufficient(status?: string | null) {
  return status === "insufficient_data";
}

function num(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function explainInsufficient(analysis: Analysis): InsufficientExplanation {
  const comparison = record(analysis.comparison_json);
  const config = record(comparison.peer_config);
  const input = record(analysis.input_snapshot_json);
  const reason = analysis.status_reason ?? "";
  const peerCount = num(comparison.peer_count);
  const similarity = num(comparison.mean_peer_similarity);
  const minSimilarity = num(config.minimum_mean_peer_similarity);
  const minCount = num(config.minimum_peer_count);
  const reviews = num(input.review_count);
  const sold = num(input.quantity_sold);
  const label = insufficientReasonLabels[reason] ?? "Chưa đủ cơ sở để kết luận";

  switch (reason) {
    case "peer_similarity_below_minimum":
      return {
        reason, label, owner: "seller",
        detail:
          `Hệ thống tìm được ${quantity(peerCount)} sản phẩm cùng loại để đối chiếu, nhưng độ tương đồng trung bình ` +
          `chỉ đạt ${quantity(similarity)} — dưới ngưỡng tối thiểu ${quantity(minSimilarity)}. ` +
          `Mức bán tham chiếu suy ra từ một nhóm lệch như vậy sẽ không đáng tin, nên hệ thống không đưa ra kết luận.`,
        unblock:
          "Chuẩn hoá tên và mô tả theo đúng loại sản phẩm — nêu rõ chất liệu, kiểu dáng và công dụng. " +
          "Tên càng đặc trưng thì nhóm đối chiếu càng chính xác. Sau đó chạy lại phân tích.",
      };
    case "peer_count_below_minimum":
      return {
        reason, label, owner: "data",
        detail:
          `Chỉ tìm được ${quantity(peerCount)} sản phẩm cùng loại, dưới mức tối thiểu ${quantity(minCount)} mà quy tắc yêu cầu. ` +
          `Với ít mẫu như vậy, một vài sản phẩm cá biệt đủ sức kéo lệch toàn bộ mức tham chiếu.`,
        unblock:
          "Cần thêm dữ liệu sản phẩm cùng loại trong kho. Với nhóm ngách rất nhỏ, số mẫu có thể không bao giờ đủ — " +
          "khi đó nên đối chiếu thủ công với vài sản phẩm bạn tự chọn.",
      };
    case "out_of_scope_product":
      return {
        reason, label, owner: "model",
        detail:
          "Sản phẩm không thuộc nhóm thời trang mà mô hình được xây dựng và đánh giá. " +
          "Đây không phải lỗi dữ liệu của tin đăng: hệ thống cố ý không kết luận ngoài phạm vi đã kiểm chứng.",
        unblock:
          "Không cần xử lý gì ở tin đăng. Nếu nhóm hàng này quan trọng với bạn, cần mở rộng taxonomy và " +
          "đánh giá lại mô hình — đây là việc của đợt phát triển tiếp theo.",
      };
    case "unresolved_product_type":
      return {
        reason, label, owner: "seller",
        detail:
          "Tên và mô tả chưa đủ căn cứ để xếp sản phẩm vào một loại trong danh mục phân loại, " +
          "nên hệ thống chưa biết phải lấy nhóm nào ra đối chiếu.",
        unblock:
          "Bổ sung từ khoá loại sản phẩm vào tên tin đăng, hoặc gán nhãn loại sản phẩm thủ công rồi chạy lại phân tích.",
      };
    case "insufficient_feedback_for_low_sales_interpretation":
      return {
        reason, label, owner: "seller",
        detail:
          `Lượng bán ghi nhận (${quantity(sold)}) thấp hơn cận dưới của mức tham chiếu, nhưng sản phẩm mới có ` +
          `${quantity(reviews)} đánh giá. Với từng đó phản hồi, chưa thể phân biệt được đây là vấn đề chất lượng ` +
          `hay chỉ là tin đăng chưa được nhìn thấy.`,
        unblock:
          "Thu thập thêm đánh giá thật từ người mua, đồng thời kiểm tra khả năng hiển thị và tình trạng tồn kho. " +
          "Khi đã có phản hồi, chạy lại phân tích để biết nên sửa sản phẩm hay sửa cách bán.",
      };
    case "invalid_essential_data":
      return {
        reason, label, owner: "seller",
        detail:
          "Tin đăng thiếu hoặc sai những trường bắt buộc để tính toán, ví dụ giá bán, nên không thể đối chiếu.",
        unblock: "Bổ sung các trường còn thiếu trong tin đăng rồi nhập lại dữ liệu.",
      };
    default:
      return {
        reason: reason || "unknown", label, owner: "data",
        detail:
          analysis.status_reason
            ? `Hệ thống ghi nhận lý do “${analysis.status_reason}” nhưng chưa có diễn giải cho mã này.`
            : "Kết quả đã lưu không ghi lý do cụ thể.",
        unblock: "Liên hệ người phụ trách dữ liệu để bổ sung diễn giải cho mã lý do này.",
      };
  }
}

export type ObservedGap = {
  metric: string;
  label: string;
  text: string;
  /** True when the product sits on the weaker side of its peer group. */
  concern: boolean;
};

/** Metrics that still mean something without a sales conclusion. */
const comparableMetrics = ["image_count", "has_video", "description_length", "review_count", "price", "discount_rate"];

/**
 * Smallest absolute difference worth showing. Without this, a product with no
 * reviews against a peer median of one review reads as "100% below", which is
 * noise rather than evidence.
 */
const minimumAbsoluteGap: Record<string, number> = {
  image_count: 2,
  review_count: 3,
  description_length: 40,
};

/**
 * Observable differences against the peer medians of the same saved analysis.
 * These are recorded facts, not an estimate of sales, so they stay valid even
 * when the run declined to produce a reference.
 */
export function observedGaps(analysis: Analysis): ObservedGap[] {
  const items = Array.isArray(analysis.evidence_json?.items)
    ? (analysis.evidence_json.items as Record<string, unknown>[])
    : [];
  const gaps: ObservedGap[] = [];
  for (const metric of comparableMetrics) {
    const item = items.find((row) => row.metric === metric);
    if (!item) continue;
    const label = metricLabels[metric] ?? metric;
    if (metric === "has_video") {
      const share = num(item.peer_share) ?? num(item.good_peer_share);
      if (item.observed === false && share !== null && share > 0.15)
        gaps.push({ metric, label, concern: true,
          text: `Chưa có video, trong khi ${quantity(Math.round(share * 100))}% sản phẩm cùng nhóm có video` });
      continue;
    }
    const observed = num(item.observed);
    const peer = num(item.peer_median);
    if (observed === null || peer === null || peer === 0) continue;
    const ratio = (observed - peer) / Math.abs(peer);
    if (Math.abs(ratio) < 0.2) continue;
    const floor = minimumAbsoluteGap[metric];
    if (floor !== undefined && Math.abs(observed - peer) < floor) continue;
    const percent = quantity(Math.round(Math.abs(ratio) * 100));
    if (metric === "price")
      gaps.push({ metric, label, concern: ratio > 0.3,
        text: ratio > 0 ? `Cao hơn trung vị nhóm ${percent}%` : `Thấp hơn trung vị nhóm ${percent}%` });
    else if (metric === "discount_rate")
      gaps.push({ metric, label, concern: ratio < 0,
        text: ratio > 0 ? `Giảm giá sâu hơn nhóm ${percent}%` : `Giảm giá ít hơn nhóm ${percent}%` });
    else
      gaps.push({ metric, label, concern: ratio < 0,
        text: ratio < 0
          ? `Thấp hơn trung vị nhóm ${percent}% (${quantity(observed)} so với ${quantity(peer)})`
          : `Cao hơn trung vị nhóm ${percent}% (${quantity(observed)} so với ${quantity(peer)})` });
  }
  return gaps;
}
