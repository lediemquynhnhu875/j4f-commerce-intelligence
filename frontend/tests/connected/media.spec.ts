import { test, expect } from "@playwright/test";

/**
 * Real Tiki media for the imported sample. Image assertions check the decoded
 * bitmap, not just the src attribute, so a broken CDN link fails the test.
 */
test("catalog and analysis show real product images and video", async ({ page }) => {
  const email = process.env.SEED_USER1_EMAIL,
    password = process.env.SEED_USER1_PASSWORD;
  const videoProduct = process.env.MEDIA_VIDEO_PRODUCT_ID;
  const missingProduct = process.env.MEDIA_MISSING_PRODUCT_ID;
  if (!email || !password) throw new Error("Provide seed test credentials through environment variables");
  if (!videoProduct || !missingProduct) throw new Error("Provide media product IDs through environment variables");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto("/login");
    await page.getByLabel("Địa chỉ email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(/\/user\/overview$/);

    // Page one lists the older seed products, which have no media; filter to an
    // imported group first.
    await page.goto("/user/products");
    await expect(page.getByLabel("Danh mục sản phẩm")).toBeVisible();
    await page.getByLabel("Danh mục sản phẩm").selectOption({ label: "Ví nam" });
    const thumbs = page.locator("tbody tr:visible .product-cell img");
    await expect(thumbs.first()).toBeVisible();
    const thumbSrc = await thumbs.first().getAttribute("src");
    expect(thumbSrc).toContain("tikicdn.com");
    await expect
      .poll(
        () => thumbs.first().evaluate((node) => (node as HTMLImageElement).naturalWidth),
        { timeout: 20000 },
      )
      .toBeGreaterThan(0);

    await page.goto(`/user/analysis?product=${videoProduct}`);
    const main = page.locator(".product-media-main");
    await expect(main).toBeVisible();
    await expect
      .poll(
        () => main.evaluate((node) => (node as HTMLImageElement).naturalWidth),
        { timeout: 20000 },
      )
      .toBeGreaterThan(0);
    await expect(page.locator(".product-media-video")).toBeVisible();
    await expect(page.getByText("Đây là tư liệu hiển thị", { exact: false })).toBeVisible();

    // A gallery thumbnail switches the main image.
    const strip = page.locator(".product-media-strip button");
    if ((await strip.count()) > 1) {
      const before = await main.getAttribute("src");
      await strip.nth(1).click();
      await expect(main).not.toHaveAttribute("src", before ?? "");
      await expect
        .poll(
          () => main.evaluate((node) => (node as HTMLImageElement).naturalWidth),
          { timeout: 20000 },
        )
        .toBeGreaterThan(0);
    }

    // A delisted listing keeps the placeholder tile and says why.
    await page.goto(`/user/analysis?product=${missingProduct}`);
    await expect(page.locator(".product-media.empty")).toBeVisible();
    await expect(page.getByText("Tin đăng gốc không còn truy cập được", { exact: false })).toBeVisible();
    await expect(page.locator(".product-media-main")).toHaveCount(0);

    expect(errors).toEqual([]);
  } finally {
    await page.request.post("/api/backend/auth/logout");
  }
});
