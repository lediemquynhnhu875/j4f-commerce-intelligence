"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { Account } from "@/types/api";
import { Badge, Icon, Logo } from "./ui";

export const livePages = {
  user: [
    { slug: "overview", label: "Tổng quan", icon: "grid" },
    { slug: "products", label: "Danh mục sản phẩm", icon: "box" },
    { slug: "analysis", label: "Kết quả phân tích", icon: "chart" },
    { slug: "suggestions", label: "Đề xuất cải thiện", icon: "sparkles" },
  ],
  admin: [
    { slug: "overview", label: "Tổng quan hệ thống", icon: "grid" },
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
}: {
  account: Account;
  page: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function logout() {
    setPending(true);
    setError("");
    try {
      await api("auth/logout", { method: "POST" });
      window.dispatchEvent(new Event("sellens-session-changed"));
      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className={`app-shell ${account.role}`}>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Đóng menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link className="logo-link" href={`/${account.role}/overview`}>
          <Logo />
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Đóng menu"
          onClick={() => setOpen(false)}
        >
          <Icon name="close" />
        </button>
        <nav
          aria-label={
            account.role === "admin" ? "Phân hệ quản trị" : "Phân hệ người dùng"
          }
        >
          <p className="nav-label">SELLENS WORKSPACE</p>
          {livePages[account.role].map((item) => (
            <Link
              key={item.slug}
              className={`nav-link ${page === item.slug ? "active" : ""}`}
              href={`/${account.role}/${item.slug}`}
              onClick={() => setOpen(false)}
              aria-current={page === item.slug ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="baseline">
            <i className="dot" /> Catalog chung
          </div>
          <button className="logout-button" disabled={pending} onClick={logout}>
            <Icon name="logout" />
            {pending ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="menu-button icon-button"
            aria-label="Mở menu"
            onClick={() => setOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <div className="topbar-context">
            <span className="store-pill">
              <Icon name="box" />
              <strong>Catalog chung Sellens</strong>
            </span>
          </div>
          <div className="topbar-right">
            <Badge tone="green">API CONNECTED</Badge>
            <div className="profile">
              <div>
                <strong>{account.full_name}</strong>
                <small>
                  {account.role === "admin" ? "Quản trị viên" : "Người rà soát"}
                </small>
              </div>
              <span className="avatar">
                {account.full_name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
        </header>
        <div className="preview-strip">
          <span>Dữ liệu được tải từ PostgreSQL</span>
          <span>Dữ liệu mẫu có nhãn minh họa · Chưa chạy ML</span>
        </div>
        <main id="main-content" className="main-content">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {children}
          <footer className="app-footer">
            <span>Sellens Decision Support Platform</span>
            <span>Kết luận từ snapshot · Không đảm bảo tăng số bán</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
