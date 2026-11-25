# Phân trang danh mục qua API

Bản cập nhật này chỉ áp dụng cho trang **Danh mục sản phẩm**. Trang Tổng quan,
Phân tích và Đề xuất vẫn dùng luồng tải cũ; chưa coi toàn bộ hệ thống sẵn sàng cho
41.576 sản phẩm trong một store.

## Cài vào project

1. Dừng hai terminal chạy frontend/backend bằng Ctrl+C.
2. Giải nén nội dung ZIP vào thư mục gốc project, giữ đúng backend/, frontend/, docs/.
   Đây là bản sửa dựa trên code_hien_tai.zip đã gửi; nếu đã tự sửa các file trong gói,
   hãy đối chiếu diff trước khi chép. Không thay package.json, lockfile hay .env.
3. Ở backend, chạy:

```powershell
npm run db:migrate
npm run dev
```

Migration mới 005 chỉ thêm index. Không sửa migration cũ, không reset/xóa bảng,
không thay dữ liệu hay quyền store. Runner giữ nguyên quy tắc checksum của nhóm;
nếu báo checksum/schema conflict thì dừng, không sửa migration cũ để ép chạy.

4. Mở terminal frontend và chạy:

```powershell
npm run dev
```

5. Đăng nhập User1 tại localhost:3000 rồi vào **Danh mục sản phẩm**.

## Kiểm tra bằng dữ liệu hiện có

- Tổng danh mục vẫn 256 sản phẩm nếu chưa có thay đổi khác.
- Trang đầu hiển thị 20 dòng. Chọn 10/50/100 hoặc chuyển trang sẽ gọi API cho trang đó.
- Tìm theo tên, brand, ID nội bộ hoặc mã SP-ID_NGUON; thử ký tự %/_ như ký tự thường.
- Lọc trạng thái, danh mục, loại ML, chỉ hiện sản phẩm đã phân tích được; thử sắp giá/số bán.
- Bộ lọc/đổi kích thước trang quay về trang 1; thứ tự ổn định nếu giá/số bán bằng nhau.
- Xem badge đề xuất và mở phân tích: vẫn liên kết với phân tích mới nhất.
- Import sản phẩm vẫn dùng preview/commit cũ; sau commit trang hiện tại được tải lại.
- User2 vẫn không xem dữ liệu store3; Admin không được đọc chi tiết catalog.
- Nút xuất ghi rõ **Xuất trang hiện tại**, không xuất toàn bộ catalog.

DevTools → Network → Fetch/XHR trên trang danh mục: sau auth/me chỉ có các lệnh
products/catalog?page=...&limit=... cho dữ liệu danh mục; không được tải hết products,
analyses, actions hoặc categories bằng allPages nữa. Các trang khác chưa đổi.

## API mới

GET /api/v1/products/catalog (User; Admin bị chặn theo quy ước privacy hiện có).
Query: page, limit (1–100, mặc định 20), q, category_id, store, status, type,
sort (rỗng/price/sales), analysable_only (true/false).
store nếu có phải là store của User. Tham số lạ/không hợp lệ bị từ chối.
Kết quả gồm data/pagination và summary/facets/categories/store cùng các summary
analysis/action của trang. Không tải snapshot/evidence/audit lớn vào bảng danh mục.
Endpoint GET /products cũ và các route khác được giữ cho consumer hiện có.

## Kiểm tra tự động

Ở backend:

```powershell
node --import tsx --test tests/unit.test.ts tests/ml-sample.test.ts tests/sample-cleanup.test.ts tests/import.test.ts tests/catalog-page.test.ts
```

Ở frontend, có bộ Playwright với HTTP fixture, không ghi Neon:

```powershell
npx playwright test --config playwright.catalog.config.ts
```

Nếu chưa có browser của Playwright, cài bằng `npx playwright install chromium`.
Test dùng port3103; hai server local3000/3001 có thể giữ nguyên.

Đã chạy 21 backend tests, typecheck/build cả hai app, ESLint các file TS/TSX đổi,
kiểm tra SQL trên PostgreSQL/WASM và tương tác React DOM với HTTP giả lập. Test
Chromium chưa chạy được trong môi trường tạo bản sửa do hạn chế Unix socket;
kiểm tra trực quan trên máy bạn vẫn còn cần thực hiện. Không có Neon write nào
trong phiên phát triển bản sửa này.
