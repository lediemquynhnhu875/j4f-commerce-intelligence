"use client";
import { ErrorPopup } from "@/components/popup";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { analysisColor } from "@/lib/status-colors";
import { useRouter } from "next/navigation";
import {
  allPages,
  api,
  analysisLabels,
  display,
  price,
} from "@/lib/api-client";
import type { CatalogProduct, Category, List, Product } from "@/types/api";
import { Empty, Icon, Panel } from "@/components/ui";
import { ProductIdentity } from "@/components/products/product-identity";
import { productCode } from "@/lib/analysis-presentation";
import { ImportProducts } from "@/components/products/import-products";
import { mlAnalysisLabels } from "@/lib/api-client";

import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { useWorkspaceData } from "@/lib/use-workspace-data";
import { loadWorkspaceSummary } from "@/lib/workspace-data";

async function loadCatalogHeader(signal: AbortSignal) {
  const [summary, categories] = await Promise.all([
    loadWorkspaceSummary(signal),
    allPages<Category>("categories", signal, 100),
  ]);
  return { summary, categories };
}

export default function UserProduct() {
  const { data, loading, error, refresh, refreshVersion } =
    useWorkspaceData(loadCatalogHeader);
  return (
    <WorkspaceLayout
      page="products"
      description="Quản lý danh mục và đối chiếu tín hiệu quan sát từ snapshot."
      storeName={data?.summary.store_name}
      suggestionCount={data?.summary.proposed_count}
      latestResult={data?.summary.latest_analyzed_at ?? null}
      loading={loading}
      error={error}
      canExport={Boolean(data)}
      onExport={() => allPages<Product>("products", undefined, 100)}
      onRefresh={refresh}
    >
      <Catalog
        categories={data?.categories ?? []}
        legacyStatuses={data?.summary.legacy_statuses ?? []}
        refresh={refresh}
        refreshVersion={refreshVersion}
      />
    </WorkspaceLayout>
  );
}

function Catalog({
  categories,
  legacyStatuses,
  refresh,
  refreshVersion,
}: {
  categories: Category[];
  legacyStatuses: string[];
  refresh: () => void;
  refreshVersion: number;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("");
  const [analysableOnly, setAnalysableOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const query = new URLSearchParams({
    view: "catalog",
    page: String(page),
    limit: String(pageSize),
  });
  if (search) query.set("search", search);
  if (category) query.set("category_id", category);
  if (status) query.set("status", status);
  if (sort) query.set("sort", sort);
  if (analysableOnly) query.set("concluded_only", "true");
  const path = `products?${query}`;
  type CatalogPage = List<CatalogProduct> & { undecided_count: number };
  const [result, setResult] = useState<{ path: string; value: CatalogPage }>();
  const [failure, setFailure] = useState<{ path: string; message: string }>();
  useEffect(() => {
    const controller = new AbortController();
    // Wait for typing to settle before querying the complete store catalog.
    const timeout = setTimeout(
      () => {
        void api<CatalogPage>(path, { signal: controller.signal })
          .then((value) => {
            if (controller.signal.aborted) return;
            const lastPage = Math.max(
              1,
              Math.ceil(value.pagination.total / pageSize),
            );
            if (page > lastPage) {
              setPage(lastPage);
              return;
            }
            setResult({ path, value });
            setFailure(undefined);
          })
          .catch((err: Error) => {
            if (!controller.signal.aborted)
              setFailure({ path, message: err.message });
          });
      },
      search ? 250 : 0,
    );
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [path, page, pageSize, search, refreshVersion]);

  const current = result?.path === path ? result.value : undefined;
  const error = failure?.path === path ? failure.message : "";
  const visible = current?.data ?? [];
  const total = current?.pagination.total ?? 0;
  const undecidedCount = current?.undecided_count ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const activePage = page;
  const pageNumbers = [
    ...new Set([1, activePage - 1, activePage, activePage + 1, pages]),
  ]
    .filter((number) => number >= 1 && number <= pages)
    .sort((a, b) => a - b);
  return (
    <>
      {error && <ErrorPopup message={error} />}
      <Panel className="filters catalog-filters">
        <div className="filter-search-row">
          <div className="search-field">
            <Icon name="search" />
            <input
              aria-label="Tìm sản phẩm"
              placeholder="Tìm theo mã, tên sản phẩm…"
              maxLength={200}
              value={search}
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
            />
          </div>
          <ImportProducts refresh={refresh} />
          <label>
            Số sản phẩm mỗi trang
            <select
              aria-label="Số sản phẩm mỗi trang"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button primary"
            disabled={!selected.length}
            onClick={() => router.push(`/user/analysis?product=${selected[0]}`)}
          >
            <Icon name="sparkles" size={17} />
            Xem phân tích đã chọn{" "}
            {selected.length > 0 && `(${selected.length})`}
          </button>
        </div>
        <div className="filter-row">
          <select
            aria-label="Danh mục sản phẩm"
            value={category}
            onChange={(event) => {
              setCategory(event.currentTarget.value);
              setPage(1);
            }}
          >
            <option value="">Danh mục: Tất cả</option>
            {categories.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Trạng thái phân tích"
            style={status ? { color: analysisColor(status) } : undefined}
            value={status}
            onChange={(event) => {
              setStatus(event.currentTarget.value);
              setPage(1);
            }}
          >
            <option value="">Trạng thái: Tất cả</option>
            <option value="no_analysis">Chưa có phân tích</option>
            {legacyStatuses
              .filter(
                (key) =>
                  !(key in mlAnalysisLabels) &&
                  key !== "no_analysis" &&
                  key !== "unanalyzed",
              )
              .map((key) => (
                <option key={key} value={key}>
                  {analysisLabels[key] ?? key}
                </option>
              ))}
            {Object.entries(mlAnalysisLabels).map(([key, label]) => (
              <option
                key={key}
                value={key}
                style={{ color: analysisColor(key) }}
              >
                {label}
              </option>
            ))}
          </select>
          <button
            className="button subtle"
            onClick={() => {
              setSearch("");
              setCategory("");
              setStatus("");
              setSort("");
              setSelected([]);
              setAnalysableOnly(false);
              setPage(1);
            }}
          >
            Đặt lại
          </button>
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={analysableOnly}
              onChange={(event) => {
                setAnalysableOnly(event.currentTarget.checked);
                setPage(1);
              }}
            />
            Chỉ hiện sản phẩm đã phân tích được
            {undecidedCount > 0 && (
              <span className="muted"> ({undecidedCount} chưa đủ cơ sở)</span>
            )}
          </label>
          <select
            aria-label="Sắp xếp sản phẩm"
            value={sort}
            onChange={(event) => {
              setSort(event.currentTarget.value);
              setPage(1);
            }}
          >
            <option value="">Sắp xếp: Mặc định</option>
            <option value="price">Giá: Thấp đến cao</option>
            <option value="sales">Số bán: Cao đến thấp</option>
          </select>
        </div>
      </Panel>
      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Chọn trang sản phẩm"
                    checked={
                      visible.length > 0 &&
                      visible.every((row) => selected.includes(row.id))
                    }
                    onChange={(event) =>
                      setSelected(
                        event.currentTarget.checked
                          ? [
                              ...new Set([
                                ...selected,
                                ...visible.map((row) => row.id),
                              ]),
                            ]
                          : selected.filter(
                              (id) => !visible.some((row) => row.id === id),
                            ),
                      )
                    }
                  />
                </th>
                <th>SẢN PHẨM</th>
                <th>DANH MỤC</th>
                <th>GIÁ</th>
                <th>SỐ BÁN</th>
                <th>ĐÁNH GIÁ</th>
                <th>TRẠNG THÁI</th>
                <th>ĐỀ XUẤT</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((product) => (
                <tr key={product.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${product.id}`}
                      checked={selected.includes(product.id)}
                      onChange={() =>
                        setSelected(
                          selected.includes(product.id)
                            ? selected.filter((id) => id !== product.id)
                            : [...selected, product.id],
                        )
                      }
                    />
                  </td>
                  <td>
                    <ProductIdentity
                      name={product.name}
                      image={product.thumbnail_url}
                      detail={
                        product.product_type ??
                        categories.find((row) => row.id === product.category_id)
                          ?.name
                      }
                      code={productCode(product)}
                    />
                  </td>
                  <td>
                    {categories.find((row) => row.id === product.category_id)
                      ?.name ?? "Chưa phân loại"}
                  </td>
                  <td>{price(product.price, product.currency)}</td>
                  <td>{display(product.quantity_sold)}</td>
                  <td>
                    <span className="rating">
                      <Icon name="star" size={14} />
                      {display(product.rating_average)} (
                      {display(product.review_count)})
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={product.latest_status ?? undefined}>
                      {analysisLabels[product.latest_status ?? ""] ??
                        "Chưa được phân tích"}
                    </StatusBadge>
                  </td>
                  <td>
                    {(() => {
                      const actions = product.action_titles;
                      if (!actions.length)
                        return <span className="muted">—</span>;
                      return (
                        <Link
                          href={`/user/analysis?product=${product.id}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            background: "rgba(51, 156, 255, 0.12)",
                            color: "#0066cc",
                            fontWeight: 500,
                            textDecoration: "none",
                          }}
                          title={actions.join("\n")}
                        >
                          <Icon name="sparkles" size={13} />
                          {actions.length === 1
                            ? actions[0]
                            : `${actions.length} đề xuất`}
                        </Link>
                      );
                    })()}
                  </td>
                  <td>
                    <Link
                      className="button subtle small"
                      href={`/user/analysis?product=${product.id}`}
                    >
                      Xem
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!current && !error && <p role="status">Đang tải sản phẩm…</p>}
        {current && !visible.length && <Empty />}
        <div className="table-footer">
          <span>
            Hiển thị{" "}
            {visible.length
              ? `${(activePage - 1) * pageSize + 1}–${Math.min(activePage * pageSize, total)}`
              : "0"}{" "}
            / {total} sản phẩm
          </span>
          <div className="pagination">
            <button
              aria-label="Trang trước"
              disabled={activePage <= 1}
              onClick={() => setPage(activePage - 1)}
            >
              ‹
            </button>
            {pageNumbers.map((number, index) => (
              <Fragment key={number}>
                {index > 0 && number - pageNumbers[index - 1] > 1 && (
                  <span aria-hidden="true">…</span>
                )}
                <button
                  aria-label={`Trang ${number}`}
                  aria-current={activePage === number ? "page" : undefined}
                  className={activePage === number ? "active" : undefined}
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              </Fragment>
            ))}
            <button
              aria-label="Trang sau"
              disabled={activePage >= pages}
              onClick={() => setPage(activePage + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
