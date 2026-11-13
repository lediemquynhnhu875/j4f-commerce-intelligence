"use client";
import type { Dataset } from "@/types/api";
import { Badge, Empty, Panel, Stat } from "@/components/ui";

export function AdminSystem({
  data,
  configuration = false,
}: {
  data: Dataset;
  configuration?: boolean;
}) {
  const summary = data.systemSummary;
  if (!summary)
    return (
      <Empty
        title="Chưa tải được số liệu hệ thống"
        description="Bấm Tải lại để thử lại."
      />
    );
  if (configuration)
    return (
      <Panel title="Phiên bản mô hình đã sử dụng">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>MÔ HÌNH</th>
                <th>PIPELINE</th>
                <th>TAXONOMY</th>
                <th>SỬ DỤNG GẦN NHẤT</th>
              </tr>
            </thead>
            <tbody>
              {summary.versions.map((version, index) => (
                <tr key={index}>
                  <td>{version.model_version ?? "Chưa ghi nhận"}</td>
                  <td>{version.pipeline_version}</td>
                  <td>{version.taxonomy_version ?? "Chưa ghi nhận"}</td>
                  <td>{new Date(version.last_used).toLocaleString("vi-VN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!summary.versions.length && <Empty title="Chưa ghi nhận phiên bản" />}
      </Panel>
    );
  return (
    <>
      <div className="stats-grid four">
        <Stat
          label="Tổng tài khoản"
          value={summary.accounts}
          note="Các tài khoản trong hệ thống"
          icon="users"
        />
        <Stat
          label="Đang hoạt động"
          value={summary.active_accounts}
          note={`${summary.accounts - summary.active_accounts} tài khoản bị khóa`}
          icon="shield"
        />
        <Stat
          label="Tổng cửa hàng"
          value={summary.stores}
          note="Mỗi tài khoản User có một cửa hàng"
          icon="store"
        />
        <Stat
          label="Sản phẩm đã tải lên"
          value={summary.products}
          note="Tổng hợp toàn hệ thống"
          icon="box"
        />
        <Stat
          label="Yêu cầu phân tích"
          value={summary.analysis_requests ?? "—"}
          note="Chưa triển khai tác vụ phân tích theo yêu cầu"
        />
        <Stat
          label="Đang phân tích"
          value={summary.running_requests ?? "—"}
          note="Chưa có dữ liệu tác vụ trực tiếp"
          icon="clock"
        />
        <Stat
          label="Kết quả đã lưu"
          value={summary.saved_results}
          note="Các kết quả phân tích đã được nhập"
        />
      </div>
      <Panel
        title="Hoạt động phân tích gần nhất"
        subtitle="Các đợt kết quả đã lưu theo cửa hàng. Tác vụ chạy trực tiếp đang chờ tích hợp ML."
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>CỬA HÀNG</th>
                <th>SỐ SẢN PHẨM</th>
                <th>THỜI ĐIỂM</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {summary.recent.map((row, index) => (
                <tr key={`${row.store_id}-${index}`}>
                  <td>{row.store_name}</td>
                  <td>{row.product_count}</td>
                  <td>{new Date(row.completed_at).toLocaleString("vi-VN")}</td>
                  <td>
                    <Badge tone="green">Đã lưu kết quả</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!summary.recent.length && (
          <Empty
            title="Chưa có hoạt động phân tích"
            description="Hoạt động sẽ được hiển thị theo từng cửa hàng."
          />
        )}
      </Panel>
    </>
  );
}
