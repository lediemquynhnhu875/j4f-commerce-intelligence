// Parse file structure only. The backend owns field mapping, validation and ownership.
export function readProductFile(text: string, filename: string): unknown[] {
  const content = text.replace(/^\uFEFF/, "");
  if (filename.toLowerCase().endsWith(".json")) {
    let value: unknown;
    try {
      value = JSON.parse(content);
    } catch {
      throw new Error(
        "File JSON chưa đúng cấu trúc. Hãy kiểm tra file hoặc xuất lại từ nguồn dữ liệu.",
      );
    }
    const findRows = (item: unknown, depth = 0): unknown[] | undefined => {
      if (Array.isArray(item)) return item;
      if (!item || typeof item !== "object" || depth > 3) return;
      for (const key of ["items", "products", "data", "results"]) {
        const found = findRows(
          (item as Record<string, unknown>)[key],
          depth + 1,
        );
        if (found) return found;
      }
    };
    const rows = findRows(value);
    if (!rows?.length)
      throw new Error(
        "File cần chứa danh sách sản phẩm trong products, items, data hoặc một mảng JSON.",
      );
    return rows;
  }
  if (!filename.toLowerCase().endsWith(".csv"))
    throw new Error("Hãy chọn file CSV hoặc JSON.");
  function parse(separator: string) {
    const rows: string[][] = [];
    let row: string[] = [],
      field = "",
      quoted = false;
    for (let index = 0; index < content.length; index++) {
      const char = content[index];
      if (char === '"') {
        if (quoted && content[index + 1] === '"') {
          field += '"';
          index++;
        } else if (quoted || !field.length) quoted = !quoted;
        else field += char;
      } else if (char === separator && !quoted) {
        row.push(field.trim());
        field = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && content[index + 1] === "\n") index++;
        row.push(field.trim());
        if (row.some((value) => value.length)) rows.push(row);
        row = [];
        field = "";
      } else field += char;
    }
    if (quoted) throw new Error("File CSV có dấu ngoặc kép chưa đóng.");
    row.push(field.trim());
    if (row.some((value) => value.length)) rows.push(row);
    return rows;
  }
  const candidates = [",", ";", "\t"].map((separator) => parse(separator));
  const rows = candidates.sort(
    (a, b) => (b[0]?.length ?? 0) - (a[0]?.length ?? 0),
  )[0];
  const headers = rows.shift();
  if (
    !headers ||
    !rows.length ||
    headers.some((value) => !value) ||
    new Set(headers).size !== headers.length
  )
    throw new Error(
      "File CSV cần tiêu đề cột riêng biệt và ít nhất một dòng sản phẩm.",
    );
  return rows.map((row, index) => {
    if (row.length !== headers.length)
      throw new Error(
        `Dòng ${index + 2} có số cột khác tiêu đề. Hãy kiểm tra dấu phân cách.`,
      );
    return Object.fromEntries(headers.map((key, column) => [key, row[column]]));
  });
}
