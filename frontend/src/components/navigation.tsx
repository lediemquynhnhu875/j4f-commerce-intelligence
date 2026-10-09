"use client";
import Link from "next/link";
import { rolePages, type Role } from "@/lib/preview-fixtures";
import { Icon } from "./ui";
export function Navigation({
  role,
  current,
  onNavigate,
}: {
  role: Role;
  current: string;
  onNavigate: () => void;
}) {
  return (
    <nav
      aria-label={
        role === "admin" ? "Phân hệ quản trị" : "Phân hệ chủ cửa hàng"
      }
    >
      <p className="nav-label">
        {role === "admin" ? "PHÂN HỆ QUẢN TRỊ" : "PHÂN HỆ CHỦ CỬA HÀNG"}
        <span className="dot" />
      </p>
      {rolePages[role].map((page) => (
        <Link
          key={page.slug}
          href={`/preview/${role}/${page.slug}`}
          onClick={onNavigate}
          aria-current={current === page.slug ? "page" : undefined}
          className={`nav-link ${current === page.slug ? "active" : ""}`}
        >
          <Icon name={page.icon} />
          <span>{page.label}</span>
          {page.slug === "suggestions" && (
            <span className="nav-count" aria-hidden="true">
              4
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
