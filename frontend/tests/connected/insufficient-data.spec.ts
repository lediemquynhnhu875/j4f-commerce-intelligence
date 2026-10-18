import { test, expect } from "@playwright/test";

/**
 * "Chưa đủ dữ liệu" must explain itself: the recorded reason with its real
 * numbers, the comparison that is still observable, and the step that would
 * make the product analysable. It must never turn into a recommendation, and
 * it must not appear on analyses that did reach a conclusion.
 */
test("undecided analyses explain the reason, the observable gaps and the unblocking step", async ({ page }) => {
  const email = process.env.SEED_USER1_EMAIL,
    password = process.env.SEED_USER1_PASSWORD;
  const undecided = process.env.UNDECIDED_PRODUCT_ID;
  const concluded = process.env.CONCLUDED_PRODUCT_ID;
  if (!email || !password) throw new Error("Provide seed test credentials through environment variables");
  if (!undecided || !concluded) throw new Error("Provide product IDs through environment variables");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto("/login");
    await page.getByLabel("Địa chỉ email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(/\/user\//);

    await page.goto(`/user/analysis?product=${undecided}`);
    const reason = page.locator(".insufficient-reason");
    await expect(reason).toBeVisible();
    // The headline must be a named reason, not the bare status label.
    await expect(reason.locator("h3")).not.toHaveText("Chưa đủ dữ liệu");
    // The explanation must carry the stored numbers rather than generic wording.
    await expect(reason.locator("p")).toContainText(/\d/);

    await expect(page.getByText("Cần gì để phân tích được sản phẩm này")).toBeVisible();
    await expect(page.locator(".unblock-step p")).not.toBeEmpty();
    await expect(page.getByText("không phải một khuyến nghị về doanh số", { exact: false })).toBeVisible();

    // The observable comparison stays available and stays explicitly non-causal.
    await expect(page.locator(".observable-summary")).toBeVisible();
    await expect(page.getByText("Chênh lệch ở đây không chứng minh nguyên nhân", { exact: false })).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible();

    // An empty reference cell says why instead of showing a bare dash.
    await expect(page.getByText("Chưa đủ cơ sở — xem lý do ở trên", { exact: false })).toBeVisible();

    // None of this may leak onto a concluded analysis.
    await page.goto(`/user/analysis?product=${concluded}`);
    await expect(page.locator(".diagnosis")).toBeVisible();
    await expect(page.locator(".insufficient-reason")).toHaveCount(0);
    await expect(page.locator(".unblock-step")).toHaveCount(0);
    await expect(page.locator(".observable-summary")).toHaveCount(0);

    // The catalog filter removes exactly the undecided products.
    await page.goto("/user/products");
    const footer = page.locator(".table-footer").first();
    const total = Number((await footer.textContent())?.match(/\/\s*(\d+)\s*sản phẩm/)?.[1]);
    expect(total).toBeGreaterThan(0);
    await page.getByText("Chỉ hiện sản phẩm đã phân tích được").click();
    const filtered = Number((await footer.textContent())?.match(/\/\s*(\d+)\s*sản phẩm/)?.[1]);
    expect(filtered).toBeLessThan(total);
    for (const badge of await page.locator("tbody tr .status-badge").allTextContents())
      expect(badge).not.toBe("Chưa đủ dữ liệu");

    expect(errors).toEqual([]);
  } finally {
    await page.request.post("/api/backend/auth/logout");
  }
});
