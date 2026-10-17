import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, role: "USER1" | "ADMIN") {
  const email = process.env[`SEED_${role}_EMAIL`],
    password = process.env[`SEED_${role}_PASSWORD`];
  if (!email || !password) throw new Error("Missing local test credentials");
  await page.goto("/login");
  await page.getByLabel("Địa chỉ email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`/${role === "ADMIN" ? "admin" : "user"}/overview$`),
  );
}

test("real User pages follow preview layout with persisted evidence and Kanban", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await login(page, "USER1");
    await expect(page.locator(".copilot-card")).toBeVisible();
    await expect(
      page.getByText("API CONNECTED", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator(".live-overview .table-card th")
        .filter({ hasText: "CHÊNH LỆCH" }),
    ).toBeVisible();
    await page.goto("/user/products");
    await page
      .getByLabel("Danh mục sản phẩm")
      .selectOption({ label: "Giày lười nam" });
    await page.getByLabel("Sắp xếp sản phẩm").selectOption("price");
    await expect(page.locator("tbody tr:visible")).toHaveCount(4);
    const first = page.locator("tbody tr:visible").first();
    await first.getByRole("checkbox").check();
    await expect(
      page.getByRole("button", { name: /Xem phân tích đã chọn/ }),
    ).toBeEnabled();
    await page.screenshot({
      path: "../tmp/parity-products.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.getByRole("button", { name: /Xem phân tích đã chọn/ }).click();
    await expect(
      page.getByText("2. Bằng chứng quan sát", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".comparison-bars")).toBeVisible();
    await expect(page.locator("pre:visible")).toHaveCount(0);
    await page.screenshot({
      path: "../tmp/parity-evidence.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.goto("/user/suggestions");
    await expect(page.locator(".suggestion-card").first()).toBeVisible();
    await expect(
      page.locator(".suggestion-card .evidence").first(),
    ).toContainText("Bằng chứng:");
    expect(await page.locator(".suggestion-card").count()).toBeLessThanOrEqual(
      12,
    );
    const firstSuggestion = await page
      .locator(".suggestion-card")
      .first()
      .locator("h3")
      .innerText();
    await page
      .getByRole("button", { name: "Trang đề xuất sau", exact: true })
      .click();
    await expect(
      page.locator(".suggestion-card").first().locator("h3"),
    ).not.toHaveText(firstSuggestion);
    await page
      .getByRole("button", { name: "Trang đề xuất trước", exact: true })
      .click();
    await page.getByRole("button", { name: "Kanban", exact: true }).click();
    await expect(page.locator(".kanban-column")).toHaveCount(6);
    await page.getByRole("button", { name: "Danh sách", exact: true }).click();
    await page.screenshot({
      path: "../tmp/parity-suggestions.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Mở menu", exact: true }).click();
    await expect(page.getByRole("navigation")).toBeInViewport();
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Kết quả phân tích", exact: true })
      .click();
    await expect(page.getByRole("navigation")).not.toBeInViewport();
    for (const path of ["/user/products", "/user/analysis"]) {
      await page.goto(path);
      await expect(
        page.locator(".analysis-product, .table-card").first(),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  } finally {
    await page.request.post("/api/backend/auth/logout");
  }
});

test("real Admin pages show saved metadata and honest unavailable controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await login(page, "ADMIN");
    await expect(page.locator(".stats-grid .stat")).toHaveCount(8);
    await expect(page.getByText("Đã kết nối", { exact: true })).toBeVisible();
    await expect(page.locator(".bar-chart")).toBeVisible();
    await page.screenshot({
      path: "../tmp/parity-admin-overview.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.goto("/admin/monitor");
    await expect(page.locator(".monitor-grid .log-panel")).toBeVisible();
    expect(
      await page.locator(".monitor-grid table tbody tr").count(),
    ).toBeLessThanOrEqual(10);
    const firstResult = await page
      .locator(".monitor-grid table tbody .text-link")
      .first()
      .innerText();
    await page
      .getByRole("button", { name: "Trang kết quả sau", exact: true })
      .click();
    await expect(
      page.locator(".monitor-grid table tbody .text-link").first(),
    ).not.toHaveText(firstResult);
    await page
      .getByRole("button", { name: "Trang kết quả trước", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Tải kết quả đã lưu", exact: true }),
    ).toBeEnabled();
    await page.locator(".monitor-grid table tbody .text-link").nth(1).click();
    await page.screenshot({
      path: "../tmp/parity-admin-monitor.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.goto("/admin/configuration");
    await expect(page.locator(".config-grid > .panel")).toHaveCount(4);
    await expect(
      page.getByRole("button", { name: /Lưu phiên bản/ }),
    ).toBeDisabled();
    await page.screenshot({
      path: "../tmp/parity-admin-configuration.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.goto("/admin/stores");
    await expect(
      page.getByText("Cửa hàng chưa được thiết lập", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Thêm cửa hàng", exact: true }),
    ).toBeDisabled();
    await page.goto("/admin/accounts");
    await expect(page.locator("table tbody tr:visible")).not.toHaveCount(0);
    await page.goto("/admin/products");
    await expect(page.locator("table tbody tr:visible")).not.toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Thêm sản phẩm", exact: true }),
    ).toBeEnabled();
    await page.goto("/admin/categories");
    await expect(page.locator("table tbody tr:visible")).not.toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of [
      "/admin/overview",
      "/admin/monitor",
      "/admin/configuration",
      "/admin/stores",
    ]) {
      await page.goto(path);
      await expect(
        page.locator(".stats-grid, .model-banner").first(),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  } finally {
    await page.request.post("/api/backend/auth/logout");
  }
});

test("preview-style work cards submit versioned decisions and preserve original evidence", async ({
  page,
}) => {
  const original = {
    rule_id: "add_product_images",
    evidence: "Synthetic evidence",
    hypothesis: "Synthetic hypothesis",
    action: "Review images",
    validation_needed: "Verify content",
  };
  const actions = [
    {
      id: "1",
      analysis_id: "1",
      type: "review_images",
      title: "Synthetic work",
      description: "Test",
      origin: "ml_rule",
      original_suggestion_json: original,
      status: "proposed",
      assigned_to: null,
      decision_reason: null,
      outcome_note: null,
      updated_at: "2026-10-17T00:00:00.000Z",
    },
  ];
  const submitted: Record<string, unknown>[] = [];
  await page.route("**/api/backend/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (req.method() === "PATCH") {
      const body = req.postDataJSON();
      expect(body.expected_updated_at).toBe(actions[0].updated_at);
      submitted.push(body);
      Object.assign(actions[0], body, {
        updated_at: new Date(
          Date.parse(actions[0].updated_at) + 1,
        ).toISOString(),
      });
      return route.fulfill({ json: { data: actions[0] } });
    }
    if (path.endsWith("/auth/me"))
      return route.fulfill({
        json: {
          data: {
            id: "1",
            full_name: "Synthetic UI test",
            role: "user",
            email: "fixture@example.invalid",
            is_active: true,
          },
        },
      });
    const rows = path.endsWith("/actions")
      ? actions
      : path.endsWith("/analyses")
        ? [
            {
              id: "1",
              product_id: "1",
              product: { id: "1", name: "Synthetic product" },
              analyzed_at: "2026-10-17T00:00:00Z",
              status: "performing_well",
            },
          ]
        : [];
    return route.fulfill({
      json: {
        data: rows,
        pagination: { page: 1, limit: 100, total: rows.length },
      },
    });
  });
  await page.goto("/user/suggestions");
  const card = page.locator(".suggestion-card");
  await card.getByRole("button", { name: "Chấp nhận", exact: true }).click();
  await card
    .getByRole("button", { name: "Bắt đầu thực hiện", exact: true })
    .click();
  await card
    .getByRole("button", { name: "Đánh dấu hoàn thành", exact: true })
    .click();
  await expect(card.locator(".suggestion-actions > .badge")).toHaveText(
    "Hoàn thành",
  );
  expect(submitted.map((body) => body.status)).toEqual([
    "accepted",
    "in_progress",
    "completed",
  ]);
  expect(actions[0].original_suggestion_json).toEqual(original);
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  await expect(
    page
      .locator(".kanban-column")
      .filter({ has: page.getByRole("heading", { name: /Hoàn thành/ }) })
      .locator(".suggestion-card"),
  ).toHaveCount(1);
});
