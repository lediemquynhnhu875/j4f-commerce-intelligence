import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, role: "admin" | "user") {
  await page.goto("/preview/login");
  await page
    .getByRole("button", {
      name:
        role === "admin"
          ? "Admin Quản trị hệ thống"
          : "Chủ cửa hàng Juno Official Store",
    })
    .click();
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/preview/${role}/overview`));
  await expect(page.getByRole("navigation")).toBeVisible();
}

test("invalid demo credentials show an error; both actors reach all four pages and logout", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByLabel("Địa chỉ email").fill("unknown@sellens.demo");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator(".form-error[role=alert]:visible")).toContainText(
    "không đúng",
  );
  for (const role of ["user", "admin"] as const) {
    await login(page, role);
    const labels =
      role === "user"
        ? [
            "Tổng quan",
            "Sản phẩm của tôi",
            "Kết quả phân tích",
            "Đề xuất cải thiện",
          ]
        : [
            "Tổng quan hệ thống",
            "Quản lý cửa hàng",
            "Giám sát phân tích",
            "Cấu hình mô hình & Quy tắc",
          ];
    await expect(page.getByRole("navigation").getByRole("link")).toHaveCount(4);
    for (const label of labels) {
      await page
        .getByRole("navigation")
        .getByRole("link", { name: label, exact: true })
        .click();
      await expect(page.locator("#main-content:visible h1")).toBeVisible();
      await expect(
        page.getByRole("banner").getByText("MOCK DATA", { exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`${role}-${labels.indexOf(label)}.png`),
        fullPage: true,
      });
    }
    await page.getByRole("button", { name: "Đăng xuất demo" }).click();
    await expect(page).toHaveURL(/\/preview\/login/);
  }
  expect(errors).toEqual([]);
});

test("catalog pagination resets on filtering; selection opens the matching analysis and missing basis stays unavailable", async ({
  page,
}) => {
  await login(page, "user");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Sản phẩm của tôi" })
    .click();
  await expect(page.locator("tbody tr:visible")).toHaveCount(4);
  await page.getByRole("button", { name: "Trang 2", exact: true }).click();
  await expect(page.locator("tbody tr:visible")).toHaveCount(2);
  await page.getByRole("textbox", { name: "Tìm sản phẩm" }).fill("SP-88421");
  await expect(page.locator("tbody tr:visible")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Trang 1", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("checkbox", { name: "Chọn SP-88421" }).check();
  await page.getByRole("button", { name: /Xem phân tích đã chọn/ }).click();
  await expect(page).toHaveURL(/product=SP-88421/);
  await expect(
    page.getByRole("heading", { name: "Giày Sneaker Nữ Cổ Thấp Độn Đế Basic" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Sản phẩm phân tích" })
    .selectOption("SP-33912");
  await expect(page).toHaveURL(/product=SP-33912/);
  await expect(
    page.getByRole("heading", { name: /Chưa đủ cơ sở để đưa ra tham chiếu/ }),
  ).toBeVisible();
  await page.goto("/preview/user/products");
  await page.getByRole("textbox", { name: "Tìm sản phẩm" }).fill("no-result");
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy kết quả" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(page.locator("tbody tr:visible")).toHaveCount(4);
});

test("suggestions require a rejection reason and preserve evidence; accepted work progresses in Kanban", async ({
  page,
}) => {
  await login(page, "user");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Đề xuất cải thiện" })
    .click();
  const first = page.locator("article").filter({ hasText: "DX-104" });
  const evidence = await first.locator(".evidence p").textContent();
  await first.getByRole("button", { name: "Từ chối", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận từ chối" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
    "Vui lòng nhập lý do từ chối.",
  );
  await page.getByLabel("Lý do từ chối").fill("Cần kiểm chứng dữ liệu trước.");
  await page.getByRole("button", { name: "Xác nhận từ chối" }).click();
  await expect(first).toContainText("Cần kiểm chứng dữ liệu trước.");
  await expect(first.locator(".evidence p")).toHaveText(evidence!);
  const second = page.locator("article").filter({ hasText: "DX-102" });
  await second.getByRole("button", { name: "Chấp nhận", exact: true }).click();
  await second.getByRole("button", { name: "Bắt đầu thực hiện" }).click();
  await second.getByRole("button", { name: "Đánh dấu hoàn thành" }).click();
  await expect(second).toContainText("Đã hoàn thành");
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  await expect(
    page
      .locator(".kanban-column")
      .filter({ hasText: "Đã hoàn thành" })
      .locator("article"),
  ).toHaveCount(1);
});

test("admin can inspect and modify local store fixtures; monitor distinguishes failed jobs", async ({
  page,
}) => {
  await login(page, "admin");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Quản lý cửa hàng" })
    .click();
  await page.getByRole("button", { name: "Thêm cửa hàng demo" }).click();
  await page.getByLabel("Tên cửa hàng").fill("Demo Store Test");
  await page.getByLabel("Chủ sở hữu").fill("Demo Owner");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Thêm cửa hàng", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Demo Store Test", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tạm dừng cửa hàng" }).click();
  await expect(
    page.locator("tbody tr:visible").filter({ hasText: "Demo Store Test" }),
  ).toContainText("Tạm dừng");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Giám sát phân tích" })
    .click();
  await page
    .getByRole("combobox", { name: "Trạng thái tác vụ" })
    .selectOption("failed");
  await expect(page.locator("tbody tr:visible")).toHaveCount(1);
  await page.getByRole("button", { name: "Xem JOB-8917" }).click();
  await expect(
    page.getByText("Timeout (fixture)", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Không có kết quả suy luận cho tác vụ lỗi. Không gán kết luận.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("configuration saves only local demo versions and can restore defaults", async ({
  page,
}) => {
  await login(page, "admin");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Cấu hình mô hình & Quy tắc" })
    .click();
  await expect(
    page.getByRole("button", { name: "Lưu phiên bản demo" }),
  ).toBeDisabled();
  await page.getByLabel("Số lượng sản phẩm tối thiểu").fill("20");
  await page.getByRole("button", { name: "Lưu phiên bản demo" }).click();
  await expect(page.locator("tbody tr:visible")).toHaveCount(2);
  await expect(page.locator("tbody tr:visible").first()).toContainText(
    "Min cohort: 20",
  );
  await page.getByRole("button", { name: "Khôi phục mặc định" }).click();
  await expect(page.getByLabel("Số lượng sản phẩm tối thiểu")).toHaveValue(
    "15",
  );
});

test("demo role presentation survives refresh, denies another workspace, and fits mobile with keyboard navigation", async ({
  page,
}, testInfo) => {
  await login(page, "user");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Xin chào Nguyễn Văn Minh" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("user-desktop.png"),
    fullPage: true,
  });
  await page.goto("/preview/admin/overview");
  await expect(
    page.getByRole("heading", { name: "Không gian làm việc khác vai trò" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Về không gian của tôi" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Mở menu" })).toBeVisible();
  await page.getByRole("button", { name: "Mở menu" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Sản phẩm của tôi" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/preview\/user\/products/);
  await expect(page.locator(".sidebar:visible")).not.toHaveClass(/open/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: testInfo.outputPath("user-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Mở menu" }).click();
  await page.getByRole("button", { name: "Đăng xuất demo" }).click();
  await page.goto("/preview/user/overview");
  await expect(
    page.getByRole("heading", { name: "Mời bạn đăng nhập demo" }),
  ).toBeVisible();
});
