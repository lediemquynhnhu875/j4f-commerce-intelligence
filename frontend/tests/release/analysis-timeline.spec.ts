import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-18T06:00:00.000Z"));
});

const product = {
  id: "14",
  name: "Túi canvas",
  currency: "VND",
  quantity_sold: "999",
  category_id: null,
  thumbnail_url: null,
};
function savedAnalysis(
  id: string,
  analyzed_at: string,
  sales: number | null,
  observedPrice: number,
) {
  return {
    id,
    analyzed_at,
    product_id: product.id,
    status: "performing_well",
    input_snapshot_json: { quantity_sold: sales, price: observedPrice },
    evidence_json: {
      items: [{ metric: "price", observed: observedPrice, peer_median: 100 }],
    },
    comparison_json: {},
    config_json: {},
    reference_sold: null,
    sales_gap: null,
    pipeline_version: "test",
    model_version: "test",
  };
}
const older = savedAnalysis("1", "2026-11-17T05:00:00Z", 0, 123);
const newest = savedAnalysis("2", "2026-11-18T05:00:00Z", 12, 456);

async function openAnalysis(
  page: Page,
  rows: ReturnType<typeof savedAnalysis>[],
  url = "/user/analysis?product=14",
) {
  const requested: URL[] = [];
  await page.route("**/api/backend/**", (route) => {
    const url = new URL(route.request().url());
    const { pathname: path, searchParams } = url;
    requested.push(url);
    const selected = [...rows]
      .filter((row) => {
        const from = Date.parse(`${searchParams.get("from")}T00:00:00+07:00`);
        const to =
          Date.parse(`${searchParams.get("to")}T00:00:00+07:00`) + 86400000;
        const time = Date.parse(row.analyzed_at);
        return time >= from && time < to;
      })
      .sort((a, b) => Date.parse(b.analyzed_at) - Date.parse(a.analyzed_at));
    const data = path.endsWith("/auth/me")
      ? { id: "91", full_name: "Store owner", role: "user", is_active: true }
      : path.endsWith("/workspace/summary")
        ? { store_name: "Store", proposed_count: 0, latest_analyzed_at: null }
        : path.endsWith("/analysis-workspace")
          ? {
              product,
              has_analysis: rows.length > 0,
              latest: selected[0]
                ? { analysis: selected[0], actions: [] }
                : null,
              timeline: selected.map(
                ({ id, analyzed_at, input_snapshot_json }) => ({
                  id,
                  analyzed_at,
                  quantity_sold: input_snapshot_json.quantity_sold,
                }),
              ),
            }
          : {
              analysis: rows.find((row) =>
                path.endsWith(`/products/14/analyses/${row.id}`),
              ),
              actions: [],
            };
    return route.fulfill({
      json: {
        data,
        pagination: { total: Array.isArray(data) ? data.length : 0 },
      },
    });
  });
  await page.goto(url);
  return requested;
}

test("retrying live inference keeps the request key and opens the saved result", async ({ page }) => {
  const rows: ReturnType<typeof savedAnalysis>[] = [];
  await openAnalysis(page, rows);
  const keys: string[] = [];
  await page.route("**/api/backend/products/14/analyses", (route) => {
    expect(route.request().method()).toBe("POST");
    keys.push(route.request().headers()["idempotency-key"]);
    if (keys.length === 1) {
      return route.fulfill({
        status: 503,
        json: { error: { code: "ML_UNAVAILABLE", message: "ML đang khởi động." } },
      });
    }
    rows.push(newest);
    return route.fulfill({
      status: 201,
      json: { data: { id: newest.id, status: newest.status, reused: false } },
    });
  });
  const run = page.getByRole("button", { name: "Chạy phân tích" });
  await run.click();
  await expect(page.getByRole("dialog")).toContainText("ML đang khởi động.");
  await page.getByRole("button", { name: "Đã hiểu" }).click();
  await run.click();
  await expect(page.getByRole("dialog")).toContainText("Phân tích hoàn tất");
  await page.getByRole("button", { name: "Đã hiểu" }).click();
  await expect(page.getByRole("table", { name: "Bằng chứng theo từng yếu tố" })).toContainText("456");
  expect(keys[0]).toMatch(/^[a-f0-9-]{36}$/);
  expect(keys).toEqual([keys[0], keys[0]]);
});

test("one imported result shows axis labels and evidence without a history selector", async ({
  page,
}) => {
  const requested = await openAnalysis(page, [newest]);
  await expect(
    page.getByRole("button", { name: /^Xem mốc.*12 đã bán/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("table", { name: "Lịch sử phân tích" }),
  ).toHaveCount(0);
  const chart = page.getByRole("img", {
    name: "Biểu đồ số lượng bán ra theo thời điểm phân tích",
  });
  await expect(
    chart.getByText("Số lượng bán ra", { exact: true }),
  ).toBeVisible();
  await expect(chart.getByText("Thời gian", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Bằng chứng theo từng yếu tố" }),
  ).toContainText("456");
  expect(
    requested.map((url) => url.pathname.split("/api/backend/")[1]).sort(),
  ).toEqual(["analysis-workspace", "auth/me", "workspace/summary"]);
  expect(
    requested
      .find((url) => url.pathname.endsWith("/analysis-workspace"))
      ?.searchParams.get("product_id"),
  ).toBe("14");
});

test("chart text keeps its proportions as the viewport changes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1760, height: 1000 });
  await openAnalysis(page, [older, newest]);
  const chart = page.getByRole("img", {
    name: "Biểu đồ số lượng bán ra theo thời điểm phân tích",
  });
  const readScale = () =>
    chart.evaluate((element: SVGSVGElement) => {
      const { a, d } = element.getScreenCTM()!;
      return { x: a, y: d };
    });

  await expect(chart).toBeVisible();
  const wideWidth = (await chart.boundingBox())!.width;
  expect(wideWidth).toBeGreaterThan(800);
  await expect.poll(readScale).toEqual({ x: 1, y: 1 });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => (await chart.boundingBox())!.width)
    .toBeLessThan(390);
  await expect.poll(readScale).toEqual({ x: 1, y: 1 });
});

test("choosing an older chart point replaces the evidence with the saved analysis for that date", async ({
  page,
}) => {
  const requested = await openAnalysis(page, [older, newest], "/user/analysis");
  const graph = page.getByRole("heading", {
    name: "Số lượng bán ra theo thời gian",
  });
  const evidenceHeading = page.getByRole("heading", {
    name: "Bằng chứng quan sát",
    exact: true,
  });
  await expect(evidenceHeading).toBeVisible();
  expect((await graph.boundingBox())!.y).toBeLessThan(
    (await evidenceHeading.boundingBox())!.y,
  );
  const evidence = page.getByRole("table", {
    name: "Bằng chứng theo từng yếu tố",
  });
  await expect(
    page.getByRole("table", { name: "Lịch sử phân tích" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Xem mốc/ })).toHaveCount(2);
  await expect(evidence).toContainText("456");
  await page.getByRole("button", { name: /^Xem mốc.*, 0 đã bán/ }).click();
  await expect(evidence).toContainText("123");
  await expect(evidence).not.toContainText("456");
  await expect(page).toHaveURL(/analysis=1/);
  expect(
    requested.filter((url) => url.pathname.endsWith("/analysis-workspace")),
  ).toHaveLength(1);
  expect(
    requested.filter((url) => url.pathname.endsWith("/products/14/analyses/1")),
  ).toHaveLength(1);
  await page.getByRole("button", { name: "Về mốc mới nhất" }).click();
  await expect(evidence).toContainText("456");
});

test("an analysis without a sales count can be selected without plotting it as zero", async ({
  page,
}) => {
  const noSales = savedAnalysis("3", "2026-11-16T05:00:00Z", null, 789);
  await openAnalysis(page, [noSales, newest]);
  const point = page.getByRole("button", {
    name: /^Xem mốc.*, chưa có số bán/,
  });
  await expect(point).toHaveAttribute("data-missing-sales", "true");
  await point.click();
  await expect(
    page.getByRole("table", { name: "Bằng chứng theo từng yếu tố" }),
  ).toContainText("789");
});

test("the period runs from June to today in Vietnam and updates the selected evidence", async ({
  page,
}) => {
  // UTC is still November 17 at this instant, while Vietnam has reached November 18.
  await page.clock.setFixedTime(new Date("2026-11-17T17:10:00.000Z"));
  const juneStart = savedAnalysis("3", "2026-05-31T17:00:00.000Z", 2, 333);
  const beforeJune = savedAnalysis("4", "2026-05-31T16:59:59.000Z", 1, 444);
  await openAnalysis(page, [older, newest, juneStart, beforeJune]);

  const from = page.getByLabel("Từ ngày", { exact: true });
  const to = page.getByLabel("Đến ngày", { exact: true });
  const points = page.getByRole("button", { name: /^Xem mốc/ });
  const evidence = page.getByRole("table", {
    name: "Bằng chứng theo từng yếu tố",
  });
  await expect(from).toHaveValue("2026-06-01");
  await expect(to).toHaveValue("2026-11-18");
  await expect(to).toHaveAttribute("max", "2026-11-18");
  await expect(points).toHaveCount(3);
  const chart = page.getByRole("img", {
    name: "Biểu đồ số lượng bán ra theo thời điểm phân tích",
  });
  await expect(chart.getByText("01/06/2026")).toBeVisible();
  await expect(chart.getByText("18/11/2026")).toBeVisible();
  await expect(evidence).toContainText("456");

  await from.fill("2026-11-17");
  await to.fill("2026-11-17");
  await expect(points).toHaveCount(1);
  await expect(evidence).toContainText("123");

  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(points).toHaveCount(3);
  await expect(evidence).toContainText("456");

  await page.clock.setFixedTime(new Date("2026-11-18T17:10:00.000Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(to).toHaveValue("2026-11-19");
  await expect(chart.getByText("19/11/2026")).toBeVisible();
});

test("a product without saved analyses shows only the product and a compact message", async ({
  page,
}) => {
  await openAnalysis(page, []);
  await expect(page.getByText(product.name, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Sản phẩm đã chọn chưa có kết quả phân tích",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Từ ngày", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("img", {
      name: "Biểu đồ số lượng bán ra theo thời điểm phân tích",
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Bằng chứng quan sát" }),
  ).toHaveCount(0);
});

test("an empty date range keeps the filters available for a product with history", async ({
  page,
}) => {
  await openAnalysis(page, [older]);
  const from = page.getByLabel("Từ ngày", { exact: true });
  await from.fill("2026-11-18");
  await expect(
    page.getByRole("heading", {
      name: "Chưa có bằng chứng trong khoảng đã chọn",
    }),
  ).toBeVisible();
  await expect(from).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "Biểu đồ số lượng bán ra theo thời điểm phân tích",
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bằng chứng quan sát" }),
  ).toBeVisible();
});
