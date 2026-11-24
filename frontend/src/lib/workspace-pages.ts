export type Role = "user" | "admin";
export type WorkspacePage = { slug: string; label: string; icon: string };

export const workspacePages = {
  user: [
    { slug: "overview", label: "Tổng quan", icon: "grid" },
    { slug: "products", label: "Danh mục sản phẩm", icon: "box" },
    { slug: "analysis", label: "Kết quả phân tích", icon: "chart" },
    { slug: "suggestions", label: "Đề xuất cải thiện", icon: "sparkles" },
  ],
  admin: [
    { slug: "overview", label: "Tổng quan hệ thống", icon: "grid" },
    { slug: "stores", label: "Quản lý cửa hàng", icon: "store" },
    { slug: "accounts", label: "Quản lý tài khoản", icon: "users" },
    { slug: "monitor", label: "Hoạt động phân tích", icon: "chart" },
    { slug: "configuration", label: "Cấu hình đã lưu", icon: "sliders" },
  ],
};

export function isWorkspacePage(role: string, page: string): role is Role {
  if (role !== "user" && role !== "admin") return false;
  return (role === "user" && page === "analysis") || workspacePages[role].some(item => item.slug === page);
}
