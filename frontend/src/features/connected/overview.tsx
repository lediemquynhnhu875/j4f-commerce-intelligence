"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { analysisColor } from "@/lib/status-colors";
import { Donut } from "@/components/charts/donut";
import { Badge, Empty, Icon, Panel, Stat } from "@/components/ui";
import { analysisLabels, mlAnalysisLabels } from "@/lib/api-client";
import type { Analysis, Dataset } from "@/types/api";
import { ProductIdentity } from "@/components/products/product-identity";
import { quantity, productCode } from "@/lib/analysis-presentation";

const palette = [
  "#8b5cf6",
  "#3b82f6",
  "#ec4899",
  "#f59e0b",
  "#14b8a6",
  "#6366f1",
  "#a855f7",
  "#64748b",
];
const typeLabels: Record<string, string> = {
  review_price: "Giá",
  review_images: "Ảnh",
  review_video: "Video",
  complete_description: "Mô tả",
  inspect_reviews: "Phản hồi",
  verify_listing_and_stock: "Hiển thị / tồn kho",
  verify_exposure: "Hiển thị",
  review_images_or_video: "Ảnh / video",
  other: "Khác",
};
const activeStates = new Set(["proposed", "accepted", "in_progress"]);
const percent = (count: number, total: number) =>
  total ? (count / total) * 100 : 0;

export function LiveOverview({
  data,
  role,
}: {
  data: Dataset;
  role: "user" | "admin";
}) {
  const latest = new Map<string, Analysis>();
  for (const row of data.analyses) {
    const old = latest.get(row.product_id);
    if (
      !old ||
      row.analyzed_at > old.analyzed_at ||
      (row.analyzed_at === old.analyzed_at && BigInt(row.id) > BigInt(old.id))
    )
      latest.set(row.product_id, row);
  }
  const products = data.products;
  const current = products.flatMap((product) =>
    latest.get(product.id) ? [latest.get(product.id)!] : [],
  );
  const analysisIds = new Set(current.map((row) => row.id));
  const actions = data.actions.filter((row) =>
    analysisIds.has(row.analysis_id),
  );
  const active = actions.filter((row) => activeStates.has(row.status));
  const reviewIds = new Set(active.map((row) => row.analysis_id));
  const total = products.length;
  const noAnalysis = total - current.length;
  const hasMl = current.some((row) => row.status_schema_version === "ml_v2");
  const groups = Object.entries(analysisLabels)
    .map(([status, label]) => ({
      status,
      label,
      count: current.filter((row) => row.status === status).length,
      color: analysisColor(status),
    }))
    .filter(
      (row) => row.count > 0 || (hasMl && row.status in mlAnalysisLabels),
    );
  if (noAnalysis)
    groups.push({
      status: "no_analysis",
      label: "Chưa có phân tích",
      count: noAnalysis,
      color: analysisColor("no_analysis"),
    });
  const categories = data.categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      count: products.filter((row) => row.category_id === category.id).length,
    }))
    .filter((row) => row.count > 0);
  const uncategorized = products.filter(
    (row) =>
      !data.categories.some((category) => category.id === row.category_id),
  ).length;
  if (uncategorized)
    categories.push({
      id: "none",
      name: "Chưa phân loại",
      count: uncategorized,
    });
  const priority = current
    .filter((row) => reviewIds.has(row.id))
    .sort((a, b) => {
      const aScore =
        a.priority_score === null || a.priority_score === undefined
          ? -1
          : Number(a.priority_score);
      const bScore =
        b.priority_score === null || b.priority_score === undefined
          ? -1
          : Number(b.priority_score);
      return bScore - aScore || (BigInt(a.id) < BigInt(b.id) ? -1 : 1);
    });
  const missingBasis = current.filter(
    (row) => row.reference_sold === null,
  ).length;
  return (
    <div className="live-overview">
      <div className="overview-source">
        <div>
          <strong>Tổng quan sản phẩm</strong>
          <p>{total} sản phẩm trong catalog</p>
        </div>
      </div>
      <div className="stats-grid six">
        <Stat
          label="Tổng số sản phẩm"
          value={total}
          suffix="sản phẩm"
          note="Trong toàn bộ catalog"
          icon="box"
        />
        <Stat
          label="Có mức tham chiếu"
          value={current.length - missingBasis}
          suffix="sản phẩm"
          note="Có giá trị tham chiếu đã lưu"
          tone="blue"
        />
        <Stat
          label="Cần rà soát"
          value={reviewIds.size}
          suffix="sản phẩm"
          note="Có đề xuất đang chờ duyệt hoặc thực hiện"
          tone="pink"
          icon="warning"
        />
        <Stat
          label="Chưa có mức tham chiếu"
          value={missingBasis + noAnalysis}
          suffix="sản phẩm"
          note={`${missingBasis} thiếu căn cứ · ${noAnalysis} chưa phân tích`}
          tone="gray"
          icon="info"
        />
        <Stat
          label="Đang thực hiện"
          value={actions.filter((row) => row.status === "in_progress").length}
          suffix="việc"
          note="Tiến độ công việc đã lưu"
          tone="blue"
          icon="clock"
        />
        <Stat
          label="Đề xuất cần duyệt"
          value={actions.filter((row) => row.status === "proposed").length}
          suffix="việc"
          note="Chờ xem bằng chứng và quyết định"
          tone="green"
          icon="check"
        />
      </div>
      <div className="grid-two overview-charts">
        <Panel
          title="Phân bố trạng thái phân tích"
          subtitle={`${current.length}/${total} sản phẩm có kết quả · Tỷ lệ trên ${total} sản phẩm đang xem`}
          action={
            <span className="tile-icon">
              <Icon name="chart" />
            </span>
          }
        >
          {!total ? (
            <Empty
              title="Chưa có sản phẩm"
              description="Dữ liệu sẽ xuất hiện sau khi sản phẩm được thêm vào catalog."
            />
          ) : (
            <div className="distribution" aria-label="Phân bố trạng thái">
              {groups.map((row) => (
                <div key={row.status} className="overview-status-row">
                  <div className="distribution-label">
                    <span>
                      <i
                        className="legend-dot"
                        style={{ background: row.color }}
                      />
                      {row.label}
                    </span>
                    <strong>
                      {row.count}{" "}
                      <small>
                        sản phẩm · {percent(row.count, total).toFixed(1)}%
                      </small>
                    </strong>
                  </div>
                  <div className="progress" aria-hidden="true">
                    <span
                      style={{
                        width: `${percent(row.count, total)}%`,
                        background: row.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="overview-footnote">
            Trạng thái mô tả kết quả phân tích, không phải tiến độ công việc.
            Thiếu dữ liệu không đồng nghĩa sản phẩm kém.
          </p>
        </Panel>
        <Panel
          title="Cơ cấu danh mục sản phẩm"
          subtitle="Số lượng và tỷ trọng trong nhóm đang xem"
          action={
            <span className="tile-icon pink">
              <Icon name="box" />
            </span>
          }
        >
          {!total ? (
            <Empty title="Chưa có danh mục để thống kê" />
          ) : (
            <div className="donut-layout overview-category-chart">
              <Donut
                total={total}
                label="SẢN PHẨM"
                segments={categories.map((category, index) => ({
                  value: category.count,
                  color: palette[index % palette.length],
                }))}
              />
              <div className="overview-category-legend">
                {categories.map((category, index) => (
                  <div className="overview-category-item" key={category.id}>
                    <span className="overview-category-name">
                      <i
                        className="legend-dot"
                        style={{ background: palette[index % palette.length] }}
                      />
                      {category.name}
                    </span>
                    <strong>
                      {category.count} <small>sản phẩm</small>
                    </strong>
                    <span className="overview-category-percent">
                      {percent(category.count, total).toFixed(0)}% danh mục
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>
      {hasMl && (
        <p className="overview-sample-note">
          <Icon name="info" size={17} />
          Kết quả thử nghiệm từ snapshot. Mẫu nhập để kiểm tra giao diện; tỷ lệ
          trên không đại diện toàn bộ thị trường.
        </p>
      )}
      <Panel
        title="Sản phẩm cần ưu tiên rà soát"
        subtitle={`${priority.length} sản phẩm có đề xuất đang mở · Hiển thị tối đa 8 sản phẩm theo điểm ưu tiên đã lưu`}
        action={
          <Link className="text-link" href={`/${role}/products`}>
            Xem danh mục <Icon name="arrow" size={16} />
          </Link>
        }
      >
        {!priority.length ? (
          <Empty
            title="Không có đề xuất đang mở"
            description="Chưa có đề xuất cần duyệt hoặc đang thực hiện trong nhóm dữ liệu này."
          />
        ) : (
          <div className="table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>SẢN PHẨM & MÃ SKU</th>
                    <th>DANH MỤC</th>
                    <th className="numeric">SỐ BÁN</th>
                    <th className="numeric">THAM CHIẾU</th>
                    <th>CHÊNH LỆCH</th>
                    <th>TRẠNG THÁI</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {priority.slice(0, 8).map((analysis) => {
                    const product = products.find(
                      (row) => row.id === analysis.product_id,
                    )!;
                    return (
                      <tr key={analysis.id}>
                        <td>
                          <ProductIdentity
                            name={product.name}
                            image={product.thumbnail_url}
                            detail={
                              analysis.product_type ??
                              data.categories.find(
                                (row) => row.id === product.category_id,
                              )?.name
                            }
                            code={productCode(product)}
                          />
                        </td>
                        <td>
                          {analysis.product_type ??
                            data.categories.find(
                              (row) => row.id === product.category_id,
                            )?.name ??
                            "Chưa phân loại"}
                        </td>
                        <td className="numeric">
                          {quantity(analysis.input_snapshot_json.quantity_sold)}
                        </td>
                        <td className="numeric">
                          {quantity(analysis.reference_sold)}
                        </td>
                        <td>
                          <Badge
                            tone={
                              analysis.sales_gap === null
                                ? "gray"
                                : Number(analysis.sales_gap) < 0
                                  ? "red"
                                  : "green"
                            }
                          >
                            {analysis.sales_gap === null
                              ? "—"
                              : `${Number(analysis.sales_gap) > 0 ? "+" : ""}${quantity(analysis.sales_gap)} đơn vị`}
                          </Badge>
                        </td>
                        <td>
                          <StatusBadge status={analysis.status} />
                        </td>
                        <td>
                          <Link
                            className="button subtle small"
                            href={`/${role}/analysis?product=${product.id}&analysis=${analysis.id}`}
                            aria-label={`Xem phân tích ${product.name}`}
                          >
                            <Icon name="eye" size={16} />
                            Phân tích
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>
      <Panel
        title="Đề xuất cải thiện đang theo dõi"
        subtitle="Hành động và bằng chứng gốc của kết quả đang xem"
        action={<Badge tone="gradient">{active.length} đề xuất đang mở</Badge>}
      >
        {!active.length ? (
          <Empty title="Chưa có công việc cần theo dõi" />
        ) : (
          <div className="grid-two">
            {active.slice(0, 4).map((action) => {
              const analysis = current.find(
                (row) => row.id === action.analysis_id,
              )!;
              const product = products.find(
                (row) => row.id === analysis.product_id,
              )!;
              return (
                <Link
                  className="work-card"
                  href={`/${role}/analysis?product=${product.id}&analysis=${analysis.id}`}
                  key={action.id}
                >
                  <div>
                    <span className="overview-work-type">
                      {typeLabels[action.type] ?? "Rà soát"}
                    </span>
                    <StatusBadge kind="action" status={action.status} />
                  </div>
                  <h3>{action.title}</h3>
                  <p>{product.name}</p>
                  {typeof action.original_suggestion_json.evidence ===
                    "string" && (
                    <p className="overview-work-evidence">
                      {action.original_suggestion_json.evidence}
                    </p>
                  )}
                  <span className="text-link">
                    Xem bằng chứng <Icon name="arrow" size={15} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
