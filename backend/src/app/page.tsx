import { routes } from "@/server/api";

export const instant = false;

export default function ApiStatusPage() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 32, color: "#c9d1d9", fontFamily: "system-ui, sans-serif" }}>
      <h1>Sellens API</h1>
      <p>Danh sách endpoint và quyền truy cập được lấy từ cấu hình backend.</p>
      <p>
        <a href="/api/v1/health" style={{ color: "#79c0ff" }}>Kiểm tra backend</a>
        {" · "}
        <a href="/api/v1/ready" style={{ color: "#79c0ff" }}>Kiểm tra kết nối PostgreSQL</a>
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr>
              <th style={{ padding: 12 }}>Phương thức</th>
              <th style={{ padding: 12 }}>Đường dẫn</th>
              <th style={{ padding: 12 }}>Quyền truy cập</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(routes).map(([endpoint, config]) => {
              const [method, path] = endpoint.split(" ");
              return (
                <tr key={endpoint} style={{ borderTop: "1px solid #30363d" }}>
                  <td style={{ padding: 12 }}><code>{method}</code></td>
                  <td style={{ padding: 12 }}><code>{path}</code></td>
                  <td style={{ padding: 12 }}>{config.access}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
