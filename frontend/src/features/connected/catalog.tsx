"use client";

import { Fragment, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { analysisColor } from "@/lib/status-colors";
import { useRouter } from "next/navigation";
import { api, analysisLabels, display, price } from "@/lib/api-client";
import type { Dataset, Product } from "@/types/api";
import { Empty, Icon, Modal, Panel } from "@/components/ui";
import { ProductIdentity } from "@/components/products/product-identity";
import { productCode } from "@/lib/analysis-presentation";
import { isInsufficient } from "@/lib/insufficient-data";

function parseSimpleCSV(text: string): Array<Record<string, unknown>> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) =>
    h
      .trim()
      .replace(/^["']|["']$/g, "")
      .toLowerCase(),
  );
  return lines
    .slice(1)
    .map((line) => {
      const values: string[] = [];
      let cur = "";
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") inQuote = !inQuote;
        else if (char === "," && !inQuote) {
          values.push(cur.trim().replace(/^["']|["']$/g, ""));
          cur = "";
        } else cur += char;
      }
      values.push(cur.trim().replace(/^["']|["']$/g, ""));
      const row: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        const val = values[idx];
        if (["name", "tên", "ten"].includes(h)) row.name = val;
        else if (["price", "giá", "gia"].includes(h))
          row.price = val ? Number(val) : null;
        else if (["description", "mô tả", "mo ta"].includes(h))
          row.description = val;
        else if (["category_id", "danh mục"].includes(h))
          row.category_id = val || null;
        else if (["quantity_sold", "số bán"].includes(h))
          row.quantity_sold = val ? Number(val) : 0;
        else if (["rating_average", "đánh giá"].includes(h))
          row.rating_average = val ? Number(val) : null;
        else row[h] = val;
      });
      return row;
    })
    .filter((r) => Boolean(r.name));
}

function latest(data: Dataset, productId: string) {
  return data.analyses
    .filter((row) => row.product_id === productId)
    .sort(
      (a, b) =>
        b.analyzed_at.localeCompare(a.analyzed_at) ||
        (BigInt(a.id) > BigInt(b.id) ? -1 : 1),
    )[0];
}
export { LiveOverview } from "./overview";

export function LiveCatalog({
  data,
  role,
  refresh,
}: {
  data: Dataset;
  role: "user" | "admin";
  refresh: () => Promise<void>;
}) {
  const [importOpen, setImportOpen] = useState(false);
  const [importItems, setImportItems] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [importFileName, setImportFileName] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("");
  const [analysableOnly, setAnalysableOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<Product | "new" | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const concluded = (product: Product) => {
    const current = latest(data, product.id);
    return Boolean(current) && !isInsufficient(current.status);
  };

  const rows = data.products
    .filter(
      (row) =>
        `${row.name} ${row.id} ${productCode(row)}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (!category || row.category_id === category) &&
        (!status ||
          (latest(data, row.id)?.status ?? "no_analysis") === status) &&
        (!analysableOnly || concluded(row)),
    )
    .sort((a, b) =>
      sort === "price"
        ? Number(a.price ?? Infinity) - Number(b.price ?? Infinity)
        : sort === "sales"
          ? Number(b.quantity_sold ?? -1) - Number(a.quantity_sold ?? -1)
          : Number(concluded(b)) - Number(concluded(a)),
    );

  const undecidedCount = data.products.filter((row) => !concluded(row)).length;
  const pages = Math.max(1, Math.ceil(rows.length / 4));
  const activePage = Math.min(page, pages);
  const pageNumbers = [
    ...new Set([1, activePage - 1, activePage, activePage + 1, pages]),
  ]
    .filter((number) => number >= 1 && number <= pages)
    .sort((a, b) => a - b);
  const visible = rows.slice((activePage - 1) * 4, activePage * 4);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new (globalThis as any).FormData(event.currentTarget);
    const value = {
      name: String(form.get("name")),
      description: String(form.get("description")),
      category_id: form.get("category_id") || null,
      price: form.get("price") === "" ? null : Number(form.get("price")),
    };
    try {
      await api(
        editor === "new" ? "products" : `products/${(editor as Product).id}`,
        {
          method: editor === "new" ? "POST" : "PATCH",
          body: JSON.stringify(value),
        },
      );
      setEditor(null);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function remove(product: Product) {
    if (
      !(globalThis as any).confirm(
        `Xóa sản phẩm “${product.name}”? Sản phẩm đã có phân tích sẽ không thể xóa.`,
      )
    )
      return;
    setPending(true);
    setError("");
    try {
      await api(`products/${product.id}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = (e.target as any).files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setError("");
    const reader = new (globalThis as any).FileReader();
    reader.onload = (event: any) => {
      try {
        const text = String(event.target?.result ?? "");
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          setImportItems(Array.isArray(parsed) ? parsed : (parsed.items ?? []));
        } else {
          setImportItems(parseSimpleCSV(text));
        }
      } catch {
        setError(
          "Không thể đọc định dạng file. Hãy chọn file CSV hoặc JSON hợp lệ.",
        );
      }
    };
    reader.readAsText(file);
  }

  async function submitImport() {
    if (!importItems.length) return;
    setPending(true);
    setError("");
    try {
      await api("products/import", {
        method: "POST",
        body: JSON.stringify({ items: importItems }),
      });
      setImportOpen(false);
      setImportItems([]);
      setImportFileName("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {error && !editor && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <Panel className="filters">
        <div className="filter-search-row">
          <div className="search-field">
            <Icon name="search" />
            <input
              aria-label="Tìm sản phẩm"
              placeholder="Tìm theo mã, tên sản phẩm…"
              value={search}
              onChange={(event) => {
                setSearch((event.target as any).value);
                setPage(1);
              }}
            />
          </div>
          <button
            className="button subtle"
            onClick={() => {
              setImportOpen(true);
              setImportItems([]);
              setImportFileName("");
              setError("");
            }}
          >
            <Icon name="sparkles" size={16} /> Import dữ liệu
          </button>
          <button
            className="button primary"
            disabled={!selected.length}
            onClick={() =>
              router.push(`/${role}/analysis?product=${selected[0]}`)
            }
          >
            <Icon name="sparkles" size={17} />
            Xem phân tích đã chọn{" "}
            {selected.length > 0 && `(${selected.length})`}
          </button>
          {role === "admin" && (
            <button
              className="button primary"
              onClick={() => {
                setEditor("new");
                setError("");
              }}
            >
              Thêm sản phẩm
            </button>
          )}
        </div>
        <div className="filter-row">
          <select
            aria-label="Danh mục sản phẩm"
            value={category}
            onChange={(event) => {
              setCategory((event.target as any).value);
              setPage(1);
            }}
          >
            <option value="">Danh mục: Tất cả</option>
            {data.categories.map((row) => (
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
              setStatus((event.target as any).value);
              setPage(1);
            }}
          >
            <option value="">Trạng thái: Tất cả</option>
            <option value="no_analysis">Chưa được phân tích</option>
            {Object.entries(analysisLabels).map(([key, label]) => (
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
                setAnalysableOnly((event.target as any).checked);
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
              setSort((event.target as any).value);
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
                        (event.target as any).checked
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
                        latest(data, product.id)?.product_type ??
                        data.categories.find(
                          (row) => row.id === product.category_id,
                        )?.name
                      }
                      code={productCode(product)}
                    />
                  </td>
                  <td>
                    {data.categories.find(
                      (row) => row.id === product.category_id,
                    )?.name ?? "Chưa phân loại"}
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
                    <StatusBadge status={latest(data, product.id)?.status}>
                      {analysisLabels[latest(data, product.id)?.status] ??
                        "Chưa được phân tích"}
                    </StatusBadge>
                  </td>
                  <td>
                    {(() => {
                      const analysis = latest(data, product.id);
                      const actions = analysis
                        ? (data.actions ?? []).filter(
                            (a) => a.analysis_id === analysis.id,
                          )
                        : [];
                      if (!actions.length)
                        return <span className="muted">—</span>;
                      return (
                        <Link
                          href={`/${role}/analysis?product=${product.id}`}
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
                          title={actions.map((a) => a.title).join("\n")}
                        >
                          <Icon name="sparkles" size={13} />
                          {actions.length === 1
                            ? actions[0].title
                            : `${actions.length} đề xuất`}
                        </Link>
                      );
                    })()}
                  </td>
                  <td>
                    <Link
                      className="button subtle small"
                      href={`/${role}/analysis?product=${product.id}`}
                    >
                      Xem
                    </Link>
                    {role === "admin" && (
                      <>
                        <button
                          className="button subtle small"
                          onClick={() => {
                            setEditor(product);
                            setError("");
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          className="button subtle small"
                          disabled={pending}
                          onClick={() => remove(product)}
                        >
                          Xóa
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && <Empty />}
        <div className="table-footer">
          <span>
            Hiển thị{" "}
            {visible.length
              ? `${(activePage - 1) * 4 + 1}–${Math.min(activePage * 4, rows.length)}`
              : "0"}{" "}
            / {rows.length} sản phẩm
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
      {editor && (
        <Modal
          title={editor === "new" ? "Thêm sản phẩm" : "Sửa sản phẩm"}
          onClose={() => !pending && setEditor(null)}
        >
          <form className="connected-form" onSubmit={save}>
            <label>
              Tên sản phẩm
              <input
                name="name"
                required
                maxLength={500}
                defaultValue={editor === "new" ? "" : editor.name}
              />
            </label>
            <label>
              Giá
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={editor === "new" ? "" : (editor.price ?? "")}
              />
            </label>
            <label>
              Danh mục
              <select
                name="category_id"
                defaultValue={
                  editor === "new" ? "" : (editor.category_id ?? "")
                }
              >
                <option value="">Chưa phân loại</option>
                {data.categories.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mô tả
              <textarea
                name="description"
                defaultValue={
                  editor === "new" ? "" : (editor.description ?? "")
                }
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" disabled={pending}>
              {pending ? "Đang lưu…" : "Lưu sản phẩm"}
            </button>
          </form>
        </Modal>
      )}
      {importOpen && (
        <Modal
          title="Import danh sách sản phẩm"
          onClose={() => !pending && setImportOpen(false)}
        >
          <div className="connected-form">
            <p
              className="muted"
              style={{ fontSize: "14px", margin: "0 0 12px 0" }}
            >
              Tải lên file <b>.csv</b> hoặc <b>.json</b> chứa danh sách sản
              phẩm. Các sản phẩm sau khi import sẽ có trạng thái{" "}
              <b>Chưa được phân tích</b> để chờ tính toán tích hợp sau.
            </p>
            <label style={{ display: "block", marginBottom: "12px" }}>
              Chọn file dữ liệu
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileSelect}
                disabled={pending}
              />
            </label>
            {importFileName && (
              <p
                style={{
                  fontSize: "13px",
                  color: importItems.length ? "#008844" : "#cc3300",
                }}
              >
                Đã nhận diện: <b>{importItems.length}</b> sản phẩm từ{" "}
                <i>{importFileName}</i>
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
                marginTop: "16px",
              }}
            >
              <button
                className="button subtle"
                onClick={() => setImportOpen(false)}
                disabled={pending}
              >
                Hủy
              </button>
              <button
                className="button primary"
                onClick={submitImport}
                disabled={pending || !importItems.length}
              >
                {pending
                  ? "Đang import..."
                  : `Xác nhận import (${importItems.length})`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export { LiveAnalysis } from "./evidence";

export {
  LiveSavedMonitor as LiveMonitor,
  LiveSavedConfiguration as LiveConfiguration,
} from "./administration";
