"use client";
import { DEMO_ACCOUNTS, rolePages, type Role } from "@/lib/preview-fixtures";
import { Badge, Icon } from "../ui";

export function Header({
  role,
  page,
  onOpenMenu,
  onOpenNotifications,
  live = false,
  profile,
  pages = rolePages[role],
}: {
  role: Role;
  page: string;
  onOpenMenu: () => void;
  onOpenNotifications: () => void;
  live?: boolean;
  profile?: { name: string; initials: string };
  pages?: { slug: string; label: string; icon: string }[];
}) {
  const account = profile ?? DEMO_ACCOUNTS.find((a) => a.role === role)!;
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
              <strong>{live ? " J4F Shop" : "Test Store"}</strong>
            </span>
          </span>
        ) : (
          <div>
            <strong>Quản trị hệ thống Sellens</strong>
            <small>
              <i className="dot" />{" "}
              {live ? "Dữ liệu đã kết nối" : "Bản xem trước giao diện"}
            </small>
          </div>
        )}
        <Icon name="chevron" size={14} />
        <span className="topbar-page">
          {pages.find((p) => p.slug === page)?.label}
        </span>
      </div>
      <div className="topbar-right">
        <Badge tone={live ? "green" : "purple"}>
          {live ? "CONNECTED" : "MOCK DATA"}
        </Badge>
        <button
          className="icon-button notification-button"
          aria-label={live ? "Thông báo" : "Thông báo demo"}
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
                : live
                  ? "Người dùng"
                  : "Chủ cửa hàng"}
            </small>
          </div>
          <span className="avatar">{account.initials}</span>
        </div>
      </div>
    </header>
  );
}
