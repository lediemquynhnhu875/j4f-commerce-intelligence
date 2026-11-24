"use client";
import Link from "next/link";
import type { Role, WorkspacePage } from "@/lib/workspace-pages";
import { Navigation } from "../navigation";
import { Badge, Icon, Logo } from "../ui";

export function Sidebar({
  role,
  page,
  open,
  onClose,
  onLogout,
  pages,
  suggestionCount,
}: {
  role: Role;
  page: string;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  pages: WorkspacePage[];
  suggestionCount?: number;
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
        <Link
          href={`/${role}/overview`}
          className="logo-link"
        >
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
            <Badge>ADMIN</Badge>
          </div>
        )}
        <Navigation
          role={role}
          current={page}
          onNavigate={onClose}
          pages={pages}
          suggestionCount={suggestionCount}
        />
        <div className="sidebar-bottom">
          <div className="baseline">
            <i className="dot" /> Dữ liệu phân tích{" "}
            <span>Đã lưu</span>
          </div>
          <button className="logout-button" onClick={onLogout}>
            <Icon name="logout" size={17} />{" "}
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}
