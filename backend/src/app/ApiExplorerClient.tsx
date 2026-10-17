"use client";

import { useState } from "react";

interface RouteItem {
  method: string;
  path: string;
  access: string;
}

export default function ApiExplorerClient({
  routesList,
}: {
  routesList: RouteItem[];
}) {
  const [token, setToken] = useState<string>("");
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [responseOutput, setResponseOutput] = useState<string>(
    "// Kết quả response sẽ hiển thị tại đây...",
  );
  const [loading, setLoading] = useState<boolean>(false);

  // Đăng nhập nhanh bằng tài khoản seed Admin
  const handleQuickLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@gmail.com",
          password: "Admin@12345",
        }),
      });
      const data: any = await res.json();
      const tokenValue = data?.data?.access_token || data?.data?.token;

      if (res.ok && tokenValue) {
        setToken(tokenValue);
        setActiveAccount(data.data.account?.email || "admin@gmail.com");
        setResponseOutput(JSON.stringify(data, null, 2));
      } else {
        setResponseOutput(JSON.stringify(data, null, 2));
      }
    } catch (err: any) {
      setResponseOutput(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  // Test một endpoint GET bất kỳ
  const handleExecute = async (path: string, access: string) => {
    setLoading(true);
    try {
      // Thay thế placeholder :id bằng 1 để test nhanh
      const resolvedPath = path.replace(":id", "1");
      const headers: Record<string, string> = {};

      if (access !== "public") {
        if (!token) {
          setResponseOutput(
            "// Vui lòng bấm 'Quick Login' ở trên để lấy Token trước khi gọi API có bảo vệ.",
          );
          setLoading(false);
          return;
        }
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(resolvedPath, { headers });
      const data: any = await res.json();
      setResponseOutput(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResponseOutput(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          borderBottom: "1px solid #30363d",
          paddingBottom: "20px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#f0f6fc",
              margin: "0 0 6px 0",
            }}
          >
            J4F Commerce Intelligence API Explorer
          </h1>
          <p style={{ color: "#8b949e", margin: 0, fontSize: "14px" }}>
            Tổng cộng <b>{routesList.length}</b> endpoints đã đăng ký trong hệ
            thống
          </p>
        </div>
        <div>
          {token ? (
            <span
              style={{
                background: "#238636",
                color: "#fff",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "13px",
              }}
            >
              Đã xác thực: <b>{activeAccount}</b>
            </span>
          ) : (
            <button
              onClick={handleQuickLogin}
              disabled={loading}
              style={{
                background: "#1f6feb",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              {loading ? "Đang xử lý..." : "Quick Login (Admin)"}
            </button>
          )}
        </div>
      </div>

      {/* Response Preview Console */}
      <div style={{ marginBottom: "28px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#8b949e",
            fontSize: "12px",
            marginBottom: "6px",
          }}
        >
          <span>OUTPUT RESPONSE VIEWER</span>
          {loading && (
            <span style={{ color: "#58a6ff" }}>Sending request...</span>
          )}
        </div>
        <pre
          style={{
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "8px",
            padding: "16px",
            maxHeight: "220px",
            overflow: "auto",
            color: "#7ee787",
            fontFamily: "monospace",
            fontSize: "13px",
            margin: 0,
          }}
        >
          {responseOutput}
        </pre>
      </div>

      {/* Full Endpoints Table */}
      <div
        style={{
          background: "#161b22",
          border: "1px solid #30363d",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#1c2128",
                borderBottom: "1px solid #30363d",
                color: "#8b949e",
              }}
            >
              <th style={{ padding: "12px 16px" }}>METHOD</th>
              <th style={{ padding: "12px 16px" }}>PATH</th>
              <th style={{ padding: "12px 16px" }}>ACCESS</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>
                THAO TÁC
              </th>
            </tr>
          </thead>
          <tbody>
            {routesList.map((ep, idx) => {
              const isGet = ep.method === "GET";
              const isLogin = ep.path.includes("login");

              const methodColors: Record<string, string> = {
                GET: "#58a6ff",
                POST: "#3fb950",
                PATCH: "#d29922",
                DELETE: "#f85149",
              };

              return (
                <tr key={idx} style={{ borderBottom: "1px solid #21262d" }}>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontWeight: "700",
                      fontFamily: "monospace",
                      color: methodColors[ep.method] || "#c9d1d9",
                    }}
                  >
                    {ep.method}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontFamily: "monospace",
                      color: "#f0f6fc",
                    }}
                  >
                    {ep.path}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        backgroundColor:
                          ep.access === "admin"
                            ? "#381b22"
                            : ep.access === "user"
                              ? "#1f2a37"
                              : "#172b26",
                        color:
                          ep.access === "admin"
                            ? "#f85149"
                            : ep.access === "user"
                              ? "#79c0ff"
                              : "#3fb950",
                      }}
                    >
                      {ep.access.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    {isGet ? (
                      <button
                        onClick={() => handleExecute(ep.path, ep.access)}
                        style={{
                          background: "#21262d",
                          border: "1px solid #30363d",
                          color: "#58a6ff",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Run ▶
                      </button>
                    ) : isLogin ? (
                      <button
                        onClick={handleQuickLogin}
                        style={{
                          background: "#21262d",
                          border: "1px solid #30363d",
                          color: "#3fb950",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Login ▶
                      </button>
                    ) : (
                      <span style={{ color: "#484f58", fontSize: "12px" }}>
                        Body payload
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
