import type { ReactNode } from "react";
import { actionLabels, analysisLabels } from "@/lib/api-client";
import { actionColor, analysisColor } from "@/lib/status-colors";

export function StatusBadge({ status, kind = "analysis", children }: {
  status?: string | null;
  kind?: "analysis" | "action";
  children?: ReactNode;
}) {
  const key = status ?? "no_analysis";
  const color = kind === "action" ? actionColor(key) : analysisColor(key);
  const label = kind === "action" ? actionLabels[key] : analysisLabels[key];
  return <span className="badge status-badge" data-status={key} data-status-kind={kind}
    style={{ color, backgroundColor: `${color}14`, borderColor: `${color}40` }}>
    {children ?? label ?? (key === "no_analysis" ? "Chưa có phân tích" : key)}
  </span>;
}
