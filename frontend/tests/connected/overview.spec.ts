import { test, expect } from "@playwright/test";

test("live overview shows the full catalog without source controls and opens real evidence", async ({
  page,
}) => {
  const email = process.env.SEED_USER1_EMAIL,
    password = process.env.SEED_USER1_PASSWORD;
  if (!email || !password)
    throw new Error("Provide seed credentials through environment variables");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto("/login");
    await page.getByLabel("Địa chỉ email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(/\/user\/overview$/);
    async function readAll<T>(resource: string): Promise<T[]> {
      const rows: T[] = [];
      for (let index = 1; index <= 100; index++) {
        const response = await page.request.get(
          `/api/backend/${resource}?page=${index}&limit=100`,
        );
        expect(response.status()).toBe(200);
        const result = await response.json();
        rows.push(...result.data);
        if (rows.length >= result.pagination.total) return rows;
      }
      throw new Error("Pagination exceeded test bound");
    }
    const products = await readAll<{ id: string; category_id: string | null }>(
      "products",
    );
    const allCategories = new Set(products.map((row) => row.category_id)).size;
    const dashboard = page.locator(".live-overview:visible");
    await expect(dashboard.getByRole("group", { name: "Nguồn dữ liệu thống kê" })).toHaveCount(0);
    await expect(dashboard.locator(".overview-source p")).toHaveText(`${products.length} sản phẩm trong catalog`);
    await expect(dashboard.locator(".stat").filter({ hasText: "Tổng số sản phẩm" }).locator(".stat-value")).toContainText(String(products.length));
    await expect(dashboard.getByRole("img", { name: new RegExp(`^SẢN PHẨM: ${products.length}\\.`) })).toBeVisible();
    await expect(dashboard.locator(".overview-category-item")).toHaveCount(allCategories);
    await page.screenshot({
      path: "../tmp/overview-desktop.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(dashboard.locator(".overview-category-item")).toHaveCount(
      allCategories,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "../tmp/overview-mobile.png",
      fullPage: true,
      animations: "disabled",
    });
    await dashboard
      .getByRole("link", { name: /^Xem phân tích / })
      .first()
      .click();
    await expect(page).toHaveURL(/\/user\/analysis\?product=\d+&analysis=\d+/);
    await expect(
      page.getByText("Kết quả từ đầu vào đã đóng băng", { exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await page.request.post("/api/backend/auth/logout");
  }
});

test("empty overview has no invalid percentages or chart values", async ({
  page,
}) => {
  await page.route("**/api/backend/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({
      json: path.endsWith("/auth/me")
        ? {
            data: {
              id: "1",
              full_name: "Synthetic UI test",
              role: "user",
              email: "fixture@example.invalid",
              is_active: true,
            },
          }
        : { data: [], pagination: { page: 1, limit: 100, total: 0 } },
    });
  });
  await page.goto("/user/overview");
  const dashboard = page.locator(".live-overview:visible");
  await expect(
    dashboard.getByText("Chưa có sản phẩm", { exact: true }),
  ).toBeVisible();
  await expect(
    dashboard.getByText("Chưa có danh mục để thống kê", { exact: true }),
  ).toBeVisible();
  await expect(dashboard.getByRole("group", { name: "Nguồn dữ liệu thống kê" })).toHaveCount(0);
  await expect(dashboard.locator(".overview-source p")).toHaveText("0 sản phẩm trong catalog");
  await expect(dashboard.getByText(/NaN|Infinity/)).toHaveCount(0);
  await expect(dashboard.getByRole("img")).toHaveCount(0);
});
