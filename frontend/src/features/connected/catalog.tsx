"use client";
import { Fragment, useState, type FormEvent } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { analysisColor } from "@/lib/status-colors";
import { useRouter } from "next/navigation";
import {
  api,
  analysisLabels,
  display,
  price,
} from "@/lib/api-client";
import type { Dataset, Product } from "@/types/api";
import { Empty, Icon, Modal, Panel } from "@/components/ui";
import { ProductIdentity } from "@/components/products/product-identity";
import { productCode } from "@/lib/analysis-presentation";


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
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<Product | "new" | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const rows = data.products.filter(
    (row) =>
      `${row.name} ${row.id} ${productCode(row)}`.toLowerCase().includes(search.toLowerCase()) &&
      (!category || row.category_id === category) &&
      (!status || (latest(data, row.id)?.status ?? "no_analysis") === status),
  ).sort((a,b)=>sort==="price"?Number(a.price??Infinity)-Number(b.price??Infinity):sort==="sales"?Number(b.quantity_sold??-1)-Number(a.quantity_sold??-1):0);
  const pages = Math.max(1, Math.ceil(rows.length / 4));
  const activePage = Math.min(page, pages);
  const pageNumbers=[...new Set([1,activePage-1,activePage,activePage+1,pages])].filter(number=>number>=1&&number<=pages).sort((a,b)=>a-b);
  const visible = rows.slice((activePage - 1) * 4, activePage * 4);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
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
      !confirm(
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
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <button className="button primary" disabled={!selected.length} onClick={()=>router.push(`/${role}/analysis?product=${selected[0]}`)}><Icon name="sparkles" size={17}/>Xem phân tích đã chọn {selected.length>0&&`(${selected.length})`}</button>
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
              setCategory(event.target.value);
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
            style={status?{color:analysisColor(status)}:undefined}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Trạng thái: Tất cả</option>
            <option value="no_analysis">Chưa có phân tích</option>
            {Object.entries(analysisLabels).map(([key, label]) => (
              <option key={key} value={key} style={{color:analysisColor(key)}}>
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
              setSort("");setSelected([]);
              setPage(1);
            }}
          >
            Đặt lại
          </button>
          <select aria-label="Sắp xếp sản phẩm" value={sort} onChange={event=>{setSort(event.target.value);setPage(1);}}>
            <option value="">Sắp xếp: Mặc định</option><option value="price">Giá: Thấp đến cao</option><option value="sales">Số bán: Cao đến thấp</option>
          </select>
        </div>
      </Panel>
      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Chọn trang sản phẩm" checked={visible.length>0&&visible.every(row=>selected.includes(row.id))} onChange={event=>setSelected(event.target.checked?[...new Set([...selected,...visible.map(row=>row.id)])]:selected.filter(id=>!visible.some(row=>row.id===id)))}/></th>
                <th>SẢN PHẨM</th>
                <th>DANH MỤC</th>
                <th>GIÁ</th>
                <th>SỐ BÁN</th>
                <th>ĐÁNH GIÁ</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((product) => (
                <tr key={product.id}>
                  <td><input type="checkbox" aria-label={`Chọn ${product.id}`} checked={selected.includes(product.id)} onChange={()=>setSelected(selected.includes(product.id)?selected.filter(id=>id!==product.id):[...selected,product.id])}/></td>
                  <td>
                    <ProductIdentity name={product.name} image={product.thumbnail_url} detail={latest(data,product.id)?.product_type??data.categories.find(row=>row.id===product.category_id)?.name} code={productCode(product)}/>
                  </td>
                  <td>
                    {data.categories.find(
                      (row) => row.id === product.category_id,
                    )?.name ?? "Chưa phân loại"}
                  </td>
                  <td>{price(product.price, product.currency)}</td>
                  <td>{display(product.quantity_sold)}</td>
                  <td><span className="rating">
                    <Icon name="star" size={14}/>{display(product.rating_average)} (
                    {display(product.review_count)})
                  </span></td>
                  <td>
                    <StatusBadge status={latest(data,product.id)?.status}>
                      {analysisLabels[latest(data, product.id)?.status] ??
                        "Chưa có phân tích"}
                    </StatusBadge>
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
            {pageNumbers.map((number,index) => (
              <Fragment key={number}>
                {index>0&&number-pageNumbers[index-1]>1&&<span aria-hidden="true">…</span>}
                <button
                  aria-label={`Trang ${number}`}
                  aria-current={activePage === number ? "page" : undefined}
                  className={activePage===number?"active":undefined}
                  onClick={() => setPage(number)}
                >{number}</button>
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
    </>
  );
}

export { LiveAnalysis } from "./evidence";

export { LiveSavedMonitor as LiveMonitor, LiveSavedConfiguration as LiveConfiguration } from "./administration";
