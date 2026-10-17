"use client";
import Link from "next/link";
import { rolePages, type Role } from "@/lib/preview-fixtures";
import { Icon } from "./ui";
export function Navigation({
  role,
  current,
  onNavigate,
  pages = rolePages[role],
  basePath = "/preview",
  suggestionCount = 4,
}: {
  role: Role;
  current: string;
  onNavigate: () => void;
  pages?:{slug:string;label:string;icon:string}[];
  basePath?:string;
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
          href={`${basePath}/${role}/${page.slug}`}
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
