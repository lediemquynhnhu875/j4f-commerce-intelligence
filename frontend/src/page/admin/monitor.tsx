"use client";

import { RecentAnalyses } from "@/components/admin/recent-analyses";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { useWorkspaceData } from "@/lib/use-workspace-data";
import { exportAdminWorkspace, loadAdminSummary } from "@/lib/workspace-data";

const loadMonitor = (signal: AbortSignal) =>
  loadAdminSummary("monitor", signal);

export default function AdminMonitor() {
  const { data, loading, error, refresh } = useWorkspaceData(loadMonitor);
  return (
    <WorkspaceLayout
      page="monitor"
      description="Theo dõi hoạt động phân tích tổng hợp theo cửa hàng."
      latestResult={data?.recent?.[0]?.completed_at ?? null}
      loading={loading}
      error={error}
      canExport={Boolean(data)}
      onExport={exportAdminWorkspace}
      onRefresh={refresh}
    >
      {data && <RecentAnalyses rows={data.recent ?? []} />}
    </WorkspaceLayout>
  );
}
