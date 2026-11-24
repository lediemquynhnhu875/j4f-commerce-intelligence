import { Suspense, type ComponentType } from "react";
import { notFound } from "next/navigation";
import { isWorkspacePage, type Role } from "@/lib/workspace-pages";
import { Auth } from "@/page/auth";
import UserOverview from "@/page/user/overview";
import UserProduct from "@/page/user/product";
import UserAnalysis from "@/page/user/analysis";
import UserSuggestion from "@/page/user/suggestion";
import AdminOverview from "@/page/admin/overview";
import AdminStores from "@/page/admin/stores";
import AdminAccounts from "@/page/admin/accounts";
import AdminMonitor from "@/page/admin/monitor";
import AdminConfiguration from "@/page/admin/configuration";

const screens: Record<Role, Record<string, ComponentType>> = {
  user: {
    overview: UserOverview,
    products: UserProduct,
    analysis: UserAnalysis,
    suggestions: UserSuggestion,
  },
  admin: {
    overview: AdminOverview,
    stores: AdminStores,
    accounts: AdminAccounts,
    monitor: AdminMonitor,
    configuration: AdminConfiguration,
  },
};

async function Workspace({
  params,
}: {
  params: Promise<{ role: string; page: string }>;
}) {
  const { role, page } = await params;
  if (!isWorkspacePage(role, page)) notFound();
  const Screen = screens[role][page];
  if (!Screen) notFound();

  return (
    <Auth role={role}>
      <Screen />
    </Auth>
  );
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
