"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import type { List } from "@/types/api";

export const adminPageSize = 50;

export function useAdminList<T extends List<unknown>>(
  endpoint: string,
  refreshVersion: number,
  filters: { status?: string; sort?: string } = {},
) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<{ path: string; data: T }>();
  const [failure, setFailure] = useState<{ path: string; message: string }>();
  const params = new URLSearchParams({
    page: String(page),
    limit: String(adminPageSize),
  });
  if (search) params.set("search", search);
  if (filters.status) params.set("status", filters.status);
  if (filters.sort) params.set("sort", filters.sort);
  const path = `${endpoint}?${params}`;

  useEffect(() => {
    const controller = new AbortController();
    void api<T>(path, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(
          1,
          Math.ceil(data.pagination.total / adminPageSize),
        );
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setResult({ path, data });
        setFailure(undefined);
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted)
          setFailure({ path, message: err.message });
      });
    return () => controller.abort();
  }, [path, page, refreshVersion]);

  return {
    result: result?.path === path ? result.data : undefined,
    error: failure?.path === path ? failure.message : "",
    page,
    setPage,
    submitSearch(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      setPage(1);
      setSearch(String(new FormData(event.currentTarget).get("search")).trim());
    },
  };
}

export function AdminListSearch({
  label,
  onSubmit,
  children,
}: {
  label: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children?: ReactNode;
}) {
  return (
    <form className="filter-search-row" onSubmit={onSubmit}>
      <div className="search-field">
        <input
          name="search"
          aria-label={label}
          placeholder={label}
          maxLength={200}
        />
      </div>
      <button className="button subtle" type="submit">
        Tìm kiếm
      </button>
      {children}
    </form>
  );
}

export function AdminListPagination({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / adminPageSize));
  const first = total ? (page - 1) * adminPageSize + 1 : 0;
  const last = Math.min(page * adminPageSize, total);
  return (
    <div className="table-footer">
      <span>
        Hiển thị {first}–{last} / {total.toLocaleString("vi-VN")}
      </span>
      <div className="pagination">
        <button
          type="button"
          aria-label="Trang trước"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          ‹
        </button>
        <span>
          Trang {page} / {pages}
        </span>
        <button
          type="button"
          aria-label="Trang sau"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          ›
        </button>
      </div>
    </div>
  );
}
