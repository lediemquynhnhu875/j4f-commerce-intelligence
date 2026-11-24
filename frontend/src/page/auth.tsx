"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { ErrorPopup } from "@/components/popup";
import { Logo } from "@/components/ui";
import { api } from "@/lib/api-client";
import { useLiveSession } from "@/lib/use-live-session";
import type { Role } from "@/lib/workspace-pages";
import type { Account } from "@/types/api";

const AuthContext = createContext<{
  account: Account;
  logout: () => Promise<void>;
} | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("Workspace pages require Auth");
  return context;
}

export function Auth({ role, children }: { role: Role; children: ReactNode }) {
  const session = useLiveSession();
  const router = useRouter();

  async function logout() {
    await api("auth/logout", { method: "POST" });
    window.dispatchEvent(new Event("sellens-session-changed"));
    router.replace("/login");
    router.refresh();
  }

  if (session.loading) {
    return (
      <main className="access-screen">
        <Logo />
        <p role="status">Đang kiểm tra phiên đăng nhập…</p>
      </main>
    );
  }
  if (!session.account) {
    return (
      <main className="access-screen">
        <Logo />
        <h1>{session.error ? "Không thể kết nối" : "Mời bạn đăng nhập"}</h1>
        {session.error ? (
          <ErrorPopup message={session.error} />
        ) : (
          <p>Phiên đăng nhập chưa có hoặc đã hết hạn.</p>
        )}
        <Link className="button primary" href="/login">Đăng nhập</Link>
        {session.error && (
          <button className="button subtle" onClick={session.refresh}>Thử lại</button>
        )}
      </main>
    );
  }
  if (session.account.role !== role) {
    return (
      <main className="access-screen">
        <Logo />
        <h1>Không có quyền truy cập</h1>
        <Link className="button primary" href={`/${session.account.role}/overview`}>
          Về không gian của tôi
        </Link>
      </main>
    );
  }

  return (
    <AuthContext.Provider key={session.account.id} value={{ account: session.account, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
