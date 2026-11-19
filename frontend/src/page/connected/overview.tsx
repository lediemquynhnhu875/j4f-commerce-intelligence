"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { analysisColor } from "@/lib/status-colors";
import { Donut } from "@/components/charts/donut";
import { Badge, Empty, Icon, Panel, Stat } from "@/components/ui";
import { analysisLabels, mlAnalysisLabels } from "@/lib/api-client";
import type { StoreOverview } from "@/types/api";
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
const percent = (count: number, total: number) =>
  total ? (count / total) * 100 : 0;

export function LiveOverview({ overview }: { overview?: StoreOverview }) {
  const metrics = overview?.metrics;
  const total = metrics?.product_count ?? 0;
  const analyzed = metrics?.analyzed_product_count ?? 0;
  const referenced = metrics?.reference_product_count ?? 0;
  const reviewCount = metrics?.review_product_count ?? 0;
  const noAnalysis = total - analyzed;
  const missingBasis = analyzed - referenced;
  const hasMl = (metrics?.ml_product_count ?? 0) > 0;
  const groups = Object.entries(analysisLabels)
    .map(([status, label]) => ({
      status,
      label,
      count: metrics?.status_counts[status] ?? 0,
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

  const categories = overview?.categories ?? [];
  const priority = overview?.priority ?? [];
  const suggestions = overview?.suggestions ?? [];
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
          value={referenced}
          suffix="sản phẩm"
          note="Có giá trị tham chiếu đã lưu"
          tone="blue"
        />
        <Stat
          label="Cần rà soát"
          value={reviewCount}
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
          value={metrics?.in_progress_count ?? 0}
          suffix="việc"
          note="Tiến độ công việc đã lưu"
          tone="blue"
          icon="clock"
        />
        <Stat
          label="Đề xuất cần duyệt"
          value={metrics?.pending_review_count ?? 0}
          suffix="việc"
          note="Chờ xem bằng chứng và quyết định"
          tone="green"
          icon="check"
        />
      </div>
      <div className="grid-two overview-charts">
        <Panel
          title="Phân bố trạng thái phân tích"
          subtitle={`${analyzed}/${total} sản phẩm có kết quả · Tỷ lệ trên ${total} sản phẩm đang xem`}
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
        subtitle={`${reviewCount} sản phẩm có đề xuất đang mở · Hiển thị tối đa 8 sản phẩm theo điểm ưu tiên đã lưu`}
        action={
          <Link className="text-link" href="/user/products">
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
                  {priority.map((row) => (
                    <tr key={row.analysis_id}>
                      <td>
                        <ProductIdentity
                          name={row.name}
                          image={row.thumbnail_url}
                          detail={row.classification}
                          code={productCode(row)}
                        />
                      </td>
                      <td>{row.classification ?? "Chưa phân loại"}</td>
                      <td className="numeric">{quantity(row.observed_sold)}</td>
                      <td className="numeric">{quantity(row.reference_sold)}</td>
                      <td className="numeric">
                        <Badge tone={row.sales_gap === null ? "gray" : Number(row.sales_gap) < 0 ? "red" : "green"}>
                          {row.sales_gap === null
                            ? "—"
                            : `${Number(row.sales_gap) > 0 ? "+" : ""}${quantity(row.sales_gap)} đơn vị`}
                        </Badge>
                      </td>
                      <td><StatusBadge status={row.status} /></td>
                      <td>
                        <Link
                          className="button subtle small"
                          href={`/user/analysis?product=${row.id}&analysis=${row.analysis_id}`}
                          aria-label={`Xem phân tích ${row.name}`}
                        >
                          <Icon name="eye" size={16} />
                          Phân tích
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>
      <Panel
        title="Đề xuất cải thiện đang theo dõi"
        subtitle="Hành động và bằng chứng gốc của kết quả đang xem"
        action={<Badge tone="gradient">{metrics?.open_suggestion_count ?? 0} đề xuất đang mở</Badge>}
      >
        {!suggestions.length ? (
          <Empty title="Chưa có công việc cần theo dõi" />
        ) : (
          <div className="grid-two">
            {suggestions.map((action) => (
              <Link
                className="work-card"
                href={`/user/analysis?product=${action.product_id}&analysis=${action.analysis_id}`}
                key={action.id}
              >
                <div>
                  <span className="overview-work-type">
                    {typeLabels[action.type] ?? "Rà soát"}
                  </span>
                  <StatusBadge kind="action" status={action.status} />
                </div>
                <h3>{action.title}</h3>
                <p>{action.product_name}</p>
                {typeof action.evidence === "string" && (
                  <p className="overview-work-evidence">{action.evidence}</p>
                )}
                <span className="text-link">
                  Xem bằng chứng <Icon name="arrow" size={15} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
