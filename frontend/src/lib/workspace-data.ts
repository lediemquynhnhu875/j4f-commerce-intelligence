import { allPages, api } from "./api-client";
import type { Account, Action, Analysis, Category, Product, Store, SystemSummary, WorkspaceSummary } from "@/types/api";

export async function loadWorkspaceSummary(signal: AbortSignal) {
  return (await api<{ data: WorkspaceSummary }>("workspace/summary", { signal })).data;
}

export async function loadAdminSummary(view: "overview" | "monitor" | "configuration", signal: AbortSignal) {
  return (await api<{ data: Partial<SystemSummary> }>(`admin/summary?view=${view}`, { signal })).data;
}

export async function exportUserWorkspace() {
  const [products, categories, analyses, actions, stores] = await Promise.all([
    allPages<Product>("products", undefined, 100),
    allPages<Category>("categories", undefined, 100),
    allPages<Analysis>("analyses", undefined, 100),
    allPages<Action>("actions", undefined, 100),
    allPages<Store>("stores"),
  ]);
  return { products, categories, analyses, actions, accounts: [], stores };
}

export async function exportAdminWorkspace() {
  const [{ data: systemSummary }, accounts, stores] = await Promise.all([
    api<{ data: SystemSummary }>("admin/summary"),
    allPages<Account>("admin/accounts", undefined, 100),
    allPages<Store>("stores", undefined, 100),
  ]);
  return { systemSummary, accounts, stores, products: [], categories: [], analyses: [], actions: [] };
}
