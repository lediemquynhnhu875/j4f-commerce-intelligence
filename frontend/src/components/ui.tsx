"use client";

import { useEffect, useRef, type ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  box: (
    <>
      <rect x="4" y="6" width="16" height="15" rx="2" />
      <path d="M3 3h18v5H3zM9 12h6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 3v18h17M8 15v3m5-8v8m5-13v13M7 10l5-5 4 3 5-6" />
    </>
  ),
  store: (
    <>
      <path d="M3 10l2-7h14l2 7M4 11v10h16V11M9 21v-7h6v7" />
      <path d="M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0M8 3l-1 7m9-7 1 7" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4" />
    </>
  ),
  sliders: (
    <>
      <path d="M3 6h5m4 0h9M3 12h11m4 0h3M3 18h3m4 0h11" />
      <circle cx="10" cy="6" r="2" />
      <circle cx="16" cy="12" r="2" />
      <circle cx="8" cy="18" r="2" />
    </>
  ),
  diamond: (
    <>
      <path d="m3 8 4-5h10l4 5-9 13L3 8Zm0 0h18M7 3l5 18 5-18M8.5 8l3.5-5 3.5 5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6 6a8 8 0 0 1 14 6M4 12a8 8 0 0 0 14 6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  logout: (
    <>
      <path d="M9 3H4v18h5M9 12h12m-5-5 5 5-5 5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l4 2" />
    </>
  ),
  shield: (
    <>
      <path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-3a7 7 0 0 1 14 0v3M16 4a4 4 0 0 1 0 8m2 3a5 5 0 0 1 4 6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 2v6m10-6v6M3 11h18" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-11v1" />
    </>
  ),
  warning: (
    <>
      <path d="m12 3 10 18H2L12 3Z" />
      <path d="M12 9v5m0 3v1" />
    </>
  ),
  menu: <path d="M3 5h18M3 12h18M3 19h18" />,
  close: <path d="m5 5 14 14M19 5 5 19" />,
  star: <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" />,
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M7 10V7a5 5 0 0 1 10 0v3M12 14v3" />
    </>
  ),
};
export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name] ?? paths.sparkles}
    </svg>
  );
}
export function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Icon name="diamond" size={26} />
      </span>
      <span>
        <span className="brand-name">
          Sellens<span className="brand-dss">DSS</span>
        </span>
        <small>Hiểu hiệu quả. Nhìn rõ cơ hội.</small>
      </span>
    </div>
  );
}
export function Badge({
  children,
  tone = "purple",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Panel({
  title,
  subtitle,
  children,
  action,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Stat({
  label,
  value,
  suffix,
  note,
  icon = "chart",
  tone = "purple",
}: {
  label: string;
  value: ReactNode;
  suffix?: string;
  note: string;
  icon?: string;
  tone?: string;
}) {
  return (
    <div className={`stat ${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon name={icon} />
        </span>
      </div>
      <div className="stat-value">
        {value}
        <small>{suffix}</small>
      </div>
      <p>{note}</p>
    </div>
  );
}
export function Empty({
  title = "Không tìm thấy kết quả",
  description = "Thử thay đổi từ khóa hoặc đặt lại bộ lọc.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty">
      <Icon name="search" size={34} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Đóng" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function downloadFixture(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob(
      [JSON.stringify({ source: "synthetic UI preview", data }, null, 2)],
      { type: "application/json" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}-demo.json`;
  a.click();
  URL.revokeObjectURL(url);
}
