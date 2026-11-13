import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isWorkspacePage } from "@/lib/workspace-pages";
import { LivePage } from "@/components/live-page";

async function Workspace({
  params,
}: {
  params: Promise<{ role: string; page: string }>;
}) {
  const { role, page } = await params;
  if (!isWorkspacePage(role, page)) notFound();
  return <LivePage role={role as "user" | "admin"} page={page} />;
}
export default function Page({
  params,
}: {
  params: Promise<{ role: string; page: string }>;
}) {
  return (
    <Suspense fallback={<p role="status">Đang tải không gian làm việc…</p>}>
      <Workspace params={params} />
    </Suspense>
  );
}
