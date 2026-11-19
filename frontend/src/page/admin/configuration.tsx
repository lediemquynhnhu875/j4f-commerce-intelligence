"use client";

import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { Empty, Panel } from "@/components/ui";
import { useWorkspaceData } from "@/lib/use-workspace-data";
import { exportAdminWorkspace, loadAdminSummary } from "@/lib/workspace-data";
import type { SystemSummary } from "@/types/api";

const loadConfiguration = (signal: AbortSignal) =>
  loadAdminSummary("configuration", signal);

export default function AdminConfiguration() {
  const { data, loading, error, refresh } = useWorkspaceData(loadConfiguration);
  return (
    <WorkspaceLayout
      page="configuration"
      description="Đối chiếu phiên bản mô hình và cấu hình của từng kết quả."
      loading={loading}
      error={error}
      canExport={Boolean(data)}
      onExport={exportAdminWorkspace}
      onRefresh={refresh}
    >
      {data && <ModelVersions versions={data.versions ?? []} />}
    </WorkspaceLayout>
  );
}

function ModelVersions({ versions }: { versions: SystemSummary["versions"] }) {
  return (
    <Panel title="Phiên bản mô hình đã sử dụng">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>MÔ HÌNH</th>
              <th>PIPELINE</th>
              <th>TAXONOMY</th>
              <th>SỬ DỤNG GẦN NHẤT</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((version, index) => (
              <tr key={index}>
                <td>{version.model_version ?? "Chưa ghi nhận"}</td>
                <td>{version.pipeline_version}</td>
                <td>{version.taxonomy_version ?? "Chưa ghi nhận"}</td>
                <td>{new Date(version.last_used).toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!versions.length && <Empty title="Chưa ghi nhận phiên bản" />}
    </Panel>
  );
}
