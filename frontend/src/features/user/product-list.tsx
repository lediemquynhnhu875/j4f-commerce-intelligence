"use client";
import { useState } from "react";
import Link from "next/link";
import { money, products, statusLabels } from "@/lib/preview-fixtures";
import { Badge, Empty, Icon, Panel } from "@/components/ui";
import { ProductCell, ProductBadge } from "@/components/products/product-cell";

export function ProductList({
  onAnalyze,
  compact = false,
}: {
  onAnalyze: (id: string) => void;
  compact?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const rows = (
    compact
      ? products.filter((p) => p.status === "review" || p.status === "watch")
      : products
  )
    .filter(
      (p) =>
        `${p.name} ${p.id}`
          .toLocaleLowerCase("vi")
          .includes(search.toLocaleLowerCase("vi")) &&
        (!category || p.category === category) &&
        (!status || p.status === status),
    )
    .sort((a, b) =>
      sort === "price"
        ? a.price - b.price
        : sort === "sales"
          ? b.sold - a.sold
          : 0,
    );
  const pageSize = 4;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = compact
    ? rows
    : rows.slice((page - 1) * pageSize, page * pageSize);
  function toggle(id: string) {
    setSelected(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  }
  return (
    <>
      {!compact && (
        <Panel className="filters">
          <div className="filter-search-row">
            <div className="search-field">
              <Icon name="search" size={18} />
              <input
                aria-label="Tìm sản phẩm"
                value={search}
                placeholder="Tìm theo SKU, tên sản phẩm…"
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <button
              className="button primary"
              disabled={!selected.length}
              onClick={() => onAnalyze(selected[0])}
            >
              <Icon name="sparkles" size={17} /> Xem phân tích đã chọn{" "}
              {selected.length > 0 && `(${selected.length})`}
            </button>
          </div>
          <div className="filter-row">
            <select
              aria-label="Danh mục sản phẩm"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Danh mục: Tất cả</option>
              {[...new Set(products.map((p) => p.category))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              aria-label="Trạng thái phân tích"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Trạng thái: Tất cả</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Sắp xếp sản phẩm"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="default">Sắp xếp: Mặc định</option>
              <option value="price">Giá: Thấp đến cao</option>
              <option value="sales">Số bán: Cao đến thấp</option>
            </select>
            <button
              className="button subtle"
              onClick={() => {
                setCategory("");
                setSearch("");
                setStatus("");
                setSort("default");
                setPage(1);
                setSelected([]);
              }}
            >
              <Icon name="refresh" size={16} />
              Đặt lại
            </button>
          </div>
        </Panel>
      )}
      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {!compact && (
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Chọn trang sản phẩm"
                      checked={
                        visible.length > 0 &&
                        visible.every((p) => selected.includes(p.id))
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [
                                ...new Set([
                                  ...selected,
                                  ...visible.map((p) => p.id),
                                ]),
                              ]
                            : selected.filter(
                                (id) => !visible.some((p) => p.id === id),
                              ),
                        )
                      }
                    />
                  </th>
                )}
                <th>SẢN PHẨM {compact ? "& MÃ SKU" : ""}</th>
                <th>DANH MỤC</th>
                <th className="numeric">
                  {compact ? "SỐ BÁN" : "GIÁ NIÊM YẾT"}
                </th>
                <th className="numeric">{compact ? "THAM CHIẾU" : "SỐ BÁN"}</th>
                <th>{compact ? "CHÊNH LỆCH" : "ĐÁNH GIÁ"}</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  {!compact && (
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${p.id}`}
                        checked={selected.includes(p.id)}
                        onChange={() => toggle(p.id)}
                      />
                    </td>
                  )}
                  <td>
                    <ProductCell product={p} />
                    <code className="sku-code">{p.id}</code>
                  </td>
                  <td>{p.category}</td>
                  <td className="numeric">
                    {compact ? p.sold : money(p.price)}
                  </td>
                  <td className="numeric">
                    {compact ? (p.reference ?? "—") : p.sold}
                  </td>
                  <td>
                    {compact ? (
                      <Badge
                        tone={
                          p.reference !== null && p.sold < p.reference
                            ? "red"
                            : "gray"
                        }
                      >
                        {p.reference === null
                          ? "—"
                          : `${p.sold - p.reference > 0 ? "+" : ""}${p.sold - p.reference} đơn vị`}
                      </Badge>
                    ) : (
                      <span className="rating">
                        {p.rating !== null ? (
                          <>
                            <Icon name="star" size={14} />
                            <strong>{p.rating.toFixed(1)}</strong>
                            <small>({p.reviews})</small>
                          </>
                        ) : (
                          "Chưa có dữ liệu"
                        )}
                      </span>
                    )}
                  </td>
                  <td>
                    <ProductBadge status={p.status} />
                  </td>
                  <td>
                    <Link
                      className="button subtle small"
                      href={`/preview/user/analysis?product=${p.id}`}
                      aria-label={`Xem phân tích ${p.id}`}
                    >
                      <Icon name="eye" size={16} />
                      {compact ? "Phân tích" : "Xem"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && <Empty />}
        {!compact && (
          <div className="table-footer">
            <span>
              Hiển thị{" "}
              {rows.length
                ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, rows.length)}`
                : "0"}{" "}
              / {rows.length} sản phẩm demo
            </span>
            <div className="pagination">
              <button
                aria-label="Trang trước"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                ‹
              </button>
              {Array.from({ length: pages }, (_, i) => (
                <button
                  aria-label={`Trang ${i + 1}`}
                  aria-current={page === i + 1 ? "page" : undefined}
                  className={page === i + 1 ? "active" : ""}
                  key={i}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                aria-label="Trang sau"
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
