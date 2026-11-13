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
