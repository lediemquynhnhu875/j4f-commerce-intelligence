"use client";
import { useState } from "react";
import type { List, Store } from "@/types/api";
import { ErrorPopup } from "@/components/popup";
import {
  AdminListPagination,
  AdminListSearch,
  useAdminList,
} from "@/components/admin/admin-list";
import { Empty, Panel, Stat } from "@/components/ui";

import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { exportAdminWorkspace } from "@/lib/workspace-data";

export default function AdminStores() {
  const [refreshVersion, setRefreshVersion] = useState(0);
  return (
    <WorkspaceLayout
      page="stores"
      description="Quản trị hồ sơ cửa hàng và quyền sở hữu sản phẩm."
      onExport={exportAdminWorkspace}
      onRefresh={() => setRefreshVersion((version) => version + 1)}
    >
      <StoresList refreshVersion={refreshVersion} />
    </WorkspaceLayout>
  );
}

type StoreList = List<Store> & { totals: { stores: number; products: number } };

function StoresList({ refreshVersion }: { refreshVersion: number }) {
  const [sort, setSort] = useState("");
  const list = useAdminList<StoreList>("stores", refreshVersion, { sort });
  const stores = list.result?.data ?? [];
  const totals = list.result?.totals;
  return (
    <>
      <div className="stats-grid four">
        <Stat
          label="Tổng số cửa hàng"
          value={totals?.stores ?? "—"}
          note="Mỗi User có một cửa hàng"
        />
        <Stat
          label="Sản phẩm đã phân bổ"
          value={totals?.products ?? "—"}
          note="Dữ liệu đã gắn cửa hàng"
        />
      </div>
      <Panel
        title="Danh sách cửa hàng"
        subtitle="Mỗi tài khoản User sở hữu một cửa hàng. Dữ liệu được phân quyền theo chủ sở hữu."
      >
        <AdminListSearch
          label="Tìm theo tên hoặc mã cửa hàng"
          onSubmit={list.submitSearch}
        >
          <select
            aria-label="Sắp xếp theo số sản phẩm"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              list.setPage(1);
            }}
          >
            <option value="">Sắp xếp mặc định</option>
            <option value="products_desc">Nhiều sản phẩm nhất</option>
            <option value="products_asc">Ít sản phẩm nhất</option>
          </select>
        </AdminListSearch>
        {list.error && <ErrorPopup message={list.error} />}
        {!list.result && !list.error && <p role="status">Đang tải cửa hàng…</p>}
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
        {list.result && !stores.length && (
          <Empty title="Không tìm thấy cửa hàng" />
        )}
        {list.result && (
          <AdminListPagination
            page={list.page}
            total={list.result.pagination.total}
            onChange={list.setPage}
          />
        )}
      </Panel>
    </>
  );
}
