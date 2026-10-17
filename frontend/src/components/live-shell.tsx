"use client";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { Account } from "@/types/api";
import { Header } from "./layout/header";
import { Sidebar } from "./layout/sidebar";
import { Icon, Modal } from "./ui";

export const livePages = {
  user: [
    { slug: "overview", label: "Tổng quan", icon: "grid" },
    { slug: "products", label: "Danh mục sản phẩm", icon: "box" },
    { slug: "analysis", label: "Kết quả phân tích", icon: "chart" },
    { slug: "suggestions", label: "Đề xuất cải thiện", icon: "sparkles" },
  ],
  admin: [
    { slug: "overview", label: "Tổng quan hệ thống", icon: "grid" },
    { slug: "stores", label: "Quản lý cửa hàng", icon: "store" },
    { slug: "accounts", label: "Quản lý tài khoản", icon: "users" },
    { slug: "products", label: "Quản lý sản phẩm", icon: "box" },
    { slug: "categories", label: "Quản lý danh mục", icon: "box" },
    { slug: "monitor", label: "Kết quả đã lưu", icon: "chart" },
    { slug: "configuration", label: "Cấu hình đã lưu", icon: "sliders" },
  ],
};
export function LiveShell({
  account,
  page,
  children,
  suggestionCount = 0,
}: {
  account: Account;
  page: string;
  children: ReactNode;
  suggestionCount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [notifications, setNotifications] = useState(false),
    [error, setError] = useState("");
  async function logout() {
    try {
      await api("auth/logout", { method: "POST" });
      window.dispatchEvent(new Event("sellens-session-changed"));
      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <div className={`app-shell live-app-shell ${account.role}`}>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <Sidebar
        role={account.role}
        page={page}
        open={open}
        onClose={() => setOpen(false)}
        onLogout={() => void logout()}
        live
        pages={livePages[account.role]}
        suggestionCount={suggestionCount}
      />
      <div className="workspace">
        <Header
          role={account.role}
          page={page}
          onOpenMenu={() => setOpen(true)}
          onOpenNotifications={() => setNotifications(true)}
          live
          pages={livePages[account.role]}
          profile={{
            name: account.full_name,
            initials: account.full_name
              .split(" ")
              .slice(-2)
              .map((part) => part[0])
              .join(""),
          }}
        />
        <main id="main-content" className="main-content">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {children}
          <footer className="app-footer">
            <span>
              <Icon name="shield" size={14} /> Sellens Decision Support Platform
            </span>
            <span>Quyết định dựa trên bằng chứng · Kết quả snapshot</span>
          </footer>
        </main>
      </div>
      {notifications && (
        <Modal
          title="Đề xuất cần duyệt"
          onClose={() => setNotifications(false)}
        >
          <div className="notice">
            <Icon name="info" />
            <span>
              {suggestionCount} đề xuất đang chờ quyết định. Xem bằng chứng
              trước khi chấp nhận hoặc từ chối.
            </span>
          </div>
          <button
            className="button primary"
            onClick={() => {
              setNotifications(false);
              router.push(
                `/${account.role}/${account.role === "user" ? "suggestions" : "monitor"}`,
              );
            }}
          >
            Xem chi tiết <Icon name="arrow" size={16} />
          </button>
        </Modal>
      )}
    </div>
  );
}
