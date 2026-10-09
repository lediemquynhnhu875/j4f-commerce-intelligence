import { Suspense } from "react";
import { PreviewPage } from "@/components/preview-page";
export default function Page() {
  return (
    <Suspense
      fallback={<div className="route-loading">Đang mở giao diện demo…</div>}
    >
      <PreviewPage role="admin" page="monitor" />
    </Suspense>
  );
}
