"use client";
import type { Role, WorkspacePage } from "@/lib/workspace-pages";
import { Badge, Icon } from "../ui";

export function Header({
  role,
  page,
  onOpenMenu,
  onOpenNotifications,
  profile,
  pages,
  storeName,
}: {
  role: Role;
  page: string;
  onOpenMenu: () => void;
  onOpenNotifications: () => void;
  profile: { name: string; initials: string };
  pages: WorkspacePage[];
  storeName?: string;
}) {
  const account = profile;
  return (
    <header className="topbar">
      <button
        className="menu-button icon-button"
        aria-label="Mở menu"
        onClick={onOpenMenu}
      >
        <Icon name="menu" />
      </button>
      <div className="topbar-context">
        {role === "user" ? (
          <span className="store-pill">
            <Icon name="store" size={16} />
            <span>
              Cửa hàng:
              <strong> {storeName ?? "Đang tải cửa hàng…"}</strong>
            </span>
          </span>
        ) : (
          <div>
            <strong>Quản trị hệ thống Sellens</strong>
            <small>
              <i className="dot" />{" "}
              Dữ liệu đã kết nối
            </small>
          </div>
        )}
        <Icon name="chevron" size={14} />
        <span className="topbar-page">
          {pages.find((p) => p.slug === page)?.label}
        </span>
      </div>
      <div className="topbar-right">
        <Badge tone="green">CONNECTED</Badge>
        <button
          className="icon-button notification-button"
          aria-label="Thông báo"
          onClick={onOpenNotifications}
        >
          <Icon name="bell" />
          <i />
        </button>
        <div className="profile">
          <div>
            <strong>{account.name}</strong>
            <small>
              {role === "admin"
                ? "Quản trị viên"
                : "Người dùng"}
            </small>
          </div>
          <span className="avatar">{account.initials}</span>
        </div>
      </div>
    </header>
  );
}
