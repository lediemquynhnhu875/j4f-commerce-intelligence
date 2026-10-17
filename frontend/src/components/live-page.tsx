"use client";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { allPages, ApiError } from "@/lib/api-client";
import { useLiveSession } from "@/lib/use-live-session";
import type {
  Account,
  Product,
  Category,
  Analysis,
  Action,
  Dataset,
} from "@/types/api";
import { LiveShell, livePages } from "./live-shell";
import { Empty, Panel, Logo, Icon, Badge } from "./ui";
import { exportSaved } from "@/lib/analysis-presentation";
import { LiveAdminOverview,LiveStoresUnavailable } from "@/features/connected/administration";
import {
  LiveCatalog,
  LiveOverview,
  LiveAnalysis,
  LiveMonitor,
  LiveConfiguration,
} from "@/features/connected/catalog";
import { LiveActions } from "@/features/connected/actions";
import { LiveAccounts, LiveCategories } from "@/features/connected/admin";

export function LivePage({
  role,
  page,
}: {
  role: "user" | "admin";
  page: string;
}) {
  const session = useLiveSession();
  const params = useSearchParams();
  const { account, refresh: refreshSession } = session;
  const [data, setData] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetchData = useCallback(async (): Promise<Dataset> => {
    const [products, categories, analyses, actions, accounts] =
      await Promise.all([
        allPages<Product>("products"),
        allPages<Category>("categories"),
        allPages<Analysis>("analyses"),
        allPages<Action>("actions"),
        role === "admin"
          ? allPages<Account>("admin/accounts")
          : Promise.resolve([]),
      ]);
    return { products, categories, analyses, actions, accounts };
  }, [role]);
  const reportError = useCallback(
    (err: unknown) => {
      setError((err as Error).message);
      setData(null);
      if (err instanceof ApiError && err.status === 401) void refreshSession();
    },
    [refreshSession],
  );
  useEffect(() => {
    if (!account || account.role !== role) return;
    let active = true;
    void fetchData()
      .then((result) => {
        if (active) {
          setData(result);
          setError("");
        }
      })
      .catch((err) => {
        if (active) reportError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [account, role, fetchData, reportError]);
  async function refreshData() {
    setLoading(true);
    setError("");
    try {
      setData(await fetchData());
    } catch (err) {
      reportError(err);
    } finally {
      setLoading(false);
    }
  }
  if (session.loading)
    return (
      <main className="access-screen">
        <Logo />
        <p role="status">Đang kiểm tra phiên đăng nhập…</p>
      </main>
    );
  if (!session.account)
    return (
      <main className="access-screen">
        <Logo />
        <h1>{session.error ? "Không thể kết nối" : "Mời bạn đăng nhập"}</h1>
        <p role={session.error ? "alert" : undefined}>
          {session.error || "Phiên đăng nhập chưa có hoặc đã hết hạn."}
        </p>
        <Link className="button primary" href="/login">
          Đăng nhập
        </Link>
        {session.error && (
          <button className="button subtle" onClick={session.refresh}>
            Thử lại
          </button>
        )}
      </main>
    );
  if (session.account.role !== role)
    return (
      <main className="access-screen">
        <Logo />
        <h1>Không có quyền truy cập</h1>
        <Link
          className="button primary"
          href={`/${session.account.role}/overview`}
        >
          Về không gian của tôi
        </Link>
      </main>
    );
  const title =
    livePages[role].find((item) => item.slug === page)?.label ??
    (page === "analysis" ? "Kết quả phân tích" : "Cửa hàng chưa khả dụng");
  return (
    <LiveShell account={session.account} page={page} suggestionCount={data?.actions.filter(row=>row.status==="proposed").length??0}>
      <div className="page-breadcrumb"><span>{role==="admin"?"Phân hệ quản trị":"Trang chủ"}</span><Icon name="chevron" size={13}/><span>{title}</span><Badge tone="gradient">{role.toUpperCase()}</Badge></div>
      <section className={`page-hero ${page==="overview"?"overview-hero":""}`}>
        <div>
          <span className="eyebrow">{role==="admin"?"SELLENS · SYSTEM WORKSPACE":"SELLENS · WORKSPACE"}</span>
          <h1>{role==="user"&&page==="overview"?`Xin chào ${session.account.full_name}`:title}</h1>
          <p>
            {({overview:"Theo dõi sản phẩm và ưu tiên cơ hội cải thiện hiệu quả bán hàng.",products:"Quản lý danh mục và đối chiếu tín hiệu quan sát từ snapshot.",analysis:"Đọc bằng chứng, hiểu tham chiếu và giới hạn của từng kết luận.",suggestions:"Rà soát đề xuất và chủ động theo dõi tiến độ thực hiện.",monitor:"Xem kết quả phân tích và kiểm tra dữ liệu đã lưu.",configuration:"Đối chiếu phiên bản mô hình và cấu hình của từng kết quả.",stores:"Quản trị hồ sơ cửa hàng và quyền sở hữu sản phẩm."} as Record<string,string>)[page]??"Quản lý dữ liệu đã lưu trong hệ thống."}
          </p>
        </div>
        <div className="hero-actions"><div className="snapshot-chip"><Icon name="calendar" size={17}/><div><small>Kết quả gần nhất</small><strong>{data?.analyses.length?new Date([...data.analyses].sort((a,b)=>b.analyzed_at.localeCompare(a.analyzed_at))[0].analyzed_at).toLocaleDateString("vi-VN"):"Chưa có kết quả"}</strong></div></div>
        <button className="button primary" disabled={!data} onClick={()=>exportSaved(`sellens-${page}`,page==="products"?data?.products:page==="suggestions"?data?.actions:data)}><Icon name="download" size={16}/>Xuất dữ liệu</button>
        <button
          className="button subtle"
          onClick={refreshData}
          disabled={loading}
        >
          <Icon name="refresh" />
          Tải lại
        </button></div>
      </section>
      {loading && (
        <Panel>
          <p role="status">Đang tải dữ liệu…</p>
        </Panel>
      )}
      {error && (
        <Panel>
          <p role="alert" className="form-error">
            {error}
          </p>
          <button className="button primary" onClick={refreshData}>
            Thử lại
          </button>
        </Panel>
      )}
      {!error &&
        data &&
        (page === "overview" ? (
          role==="admin"?<LiveAdminOverview data={data}/>:<LiveOverview data={data} role={role} />
        ) : page === "products" ? (
          <LiveCatalog data={data} role={role} refresh={refreshData} />
        ) : page === "analysis" ? (
          <LiveAnalysis
            data={data}
            role={role}
            productId={params.get("product")}
            analysisId={params.get("analysis")}
          />
        ) : page === "suggestions" ? (
          <LiveActions
            data={data}
            actor={session.account}
            refresh={refreshData}
          />
        ) : page === "accounts" ? (
          <LiveAccounts
            data={data}
            actor={session.account}
            refresh={refreshData}
          />
        ) : page === "categories" ? (
          <LiveCategories data={data} refresh={refreshData} />
        ) : page === "monitor" ? (
          <LiveMonitor data={data} role={role} />
        ) : page === "configuration" ? (
          <LiveConfiguration data={data} />
        ) : page === "stores" ? (
          <LiveStoresUnavailable data={data}/>
        ) : (
          <Empty
            title="Chưa có API cửa hàng"
            description="Schema hiện tại dùng catalog chung. Quản lý tài khoản qua trang Quản lý tài khoản; không suy ra cửa hàng từ seller metadata."
          />
        ))}
    </LiveShell>
  );
}
