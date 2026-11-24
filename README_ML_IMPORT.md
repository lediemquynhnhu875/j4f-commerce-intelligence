# Nạp kết quả ML thật vào Sellens

Gói này bổ sung CLI import offline, không đổi API và không gọi mô hình Python.
Chép các file trong ZIP vào đúng đường dẫn tương ứng tại thư mục gốc project.
Giữ nguyên package.json, lockfile và các migrations đã có.

## 1. Chuẩn bị file (chạy ở thư mục gốc project)

Cần ba file trong `data/processed/`:
`products_full.json`, `product_statuses.csv`, `product_recommendations.csv`.

```powershell
python backend/scripts/prepare-ml-import.py
```

Nếu máy dùng Python launcher, thay `python` bằng `py`.
Lệnh chỉ đọc file và tạo `data/processed/ml-import-v1/`, không kết nối database.
Nếu thư mục đầu ra đã tồn tại, dùng `--output data/processed/ml-import-v2`;
không ghi đè kết quả cũ.

Kết quả: `records.ndjson`, `manifest.json`, `sellers.csv` và
`store-mapping.example.json`. File sellers.csv là bảng seller nguồn/số sản phẩm;
đừng nhầm với quyền sở hữu tài khoản ứng dụng. Giữ các file dữ liệu ngoài Git.
Bộ đầu vào hiện có chứa 41.576 sản phẩm, 42.652 đề xuất; có cờ chất lượng chưa đạt.

## 2. Xem store hiện có (chạy ở backend)

```powershell
cd backend
node --import tsx scripts/list-import-stores.ts
```

Cần dependencies đã cài (`npm ci` nếu chưa), và DATABASE_URL trong cấu hình .env
hiện có. Không gửi .env/mật khẩu/token lên chat. Lệnh chỉ đọc thông tin store,
chủ tài khoản và số sản phẩm. Không tạo tài khoản/store và không chạy migration.
Nếu schema chưa có stores, kiểm tra migration ledger trước khi triển khai tiếp.

## 3. Mapping seller nguồn với store ứng dụng

Sao chép `store-mapping.example.json` thành `store-mapping.json` trong thư mục bundle.
Thay nội dung ví dụ bên dưới bằng seller chính xác từ sellers.csv và store_id thật
ở bước 2. Store ID phải là chuỗi số, không phải email hay seller ID.

```json
{
  "run_key": "ml-v2-demo-stores-v1",
  "seller_to_store": {
    "TEN_SELLER_DA_CHON": "STORE_ID_THAT"
  }
}
```

Một User hiện sở hữu một store. Chỉ seller đã map mới được chọn để import;
CLI báo rõ số không được chọn. Không tự gán 41.576 sản phẩm vào tài khoản bất kỳ.
Bắt đầu với một seller nhỏ. Nhiều seller cùng một store phải là lựa chọn có chủ ý.
Nếu sản phẩm nguồn đã nằm trong store khác, CLI dừng và giữ nguyên dữ liệu cũ.
Cần quyết định mapping riêng cho dữ liệu mẫu đang thuộc J4F store.

## 4. Dry-run, chưa ghi database

Vẫn ở backend:

```powershell
node --import tsx scripts/import-ml-full.ts --mapping ../data/processed/ml-import-v1/store-mapping.json
```

Mặc định là read-only dry-run. Kiểm tra `selected_products`,
`selected_recommendations`, `unselected_products`, `stores`, `insert`,
`reused_analyses` và `fingerprint`. Nó chưa phải kết quả đã import.
Bundle đổi thư mục thì thêm `--bundle ../data/processed/ml-import-v2`.

## 5. Apply sau khi duyệt kế hoạch

Thay FINGERPRINT_TU_DRY_RUN bằng giá trị đầy đủ vừa nhận:

```powershell
node --import tsx scripts/import-ml-full.ts --mapping ../data/processed/ml-import-v1/store-mapping.json --apply --confirm FINGERPRINT_TU_DRY_RUN
```

Thay đổi dữ liệu/mapping sau dry-run sẽ yêu cầu dry-run lại. Toàn bộ phần ghi nằm
trong một transaction, dùng khóa bảng trong lúc apply; nên thử lô nhỏ ngoài thời
điểm người dùng đang thao tác. Không sửa hoặc xóa các bản ghi có sẵn.
Chạy lại lệnh dry-run phải báo `already-imported` và mọi số insert bằng 0.
Giữ run_key cho cùng một lần import; không đổi khóa để né lỗi dữ liệu.
Sau đó đăng nhập User của store để kiểm tra sản phẩm, phân tích, đề xuất và lịch sử.

## Kiểm tra và giới hạn

```powershell
# Ở thư mục gốc:
python -m unittest discover -s backend/tests -p test_prepare_ml_import.py -v
# Ở backend:
npx tsc --noEmit
node --import tsx --test tests/unit.test.ts tests/ml-sample.test.ts tests/sample-cleanup.test.ts tests/import.test.ts
```

Đã kiểm tra exporter trên toàn bộ dữ liệu và đường SQL trên database PGlite thử
nghiệm với lô nhỏ. Chưa thực hiện dry-run/apply trên Neon của bạn, chưa kiểm tra
hiệu năng ghi 41.576 sản phẩm và dung lượng thực tế. Không coi WS1 đã hoàn tất.

Danh mục mới chưa được gán category_id; product_type vẫn được lưu trong phân tích.
Ảnh nguồn chưa có URL. Peer IDs/statistics được giữ trong snapshot so sánh, chưa có
API hồ sơ peer mới. Chưa đổi frontend sang tải từng trang phía server.
Xem `docs/verification/full-ml-import-preparation.md` để biết phạm vi và bằng chứng.
