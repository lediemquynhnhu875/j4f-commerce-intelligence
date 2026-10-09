"use client";
import Link from "next/link";
import { DEMO_ACCOUNTS, stores, jobs } from "@/lib/preview-fixtures";
import { Badge, Icon, Panel, Stat } from "@/components/ui";
import { Donut } from "@/components/charts/donut";
export function AdminOverview() {
  return (
    <>
      <div className="stats-grid four">
        <Stat
          label="Tổng tài khoản demo"
          value={DEMO_ACCOUNTS.length}
          note="1 Admin / 1 Chủ cửa hàng"
          icon="users"
        />
        <Stat
          label="Tài khoản hoạt động"
          value="2"
          note="Tài khoản tổng hợp minh họa"
          tone="blue"
          icon="shield"
        />
        <Stat
          label="Tổng cửa hàng"
          value={stores.length}
          note="4 hoạt động / 1 tạm dừng"
          icon="store"
        />
        <Stat
          label="Catalog sản phẩm"
          value={stores.reduce((n, s) => n + s.sku, 0)}
          suffix="SKU"
          note="Số đếm fixture, không phải DB"
          icon="box"
        />
        <Stat
          label="Lượt phân tích demo"
          value={jobs.length}
          note="5 bản ghi tổng hợp"
        />
        <Stat
          label="Tác vụ thành công"
          value="4"
          note="Trạng thái kỹ thuật minh họa"
          tone="green"
          icon="check"
        />
        <Stat
          label="Phân tích lỗi"
          value="1"
          note="Ví dụ timeout, chưa chạy inference"
          tone="pink"
          icon="warning"
        />
        <Stat
          label="Chưa đủ cơ sở"
          value="1"
          note="Fixture thiếu tham chiếu"
          tone="blue"
          icon="info"
        />
      </div>
      <div className="admin-chart-grid">
        <Panel
          title="Lượt phân tích 7 ngày qua"
          subtitle="Biểu đồ tổng hợp để xem giao diện"
          action={<Badge>DEMO</Badge>}
        >
          <div className="bar-chart">
            {[18, 21, 17, 24, 22, 18, 5].map((v, i) => (
              <div key={i}>
                <strong>{v}</strong>
                <span style={{ height: `${(v / 24) * 145}px` }} />
                <small>{i === 6 ? "Snapshot" : `${18 + i}/10`}</small>
              </div>
            ))}
          </div>
          <div className="tinted chart-note">
            <Icon name="info" size={16} /> Dữ liệu minh họa · Không phải live
            log
          </div>
        </Panel>
        <Panel
          title="Phân bố kết quả DSS"
          subtitle="6 sản phẩm demo, chưa chạy inference"
        >
          <Donut
            total={6}
            label="SKU DEMO"
            segments={[
              { value: 2, color: "#8b5cf6" },
              { value: 2, color: "#60a5fa" },
              { value: 1, color: "#d8b4fe" },
              { value: 1, color: "#f43f5e" },
            ]}
          />
          <div className="compact-legend">
            {[
              ["Cần rà soát", 2],
              ["Đạt / Theo dõi", 2],
              ["Chưa đủ cơ sở", 1],
              ["Số bán bằng 0", 1],
            ].map(([name, n], i) => (
              <div key={name}>
                <span>
                  <i className={`legend-dot segment-${i}`} />
                  {name}
                </span>
                <strong>{n} SKU</strong>
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Cơ cấu ngành hàng"
          subtitle="Phân bố tổng hợp của fixture"
        >
          <div className="distribution">
            {[
              ["Giày dép thời trang", 38],
              ["Túi & Balo", 26],
              ["Phụ kiện thời trang", 22],
              ["Khác", 14],
            ].map(([name, n], i) => (
              <div key={name}>
                <div className="distribution-label">
                  <span>{name}</span>
                  <strong>{n}%</strong>
                </div>
                <div className="progress">
                  <span className={`segment-${i}`} style={{ width: `${n}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="tinted chart-note">Các tỷ trọng chỉ minh họa.</div>
        </Panel>
      </div>
      <Panel
        title="Tình trạng hạ tầng kỹ thuật"
        subtitle="Không thực hiện health check trong bản UI demo"
        action={
          <Link className="button subtle small" href="/preview/admin/monitor">
            Xem giám sát
            <Icon name="arrow" size={15} />
          </Link>
        }
      >
        <div className="context-grid">
          {[
            "Next.js Web API",
            "PostgreSQL trên Neon",
            "Python / FastAPI",
            "ML Pipeline",
          ].map((name) => (
            <div className="tinted" key={name}>
              <strong>{name}</strong>
              <Badge tone="gray">Chưa kết nối</Badge>
              <small>Chưa kiểm chứng runtime / kết nối</small>
            </div>
          ))}
        </div>
      </Panel>
      <Panel
        title="Nhật ký & Hoạt động gần nhất"
        subtitle="Sự kiện tổng hợp minh họa, không phải lịch sử kiểm toán thật"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>THỜI GIAN</th>
                <th>LOẠI SỰ KIỆN</th>
                <th>ĐỐI TƯỢNG</th>
                <th>NỘI DUNG</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "14:30:12",
                  "Phân tích DSS",
                  "SP-88421",
                  "Hiển thị kết quả fixture",
                  "Thành công",
                ],
                [
                  "14:28:45",
                  "Cập nhật nội dung",
                  "Juno Official Store",
                  "Rà soát bảng kích thước minh họa",
                  "Chờ duyệt",
                ],
                [
                  "14:15:33",
                  "Lỗi tác vụ",
                  "JOB-8917",
                  "Ví dụ timeout phân tích",
                  "Thất bại",
                ],
                [
                  "11:20:14",
                  "Cấu hình mô hình",
                  "Baseline v2.4",
                  "Phiên bản mặc định UI preview",
                  "Minh họa",
                ],
              ].map((row, i) => (
                <tr key={i}>
                  <td className="mono">
                    {row[0]}
                    <small>24/10/2024</small>
                  </td>
                  <td>
                    <Badge tone={i === 2 ? "red" : "purple"}>{row[1]}</Badge>
                  </td>
                  <td>{row[2]}</td>
                  <td>{row[3]}</td>
                  <td>
                    <Badge tone={i === 2 ? "red" : i === 0 ? "green" : "gray"}>
                      {row[4]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
