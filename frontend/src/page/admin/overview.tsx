"use client";

import { RecentAnalyses } from "@/components/admin/recent-analyses";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { Stat } from "@/components/ui";
import { useWorkspaceData } from "@/lib/use-workspace-data";
import { exportAdminWorkspace, loadAdminSummary } from "@/lib/workspace-data";
import type { SystemSummary } from "@/types/api";

const loadOverview = (signal: AbortSignal) =>
  loadAdminSummary("overview", signal);

export default function AdminOverview() {
  const { data, loading, error, refresh } = useWorkspaceData(loadOverview);
  return (
    <WorkspaceLayout
      page="overview"
      description="Theo dõi tài khoản, cửa hàng và hoạt động phân tích của hệ thống."
      latestResult={data?.recent?.[0]?.completed_at ?? null}
      loading={loading}
      error={error}
      canExport={Boolean(data)}
      onExport={exportAdminWorkspace}
      onRefresh={refresh}
    >
      {data && (
        <>
          <SystemStats summary={data} />
          <RecentAnalyses rows={data.recent ?? []} />
        </>
      )}
    </WorkspaceLayout>
  );
}

function SystemStats({ summary }: { summary: Partial<SystemSummary> }) {
  return (
    <div className="stats-grid four">
      <Stat
        label="Tổng tài khoản"
        value={summary.accounts ?? "—"}
        note="Các tài khoản trong hệ thống"
        icon="users"
      />
      <Stat
        label="Đang hoạt động"
        value={summary.active_accounts ?? "—"}
        note={`${(summary.accounts ?? 0) - (summary.active_accounts ?? 0)} tài khoản bị khóa`}
        icon="shield"
      />
      <Stat
        label="Tổng cửa hàng"
        value={summary.stores ?? "—"}
        note="Mỗi tài khoản User có một cửa hàng"
        icon="store"
      />
      <Stat
        label="Sản phẩm đã tải lên"
        value={summary.products ?? "—"}
        note="Tổng hợp toàn hệ thống"
        icon="box"
      />
      <Stat
        label="Yêu cầu phân tích"
        value={summary.analysis_requests ?? "—"}
        note="Chưa triển khai tác vụ phân tích theo yêu cầu"
      />
      <Stat
        label="Đang phân tích"
        value={summary.running_requests ?? "—"}
        note="Chưa có dữ liệu tác vụ trực tiếp"
        icon="clock"
      />
      <Stat
        label="Kết quả đã lưu"
        value={summary.saved_results ?? "—"}
        note="Các kết quả phân tích đã được nhập"
      />
    </div>
  );
}
