import { test, expect } from "@playwright/test";

test("account state changes immediately and only the selected row is pending", async ({
  page,
}) => {
  let locked = false;
  let release: (() => void) | undefined;
  const account = {
    id: "90",
    full_name: "Admin",
    email: "admin@example.test",
    role: "admin",
    is_active: true,
  };
  const users = [
    account,
    { ...account, id: "91", full_name: "User1", role: "user" },
    { ...account, id: "92", full_name: "User2", role: "user" },
  ];
  await page.route("**/api/backend/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "PATCH") {
      locked = !JSON.parse(route.request().postData()!).is_active;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return route.fulfill({
        json: { data: { ...users[2], is_active: !locked } },
      });
    }
    const data = path.endsWith("auth/me")
      ? account
      : path.endsWith("admin/accounts")
        ? users
        : path.endsWith("admin/summary")
          ? {
              accounts: 3,
              active_accounts: 3,
              stores: 2,
              products: 0,
              saved_results: 0,
              analysis_requests: null,
              running_requests: null,
              recent: [],
              versions: [],
            }
          : [];
    await route.fulfill({
      json: {
        data,
        pagination: { total: Array.isArray(data) ? data.length : 0 },
      },
    });
  });
  await page.goto("/admin/accounts");
  const user1 = page.getByRole("row").filter({ hasText: "User1" });
  const user2 = page.getByRole("row").filter({ hasText: "User2" });
  await user2.getByRole("button", { name: "Tạm khóa" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(user2.getByText("Tạm khóa", { exact: true })).toBeVisible();
  await expect(user2.getByRole("button")).toBeDisabled();
  await expect(user1.getByRole("button")).toBeEnabled();
  await expect.poll(() => Boolean(release)).toBe(true);
  release!();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đã hiểu" })
    .click();
  await expect(user2.getByRole("button", { name: "Kích hoạt" })).toBeEnabled();
  await user2.getByRole("button", { name: "Kích hoạt" }).click();
  release = undefined;
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect.poll(() => Boolean(release)).toBe(true);
  release!();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đã hiểu" })
    .click();
  await expect(user2.getByRole("button", { name: "Tạm khóa" })).toBeEnabled();
});

test("product page size and status choices match the current ML statuses", async ({
  page,
}) => {
  const account = {
    id: "91",
    full_name: "User1",
    role: "user",
    is_active: true,
  };
  const products = Array.from({ length: 25 }, (_, index) => ({
    id: String(index + 1),
    name: `Product ${index + 1}`,
    price: "1000",
    currency: "VND",
    category_id: null,
    quantity_sold: null,
    rating_average: null,
    review_count: null,
  }));
  await page.route("**/api/backend/**", async (route) => {
    const url = new URL(route.request().url());
    const data = url.pathname.endsWith("auth/me")
      ? account
      : url.pathname.endsWith("products")
        ? products.slice(
            (Number(url.searchParams.get("page")) - 1) * 20,
            Number(url.searchParams.get("page")) * 20,
          )
        : [];
    await route.fulfill({
      json: {
        data,
        pagination: { total: url.pathname.endsWith("products") ? 25 : 0 },
      },
    });
  });
  await page.goto("/user/products");
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await page
    .getByLabel("Số sản phẩm mỗi trang", { exact: true })
    .selectOption("10");
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await expect(
    page.getByLabel("Trạng thái phân tích").locator("option"),
  ).toHaveCount(8);
});

test("a broken replacement file clears the valid import preview", async ({
  page,
}) => {
  await page.route("**/api/backend/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith("auth/me")
      ? { id: "91", full_name: "User1", role: "user", is_active: true }
      : path.endsWith("import/preview")
        ? {
            total: 1,
            create_count: 1,
            update_count: 0,
            invalid_count: 0,
            ignored_columns: [],
            rows: [
              {
                row: 1,
                name: "Test",
                price: 1000,
                operation: "create",
                errors: [],
                warnings: [],
              },
            ],
          }
        : [];
    await route.fulfill({ json: { data, pagination: { total: 0 } } });
  });
  await page.goto("/user/products");
  await page.getByRole("button", { name: "Import dữ liệu" }).click();
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({
    name: "good.json",
    mimeType: "application/json",
    buffer: Buffer.from('[{"name":"Test"}]'),
  });
  await expect(
    page.getByRole("button", { name: "Xác nhận nhập" }),
  ).toBeEnabled();
  await input.setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{bad"),
  });
  await page
    .getByRole("dialog")
    .filter({ hasText: "Kiểm tra file nhập" })
    .getByRole("button", { name: "Đã hiểu" })
    .click();
  await expect(
    page.getByRole("button", { name: "Xác nhận nhập" }),
  ).toBeDisabled();
});

test("suspended account login displays a popup with the account message", async ({
  page,
}) => {
  await page.route("**/api/backend/auth/login", (route) =>
    route.fulfill({
      status: 403,
      json: {
        error: {
          code: "ACCOUNT_SUSPENDED",
          message:
            "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
        },
      },
    }),
  );
  await page.goto("/login");
  await page.getByLabel("Địa chỉ email").fill("locked@example.test");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("Example-password-12");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
  );
});
