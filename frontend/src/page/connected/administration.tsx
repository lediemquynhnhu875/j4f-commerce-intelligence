"use client";
import type { Dataset } from "@/types/api";
import { Empty, Panel, Stat } from "@/components/ui";

export function LiveStoresUnavailable({ data }: { data: Dataset }) {
  const stores = data.stores ?? [];
  return (
    <>
      <div className="stats-grid four">
        <Stat
          label="Tổng số cửa hàng"
          value={stores.length}
          note="Mỗi User có một cửa hàng"
        />
        <Stat
          label="Sản phẩm đã phân bổ"
          value={stores.reduce(
            (total, store) => total + (store.product_count ?? 0),
            0,
          )}
          note="Dữ liệu đã gắn cửa hàng"
        />
      </div>
      <Panel
        title="Danh sách cửa hàng"
        subtitle="Mỗi tài khoản User sở hữu một cửa hàng. Dữ liệu được phân quyền theo chủ sở hữu."
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>MÃ STORE</th>
                <th>TÊN CỬA HÀNG</th>
                <th>CHỦ SỞ HỮU</th>
                <th>SẢN PHẨM</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id}>
                  <td>#{store.id}</td>
                  <td>{store.name}</td>
                  <td>{store.owner?.full_name ?? store.owner_user_id}</td>
                  <td>{store.product_count ?? 0}</td>
                  <td>{store.is_active ? "Hoạt động" : "Tạm dừng"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!stores.length && <Empty title="Chưa có cửa hàng" />}
      </Panel>
    </>
  );
}
