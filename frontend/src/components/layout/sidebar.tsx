"use client";
import Link from "next/link";
import type { Role } from "@/lib/preview-fixtures";
import { Navigation } from "../navigation";
import { Badge, Icon, Logo } from "../ui";

export function Sidebar({
  role,
  page,
  open,
  onClose,
  onLogout,
}: {
  role: Role;
  page: string;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Đóng menu"
          onClick={onClose}
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link href={`/preview/${role}/overview`} className="logo-link">
          <Logo />
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Đóng menu"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
        {role === "admin" && (
          <div className="workspace-tag">
            <Icon name="shield" size={16} /> Hạ tầng DSS Phân tích{" "}
            <Badge>DEMO</Badge>
          </div>
        )}
        <Navigation role={role} current={page} onNavigate={onClose} />
        <div className="copilot-card">
          <div>
            <span className="mini-mark">
              <Icon name="sparkles" size={15} />
            </span>
            <strong>Sellens Copilot</strong>
            <Badge tone="gradient">Demo</Badge>
          </div>
          <p>Khám phá cơ hội từ dữ liệu minh họa</p>
          <div className="progress">
            <span style={{ width: "68%" }} />
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="baseline">
            <i className="dot" /> DSS Baseline <span>v2.4 Preview</span>
          </div>
          <button className="logout-button" onClick={onLogout}>
            <Icon name="logout" size={17} /> Đăng xuất demo
          </button>
        </div>
      </aside>
    </>
  );
}
