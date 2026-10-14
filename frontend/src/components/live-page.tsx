"use client";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { allPages, ApiError } from "@/lib/api-client";
import { useLiveSession } from "@/lib/use-live-session";
import type { Account, Product, Category, Analysis, Action, Dataset } from "@/types/api";
import { LiveShell, livePages } from "./live-shell";
import { Empty, Panel, Logo, Icon } from "./ui";
import { LiveCatalog, LiveOverview, LiveAnalysis, LiveMonitor, LiveConfiguration } from "@/features/connected/catalog";
import { LiveActions } from "@/features/connected/actions";
import { LiveAccounts, LiveCategories } from "@/features/connected/admin";

export function LivePage({ role, page }: { role: "user" | "admin"; page: string }) {
  const session = useLiveSession(); const params = useSearchParams();
  const { account, refresh: refreshSession } = session;
  const [data, setData] = useState<Dataset | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const fetchData = useCallback(async (): Promise<Dataset> => {
    const [products, categories, analyses, actions, accounts] = await Promise.all([
      allPages<Product>("products"), allPages<Category>("categories"), allPages<Analysis>("analyses"), allPages<Action>("actions"),
      role === "admin" ? allPages<Account>("admin/accounts") : Promise.resolve([]),
    ]);
    return { products, categories, analyses, actions, accounts };
  }, [role]);
  const reportError = useCallback((err: unknown) => {
    setError((err as Error).message); setData(null);
    if (err instanceof ApiError && err.status === 401) void refreshSession();
  }, [refreshSession]);
  useEffect(() => {
    if (!account || account.role !== role) return;
    let active = true;
    void fetchData().then(result => { if (active) { setData(result); setError(""); } })
      .catch(err => { if (active) reportError(err); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [account, role, fetchData, reportError]);
  async function refreshData() {
    setLoading(true); setError("");
    try { setData(await fetchData()); } catch (err) { reportError(err); } finally { setLoading(false); }
  }
  if (session.loading) return <main className="access-screen"><Logo /><p role="status">Đang kiểm tra phiên đăng nhập…</p></main>;
  if (!session.account) return <main className="access-screen"><Logo /><h1>{session.error ? "Không thể kết nối" : "Mời bạn đăng nhập"}</h1><p role={session.error ? "alert" : undefined}>{session.error || "Phiên đăng nhập chưa có hoặc đã hết hạn."}</p><Link className="button primary" href="/login">Đăng nhập</Link>{session.error && <button className="button subtle" onClick={session.refresh}>Thử lại</button>}</main>;
  if (session.account.role !== role) return <main className="access-screen"><Logo /><h1>Không có quyền truy cập</h1><Link className="button primary" href={`/${session.account.role}/overview`}>Về không gian của tôi</Link></main>;
  const title = livePages[role].find(item => item.slug === page)?.label ?? (page === "analysis" ? "Kết quả phân tích" : "Cửa hàng chưa khả dụng");
  return <LiveShell account={session.account} page={page}><section className="page-hero"><div><span className="eyebrow">SELLENS · SHARED CATALOG</span><h1>{title}</h1><p>Đọc dữ liệu và kết quả đã lưu; giá trị chưa biết được giữ nguyên.</p></div><button className="button subtle" onClick={refreshData} disabled={loading}><Icon name="refresh" />Tải lại</button></section>
    {loading && <Panel><p role="status">Đang tải dữ liệu…</p></Panel>}
    {error && <Panel><p role="alert" className="form-error">{error}</p><button className="button primary" onClick={refreshData}>Thử lại</button></Panel>}
    {!error && data && (page === "overview" ? <LiveOverview data={data} role={role} />
      : page === "products" ? <LiveCatalog data={data} role={role} refresh={refreshData} />
      : page === "analysis" ? <LiveAnalysis data={data} role={role} productId={params.get("product")} analysisId={params.get("analysis")} />
      : page === "suggestions" ? <LiveActions data={data} actor={session.account} refresh={refreshData} />
      : page === "accounts" ? <LiveAccounts data={data} actor={session.account} refresh={refreshData} />
      : page === "categories" ? <LiveCategories data={data} refresh={refreshData} />
      : page === "monitor" ? <LiveMonitor data={data} role={role} />
      : page === "configuration" ? <LiveConfiguration data={data} />
      : <Empty title="Chưa có API cửa hàng" description="Schema hiện tại dùng catalog chung. Quản lý tài khoản qua trang Quản lý tài khoản; không suy ra cửa hàng từ seller metadata." />)}
  </LiveShell>;
}
