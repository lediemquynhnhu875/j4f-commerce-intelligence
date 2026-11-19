import { test, expect } from "@playwright/test";

test("retired demo and Admin catalog URLs return 404", async ({ request }) => {
  for (const route of [
    "/preview", "/preview/login", "/preview/demo-login",
    ...["overview", "products", "analysis", "suggestions"].map(page => `/preview/user/${page}`),
    ...["overview", "stores", "monitor", "configuration"].map(page => `/preview/admin/${page}`),
    "/admin/products", "/admin/categories",
  ]) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(404);
  }
});

test("login exposes only real authentication", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Địa chỉ email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeVisible();
  await expect(page.locator('a[href*="preview"], a[href*="demo"]')).toHaveCount(0);
});

for (const role of ["user", "admin"] as const) {
  test(`${role} retains connected navigation without mock fallback`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const account = { id: "90001", full_name: "Release Check", email: "release@example.test", role, is_active: true };
    await page.route("**/api/backend/**", async route => {
      expect(route.request().method()).toBe("GET");
      const path = new URL(route.request().url()).pathname;
      const data = path.endsWith("/admin/accounts") ? [account] : [];
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(
        path.endsWith("/auth/me") ? { data: account }
          : path.endsWith("/admin/summary") ? { data: { accounts: 1, active_accounts: 1, stores: 0, products: 0, saved_results: 0, analysis_requests: null, running_requests: null, recent: [], versions: [] } }
          : path.endsWith("/workspace/overview") ? { data: { summary: null, metrics: null, categories: [], priority: [], suggestions: [] } }
          : path.endsWith("/analysis-workspace") ? { data: { product: null, has_analysis: false, timeline: [], latest: null } }
          : path.endsWith("/workspace/summary") ? { data: { store_name: null, latest_analyzed_at: null, proposed_count: 0 } }
          : path.endsWith("/ready") ? { status: "ready", database: "connected" }
          : { data, pagination: { total: data.length, page: 1, limit: 100 } },
      ) });
    });
    await page.goto(`/${role}/overview`);
    const navigation = page.getByRole("navigation");
    await expect(navigation).toBeVisible();
    await expect(page.getByText("Release Check", { exact: true }).first()).toBeVisible();
    const slugs = role === "user" ? ["overview", "products", "analysis", "suggestions"] : ["overview", "stores", "accounts", "monitor", "configuration"];
    expect(await navigation.getByRole("link").evaluateAll(links => links.map(link => link.getAttribute("href"))))
      .toEqual(slugs.map(slug => `/${role}/${slug}`));
    for (const slug of slugs) {
      await navigation.locator(`a[href="/${role}/${slug}"]`).click();
      await expect(page).toHaveURL(new RegExp(`/${role}/${slug}$`));
      await expect(page.locator("#main-content h1:visible")).toBeVisible();
    }
    if (role === "admin") {
      await page.goto("/admin/accounts");
      await page.getByRole("button", { name: "Thêm tài khoản", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveAttribute("minlength", "12");
    }
    expect(errors).toEqual([]);
  });
}

test("catalog requests one server page and applies filters before pagination", async ({ page }) => {
  const requests: URL[] = [];
  await page.route("**/api/backend/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.split("/api/backend/")[1];
    if (path === "auth/me") return route.fulfill({ json: {
      data: { id: "91", full_name: "Store owner", role: "user", is_active: true },
    } });
    if (path === "workspace/summary") return route.fulfill({ json: {
      data: { store_name: "Store", proposed_count: 0, latest_analyzed_at: null },
    } });
    if (path === "categories") return route.fulfill({ json: { data: [], pagination: { total: 0 } } });
    expect(path).toBe("products");
    const query = url.searchParams;
    expect(query.get("view")).toBe("catalog");
    requests.push(url);
    const pageNumber = Number(query.get("page"));
    await route.fulfill({ json: {
      data: [{
        id: String(pageNumber), name: `Sản phẩm trang ${pageNumber}`, price: "10000",
        currency: "VND", category_id: null, thumbnail_url: null,
        latest_status: "performing_well", product_type: null, action_titles: [],
      }],
      pagination: { total: query.get("search") ? 1 : 40000 },
      undecided_count: 0,
    } });
  });
  await page.goto("/user/products");
  await expect(page.getByText("Sản phẩm trang 1", { exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0].searchParams.get("limit")).toBe("20");
  await page.getByRole("button", { name: "Trang sau" }).click();
  await expect(page.getByText("Sản phẩm trang 2", { exact: true })).toBeVisible();
  await page.getByLabel("Tìm sản phẩm").fill("SP-14");
  await expect(page.getByText("Sản phẩm trang 1", { exact: true })).toBeVisible();
  expect(requests.map(({ searchParams }) => [searchParams.get("page"), searchParams.get("search")]))
    .toEqual([["1", null], ["2", null], ["1", "SP-14"]]);
});


test("Admin stores and accounts fetch only the requested 50-row page", async ({ page }) => {
  const calls: string[] = [];
  const account = { id: "90001", full_name: "Admin", role: "admin", is_active: true };
  await page.route("**/api/backend/**", (route) => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.split("/api/backend/")[1];
    if (endpoint === "auth/me") return route.fulfill({ json: { data: account } });
    calls.push(endpoint + url.search);
    const current = Number(url.searchParams.get("page"));
    const query = url.searchParams.get("search");
    const total = endpoint === "stores" ? 3808 : 3809;
    const ids = query ? [120] : Array.from({ length: 50 }, (_, index) => (current - 1) * 50 + index + 1);
    return route.fulfill({
      json: {
        data: ids.map((id) => endpoint === "stores"
          ? { id: String(id), name: `Cửa hàng ${id}`, owner_user_id: String(id), product_count: 2, is_active: true }
          : { ...account, id: String(id), full_name: `Tài khoản ${id}`, role: "user", is_active: false }),
        pagination: { page: current, limit: 50, total: query ? 1 : total },
        totals: { stores: 3808, products: 41578 },
      },
    });
  });

  await page.goto("/admin/stores");
  await expect(page.locator("tbody tr")).toHaveCount(50);
  await expect(page.getByText("41578", { exact: true })).toBeVisible();
  expect(calls).toEqual(["stores?page=1&limit=50"]);
  await page.getByRole("button", { name: "Trang sau" }).click();
  await expect(page.getByText("Cửa hàng 51", { exact: true })).toBeVisible();

  const sort = page.getByLabel("Sắp xếp theo số sản phẩm");
  await sort.selectOption({ label: "Nhiều sản phẩm nhất" });
  await expect(page.getByText("Cửa hàng 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Trang sau" }).click();
  await expect(page.getByText("Cửa hàng 51", { exact: true })).toBeVisible();
  await sort.selectOption({ label: "Ít sản phẩm nhất" });
  await expect(page.getByText("Cửa hàng 1", { exact: true })).toBeVisible();

  await page.getByLabel("Tìm theo tên hoặc mã cửa hàng").fill("120");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.getByText("Cửa hàng 120", { exact: true })).toBeVisible();
  expect(calls).toEqual([
    "stores?page=1&limit=50",
    "stores?page=2&limit=50",
    "stores?page=1&limit=50&sort=products_desc",
    "stores?page=2&limit=50&sort=products_desc",
    "stores?page=1&limit=50&sort=products_asc",
    "stores?page=1&limit=50&search=120&sort=products_asc",
  ]);

  await page.goto("/admin/accounts");
  await expect(page.locator("tbody tr")).toHaveCount(50);
  await page.getByLabel("Trạng thái tài khoản").selectOption("suspended");
  await expect.poll(() => calls.slice(6)).toEqual([
    "admin/accounts?page=1&limit=50",
    "admin/accounts?page=1&limit=50&status=suspended",
  ]);
});

test("Admin reporting pages request only their own summary view", async ({ page }) => {
  const calls: string[] = [];
  await page.route("**/api/backend/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/auth/me")) {
      return route.fulfill({ json: { data: { id: "90", role: "admin", full_name: "Admin", is_active: true } } });
    }
    calls.push(url.pathname.split("/api/backend/")[1] + url.search);
    return route.fulfill({ json: { data: { recent: [], versions: [] } } });
  });
  for (const view of ["overview", "monitor", "configuration"]) {
    await page.goto(`/admin/${view}`);
    await expect.poll(() => calls.at(-1)).toBe(`admin/summary?view=${view}`);
  }
  expect(calls).toEqual(["admin/summary?view=overview", "admin/summary?view=monitor", "admin/summary?view=configuration"]);
});


test("User overview loads saved totals with one data request", async ({ page }) => {
  const calls: string[] = [];
  await page.route("**/api/backend/**", (route) => {
    const endpoint = new URL(route.request().url()).pathname.split("/api/backend/")[1];
    if (endpoint === "auth/me") return route.fulfill({ json: {
      data: { id: "91", full_name: "Store owner", role: "user", is_active: true },
    } });
    calls.push(endpoint);
    return route.fulfill({ json: { data: {
      summary: { store_name: "Store", proposed_count: 20, latest_analyzed_at: null, legacy_statuses: [] },
      metrics: {
        product_count: 40000, analyzed_product_count: 32000, reference_product_count: 1000,
        review_product_count: 15, ml_product_count: 32000, in_progress_count: 4,
        pending_review_count: 12, open_suggestion_count: 16, status_counts: { performing_well: 32000 },
      },
      categories: [{ id: "1", name: "Giày", count: 40000 }],
      priority: [{
        id: "14", name: "Giày kiểm thử", analysis_id: "19", classification: "Giày",
        status: "performing_well", observed_sold: 3, reference_sold: "2", sales_gap: "1",
      }],
      suggestions: [{
        id: "20", product_id: "14", product_name: "Giày kiểm thử", analysis_id: "19",
        type: "review_images", status: "proposed", title: "Rà soát ảnh sản phẩm", evidence: "Bằng chứng thử nghiệm",
      }],
    } } });
  });
  await page.goto("/user/overview");
  await expect(page.getByText("40000 sản phẩm trong catalog")).toBeVisible();
  await expect(page.getByText("16 đề xuất đang mở", { exact: true })).toBeVisible();
  await expect(page.getByText("Rà soát ảnh sản phẩm", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Xem phân tích Giày kiểm thử" }))
    .toHaveAttribute("href", "/user/analysis?product=14&analysis=19");
  expect(calls).toEqual(["workspace/overview"]);
});
