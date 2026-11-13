"use client";
import Link from "next/link";
import type { Role, WorkspacePage } from "@/lib/workspace-pages";
import { Icon } from "./ui";
export function Navigation({
  role,
  current,
  onNavigate,
  pages,
  suggestionCount = 0,
}: {
  role: Role;
  current: string;
  onNavigate: () => void;
  pages: WorkspacePage[];
  suggestionCount?:number;
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
      {pages.map((page) => (
        <Link
          key={page.slug}
          href={`/${role}/${page.slug}`}
          onClick={onNavigate}
          aria-current={current === page.slug ? "page" : undefined}
          className={`nav-link ${current === page.slug ? "active" : ""}`}
        >
          <Icon name={page.icon} />
          <span>{page.label}</span>
          {page.slug === "suggestions" && (
            <span className="nav-count" aria-hidden="true">
              {suggestionCount}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
