"use client";
import Link from "next/link";
import { products, statusLabels, suggestions } from "@/lib/preview-fixtures";
import { Badge, Icon, Panel, Stat } from "@/components/ui";
import { ProductList } from "./product-list";
import { Donut } from "@/components/charts/donut";

export function Overview({ onAnalyze }: { onAnalyze: (id: string) => void }) {
  const grouped = ["good", "insufficient", "review", "zero", "watch"] as const;
  return (
    <>
      <div className="stats-grid six">
        <Stat
          label="Tổng số sản phẩm"
          value="6"
          suffix="SKU"
          note="100% danh mục demo"
          icon="box"
        />
        <Stat
          label="Có cơ sở tham chiếu"
          value="5"
          suffix="SKU"
          note="83.3% fixture minh họa"
          tone="blue"
        />
        <Stat
          label="Cần rà soát"
          value="2"
          suffix="SKU"
          note="Ưu tiên kiểm tra bằng chứng"
          tone="pink"
          icon="warning"
        />
        <Stat
          label="Chưa đủ cơ sở"
          value="1"
          suffix="SKU"
          note="Không suy đoán kết luận"
          tone="gray"
          icon="info"
        />
        <Stat
          label="Đang thực hiện"
          value="1"
          suffix="việc"
          note="Tiến độ demo"
          tone="blue"
          icon="clock"
        />
        <Stat
          label="Đề xuất cần duyệt"
          value="2"
          suffix="việc"
          note="Chờ quyết định của bạn"
          tone="green"
          icon="check"
        />
      </div>
      <div className="grid-two overview-charts">
        <Panel
          title="Phân bố trạng thái phân tích DSS"
          subtitle="6 SKU tại thời điểm snapshot minh họa"
          action={
            <span className="tile-icon">
              <Icon name="chart" />
            </span>
          }
        >
          <div className="distribution">
            {grouped.map((status, i) => {
              const count = products.filter((p) => p.status === status).length;
              return (
                <div key={status}>
                  <div className="distribution-label">
                    <span>
                      <i className={`legend-dot tone-${status}`} />
                      {statusLabels[status]}
                    </span>
                    <strong>
                      {count} SKU{" "}
                      <small>({((count / 6) * 100).toFixed(1)}%)</small>
                    </strong>
                  </div>
                  <div className="progress">
                    <span
                      className={`segment-${i}`}
                      style={{ width: `${(count / 6) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel
          title="Cơ cấu danh mục sản phẩm"
          subtitle="Tỷ trọng SKU trong kho Juno Official"
          action={
            <span className="tile-icon pink">
              <Icon name="box" />
            </span>
          }
        >
          <div className="donut-layout">
            <Donut
              total={6}
              label="TỔNG SKU"
              segments={[
                { value: 3, color: "url(#donut-gradient)" },
                { value: 3, color: "#6366f1" },
              ]}
            />
            <div className="donut-legend">
              <div className="tinted">
                <i className="dot" /> Giày dép<strong>3 SKU</strong>
                <small>50% danh mục</small>
              </div>
              <div className="tinted">
                <i className="dot blue" /> Túi & Phụ kiện<strong>3 SKU</strong>
                <small>50% danh mục</small>
              </div>
            </div>
          </div>
        </Panel>
      </div>
      <Panel
        title="Sản phẩm cần ưu tiên rà soát"
        subtitle="Đối chiếu số bán quan sát với tham chiếu của nhóm minh họa"
        action={
          <Link className="text-link" href="/preview/user/products">
            Xem danh mục
            <Icon name="arrow" size={16} />
          </Link>
        }
      >
        <ProductList compact onAnalyze={onAnalyze} />
      </Panel>
      <Panel
        title="Đề xuất cải thiện đang theo dõi"
        subtitle="Giả thuyết cần kiểm chứng; không đảm bảo tăng doanh số"
        action={<Badge tone="gradient">4 đề xuất demo</Badge>}
      >
        <div className="grid-two">
          {suggestions.map((s, i) => (
            <Link
              href="/preview/user/suggestions"
              className="work-card"
              key={s.id}
            >
              <div>
                <code>{s.productId}</code>
                <Badge tone={i < 2 ? "pink" : "blue"}>
                  {s.state === "pending" ? "Chờ duyệt" : "Đang theo dõi"}
                </Badge>
              </div>
              <h3>{s.title}</h3>
              <p>
                Tiến độ minh họa <strong>{[0, 0, 40, 15][i]}%</strong>
              </p>
              <div className="progress">
                <span style={{ width: `${[0, 0, 40, 15][i]}%` }} />
              </div>
            </Link>
          ))}
        </div>
      </Panel>
    </>
  );
}
