"use client";
import { useState } from "react";
import { jobs, stores } from "@/lib/preview-fixtures";
import {
  Badge,
  Empty,
  Icon,
  Panel,
  Stat,
  downloadFixture,
} from "@/components/ui";
import { ProductCell } from "@/components/products/product-cell";
export function MonitorView({ notify }: { notify: (text: string) => void }) {
  const [selected, setSelected] = useState(jobs[0]);
  const [store, setStore] = useState("");
  const [status, setStatus] = useState("");
  const rows = jobs.filter(
    (j) =>
      (!store || j.store === store) &&
      (!status || (status === "failed" ? j.failed : !j.failed)),
  );
  return (
    <>
      <div className="stats-grid four">
        <Stat
          label="Lượt chạy minh họa"
          value="5"
          suffix="lượt"
          note="Không phải live pipeline"
        />
        <Stat
          label="Độ trễ minh họa"
          value="1.84"
          suffix="s / SKU"
          note="Không phải benchmark thực tế"
          tone="blue"
          icon="clock"
        />
        <Stat
          label="Hoàn thành kỹ thuật"
          value="80%"
          note="4/5 bản ghi fixture"
          tone="green"
          icon="check"
        />
        <Stat
          label="Tác vụ lỗi"
          value="1"
          note="Ví dụ timeout trong fixture"
          tone="pink"
          icon="warning"
        />
      </div>
      <Panel className="filters">
        <div className="filter-row">
          <Badge tone="purple">Snapshot demo · 24/10/2024</Badge>
          <select
            aria-label="Cửa hàng tác vụ"
            value={store}
            onChange={(e) => setStore(e.target.value)}
          >
            <option value="">Cửa hàng: Tất cả</option>
            {stores.slice(0, 4).map((s) => (
              <option key={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            aria-label="Trạng thái tác vụ"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Kỹ thuật: Tất cả</option>
            <option value="success">Thành công</option>
            <option value="failed">Thất bại</option>
          </select>
          <button
            className="button subtle"
            onClick={() => {
              setStatus("");
              setStore("");
              notify("Đã đặt lại bộ lọc demo. Chưa truy vấn pipeline thật.");
            }}
          >
            <Icon name="refresh" size={16} />
            Làm mới
          </button>
        </div>
      </Panel>
      <div className="monitor-grid">
        <Panel
          title="Danh sách lượt phân tích"
          subtitle="Chọn tác vụ để xem log minh họa"
          action={<Badge>{rows.length} jobs</Badge>}
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>JOB ID</th>
                  <th>CỬA HÀNG & SẢN PHẨM</th>
                  <th>THỜI GIAN</th>
                  <th>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((j) => (
                  <tr
                    key={j.id}
                    className={selected.id === j.id ? "selected-row" : ""}
                  >
                    <td>
                      <button
                        className="text-link"
                        onClick={() => setSelected(j)}
                        aria-label={`Xem ${j.id}`}
                      >
                        {j.id}
                      </button>
                      <small>Baseline demo v2.4</small>
                    </td>
                    <td>
                      <small>{j.store}</small>
                      <ProductCell product={j.product} />
                    </td>
                    <td className="mono">
                      {j.time}
                      <small>{j.duration} s</small>
                    </td>
                    <td>
                      <Badge tone={j.failed ? "red" : "green"}>
                        {j.failed ? "Timeout" : "Thành công"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <Empty />}
          <div className="table-footer">
            {rows.length} tác vụ fixture · Không tự cập nhật từ server
          </div>
        </Panel>
        <Panel
          title={`Log Panel: ${selected.id}`}
          className="log-panel"
          action={
            <button
              className="icon-button"
              aria-label="Tải log demo"
              onClick={() => downloadFixture(selected.id, selected)}
            >
              <Icon name="download" size={18} />
            </button>
          }
        >
          <ProductCell product={selected.product} />
          <div className="log-step">
            <span className="eyebrow">01 · INPUT SNAPSHOT</span>
            <pre>
              {JSON.stringify(
                {
                  product_id: selected.product.id,
                  price: selected.product.price,
                  quantity_sold: selected.product.sold,
                  rating_average: selected.product.rating,
                },
                null,
                2,
              )}
            </pre>
          </div>
          {selected.failed ? (
            <div className="notice error-notice">
              <Icon name="warning" />
              <div>
                <strong>Timeout (fixture)</strong>
                <p>
                  Không có kết quả suy luận cho tác vụ lỗi. Không gán kết luận.
                </p>
                <button
                  className="button subtle small"
                  onClick={() =>
                    notify(
                      "Đã mô phỏng thử lại. Job giữ trạng thái lỗi; chưa có backend xử lý.",
                    )
                  }
                >
                  Mô phỏng thử lại
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="log-step">
                <span className="eyebrow">02 · NHÓM ĐỐI CHIẾU</span>
                <div className="tinted">
                  <h3>{selected.product.category}</h3>
                  <p>
                    42 SKU tổng hợp minh họa. Phạm vi snapshot, không phải dự
                    báo.
                  </p>
                </div>
              </div>
              <div className="log-step">
                <span className="eyebrow">03 · THAM CHIẾU VS QUAN SÁT</span>
                <div className="log-metrics">
                  <div>
                    <small>Tham chiếu</small>
                    <strong>{selected.product.reference ?? "—"}</strong>
                  </div>
                  <div>
                    <small>Quan sát</small>
                    <strong>{selected.product.sold}</strong>
                  </div>
                  <div>
                    <small>Khoảng cách</small>
                    <strong>
                      {selected.product.reference === null
                        ? "—"
                        : selected.product.reference - selected.product.sold}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="log-step">
                <span className="eyebrow">04 · GHI CHÚ SUY LUẬN</span>
                <div className="notice">
                  <Icon name="info" />
                  <span>
                    Log là synthetic fixtures. Chưa gọi FastAPI hay kiểm chứng
                    mô hình.
                  </span>
                </div>
              </div>
            </>
          )}
          <button
            className="button primary"
            onClick={() =>
              notify(
                `Đã chọn ${selected.product.id}. Admin xem log demo; phân tích chi tiết thuộc không gian User.`,
              )
            }
          >
            <Icon name="eye" size={17} />
            Xem ghi chú sản phẩm
          </button>
        </Panel>
      </div>
    </>
  );
}
