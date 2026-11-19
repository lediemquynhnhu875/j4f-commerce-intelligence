import { Badge, Empty, Panel } from "@/components/ui";
import type { SystemSummary } from "@/types/api";

export function RecentAnalyses({ rows }: { rows: SystemSummary["recent"] }) {
  return (
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
            {rows.map((row, index) => (
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
      {!rows.length && (
        <Empty
          title="Chưa có hoạt động phân tích"
          description="Hoạt động sẽ được hiển thị theo từng cửa hàng."
        />
      )}
    </Panel>
  );
}
