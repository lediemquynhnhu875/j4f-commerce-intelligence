"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  products,
  rolePages,
  SNAPSHOT,
  type Role,
} from "@/lib/preview-fixtures";
import { AppShell } from "./layout/app-shell";
import { Badge, Icon, downloadFixture } from "./ui";
import { Overview } from "@/features/user/overview";
import { ProductList } from "@/features/user/product-list";
import { EvidencePanel } from "@/features/user/evidence-panel";
import { SuggestionsView } from "@/features/user/suggestions-view";
import { AdminOverview } from "@/features/admin/overview";
import { StoresView } from "@/features/admin/stores";
import { MonitorView } from "@/features/admin/monitor";
import { ConfigurationView } from "@/features/admin/configuration";
const descriptions: Record<string, string> = {
  overview: "Theo dõi sản phẩm và ưu tiên cơ hội cải thiện hiệu quả bán hàng.",
  products: "Quản lý danh mục và đối chiếu tín hiệu quan sát từ snapshot.",
  analysis: "Đọc bằng chứng, hiểu tham chiếu và giới hạn của từng kết luận.",
  suggestions: "Rà soát đề xuất và chủ động theo dõi tiến độ thực hiện.",
  stores: "Quản trị hồ sơ cửa hàng và trình bày quyền sở hữu sản phẩm.",
  monitor: "Phân biệt trạng thái kỹ thuật với kết quả hỗ trợ quyết định.",
  configuration: "Xem trước cấu hình thuật toán và quy tắc phân tích DSS.",
};
export function PreviewPage({ role, page }: { role: Role; page: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  const product =
    products.find((p) => p.id === params.get("product")) ?? products[0];
  const title =
    role === "user" && page === "overview"
      ? "Xin chào Nguyễn Văn Minh"
      : (rolePages[role].find((p) => p.slug === page)?.label ?? "Sellens DSS");
  const analyze = (id: string) =>
    router.push(`/preview/user/analysis?product=${id}`);
  return (
    <AppShell role={role} page={page}>
      <div className="page-breadcrumb">
        <span>{role === "admin" ? "Phân hệ quản trị" : "Trang chủ"}</span>
        <Icon name="chevron" size={13} />
        <span>{rolePages[role].find((p) => p.slug === page)?.label}</span>
        <Badge tone="gradient">
          {role === "admin" ? "ADMIN" : "USER"} PREVIEW
        </Badge>
      </div>
      <section
        className={`page-hero ${page === "overview" ? "overview-hero" : ""}`}
      >
        <div>
          <span className="eyebrow">
            {role === "admin"
              ? "SELLENS · SYSTEM WORKSPACE"
              : "SELLENS · STORE WORKSPACE"}
          </span>
          <h1>{title}</h1>
          {role === "user" && page === "overview" && (
            <Badge tone="gradient">
              <Icon name="shield" size={12} />
              Juno Official Store
            </Badge>
          )}
          <p>
            {role === "admin" && page === "overview"
              ? "Giám sát vận hành hệ thống hỗ trợ ra quyết định trên dữ liệu thương mại điện tử."
              : descriptions[page]}
          </p>
        </div>
        <div className="hero-actions">
          <div className="snapshot-chip">
            <Icon name="calendar" size={17} />
            <div>
              <small>Dữ liệu quan sát minh họa</small>
              <strong>Snapshot {SNAPSHOT}</strong>
            </div>
          </div>
          <button
            className="button primary"
            onClick={() => {
              downloadFixture(
                `${role}-${page}`,
                page === "products"
                  ? products
                  : { page, source: "synthetic mock data", snapshot: SNAPSHOT },
              );
              setToast("Đã xuất file JSON dữ liệu demo.");
            }}
          >
            <Icon name="download" size={16} />
            Xuất dữ liệu demo
          </button>
        </div>
      </section>
      {role === "user" ? (
        page === "overview" ? (
          <Overview onAnalyze={analyze} />
        ) : page === "products" ? (
          <ProductList onAnalyze={analyze} />
        ) : page === "analysis" ? (
          <EvidencePanel
            product={product}
            onSelect={analyze}
            notify={setToast}
          />
        ) : (
          <SuggestionsView notify={setToast} />
        )
      ) : page === "overview" ? (
        <AdminOverview />
      ) : page === "stores" ? (
        <StoresView notify={setToast} />
      ) : page === "monitor" ? (
        <MonitorView notify={setToast} />
      ) : (
        <ConfigurationView notify={setToast} />
      )}
      <div
        role="status"
        aria-live="polite"
        className={`toast ${toast ? "visible" : ""}`}
      >
        {toast && (
          <>
            <Icon name="check" size={18} />
            <span>{toast}</span>
            <button
              className="icon-button"
              aria-label="Đóng thông báo"
              onClick={() => setToast("")}
            >
              <Icon name="close" size={16} />
            </button>
          </>
        )}
      </div>
    </AppShell>
  );
}
