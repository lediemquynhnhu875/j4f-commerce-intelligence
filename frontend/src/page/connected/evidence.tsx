"use client";
import { ErrorPopup } from "@/components/popup";
import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { api, analysisLabels, price } from "@/lib/api-client";
import {
  actionTypeLabels,
  exportSaved,
  quantity,
  productCode,
} from "@/lib/analysis-presentation";
import { Badge, Empty, Icon, Panel, Stat } from "@/components/ui";
import {
  AnalysisTimeline,
  useAnalysisDateRange,
  analysisTime,
} from "@/components/analysis/analysis-timeline";
import { ProductIdentity } from "@/components/products/product-identity";
import {
  InsufficientReason,
  ObservableSummary,
  UnblockPanel,
} from "@/components/analysis/insufficient-data";
import { isInsufficient, metricLabels } from "@/lib/insufficient-data";
import type { AnalysisWorkspace, ProductAnalysis } from "@/types/api";

// Presentation association only: an action must already exist on this analysis.
const metricActionTypes: Record<string, readonly string[]> = {
  price: ["review_price"],
  image_count: ["review_images", "review_images_or_video"],
  has_video: ["review_video", "review_images_or_video"],
  description_length: ["complete_description"],
  rating_average: ["inspect_reviews"],
  review_count: ["inspect_reviews"],
  quantity_sold: ["verify_listing_and_stock", "verify_exposure"],
  observed_sales: ["verify_listing_and_stock", "verify_exposure"],
  sale_probability: ["verify_listing_and_stock", "verify_exposure"],
};
const actionTones: Record<string, string> = {
  review_price: "amber",
  review_images: "blue",
  review_video: "pink",
  review_images_or_video: "blue",
  complete_description: "purple",
  inspect_reviews: "red",
  verify_listing_and_stock: "green",
  verify_exposure: "green",
};
function peerValue(item: Record<string, unknown>) {
  if (item.metric === "peer_quality")
    return `Độ tương đồng trung bình: ${quantity(item.mean_peer_similarity)}`;
  if (item.metric === "quantity_sold") return value(item.reference_sales);
  if (item.metric === "has_video")
    return item.good_peer_share != null
      ? `${quantity(Number(item.good_peer_share) * 100)}% peer bán tốt có video (${quantity(item.good_peer_video_known_count)} mẫu đã biết)`
      : item.peer_share != null
        ? `${quantity(Number(item.peer_share) * 100)}% peer có video`
        : "—";
  return value(item.peer_median);
}
function value(v: unknown) {
  return v === null || v === undefined
    ? "—"
    : typeof v === "boolean"
      ? v
        ? "Có"
        : "Không"
      : typeof v === "number"
        ? quantity(v)
        : String(v);
}

export function LiveAnalysis({
  role,
  productId,
  analysisId,
  refreshVersion,
}: {
  role: "user" | "admin";
  productId: string | null;
  analysisId: string | null;
  refreshVersion: number;
}) {
  const range = useAnalysisDateRange();
  const lookupId = productId ?? analysisId;
  const lookupKey = productId ? "product_id" : "analysis_id";
  const query = new URLSearchParams({ from: range.from, to: range.to });
  if (lookupId) query.set(lookupKey, lookupId);
  const path = `analysis-workspace?${query}`;
  const [workspace, setWorkspace] = useState<{
    path: string;
    productPath: string;
    version: number;
    data: AnalysisWorkspace;
  }>();
  const [detail, setDetail] = useState<ProductAnalysis>();
  const [failure, setFailure] = useState<{ path: string; message: string }>();
  const [detailFailure, setDetailFailure] = useState<{ id: string; message: string }>();
  const current = workspace?.path === path || workspace?.productPath === path ? workspace.data : undefined;

  useEffect(() => {
    if (workspace?.version === refreshVersion &&
      (workspace.path === path || workspace.productPath === path)) return;
    const controller = new AbortController();
    void api<{ data: AnalysisWorkspace }>(path, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const productQuery = new URLSearchParams(path.split("?")[1]);
        productQuery.delete("analysis_id");
        if (data.product) productQuery.set("product_id", data.product.id);
        setWorkspace({ path, productPath: `analysis-workspace?${productQuery}`, version: refreshVersion, data });
        setFailure(undefined);
        setDetail(undefined);
        setDetailFailure(undefined);
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) setFailure({ path, message: err.message });
      });
    return () => controller.abort();
  }, [path, refreshVersion, workspace]);

  const product = current ? current.product : workspace?.data.product;
  const hasAnalysis = current?.has_analysis ?? workspace?.data.has_analysis;
  const inRange = current?.timeline ?? [];
  const latest = current?.latest;
  const selectedId = inRange.some((row) => row.id === analysisId)
    ? analysisId : latest?.analysis.id;
  const historicalId = selectedId && selectedId !== latest?.analysis.id ? selectedId : null;

  useEffect(() => {
    if (!historicalId || !product) return;
    const controller = new AbortController();
    void api<{ data: ProductAnalysis }>(
      `products/${encodeURIComponent(product.id)}/analyses/${encodeURIComponent(historicalId)}`,
      { signal: controller.signal },
    ).then(({ data }) => {
      if (!controller.signal.aborted) {
        setDetail(data);
        setDetailFailure(undefined);
      }
    }).catch((err: Error) => {
      if (!controller.signal.aborted) setDetailFailure({ id: historicalId, message: err.message });
    });
    return () => controller.abort();
  }, [historicalId, product, refreshVersion]);

  const result = historicalId
    ? detail?.analysis.id === historicalId ? detail : undefined
    : latest;
  const analysis = result?.analysis;
  const suggestions = result?.actions ?? [];
  function selectAnalysis(id?: string) {
    const url = new URL(window.location.href);
    if (!productId && !analysisId && !id) return;
    if (product) url.searchParams.set("product", product.id);
    if (id) url.searchParams.set("analysis", id);
    else url.searchParams.delete("analysis");
    window.history.replaceState(null, "", url);
  }
  if (failure?.path === path)
    return <Panel><ErrorPopup message={failure.message} /></Panel>;
  if (!product)
    return current ? <Empty title="Catalog chưa có sản phẩm" /> : (
      <Panel><p role="status">Đang tải phân tích…</p></Panel>
    );
  const input = analysis?.input_snapshot_json ?? {};
  const observed = input.quantity_sold ?? null,
    reference = analysis?.reference_sold ?? null;
  const items = Array.isArray(analysis?.evidence_json?.items)
    ? (analysis.evidence_json.items as Record<string, unknown>[])
    : [];
  const comparison = analysis?.comparison_json ?? {};
  const undecided = isInsufficient(analysis?.status);
  const maximum = Math.max(Number(observed ?? 0), Number(reference ?? 0), 1);
  const title =
    typeof input.product_name === "string"
      ? input.product_name
      : typeof input.name === "string"
        ? input.name
        : product.name;
  const observedAt = input.source_captured_at ?? input.observed_at;
  return (
    <>
      <div className="analysis-product panel">
        <div className="analysis-product-info">
          <ProductIdentity
            name={title}
            image={product.thumbnail_url}
            detail={
              analysis?.product_type ??
              product.category_name
            }
            code={productCode(product)}
          />
          <strong className="product-price">
            {price(
              analysis
                ? input.price == null
                  ? null
                  : String(input.price)
                : product.price,
              product.currency,
            )}
          </strong>
          <p>
            {quantity(analysis ? input.rating_average : product.rating_average)}{" "}
            ★ · {quantity(analysis ? input.review_count : product.review_count)}{" "}
            đánh giá
          </p>
          {(analysis || hasAnalysis !== true) && <StatusBadge status={analysis?.status} />}
        </div>
        <div className="analysis-product-actions">
          <Link className="button subtle" href={`/${role}/products`}>
            Chọn sản phẩm khác
          </Link>
          <button
            className="button subtle"
            disabled={!analysis}
            onClick={() =>
              exportSaved(`analysis-${analysis!.id}`, {
                product,
                analysis,
                suggestions,
              })
            }
          >
            <Icon name="download" size={16} />
            Xuất kết quả đã lưu
          </button>
        </div>
      </div>
      {hasAnalysis !== false && (
        <AnalysisTimeline
          rows={inRange}
          range={range}
          onRangeChange={() => selectAnalysis()}
          currentId={selectedId ?? undefined}
          onSelect={selectAnalysis}
        />
      )}
      {historicalId && detailFailure?.id === historicalId ? (
        <Panel><ErrorPopup message={detailFailure.message} /></Panel>
      ) : !current || (historicalId && !analysis) ? (
        <Panel><p role="status">Đang tải bằng chứng…</p></Panel>
      ) : current.has_analysis === false ? (
        <Empty title="Sản phẩm đã chọn chưa có kết quả phân tích" description={null} />
      ) : !analysis ? (
        <Empty
          title="Chưa có bằng chứng trong khoảng đã chọn"
          description="Chọn khoảng ngày khác để xem các kết quả đã lưu của sản phẩm."
        />
      ) : (
        <>
          <Panel
            title="Bằng chứng quan sát"
            subtitle={`Đang xem kết quả lúc ${analysisTime.format(new Date(analysis.analyzed_at))}`}
            action={
              analysis.id !== latest?.analysis.id && (
                <button
                  type="button"
                  className="button subtle small"
                  onClick={() => selectAnalysis()}
                >
                  Về mốc mới nhất
                </button>
              )
            }
          >
            {undecided && <ObservableSummary analysis={analysis} />}
            <div className="table-card">
              <div className="table-scroll">
                <table aria-label="Bằng chứng theo từng yếu tố">
                  <thead>
                    <tr>
                      <th>YẾU TỐ</th>
                      <th>HIỆN TRẠNG</th>
                      <th>CƠ SỞ ĐỐI CHIẾU</th>
                      <th>CHÊNH LỆCH</th>
                      <th>HÀNH ĐỘNG RÀ SOÁT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const actions = suggestions.filter((row) =>
                        metricActionTypes[String(item.metric)]?.includes(
                          row.type,
                        ),
                      );
                      return (
                        <tr key={index}>
                          <td>
                            {metricLabels[String(item.metric)] ??
                              String(item.metric)}
                          </td>
                          <td>
                            {item.metric === "peer_quality"
                              ? `${quantity(item.peer_count)} sản phẩm`
                              : value(item.observed)}
                          </td>
                          <td>{peerValue(item)}</td>
                          <td>{value(item.difference)}</td>
                          <td>
                            {actions.length ? (
                              <div className="evidence-review-actions">
                                {actions.map((row) => (
                                  <a
                                    key={row.id}
                                    className={`badge ${actionTones[row.type] ?? "purple"}`}
                                    href={`#analysis-action-${row.id}`}
                                    title={
                                      typeof row.original_suggestion_json
                                        .action === "string"
                                        ? row.original_suggestion_json.action
                                        : row.title
                                    }
                                  >
                                    {actionTypeLabels[row.type] ?? row.type}
                                    <Icon name="arrow" size={12} />
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="muted">Chưa có đề xuất</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {!items.length && (
              <Empty
                title="Chưa có bằng chứng chi tiết"
                description="Kết quả này chưa có dữ liệu đối chiếu theo từng yếu tố."
              />
            )}
          </Panel>
          <div className="diagnosis">
            <span className="tile-icon pink">
              <Icon name="sparkles" />
            </span>
            <div>
              <span className="eyebrow">KẾT QUẢ TỪ ĐẦU VÀO ĐÃ ĐÓNG BĂNG</span>
              <h3>{analysisLabels[analysis.status] ?? analysis.status}</h3>
              <p>
                {typeof analysis.evidence_json?.explanation === "string"
                  ? analysis.evidence_json.explanation
                  : "Xem bằng chứng và phạm vi của kết quả trước khi lựa chọn hành động."}
              </p>
            </div>
            <StatusBadge status={analysis.status}>Kết quả đã lưu</StatusBadge>
          </div>
          {undecided && <InsufficientReason analysis={analysis} />}
          <Panel title="Kết quả từ đầu vào đã đóng băng">
            <div className="stats-grid four">
              <Stat
                label="Số bán khi phân tích"
                value={quantity(observed)}
                suffix="đơn vị"
                note="Từ snapshot đã lưu"
                icon="box"
              />
              <Stat
                label="Tham chiếu"
                value={quantity(reference)}
                suffix={reference === null ? undefined : "đơn vị"}
                note={
                  undecided && reference === null
                    ? "Chưa đủ cơ sở — xem lý do ở trên"
                    : "Không phải dự báo doanh số"
                }
                tone="blue"
              />
              <Stat
                label="Chênh lệch"
                value={quantity(analysis.sales_gap)}
                suffix={analysis.sales_gap === null ? undefined : "đơn vị"}
                note="Quan sát trừ tham chiếu"
                tone={
                  analysis.sales_gap === null
                    ? "gray"
                    : Number(analysis.sales_gap) < 0
                      ? "pink"
                      : "green"
                }
              />
              <Stat
                label="Khoảng tham chiếu"
                value={`${quantity(analysis.prediction_lower)} – ${quantity(analysis.prediction_upper)}`}
                note="Khoảng tham chiếu từ mô hình"
                tone="blue"
              />
            </div>
          </Panel>
          <Panel
            title="Biểu đồ đối chiếu lượng bán"
            subtitle="So sánh tại snapshot; chênh lệch không chứng minh nguyên nhân"
          >
            <div className="comparison-bars">
              {[
                { name: "Số bán quan sát", number: observed },
                { name: "Mức bán tham chiếu", number: reference },
              ].map((row, index) => (
                <div key={row.name}>
                  <div>
                    <span>{row.name}</span>
                    <strong>
                      {row.number === null
                        ? "Không khả dụng"
                        : `${quantity(row.number)} đơn vị`}
                    </strong>
                  </div>
                  <div className="comparison-track">
                    <span
                      className={index === 0 ? "observed" : "reference"}
                      style={{
                        display:
                          row.number === null || Number(row.number) === 0
                            ? "none"
                            : undefined,
                        width:
                          row.number === null
                            ? "0%"
                            : `${(Number(row.number) / maximum) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Bối cảnh & Cơ sở ghép nhóm đối chiếu">
            <div className="context-grid">
              <div className="tinted">
                <small>Nhóm sản phẩm</small>
                <strong>{analysis.product_type ?? "Chưa có nhãn"}</strong>
              </div>
              <div className="tinted">
                <small>Số mẫu đối chiếu</small>
                <strong>{quantity(comparison.peer_count)} sản phẩm</strong>
              </div>
              <div className="tinted">
                <small>Giá trung vị nhóm</small>
                <strong>
                  {comparison.peer_median_price == null
                    ? "—"
                    : price(
                        String(comparison.peer_median_price),
                        product.currency,
                      )}
                </strong>
              </div>
              <div className="tinted">
                <small>Chất lượng kết quả</small>
                <strong>
                  {analysis.config_json.quality_acceptance === true
                    ? "Theo đánh giá của đợt chạy"
                    : "Thử nghiệm, cần rà soát"}
                </strong>
              </div>
            </div>
          </Panel>
          <Panel title="Giải thích kết quả phân tích">
            <div className="grid-two">
              {suggestions.map((row) => (
                <div
                  className="tinted evidence-suggestion"
                  id={`analysis-action-${row.id}`}
                  tabIndex={-1}
                  key={row.id}
                >
                  <Badge>{actionTypeLabels[row.type] ?? row.type}</Badge>
                  <h3>{row.title}</h3>
                  <p>
                    <strong>Bằng chứng:</strong>{" "}
                    {String(
                      row.original_suggestion_json.evidence ??
                        row.information_needed ??
                        "Chưa có",
                    )}
                  </p>
                  <p>
                    <strong>Giả thuyết:</strong>{" "}
                    {String(
                      row.original_suggestion_json.hypothesis ??
                        row.description ??
                        "Chưa có",
                    )}
                  </p>
                </div>
              ))}
            </div>
            {!suggestions.length && (
              <Empty
                title="Không có đề xuất trong kết quả này"
                description="Không tự sinh hành động khi đầu ra chưa có căn cứ."
              />
            )}
          </Panel>
          {undecided && <UnblockPanel analysis={analysis} />}
          <Panel title="Phạm vi & Giới hạn phân tích">
            <div className="notice">
              <Icon name="shield" />
              <span>
                {analysis.status_schema_version === "ml_v2"
                  ? "Phân tích thử nghiệm, cần rà soát. "
                  : ""}
                {analysis.limitation_note ??
                  "Tham chiếu từ snapshot, không phải dự báo hoặc cam kết tăng doanh số."}
              </span>
            </div>
            <p className="muted">
              Thời điểm phân tích:{" "}
              {new Date(
                analysis.scored_at ?? analysis.analyzed_at,
              ).toLocaleString("vi-VN")}{" "}
              · Thời điểm quan sát nguồn:{" "}
              {typeof observedAt === "string"
                ? new Date(observedAt).toLocaleString("vi-VN")
                : "Chưa xác định"}
            </p>
          </Panel>
          <Panel title="Hành động tiếp theo">
            <div className="action-banner">
              <div>
                <h3>Xem đề xuất và kiểm tra bằng chứng</h3>
                <p>
                  {role === "user"
                    ? "Chấp nhận, từ chối hoặc theo dõi công việc của đúng kết quả này."
                    : "Kiểm tra dữ liệu và phiên bản của đúng kết quả này trong trang giám sát."}
                </p>
              </div>
              <Link
                className="button primary"
                href={`/${role === "user" ? "user/suggestions" : "admin/monitor"}?analysis=${analysis.id}`}
              >
                <Icon name="sparkles" size={18} />
                {role === "user" ? "Xem đề xuất" : "Xem trong giám sát"}
              </Link>
            </div>
            {suggestions.map((row) => (
              <p key={row.id}>
                Cần xác minh:{" "}
                {String(
                  row.original_suggestion_json.validation_needed ??
                    row.information_needed ??
                    "Chưa có thông tin",
                )}
              </p>
            ))}
            <details className="audit-details">
              <summary>Thông số kết quả đã lưu</summary>
              <p>
                Mô hình: {analysis.model_version ?? "Chưa có"} · Quy tắc:{" "}
                {analysis.pipeline_version} · Taxonomy:{" "}
                {analysis.taxonomy_version ?? "Chưa có"}
              </p>
              <pre className="connected-json">
                {JSON.stringify(
                  {
                    config: analysis.config_json,
                    comparison: analysis.comparison_json,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          </Panel>
        </>
      )}
    </>
  );
}
