"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { Account } from "@/types/api";
import { Badge, Icon, Logo } from "./ui";

export function LiveLogin() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false); const [error, setError] = useState(""); const [show, setShow] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError("");
    try {
      const result = await api<{ data: { account: Account } }>("auth/login", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) });
      setPassword(""); window.dispatchEvent(new Event("sellens-session-changed")); router.push(`/${result.data.account.role}/overview`); router.refresh();
    } catch (err) { setError((err as Error).message); }
    finally { setPending(false); }
  }
  return <main className="login-screen">
    <div className="login-story"><Logo /><div className="login-copy"><Badge tone="gradient">DECISION SUPPORT PLATFORM</Badge>
      <h1>Hiểu dữ liệu.<br /><span>Nhìn rõ cơ hội.</span></h1><p>Đọc bằng chứng từ catalog chung.<br />Theo dõi quyết định và công việc của bạn.</p>
      <div className="login-points"><span><Icon name="shield" /> Bằng chứng rõ ràng</span><span><Icon name="sparkles" /> Quyết định chủ động</span></div>
    </div><small className="login-foot">SELLENS DSS · J4F COMMERCE INTELLIGENCE</small></div>
    <div className="login-form-side"><div className="login-form"><Badge tone="purple">SELLENS WORKSPACE</Badge>
      <h2>Chào mừng trở lại</h2><p>Đăng nhập bằng tài khoản do quản trị viên cấp.</p>
      <form onSubmit={submit}><label htmlFor="email">Địa chỉ email</label><input id="email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} />
        <label htmlFor="password">Mật khẩu</label><div className="password-field"><input id="password" type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
          <button type="button" className="icon-button" aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShow(!show)}><Icon name="eye" /></button></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button primary login-submit" disabled={pending}>{pending ? "Đang đăng nhập…" : "Đăng nhập"}<Icon name="arrow" /></button>
      </form><div className="notice"><Icon name="info" /><span>Catalog dùng chung cho tài khoản hoạt động. Dữ liệu mẫu là minh họa; chưa chạy mô hình phân tích.</span></div>
      <Link className="text-link" href="/preview/demo-login">Xem giao diện mock riêng</Link>
    </div></div>
  </main>;
}
