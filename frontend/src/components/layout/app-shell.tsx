"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/preview-fixtures";
import { setDemoRole, useDemoRole } from "@/lib/demo-session";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { Badge, Icon, Logo, Modal } from "../ui";

export function AppShell({
  role,
  page,
  children,
}: {
  role: Role;
  page: string;
  children: ReactNode;
}) {
  const selectedRole = useDemoRole();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [notifications, setNotifications] = useState(false);
  function logout() {
    setDemoRole(null);
    router.push("/preview/login");
  }
  if (selectedRole !== role)
    return (
      <main className="access-screen">
        <Logo />
        <Icon name="lock" size={42} />
        <h1>
          {selectedRole
            ? "Không gian làm việc khác vai trò"
            : "Mời bạn đăng nhập demo"}
        </h1>
        <p>
          {selectedRole
            ? "Chọn không gian của tài khoản demo hiện tại để tiếp tục."
            : "Chọn tài khoản Admin hoặc Chủ cửa hàng để xem giao diện."}
        </p>
        <Badge>Demo UI · Không phải kiểm tra quyền trên server</Badge>
        <Link
          className="button primary"
          href={
            selectedRole
              ? `/preview/${selectedRole}/overview`
              : "/preview/login"
          }
        >
          {selectedRole ? "Về không gian của tôi" : "Đăng nhập demo"}
          <Icon name="arrow" size={18} />
        </Link>
      </main>
    );
  return (
    <div className={`app-shell ${role}`}>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <Sidebar
        role={role}
        page={page}
        open={mobile}
        onClose={() => setMobile(false)}
        onLogout={logout}
      />
      <div className="workspace">
        <Header
          role={role}
          page={page}
          onOpenMenu={() => setMobile(true)}
          onOpenNotifications={() => setNotifications(true)}
        />
        <div className="preview-strip">
          <span>
            <i className="dot" /> Bản demo · Dữ liệu tổng hợp minh họa
          </span>
          <span>Snapshot 24/10/2024 · Chưa kết nối API / ML</span>
        </div>
        <main id="main-content" className="main-content">
          {children}
          <footer className="app-footer">
            <span>
              <Icon name="shield" size={14} /> Sellens Decision Support Platform
            </span>
            <span>Quyết định dựa trên bằng chứng · UI Preview</span>
          </footer>
        </main>
      </div>
      {notifications && (
        <Modal title="Thông báo demo" onClose={() => setNotifications(false)}>
          <div className="notice">
            <Icon name="sparkles" />
            <span>
              2 sản phẩm minh họa cần rà soát. Xem bằng chứng trước khi lựa chọn
              hành động.
            </span>
          </div>
          <p className="muted">
            Thông báo tổng hợp, không có sự kiện từ hệ thống thật.
          </p>
          <button
            className="button primary"
            onClick={() => {
              setNotifications(false);
              router.push(
                `/preview/${role}/${role === "admin" ? "monitor" : "suggestions"}`,
              );
            }}
          >
            Xem chi tiết
            <Icon name="arrow" size={16} />
          </button>
        </Modal>
      )}
    </div>
  );
}
