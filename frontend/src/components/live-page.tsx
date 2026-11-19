"use client";
import { ErrorPopup } from "@/components/popup";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdminSystem } from "@/page/connected/admin-summary";
import { api, allPages, ApiError } from "@/lib/api-client";
import { useLiveSession } from "@/lib/use-live-session";
import type {
  SystemSummary,
  Account,
  Store,
  Product,
  Category,
  Analysis,
  Action,
  Dataset,
  WorkspaceSummary,
  StoreOverview,
} from "@/types/api";
import { LiveShell, livePages } from "./live-shell";
import { Empty, Panel, Logo, Icon, Badge } from "./ui";
import { exportSaved } from "@/lib/analysis-presentation";
import { LiveStores } from "@/page/connected/administration";
import {
  LiveCatalog,
  LiveOverview,
  LiveAnalysis,
} from "@/page/connected/catalog";
import { LiveActions } from "@/page/connected/actions";
import { LiveAccounts } from "@/page/connected/admin";

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
  const [refreshVersion, setRefreshVersion] = useState(0);
  const userOverview = role === "user" && page === "overview";
  const targeted = role === "user" && (page === "analysis" || page === "products");
  const adminList = role === "admin" && (page === "stores" || page === "accounts");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetchData = useCallback(async (forExport = false): Promise<Dataset> => {
    if (role === "admin") {
      if (!forExport) {
        const summary = await api<{ data: Partial<SystemSummary> }>(`admin/summary?view=${page}`);
        return { systemSummary: summary.data, accounts: [], stores: [],
          products: [], categories: [], analyses: [], actions: [] };
      }
      const [summary, accounts, stores] = await Promise.all([
        api<{ data: SystemSummary }>("admin/summary"),
        allPages<Account>("admin/accounts", undefined, 100),
        allPages<Store>("stores", undefined, 100),
      ]);
      return {
        systemSummary: summary.data,
        accounts,
        stores,
        products: [],
        categories: [],
        analyses: [],
        actions: [],
      };
    }
    if (userOverview && !forExport) {
      const { data: overview } = await api<{ data: StoreOverview }>("workspace/overview");
      return {
        storeOverview: overview, workspaceSummary: overview.summary ?? undefined,
        products: [], categories: [], analyses: [], actions: [], accounts: [], stores: [],
      };
    }
    if (targeted && !forExport) {
      const [summary, categories] = await Promise.all([
        api<{ data: WorkspaceSummary }>("workspace/summary"),
        page === "products" ? allPages<Category>("categories", undefined, 100) : Promise.resolve([]),
      ]);
      return {
        workspaceSummary: summary.data, categories,
        products: [], analyses: [], actions: [], accounts: [], stores: [],
      };
    }
    const batchSize = forExport ? 100 : 20;
    const [products, categories, analyses, actions, accounts, stores] =
      await Promise.all([
        allPages<Product>("products", undefined, batchSize),
        allPages<Category>("categories", undefined, batchSize),
        allPages<Analysis>("analyses", undefined, batchSize),
        allPages<Action>("actions", undefined, batchSize),
        Promise.resolve([]),
        allPages<Store>("stores"),
      ]);
    return { products, categories, analyses, actions, accounts, stores };
  }, [role, page, targeted, userOverview]);
  const reportError = useCallback(
    (err: unknown) => {
      setError((err as Error).message);
      setData(null);
      if (err instanceof ApiError && err.status === 401) void refreshSession();
    },
    [refreshSession],
  );
  useEffect(() => {
    if (!account || account.role !== role || adminList) return;
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
  }, [account, role, adminList, fetchData, reportError]);
  async function refreshData() {
    if (adminList) {
      setRefreshVersion((value) => value + 1);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setData(await fetchData());
      setRefreshVersion((value) => value + 1);
    } catch (err) {
      reportError(err);
    } finally {
      setLoading(false);
    }
  }
  async function exportData() {
    setExporting(true);
    setExportError("");
    try {
      const exported = role === "admin" || userOverview ? await fetchData(true) : targeted
        ? page === "products" ? await allPages<Product>("products", undefined, 100) : await fetchData(true)
        : page === "suggestions" ? data?.actions : data;
      exportSaved(`sellens-${page}`, exported);
    } catch (err) {
      setExportError((err as Error).message);
    } finally {
      setExporting(false);
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
        {session.error ? (
          <ErrorPopup message={session.error} />
        ) : (
          <p>Phiên đăng nhập chưa có hoặc đã hết hạn.</p>
        )}
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
    <LiveShell
      account={session.account}
      page={page}
      storeName={
        data?.workspaceSummary?.store_name ?? data?.stores?.find(
          (store) => store.owner_user_id === session.account.id,
        )?.name
      }
      suggestionCount={
        data?.workspaceSummary?.proposed_count ?? data?.actions.filter((row) => row.status === "proposed").length ?? 0
      }
    >
      <div className="page-breadcrumb">
        <span>{role === "admin" ? "Phân hệ quản trị" : "Trang chủ"}</span>
        <Icon name="chevron" size={13} />
        <span>{title}</span>
        <Badge tone="gradient">{role.toUpperCase()}</Badge>
      </div>
      <section
        className={`page-hero ${page === "overview" ? "overview-hero" : ""}`}
      >
        <div>
          <span className="eyebrow">
            {role === "admin"
              ? "SELLENS · SYSTEM WORKSPACE"
              : "SELLENS · WORKSPACE"}
          </span>
          <h1>
            {role === "user" && page === "overview"
              ? `Xin chào ${session.account.full_name}`
              : title}
          </h1>
          <p>
            {(
              {
                overview:
                  role === "admin"
                    ? "Theo dõi tài khoản, cửa hàng và hoạt động phân tích của hệ thống."
                    : "Theo dõi sản phẩm và ưu tiên cơ hội cải thiện hiệu quả bán hàng.",
                products:
                  "Quản lý danh mục và đối chiếu tín hiệu quan sát từ snapshot.",
                analysis:
                  "Đọc bằng chứng, hiểu tham chiếu và giới hạn của từng kết luận.",
                suggestions:
                  "Rà soát đề xuất và chủ động theo dõi tiến độ thực hiện.",
                monitor: "Theo dõi hoạt động phân tích tổng hợp theo cửa hàng.",
                configuration:
                  "Đối chiếu phiên bản mô hình và cấu hình của từng kết quả.",
                stores: "Quản trị hồ sơ cửa hàng và quyền sở hữu sản phẩm.",
              } as Record<string, string>
            )[page] ?? "Quản lý dữ liệu đã lưu trong hệ thống."}
          </p>
        </div>
        <div className="hero-actions">
          {!adminList && !(role === "admin" && page === "configuration") && <div className="snapshot-chip">
            <Icon name="calendar" size={17} />
            <div>
              <small>Kết quả gần nhất</small>
              <strong>
                {data?.workspaceSummary?.latest_analyzed_at
                  ? new Date(data.workspaceSummary.latest_analyzed_at).toLocaleDateString("vi-VN")
                  : data?.analyses.length
                  ? new Date(
                      [...data.analyses].sort((a, b) =>
                        b.analyzed_at.localeCompare(a.analyzed_at),
                      )[0].analyzed_at,
                    ).toLocaleDateString("vi-VN")
                  : data?.systemSummary?.recent?.[0]
                    ? new Date(
                        data.systemSummary.recent[0].completed_at,
                      ).toLocaleDateString("vi-VN")
                    : "Chưa có kết quả"}
              </strong>
            </div>
          </div>}
          <button
            className="button primary"
            disabled={(!data && !adminList) || exporting}
            onClick={exportData}
          >
            <Icon name="download" size={16} />
            {exporting ? "Đang xuất dữ liệu…" : "Xuất dữ liệu"}
          </button>
          <button
            className="button subtle"
            onClick={refreshData}
            disabled={loading && !adminList}
          >
            <Icon name="refresh" />
            Tải lại
          </button>
        </div>
      </section>
      {exportError && <ErrorPopup message={exportError} />}
      {loading && !adminList && (
        <Panel>
          <p role="status">Đang tải dữ liệu…</p>
        </Panel>
      )}
      {error && !adminList && (
        <Panel>
          <ErrorPopup message={error} />
          <button className="button primary" onClick={refreshData}>
            Thử lại
          </button>
        </Panel>
      )}
      {role === "user" && page === "analysis" && (
        <LiveAnalysis
          key={account?.id}
          role={role}
          refreshVersion={refreshVersion}
          productId={params.get("product")}
          analysisId={params.get("analysis")}
        />
      )}
      {role === "user" && page === "products" && (
        <LiveCatalog
          key={account?.id}
          categories={data?.categories ?? []}
          legacyStatuses={data?.workspaceSummary?.legacy_statuses ?? []}
          role={role}
          refresh={refreshData}
          refreshVersion={refreshVersion}
        />
      )}
      {adminList && (page === "stores" ? (
        <LiveStores key={session.account.id} refreshVersion={refreshVersion} />
      ) : (
        <LiveAccounts
          key={session.account.id}
          actor={session.account}
          refresh={refreshData}
          refreshVersion={refreshVersion}
        />
      ))}
      {!error &&
        data &&
        !adminList &&
        !targeted &&
        (page === "overview" ? (
          role === "admin" ? (
            <AdminSystem data={data} />
          ) : (
            <LiveOverview overview={data.storeOverview} />
          )
        ) : page === "suggestions" ? (
          <LiveActions
            data={data}
            actor={session.account}
            refresh={refreshData}
          />
        ) : page === "monitor" ? (
          <AdminSystem data={data} view="monitor" />
        ) : page === "configuration" ? (
          <AdminSystem data={data} view="configuration" />
        ) : (
          <Empty
            title="Chưa có API cửa hàng"
            description="Schema hiện tại dùng catalog chung. Quản lý tài khoản qua trang Quản lý tài khoản; không suy ra cửa hàng từ seller metadata."
          />
        ))}
    </LiveShell>
  );
}
