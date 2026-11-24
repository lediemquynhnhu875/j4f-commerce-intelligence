"use client";

import { useEffect, useRef, useState } from "react";
import { usePopup } from "@/components/popup";
import { Icon } from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";

export function RunAnalysisButton({
  productId,
  onAnalyzed,
}: {
  productId: string;
  onAnalyzed: () => void;
}) {
  const { notify } = usePopup();
  const [running, setRunning] = useState(false);
  const requestKey = useRef<string | null>(null);
  const active = useRef<AbortController | null>(null);

  useEffect(() => () => active.current?.abort(), []);

  async function run() {
    if (active.current) return;
    const request = new AbortController();
    active.current = request;
    requestKey.current ??= crypto.randomUUID();
    setRunning(true);
    try {
      const { data } = await api<{ data: { status: string } }>(
        `products/${encodeURIComponent(productId)}/analyses`,
        {
          method: "POST",
          headers: { "Idempotency-Key": requestKey.current },
          signal: request.signal,
        },
      );
      if (request.signal.aborted) return;
      requestKey.current = null;
      onAnalyzed();
      notify(
        data.status === "insufficient_data"
          ? "Kết quả đã lưu. Bạn có thể xem lý do chưa đủ dữ liệu ở phần bằng chứng."
          : "Kết quả phân tích và các đề xuất (nếu có) đã được lưu.",
        "Phân tích hoàn tất",
      );
    } catch (error) {
      if (request.signal.aborted) return;
      if (error instanceof ApiError && error.code === "ANALYSIS_INPUT_CHANGED")
        requestKey.current = null;
      notify((error as Error).message, "Chưa thể phân tích");
    } finally {
      if (active.current === request) active.current = null;
      if (!request.signal.aborted) setRunning(false);
    }
  }

  return (
    <button type="button" className="button primary" disabled={running} onClick={run}>
      <Icon name="sparkles" size={17} />
      {running ? "Đang phân tích…" : "Chạy phân tích"}
    </button>
  );
}
