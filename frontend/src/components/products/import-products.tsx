"use client";
import { useRef, useState, type ChangeEvent } from "react";
import { api } from "@/lib/api-client";
import { readProductFile } from "@/lib/import-file";
import { Modal } from "@/components/ui";
import { usePopup } from "@/components/popup";

type Preview = {
  total: number;
  create_count: number;
  update_count: number;
  invalid_count: number;
  ignored_columns: string[];
  rows: {
    row: number;
    name: string;
    price: number | null;
    operation: string;
    errors: string[];
    warnings: string[];
  }[];
};
export function ImportProducts({ refresh }: { refresh: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<unknown[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const generation = useRef(0);
  const { notify } = usePopup();
  function close() {
    if (busy) return;
    generation.current++;
    setOpen(false);
    setItems([]);
    setPreview(null);
  }
  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    const current = ++generation.current;
    setItems([]);
    setPreview(null);
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 2 * 1024 * 1024)
        throw new Error("File vượt quá 2 MB. Hãy chia thành các file nhỏ hơn.");
      const rows = readProductFile(await file.text(), file.name);
      const body = JSON.stringify({ items: rows });
      if (new TextEncoder().encode(body).length > 262144)
        throw new Error(
          "Dữ liệu vượt giới hạn 256 KB mỗi lần nhập. Hãy chia file thành nhiều phần.",
        );
      const result = await api<{ data: Preview }>("products/import/preview", {
        method: "POST",
        body,
      });
      if (current !== generation.current) return;
      setItems(rows);
      setPreview(result.data);
    } catch (error) {
      if (current === generation.current)
        notify((error as Error).message, "Kiểm tra file nhập");
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  async function save() {
    if (busy || !preview || preview.invalid_count || !items.length) return;
    setBusy(true);
    try {
      const result = await api<{
        data: { created_count: number; updated_count: number };
      }>("products/import", {
        method: "POST",
        body: JSON.stringify({ items }),
      });
      setOpen(false);
      setItems([]);
      setPreview(null);
      notify(
        `Đã thêm ${result.data.created_count} sản phẩm và cập nhật ${result.data.updated_count} sản phẩm. Các kết quả phân tích đã lưu phản ánh dữ liệu tại lần phân tích trước.`,
        "Nhập dữ liệu thành công",
      );
      await refresh();
    } catch (error) {
      notify((error as Error).message, "Nhập dữ liệu thất bại");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="button subtle" onClick={() => setOpen(true)}>
        Import dữ liệu
      </button>
      {open && (
        <Modal title="Nhập dữ liệu sản phẩm" onClose={close}>
          <div className="connected-form">
            <p>
              Chọn CSV hoặc JSON. Hệ thống tự nhận diện cột, chuẩn hóa dữ liệu
              và gắn sản phẩm vào cửa hàng của bạn.
            </p>
            <label>
              Chọn file dữ liệu
              <input
                type="file"
                accept=".csv,.json"
                disabled={busy}
                onChange={selectFile}
              />
            </label>
            <p className="muted">
              Tối đa 1.000 dòng, dữ liệu gửi tối đa 256 KB. Dùng mã sản phẩm ổn
              định để cập nhật lần sau. Ô trống khi cập nhật giữ giá trị hiện
              có.
            </p>
            {busy && <p role="status">Đang xử lý dữ liệu…</p>}
            {preview && (
              <>
                <p>
                  {preview.total} dòng · {preview.create_count} thêm mới ·{" "}
                  {preview.update_count} cập nhật · {preview.invalid_count} cần
                  kiểm tra
                </p>
                {preview.ignored_columns.length > 0 && (
                  <details>
                    <summary>
                      Các cột được bỏ qua ({preview.ignored_columns.length})
                    </summary>
                    <p>{preview.ignored_columns.join(", ")}</p>
                  </details>
                )}
                <div className="import-preview table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>DÒNG</th>
                        <th>SẢN PHẨM</th>
                        <th>GIÁ</th>
                        <th>XỬ LÝ</th>
                        <th>CẦN LƯU Ý</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row) => (
                        <tr key={row.row}>
                          <td>{row.row}</td>
                          <td>{row.name}</td>
                          <td>
                            {row.price === null
                              ? "Chưa có"
                              : row.price.toLocaleString("vi-VN")}
                          </td>
                          <td>
                            {row.operation === "create"
                              ? "Thêm mới"
                              : "Cập nhật"}
                          </td>
                          <td>
                            {[...row.errors, ...row.warnings].join(" ") ||
                              "Hợp lệ"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.invalid_count > 0 && (
                  <p>
                    Hãy sửa các dòng cần kiểm tra trong file và chọn lại file để
                    tiếp tục.
                  </p>
                )}
              </>
            )}
            <div className="popup-buttons">
              <button className="button subtle" disabled={busy} onClick={close}>
                Hủy
              </button>
              <button
                className="button primary"
                disabled={busy || !preview || preview.invalid_count > 0}
                onClick={save}
              >
                Xác nhận nhập
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
