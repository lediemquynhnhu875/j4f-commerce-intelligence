"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DEMO_ACCOUNTS, type Role } from "@/lib/preview-fixtures";
import { setDemoRole } from "@/lib/demo-session";
import { Badge, Icon, Logo } from "./ui";

export function DemoLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  function fill(role: Role) {
    const account = DEMO_ACCOUNTS.find((a) => a.role === role)!;
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    const account = DEMO_ACCOUNTS.find(
      (a) => a.email === email.trim().toLowerCase() && a.password === password,
    );
    if (!account) {
      setError("Email hoặc mật khẩu demo không đúng. Vui lòng thử lại.");
      setPending(false);
      return;
    }
    setDemoRole(account.role);
    router.push(`/preview/${account.role}/overview`);
  }
  return (
    <main className="login-screen">
      <div className="login-story">
        <Logo />
        <div className="login-copy">
          <Badge tone="gradient">DECISION SUPPORT PLATFORM</Badge>
          <h1>
            Hiểu dữ liệu.
            <br />
            <span>Nhìn rõ cơ hội.</span>
          </h1>
          <p>
            Một góc nhìn rõ ràng về hiệu quả sản phẩm.
            <br />
            Từ bằng chứng đến quyết định, cùng Sellens.
          </p>
          <div className="login-illustration">
            <div className="illustration-head">
              <span>
                <Icon name="chart" /> Hiệu quả danh mục
              </span>
              <Badge tone="green">Snapshot demo</Badge>
            </div>
            <div className="illustration-metric">
              6 <small>sản phẩm minh họa</small>
            </div>
            <div className="illustration-bars">
              {[36, 58, 44, 76, 62, 88, 72, 98].map((v, i) => (
                <span key={i} style={{ height: `${v}%` }} />
              ))}
            </div>
            <div className="illustration-bottom">
              <span>
                <i className="dot" /> Dữ liệu quan sát
              </span>
              <span>
                Khám phá cơ hội <Icon name="arrow" size={16} />
              </span>
            </div>
          </div>
          <div className="login-points">
            <span>
              <Icon name="shield" /> Bằng chứng rõ ràng
            </span>
            <span>
              <Icon name="sparkles" /> Quyết định chủ động
            </span>
          </div>
        </div>
        <small className="login-foot">
          SELLENS DSS · J4F COMMERCE INTELLIGENCE
        </small>
      </div>
      <div className="login-form-side">
        <div className="login-form">
          <Badge tone="purple">BẢN DEMO GIAO DIỆN</Badge>
          <h2>Chào mừng trở lại</h2>
          <p>Đăng nhập để khám phá không gian làm việc của bạn.</p>
          <form onSubmit={submit}>
            <label htmlFor="email">Địa chỉ email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@sellens.demo"
            />
            <label htmlFor="password">Mật khẩu</label>
            <div className="password-field">
              <input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu demo"
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                <Icon name="eye" />
              </button>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary login-submit" disabled={pending}>
              {pending ? "Đang đăng nhập demo…" : "Đăng nhập"}
              <Icon name="arrow" size={18} />
            </button>
          </form>
          <div className="demo-divider">
            <span>CHỌN TÀI KHOẢN DEMO</span>
          </div>
          <div className="demo-accounts">
            <button onClick={() => fill("admin")}>
              <span className="demo-account-icon">
                <Icon name="shield" />
              </span>
              <strong>Admin</strong>
              <small>Quản trị hệ thống</small>
            </button>
            <button onClick={() => fill("user")}>
              <span className="demo-account-icon blue">
                <Icon name="store" />
              </span>
              <strong>Chủ cửa hàng</strong>
              <small>Juno Official Store</small>
            </button>
          </div>
          <p className="demo-password">
            Mật khẩu chung: <code>Sellens123!</code>
          </p>
          <div className="notice">
            <Icon name="info" />
            <span>
              Tài khoản và dữ liệu đều là mock. Phiên demo chỉ lưu trong tab
              trình duyệt, chưa kết nối backend hay mô hình.
            </span>
          </div>
        </div>
        <small className="login-form-footer">
          Cần tài khoản thật? Liên hệ quản trị viên của bạn.
        </small>
      </div>
    </main>
  );
}
