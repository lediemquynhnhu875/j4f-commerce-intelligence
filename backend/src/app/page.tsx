import { routes } from "@/server/api";
import ApiExplorerClient from "./ApiExplorerClient";

export const instant = false;

export default function ApiStatusPage() {
  // Tự động chuyển đổi tất cả 39 endpoints từ api.ts thành mảng danh sách
  const routesList = Object.entries(routes).map(([endpoint, config]) => {
    const [method, path] = endpoint.split(" ");
    return {
      method,
      path,
      access: config.access,
    };
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0d1117",
        color: "#c9d1d9",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "32px 24px",
      }}
    >
      <div style={{ maxWidth: "1150px", margin: "0 auto" }}>
        <ApiExplorerClient routesList={routesList} />
      </div>
    </div>
  );
}
