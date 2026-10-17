import { test, expect, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";

const disposableProducts = new Set<string>();
const disposableAccounts = new Set<string>();
test.afterEach(async ({ page }) => {
  for (const title of disposableProducts) {
    const response = await page.request.get(
      `/api/backend/products?search=${encodeURIComponent(title)}&limit=100`,
    );
    if (response.ok())
      for (const row of (await response.json()).data)
        if (row.name === title && row.source_data_json === null)
          await page.request.delete(`/api/backend/products/${row.id}`);
  }
  for (const name of disposableAccounts) {
    const response = await page.request.get(
      "/api/backend/admin/accounts?limit=100",
    );
    if (response.ok())
      for (const row of (await response.json()).data)
        if (row.full_name === name && row.is_active)
          await page.request.patch(`/api/backend/admin/accounts/${row.id}`, {
            data: { is_active: false },
          });
  }
  disposableProducts.clear();
  disposableAccounts.clear();
  await page.request.post("/api/backend/auth/logout");
});

async function allRecords(
  page: Page,
  path: string,
): Promise<
  {
    id: string;
    title?: string;
    updated_at: string;
    original_suggestion_json: unknown;
    source_data_json?: { seed_key?: string };
  }[]
> {
  const rows = [];
  for (let index = 1; ; index++) {
    const response = await page.request.get(
      `/api/backend/${path}?limit=100&page=${index}`,
    );
    expect(response.status()).toBe(200);
    const payload = await response.json();
    rows.push(...payload.data);
    if (rows.length >= payload.pagination.total) return rows;
  }
}

function credential(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing test environment ${name}`);
  return value;
}
test("legacy login entry points authenticate the real Admin rather than demo credentials", async ({
  page,
}) => {
  for (const path of ["/", "/login", "/preview", "/preview/login"]) {
    await page.goto(path);
    await expect(
      page.getByText("SELLENS WORKSPACE", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("CHỌN TÀI KHOẢN DEMO", { exact: true }),
    ).toHaveCount(0);
  }
  await page.getByLabel("Địa chỉ email").fill(credential("SEED_ADMIN_EMAIL"));
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(credential("SEED_ADMIN_PASSWORD"));
  const pendingLogin = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/backend/auth/login") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect((await pendingLogin).status()).toBe(200);
  await expect(page).toHaveURL(/\/admin\/overview$/);
  expect((await page.request.get("/api/backend/admin/accounts")).status()).toBe(
    200,
  );
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
async function login(page: Page, role: "USER1" | "ADMIN") {
  await page.goto("/login");
  await page.getByLabel("Địa chỉ email").fill(credential(`SEED_${role}_EMAIL`));
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(credential(`SEED_${role}_PASSWORD`));
  const pendingLogin = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/backend/auth/login") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const response = await pendingLogin;
  const payload = await response.json();
  expect({ status: response.status(), code: payload.error?.code }).toEqual({
    status: 200,
    code: undefined,
  });
  await expect(page).toHaveURL(
    new RegExp(`/${role === "ADMIN" ? "admin" : "user"}/overview`),
  );
  await expect(page.getByText("API CONNECTED", { exact: true })).toBeVisible();
  await expect(page.locator(".stats-grid .stat")).toHaveCount(
    role === "ADMIN" ? 8 : 6,
  );
}
test("real login, catalog, frozen analyses, persistence and role boundaries", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, "USER1");
  const cookies = await context.cookies();
  expect(
    cookies.some(
      (cookie) =>
        cookie.name === "sellens-session" &&
        cookie.httpOnly &&
        cookie.sameSite === "Lax",
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => document.cookie.includes("sellens-session")),
  ).toBe(false);
  const products = await allRecords(page, "products");
  expect(
    products.filter(
      (product: {
        source_data_json?: { synthetic?: boolean; seed_key?: string };
      }) =>
        product.source_data_json?.seed_key?.startsWith(
          "sellens-mvp-v1:product:",
        ),
    ).length,
  ).toBe(10);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Danh mục sản phẩm" })
    .click();
  await expect(page.locator("tbody tr:visible")).toHaveCount(4);
  await page.screenshot({
    path: "../tmp/frontend-connected/catalog.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page.locator("tbody tr:visible")).toHaveCount(
    Math.min(4, Math.max(0, products.length - 4)),
  );
  await page
    .getByRole("textbox", { name: "Tìm sản phẩm" })
    .fill("Canvas Everyday Tote");
  await expect(page.locator("tbody tr:visible")).toHaveCount(1);
  await page.getByRole("link", { name: "Xem", exact: true }).click();
  await expect(
    page.locator(".analysis-product .product-cell strong"),
  ).toHaveText("Canvas Everyday Tote");
  await expect(
    page.getByRole("heading", { name: "Kết quả từ đầu vào đã đóng băng" }),
  ).toBeVisible();
  await expect(page.locator(".diagnosis h3")).toHaveText("Chưa đủ cơ sở");
  await expect(
    page
      .locator(".stat:visible")
      .filter({ has: page.getByText("Tham chiếu", { exact: true }) })
      .locator(".stat-value"),
  ).toContainText("—");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Kết quả từ đầu vào đã đóng băng" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Sản phẩm phân tích" })
    .selectOption({ label: "Unisex Canvas Sneakers" });
  await expect(
    page.getByRole("heading", { name: "Chưa có phân tích", exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    sessionStorage.setItem("sellens-preview-role", "admin"),
  );
  await page.goto("/admin/accounts");
  await expect(
    page.getByRole("heading", { name: "Không có quyền truy cập" }),
  ).toBeVisible();
  expect((await page.request.get("/api/backend/admin/accounts")).status()).toBe(
    403,
  );
  expect(
    (
      await page.request.post("/api/backend/products", {
        data: { name: "Denied" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/backend/auth/logout", {
        headers: { Origin: "https://forbidden.invalid" },
      })
    ).status(),
  ).toBe(403);
  await page.goto("/user/products");
  await expect(
    page.getByRole("button", { name: "Đăng xuất", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/backend/products")).status()).toBe(401);
  expect(errors).toEqual([]);
});

test("user work transitions and audit persist without rewriting original suggestions", async ({
  page,
}) => {
  await login(page, "USER1");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Đề xuất cải thiện" })
    .click();
  const title = `Integration work ${Date.now()}`;
  await page
    .getByRole("button", { name: "Thêm công việc", exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("Tiêu đề").fill(title);
  await page
    .getByRole("button", { name: "Tạo công việc", exact: true })
    .click();
  const card = page
    .locator(".grid-two > .suggestion-card")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await expect(card).toBeVisible();
  const original = (await allRecords(page, "actions")).find(
    (row) => row.title === title,
  )!;
  await card.getByRole("button", { name: "Chấp nhận", exact: true }).click();
  await expect(card.locator(".suggestion-actions > .badge")).toHaveText(
    "Đã chấp nhận",
  );
  expect(
    (
      await page.request.patch(`/api/backend/actions/${original.id}`, {
        data: {
          title: "Stale update",
          expected_updated_at: original.updated_at,
        },
      })
    ).status(),
  ).toBe(409);
  await card
    .getByRole("button", { name: "Bắt đầu thực hiện", exact: true })
    .click();
  await expect(card.locator(".suggestion-actions > .badge")).toHaveText(
    "Đang thực hiện",
  );
  await card
    .getByRole("button", { name: "Đánh dấu hoàn thành", exact: true })
    .click();
  await expect(card.locator(".suggestion-actions > .badge")).toHaveText(
    "Hoàn thành",
  );
  await page.reload();
  await expect(card.locator(".suggestion-actions > .badge")).toHaveText(
    "Hoàn thành",
  );
  const updated = (
    await (await page.request.get(`/api/backend/actions/${original.id}`)).json()
  ).data;
  expect(updated.original_suggestion_json).toEqual(
    original.original_suggestion_json,
  );
  await card.getByText("Quản lý công việc & lịch sử", { exact: true }).click();
  await card.getByRole("button", { name: "Lịch sử", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: /completed/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: /accepted/ }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
});

test("admin CRUD, account suspension and honest unsupported configuration", async ({
  page,
  browser,
}) => {
  await login(page, "ADMIN");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Quản lý sản phẩm" })
    .click();
  const title = `Integration product ${Date.now()}`;
  disposableProducts.add(title);
  await page
    .getByRole("button", { name: "Thêm sản phẩm", exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("Tên sản phẩm").fill(title);
  await page
    .getByRole("dialog")
    .getByLabel("Giá", { exact: true })
    .fill("199000");
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Tìm sản phẩm" }).fill(title);
  await expect(page.locator("tbody tr:visible")).toHaveCount(1);
  await page.getByRole("button", { name: "Sửa", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Giá", { exact: true })
    .fill("209000");
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Tìm sản phẩm" }).fill(title);
  await expect(page.locator("tbody tr:visible")).toContainText("209.000");
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Xóa", exact: true }).click();
  await page.getByRole("textbox", { name: "Tìm sản phẩm" }).fill(title);
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy kết quả" }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Quản lý tài khoản" })
    .click();
  await page
    .getByRole("button", { name: "Thêm tài khoản", exact: true })
    .click();
  const name = `Integration Reviewer ${Date.now()}`;
  const email = `integration-${randomBytes(6).toString("hex")}@example.invalid`;
  const password = randomBytes(24).toString("hex");
  disposableAccounts.add(name);
  await page.getByRole("dialog").getByLabel("Họ tên").fill(name);
  await page
    .getByRole("dialog")
    .getByLabel("Email", { exact: true })
    .fill(email);
  await page
    .getByRole("dialog")
    .getByLabel("Mật khẩu", { exact: true })
    .fill(password);
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  const accountRow = page.locator("tbody tr:visible").filter({ hasText: name });
  await expect(accountRow).toBeVisible();
  const other = await browser.newContext({ baseURL: "http://127.0.0.1:3101" });
  try {
    const login = await other.request.post("/api/backend/auth/login", {
      data: { email, password },
    });
    expect(login.status()).toBe(200);
    const payload = await login.json();
    expect("access_token" in payload.data).toBe(false);
    await accountRow
      .getByRole("button", { name: "Tạm khóa", exact: true })
      .click();
    await expect(accountRow.locator(".badge")).toHaveText("Tạm khóa");
    expect((await other.request.get("/api/backend/products")).status()).toBe(
      401,
    );
    await accountRow
      .getByRole("button", { name: "Kích hoạt", exact: true })
      .click();
    await expect(accountRow.locator(".badge")).toHaveText("Hoạt động");
    expect((await other.request.get("/api/backend/products")).status()).toBe(
      401,
    );
    expect(
      (
        await other.request.post("/api/backend/auth/login", {
          data: { email, password },
        })
      ).status(),
    ).toBe(200);
    await other.request.post("/api/backend/auth/logout");
    await accountRow
      .getByRole("button", { name: "Tạm khóa", exact: true })
      .click();
    await expect(accountRow.locator(".badge")).toHaveText("Tạm khóa");
  } finally {
    await other.close();
  }
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Kết quả đã lưu" })
    .click();
  await expect(page.locator("tbody tr:visible")).toHaveCount(
    Math.min(10, (await allRecords(page, "analyses")).length),
  );
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Cấu hình đã lưu" })
    .click();
  await expect(
    page.getByRole("button", { name: "Lưu phiên bản (chưa khả dụng)" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
});

test("backend outages show retry state instead of mock fallback", async ({
  page,
}) => {
  await login(page, "USER1");
  await page.route("**/api/backend/products?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "BACKEND_UNAVAILABLE",
          message: "Backend unavailable; please retry",
        },
      }),
    }),
  );
  await page.goto("/user/products");
  await expect(page.locator(".form-error[role=alert]:visible")).toContainText(
    "Backend unavailable",
  );
  await expect(page.locator("tbody tr:visible")).toHaveCount(0);
  await page.unroute("**/api/backend/products?*");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.locator("tbody tr:visible")).toHaveCount(4);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
});

test("rejection requires a reason and persists as a terminal audited decision", async ({
  page,
}) => {
  await login(page, "USER1");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Đề xuất cải thiện" })
    .click();
  const title = `Integration rejection ${Date.now()}`;
  await page
    .getByRole("button", { name: "Thêm công việc", exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("Tiêu đề").fill(title);
  await page
    .getByRole("button", { name: "Tạo công việc", exact: true })
    .click();
  const card = page
    .locator(".grid-two > .suggestion-card")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await card.getByRole("button", { name: "Từ chối", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("checkbox", { name: "Từ chối công việc" }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Lưu công việc", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(card.locator(".suggestion-actions > .badge")).toHaveText(
    "Chờ duyệt",
  );
  await page
    .getByRole("dialog")
    .getByLabel("Lý do từ chối")
    .fill("Development review: source basis needs independent verification.");
  await page
    .getByRole("button", { name: "Lưu công việc", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card.locator(".suggestion-actions > .badge")).toHaveText(
    "Đã từ chối",
  );
  await page.reload();
  await expect(card.locator(".suggestion-actions > .badge")).toHaveText(
    "Đã từ chối",
  );
  await expect(
    card.getByRole("button", { name: "Chấp nhận", exact: true }),
  ).toHaveCount(0);
  await card.getByText("Quản lý công việc & lịch sử", { exact: true }).click();
  await card.getByRole("button", { name: "Lịch sử", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: /rejected/ }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
});
