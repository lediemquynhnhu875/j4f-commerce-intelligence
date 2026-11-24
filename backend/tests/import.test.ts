import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeImportRow } from "../src/server/services/import-normalize";
import { readProductFile } from "../../frontend/src/lib/import-file";

test("CSV preserves apostrophes, quoted delimiters and multiline values", () => {
  assert.deepEqual(
    readProductFile(
      'Tên sản phẩm;Giá;Mô tả\n"Giày Men\'s";"85.000 ₫";"Dòng 1\nDòng 2; có dấu chấm phẩy"',
      "products.csv",
    ),
    [
      {
        "Tên sản phẩm": "Giày Men's",
        Giá: "85.000 ₫",
        "Mô tả": "Dòng 1\nDòng 2; có dấu chấm phẩy",
      },
    ],
  );
  assert.throws(() => readProductFile('name,price\n"unclosed,1', "bad.csv"));
  assert.throws(() => readProductFile("name,name\na,b", "bad.csv"));
});

test("JSON envelopes and Vietnamese columns normalize without accepting ownership", () => {
  const rows = readProductFile(
    '{"data":{"products":[{"Tên sản phẩm":"Túi","Giá bán":"85.000 ₫","Số bán":"0","Điểm đánh giá":"4,5","Có video":"không","store_id":"900"}]}}',
    "products.JSON",
  );
  const row = normalizeImportRow(rows[0]);
  assert.deepEqual(row.errors, []);
  assert.equal(row.fields.price, 85000);
  assert.equal(row.fields.quantity_sold, 0);
  assert.equal(row.fields.rating_average, 4.5);
  assert.equal(row.fields.has_video, false);
  assert.equal(row.fields.store_id, undefined);
  assert(row.ignored.includes("store_id"));
});

test("sparse updates preserve missing fields and flag ambiguous or invalid input", () => {
  const sparse = normalizeImportRow({
    sku: "A1",
    quantity_sold: "12",
    price: "",
  });
  assert.deepEqual(sparse.errors, []);
  assert.equal(sparse.key, "A1");
  assert.equal(sparse.fields.price, undefined);
  assert.equal(sparse.fields.name, undefined);
  assert(
    normalizeImportRow({ name: "A", price: 10, "Giá bán": 12 }).errors.length,
  );
  assert(normalizeImportRow({ name: "A", has_video: "maybe" }).errors.length);
  assert(normalizeImportRow({ name: "A", rating: 6 }).errors.length);
  assert(normalizeImportRow({ name: "A", price: "1.2345" }).errors.length);
  assert(
    normalizeImportRow({ name: "A", images: ["javascript:bad"] }).errors.length,
  );
});
