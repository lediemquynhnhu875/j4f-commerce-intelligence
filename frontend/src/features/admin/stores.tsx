"use client";
import { useState, type FormEvent } from "react";
import { stores } from "@/lib/preview-fixtures";
import { Badge, Empty, Icon, Modal, Panel, Stat } from "@/components/ui";
export function StoresView({ notify }: { notify: (text: string) => void }) {
  const [items, setItems] = useState(stores);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(stores[0].id);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [error, setError] = useState("");
  const current = items.find((s) => s.id === selected)!;
  const rows = items.filter(
    (s) =>
      `${s.name} ${s.id} ${s.owner}`
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")) &&
      (!filter || (filter === "active" ? s.active : !s.active)),
  );
  function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !owner.trim()) {
      setError("Vui lòng nhập tên cửa hàng và chủ sở hữu.");
      return;
    }
    if (items.some((s) => s.name.toLowerCase() === name.trim().toLowerCase())) {
      setError("Tên cửa hàng demo đã tồn tại.");
      return;
    }
    const store = {
      id: `STORE-${String(items.length + 1).padStart(3, "0")}`,
      name: name.trim(),
      owner: owner.trim(),
      category: "Danh mục mới",
      sku: 0,
      runs: 0,
      actions: 0,
      active: true,
    };
    setItems([...items, store]);
    setSelected(store.id);
    setModal(false);
    setName("");
    setOwner("");
    setError("");
    notify("Đã thêm cửa hàng demo. Chưa tạo cửa hàng hay tài khoản thật.");
  }
  return (
    <>
      <div className="stats-grid four">
        <Stat
          label="Tổng số cửa hàng"
          value={items.length}
          note="Các cửa hàng demo"
          icon="store"
        />
        <Stat
          label="SKU đã phân phối"
          value={items.reduce((n, s) => n + s.sku, 0)}
          note="Số lượng tổng hợp fixture"
          icon="box"
        />
        <Stat
          label="Lượt phân tích DSS"
          value={items.reduce((n, s) => n + s.runs, 0)}
          note="Lịch sử tổng hợp minh họa"
        />
        <Stat
          label="Cải thiện cần xử lý"
          value={items.reduce((n, s) => n + s.actions, 0)}
          note="Chưa kết nối workflow thật"
          tone="pink"
          icon="check"
        />
      </div>
      <Panel className="filters">
        <div className="filter-row">
          <div className="search-field">
            <Icon name="search" size={17} />
            <input
              aria-label="Tìm cửa hàng"
              placeholder="Tìm tên cửa hàng, Store ID, chủ sở hữu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Trạng thái cửa hàng"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Trạng thái: Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm dừng</option>
          </select>
          <button className="button primary" onClick={() => setModal(true)}>
            <Icon name="plus" size={17} />
            Thêm cửa hàng demo
          </button>
        </div>
      </Panel>
      <Panel
        title="Danh sách cửa hàng đối tác"
        action={
          <Badge>
            {rows.length} / {items.length} hiển thị
          </Badge>
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>MÃ STORE</th>
                <th>TÊN CỬA HÀNG</th>
                <th>CHỦ SỞ HỮU</th>
                <th className="numeric">SKU</th>
                <th className="numeric">DSS RUN</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr
                  key={s.id}
                  className={selected === s.id ? "selected-row" : ""}
                >
                  <td>
                    <code>{s.id}</code>
                  </td>
                  <td>
                    <strong>{s.name}</strong>
                    <small>{s.category}</small>
                  </td>
                  <td>
                    <div className="owner-cell">
                      <span className="small-avatar">
                        {s.owner
                          .split(" ")
                          .slice(-2)
                          .map((n) => n[0])
                          .join("")}
                      </span>
                      {s.owner}
                    </div>
                  </td>
                  <td className="numeric">{s.sku}</td>
                  <td className="numeric">{s.runs}</td>
                  <td>
                    <Badge tone={s.active ? "green" : "amber"}>
                      {s.active ? "Hoạt động" : "Tạm dừng"}
                    </Badge>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`Xem ${s.name}`}
                      onClick={() => setSelected(s.id)}
                    >
                      <Icon name="eye" size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty />}
      </Panel>
      <Panel
        title={current.name}
        subtitle={`${current.id} · Thông tin cửa hàng minh họa`}
        action={
          <Badge tone={current.active ? "green" : "amber"}>
            {current.active ? "Hoạt động" : "Tạm dừng"}
          </Badge>
        }
      >
        <div className="notice">
          <Icon name="shield" />
          <span>
            UI quản lý cửa hàng: quyền sở hữu và cô lập dữ liệu trên server chưa
            triển khai. Thao tác chỉ đổi fixture trên trang.
          </span>
        </div>
        <div className="grid-two store-details">
          <div className="tinted">
            <small>Chủ cửa hàng</small>
            <h3>{current.owner}</h3>
            <p>Vai trò: Chủ cửa hàng · Một cửa hàng / User</p>
            <Badge>Hồ sơ tổng hợp</Badge>
          </div>
          <div className="tinted">
            <small>Danh mục & Hoạt động</small>
            <h3>
              {current.sku} SKU · {current.runs} lượt phân tích
            </h3>
            <p>{current.category}</p>
            <Badge tone="blue">{current.actions} đề xuất theo dõi</Badge>
          </div>
        </div>
        <div className="panel-bottom">
          <span className="muted">Thay đổi demo sẽ mất khi tải lại trang.</span>
          <button
            className={`button ${current.active ? "danger" : "primary"}`}
            onClick={() => {
              setItems(
                items.map((s) =>
                  s.id === current.id ? { ...s, active: !s.active } : s,
                ),
              );
              notify(
                current.active
                  ? "Đã tạm dừng cửa hàng trong demo."
                  : "Đã kích hoạt cửa hàng trong demo.",
              );
            }}
          >
            {current.active ? "Tạm dừng cửa hàng" : "Kích hoạt cửa hàng"}
          </button>
        </div>
      </Panel>
      {modal && (
        <Modal
          title="Thêm cửa hàng demo"
          onClose={() => {
            setModal(false);
            setError("");
          }}
        >
          <form onSubmit={add}>
            <p className="muted">
              Không tạo tài khoản đăng nhập hoặc ghi vào database.
            </p>
            <label htmlFor="store-name">Tên cửa hàng</label>
            <input
              id="store-name"
              value={name}
              maxLength={200}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Tên cửa hàng minh họa"
            />
            <label htmlFor="store-owner">Chủ sở hữu</label>
            <input
              id="store-owner"
              value={owner}
              maxLength={200}
              onChange={(e) => setOwner(e.target.value)}
              required
              placeholder="Họ và tên minh họa"
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button subtle"
                onClick={() => setModal(false)}
              >
                Hủy
              </button>
              <button className="button primary" type="submit">
                Thêm cửa hàng
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
