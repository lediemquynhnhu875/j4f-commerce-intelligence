import { test, expect } from "@playwright/test";

test("ML sample shows five groups of twenty and saved recommendations", async ({
  page,
}) => {
  const email = process.env.SEED_USER1_EMAIL,
    password = process.env.SEED_USER1_PASSWORD;
  if (!email || !password)
    throw new Error(
      "Provide seed test credentials through environment variables",
    );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto("/login");
    await page.getByLabel("Địa chỉ email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(/\/user\/overview$/);
    await expect(
      page.getByText("Phản hồi tốt nhưng bán thấp", { exact: true }),
    ).toBeVisible();
    await page.goto("/user/products");
    for (const name of [
      "Giày lười nam",
      "Túi đeo chéo",
      "Balo",
      "Ví nam",
      "Mũ nón",
    ]) {
      await expect(page.getByLabel("Danh mục sản phẩm")).toBeVisible();
      await page.getByLabel("Danh mục sản phẩm").selectOption({ label: name });
      await expect(page.locator(".table-footer:visible")).toContainText(
        "/ 20 sản phẩm",
      );
      await expect(page.locator("tbody tr:visible")).toHaveCount(4);
      await expect(page.locator("tbody tr:visible").first()).toContainText(
        name,
      );
    }
    await page.getByRole("link", { name: "Xem", exact: true }).first().click();
    await expect(
      page.getByText("Phân tích thử nghiệm, cần rà soát.", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("Khoảng tham chiếu", { exact: true }),
    ).toBeVisible();
    await page.goto("/user/suggestions");
    await expect(
      page
        .getByText("Đề xuất thử nghiệm từ ML, cần rà soát.", { exact: true })
        .first(),
    ).toBeVisible();
    await expect(page.getByText(/^Bằng chứng:/).first()).toBeVisible();
    await expect(page.getByText(/^Cần xác minh:/).first()).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await page.request.post("/api/backend/auth/logout");
  }
});
