import { createHash } from "node:crypto";
import { productSchema } from "../validation";

export const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const aliases: Record<string, string[]> = {
  name: ["name", "product_name", "title", "ten", "ten san pham"],
  description: ["description", "mo ta", "mo ta san pham", "short_description"],
  price: [
    "price",
    "selling_price",
    "sale_price",
    "gia",
    "gia ban",
    "gia sau khuyen mai",
  ],
  original_price: ["original_price", "list_price", "gia goc", "gia niem yet"],
  quantity_sold: [
    "quantity_sold",
    "sold",
    "sold_count",
    "so ban",
    "da ban",
    "so luong da ban",
  ],
  rating_average: ["rating_average", "rating", "diem danh gia", "danh gia"],
  review_count: [
    "review_count",
    "reviews_count",
    "so danh gia",
    "so luot danh gia",
  ],
  number_of_images: ["number_of_images", "image_count", "so anh"],
  has_video: ["has_video", "co video"],
  thumbnail_url: [
    "thumbnail_url",
    "thumbnail",
    "image",
    "image_url",
    "anh",
    "anh dai dien",
  ],
  image_urls: ["image_urls", "images", "danh sach anh"],
  video_url: ["video_url", "video", "link video"],
  category_name: [
    "category",
    "category_name",
    "danh muc",
    "ten danh muc",
    "product_type",
  ],
  category_id: ["category_id"],
  currency: ["currency", "tien te", "don vi tien"],
  observed_at: [
    "observed_at",
    "captured_at",
    "ngay ghi nhan",
    "thoi diem ghi nhan",
  ],
  source_product_id: [
    "source_product_id",
    "product_id",
    "product_code",
    "sku",
    "id",
    "ma san pham",
    "msp",
  ],
};
const fieldMap = new Map(
  Object.entries(aliases).flatMap(([field, names]) =>
    names.map((name) => [normalizeKey(name), field] as const),
  ),
);
export type NormalizedImport = {
  fields: Record<string, unknown>;
  key: string;
  categoryName?: string;
  errors: string[];
  ignored: string[];
  warnings: string[];
};

function numeric(value: unknown, integer: boolean): number {
  if (typeof value === "number") return value;
  let text = String(value)
    .trim()
    .replace(/(?:VND|VNĐ|₫|đ|\s)/gi, "");
  if (!/^[+-]?[\d.,]+$/.test(text))
    throw new Error("cần là số, không chứa ký tự khác");
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text))
    text = text.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(text))
    text = text.replace(/,/g, "");
  else if (/^\d+([.,]\d{1,2})?$/.test(text)) text = text.replace(",", ".");
  else throw new Error("có định dạng số chưa nhận diện được");
  const result = Number(text);
  if (!Number.isFinite(result) || (integer && !Number.isSafeInteger(result)))
    throw new Error("cần là số hợp lệ");
  return result;
}

export function normalizeImportRow(value: unknown): NormalizedImport {
  const result: NormalizedImport = {
    fields: {},
    key: "",
    errors: [],
    ignored: [],
    warnings: [],
  };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    result.errors.push("Dòng cần chứa thông tin một sản phẩm.");
    return result;
  }
  const fields: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    const field = fieldMap.get(normalizeKey(key));
    if (!field) {
      result.ignored.push(key);
      continue;
    }
    if (raw === null || raw === undefined || raw === "") continue;
    if (
      field in fields &&
      JSON.stringify(fields[field]) !== JSON.stringify(raw)
    ) {
      result.errors.push(
        `Có nhiều cột cùng thể hiện ${field}. Cần giữ một cột để tránh nhập nhầm.`,
      );
      continue;
    }
    fields[field] = raw;
  }
  for (const [key, raw] of Object.entries(fields)) {
    try {
      if (
        [
          "price",
          "original_price",
          "quantity_sold",
          "review_count",
          "number_of_images",
          "rating_average",
        ].includes(key)
      )
        fields[key] = numeric(
          typeof raw === "object" && raw !== null && "value" in raw
            ? (raw as { value: unknown }).value
            : raw,
          ["quantity_sold", "review_count", "number_of_images"].includes(key),
        );
      else if (key === "has_video") {
        const text = normalizeKey(String(raw));
        if (
          !["true", "false", "1", "0", "co", "khong", "yes", "no"].includes(
            text,
          )
        )
          throw new Error("cần là có/không, true/false hoặc 1/0");
        fields[key] = ["true", "1", "co", "yes"].includes(text);
      } else if (key === "image_urls") {
        const urls =
          typeof raw === "string"
            ? raw.trim().startsWith("[")
              ? JSON.parse(raw)
              : raw.split(/\s*[|;]\s*/)
            : raw;
        if (!Array.isArray(urls))
          throw new Error("cần là danh sách địa chỉ ảnh");
        fields[key] = urls.map((item) =>
          typeof item === "string" ? item : (item?.base_url ?? item?.url),
        );
      } else if (key === "thumbnail_url" && typeof raw === "object")
        fields[key] = (raw as Record<string, unknown>).url;
      else if (key === "observed_at") {
        const text = String(raw);
        if (
          !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(text) ||
          !Number.isFinite(Date.parse(text))
        )
          throw new Error("cần ngày dạng YYYY-MM-DD hoặc thời gian ISO");
        fields[key] = new Date(text).toISOString();
      } else if (key === "currency")
        fields[key] = String(raw).trim().toUpperCase();
      else fields[key] = String(raw).trim();
    } catch (error) {
      result.errors.push(`${key} ${(error as Error).message}.`);
      delete fields[key];
    }
  }
  result.categoryName = fields.category_name as string | undefined;
  delete fields.category_name;
  if (fields.source_product_id) result.key = String(fields.source_product_id);
  delete fields.source_product_id;
  if (!result.key && fields.name) {
    result.key = `auto:${createHash("sha256").update(String(fields.name).trim().toLocaleLowerCase("vi")).digest("hex").slice(0, 32)}`;
    result.warnings.push(
      "Thiếu mã nguồn, dùng tên để nhận diện. Đổi tên trong file có thể tạo sản phẩm mới.",
    );
  }
  if (fields.category_id && result.categoryName) {
    delete fields.category_id;
    result.warnings.push(
      "Sử dụng tên danh mục thay cho mã danh mục trong file.",
    );
  }
  if (fields.image_urls && !fields.thumbnail_url)
    fields.thumbnail_url = (fields.image_urls as string[])[0];
  if (fields.image_urls && fields.number_of_images === undefined)
    fields.number_of_images = (fields.image_urls as string[]).length;
  if (fields.video_url && fields.has_video === undefined)
    fields.has_video = true;
  result.fields = fields;
  const checked = productSchema.partial().safeParse(fields);
  if (!checked.success)
    result.errors.push(
      ...checked.error.issues.map(
        (issue) => `${issue.path.join(".") || "Dữ liệu"}: ${issue.message}`,
      ),
    );
  else result.fields = checked.data;
  if (result.key.length > 255)
    result.errors.push("Mã sản phẩm dài quá 255 ký tự.");
  return result;
}
