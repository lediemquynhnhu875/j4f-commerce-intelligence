"use client";

import { useState, type ReactNode } from "react";
import { LiveShell } from "@/components/live-shell";
import { ErrorPopup } from "@/components/popup";
import { Badge, Icon, Panel } from "@/components/ui";
import { exportSaved } from "@/lib/analysis-presentation";
import { workspacePages } from "@/lib/workspace-pages";
import { useAuth } from "@/page/auth";

type WorkspaceLayoutProps = {
  page: string;
  description: string;
  heading?: string;
  children: ReactNode;
  loading?: boolean;
  error?: string;
  storeName?: string | null;
  suggestionCount?: number;
  latestResult?: string | null;
  canExport?: boolean;
  onExport: () => Promise<unknown>;
  onRefresh: () => void;
};

export function WorkspaceLayout({
  page,
  description,
  heading,
  children,
  loading = false,
  error,
  storeName,
  suggestionCount,
  latestResult,
  canExport = true,
  onExport,
  onRefresh,
}: WorkspaceLayoutProps) {
  const { account, logout } = useAuth();
  const { role } = account;
  const title = workspacePages[role].find((item) => item.slug === page)?.label;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  async function download() {
    setExporting(true);
    setExportError("");
    try {
      exportSaved(`sellens-${page}`, await onExport());
    } catch (err) {
      setExportError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <LiveShell
      account={account}
      page={page}
      storeName={storeName ?? undefined}
      suggestionCount={suggestionCount}
      onLogout={logout}
    >
      <div className="page-breadcrumb">
        <span>{role === "admin" ? "Phân hệ quản trị" : "Trang chủ"}</span>
        <Icon name="chevron" size={13} />
        <span>{title}</span>
        <Badge tone="gradient">{role.toUpperCase()}</Badge>
      </div>
      <section
        className={`page-hero ${page === "overview" ? "overview-hero" : ""}`}
      >
        <div>
          <span className="eyebrow">
            {role === "admin"
              ? "SELLENS · SYSTEM WORKSPACE"
              : "SELLENS · WORKSPACE"}
          </span>
          <h1>{heading ?? title}</h1>
          <p>{description}</p>
        </div>
        <div className="hero-actions">
          {latestResult !== undefined && (
            <div className="snapshot-chip">
              <Icon name="calendar" size={17} />
              <div>
                <small>Kết quả gần nhất</small>
                <strong>
                  {latestResult
                    ? new Date(latestResult).toLocaleDateString("vi-VN")
                    : "Chưa có kết quả"}
                </strong>
              </div>
            </div>
          )}
          <button
            className="button primary"
            disabled={!canExport || exporting}
            onClick={download}
          >
            <Icon name="download" size={16} />
            {exporting ? "Đang xuất dữ liệu…" : "Xuất dữ liệu"}
          </button>
          <button
            className="button subtle"
            onClick={onRefresh}
            disabled={loading}
          >
            <Icon name="refresh" />
            Tải lại
          </button>
        </div>
      </section>
      {exportError && <ErrorPopup message={exportError} />}
      {loading && (
        <Panel>
          <p role="status">Đang tải dữ liệu…</p>
        </Panel>
      )}
      {error && (
        <Panel>
          <ErrorPopup message={error} />
          <button className="button primary" onClick={onRefresh}>
            Thử lại
          </button>
        </Panel>
      )}
      {children}
    </LiveShell>
  );
}
