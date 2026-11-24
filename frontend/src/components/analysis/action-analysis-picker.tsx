"use client";

import { useEffect, useState } from "react";
import { ErrorPopup } from "@/components/popup";
import { api } from "@/lib/api-client";
import type { List } from "@/types/api";

const pageSize = 20;
type AnalysisChoice = { id: string; product_name: string };

export function ActionAnalysisPicker() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{
    path: string;
    rows: List<AnalysisChoice>;
  }>();
  const [failure, setFailure] = useState<{ path: string; message: string }>();
  const params = new URLSearchParams({
    view: "picker",
    page: String(page),
    limit: String(pageSize),
  });
  if (search.trim()) params.set("search", search.trim());
  const path = `analyses?${params}`;
  const current = result?.path === path ? result.rows : undefined;
  const error = failure?.path === path ? failure.message : "";

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => {
        void api<List<AnalysisChoice>>(path, { signal: controller.signal })
          .then((rows) => {
            if (controller.signal.aborted) return;
            setResult({ path, rows });
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
  }, [path, search]);

  return (
    <>
      <label>
        Tìm phân tích theo tên sản phẩm hoặc mã
        <input
          value={search}
          maxLength={200}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            setPage(1);
          }}
        />
      </label>
      {error && <ErrorPopup message={error} />}
      <label>
        Phân tích
        <select name="analysis_id" key={path} defaultValue="" required>
          <option value="">
            {current
              ? current.data.length
                ? "Chọn phân tích"
                : "Không tìm thấy phân tích"
              : "Đang tải phân tích…"}
          </option>
          {current?.data.map((row) => (
            <option value={row.id} key={row.id}>
              #{row.id} · {row.product_name}
            </option>
          ))}
        </select>
      </label>
      {current && current.pagination.total > pageSize && (
        <div className="filter-row">
          <button
            className="button subtle small"
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Trang phân tích trước
          </button>
          <button
            className="button subtle small"
            type="button"
            disabled={page * pageSize >= current.pagination.total}
            onClick={() => setPage(page + 1)}
          >
            Trang phân tích sau
          </button>
        </div>
      )}
    </>
  );
}
