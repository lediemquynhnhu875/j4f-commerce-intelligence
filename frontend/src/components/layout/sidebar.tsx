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
  live = false,
  pages,
  suggestionCount,
}: {
  role: Role;
  page: string;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  live?: boolean;
  pages?: { slug: string; label: string; icon: string }[];
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
          href={`${live ? "" : "/preview"}/${role}/overview`}
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
            <Badge>{live ? "ADMIN" : "DEMO"}</Badge>
          </div>
        )}
        <Navigation
          role={role}
          current={page}
          onNavigate={onClose}
          pages={pages}
          basePath={live ? "" : "/preview"}
          suggestionCount={suggestionCount}
        />
        <div className="sidebar-bottom">
          <div className="baseline">
            <i className="dot" /> {live ? "Dữ liệu phân tích" : "DSS Baseline"}{" "}
            <span>{live ? "Đã lưu" : "v2.4 Preview"}</span>
          </div>
          <button className="logout-button" onClick={onLogout}>
            <Icon name="logout" size={17} />{" "}
            {live ? "Đăng xuất" : "Đăng xuất demo"}
          </button>
        </div>
      </aside>
    </>
  );
}
