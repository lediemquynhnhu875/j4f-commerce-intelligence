# Tối ưu toàn bộ trang User của Sellens

Bản cập nhật tiếp tục phần phân trang danh mục đã kiểm tra. Bốn trang User không
còn tải toàn bộ products/analyses/actions/categories bằng allPages.

| Trang | Dữ liệu tải |
|---|---|
| Tổng quan | SQL đếm toàn store, tối đa 8 sản phẩm ưu tiên và 4 thẻ đề xuất |
| Danh mục | Trang/bộ lọc hiện tại, giữ bản sửa trước |
| Phân tích | Một sản phẩm + một kết quả đã chọn; lịch sử và đề xuất mỗi trang 20 |
| Đề xuất | 12 việc/trang, bộ lọc phía server; Kanban nhóm các việc của trang hiện tại |

Số ở các thẻ thống kê là tổng toàn store, không phải số dòng trên trang. Tổng quan
vẫn tính theo phân tích mới nhất mỗi sản phẩm; bảng công việc vẫn giữ cả việc của
các phân tích lịch sử. Hai ý nghĩa này không bị gộp vào nhau.

## Áp dụng

1. Dừng frontend/backend (Ctrl+C).
2. Chép nội dung ZIP vào thư mục gốc project. Gói có cả các file phân trang danh mục
   trước đó để tránh thiếu dependency. Không thay .env, package.json, lockfile hay
   các migration 001/002/004 đã áp dụng. Nếu đã sửa code riêng, đối chiếu trước khi chép.
3. Trong backend:

```powershell
npm run db:migrate
npm run dev
```

005 nếu đã chạy sẽ được bỏ qua; 006 chỉ thêm hai index. Không xóa/sửa dữ liệu,
không đổi store, không tác động lịch sử hay gọi mô hình. Nếu có checksum conflict,
giữ nguyên migration cũ và gửi lỗi để đối chiếu; không reset DB.

4. Terminal frontend:

```powershell
npm run dev
```

## Kiểm tra trên máy

- Đăng nhập User1, Tổng quan vẫn có 256 sản phẩm nếu không có thay đổi khác;
  số phân tích và trạng thái phải khớp dữ liệu trước khi sửa.
- Danh mục: thử balo → 10 dòng → trang2 như lần kiểm tra trước.
- Phân tích: mở sản phẩm từ danh mục; trạng thái, snapshot, bằng chứng giữ nguyên.
  Tìm sản phẩm ở ô mới rồi chọn trong danh sách; các lựa chọn có phân trang.
  Lịch sử kết quả và đề xuất của hồ sơ có nút trang riêng. Chọn lịch sử cũ phải tải
  đúng kết quả đó; cặp product/analysis không khớp hoặc khác store phải bị chặn.
- Đề xuất: thử tìm kiếm, trạng thái, loại hành động và trang sau. Tổng số việc trên
  thẻ thống kê không đổi theo kích thước trang. Kanban có 12 việc mỗi trang và
  ghi rõ số đang xem/tổng phù hợp ở mỗi cột.
- Chấp nhận/từ chối một đề xuất có chủ ý, F5 kiểm tra trạng thái và lịch sử. Từ chối
  vẫn bắt buộc lý do; version timestamp vẫn được gửi chống ghi đè thao tác cũ.
- Lịch sử công việc tải 20 dòng mỗi trang. Thêm công việc thủ công cho phép tìm
  phân tích theo tên/mã, chọn từng trang 20 lựa chọn, không tải hết phân tích.
- User2 vẫn thấy store riêng; không được đọc hồ sơ/công việc store3.

Nút xuất ghi rõ phạm vi: tổng hợp, hồ sơ đang xem hoặc trang hiện tại. Dữ liệu
xuất không được hiểu là bản sao toàn bộ catalog/histories.

## API mới (đều khai báo tập trung trong server/api.ts)

- GET /api/v1/stores/me/summary
- GET /api/v1/products/options?q=&page=&limit=
- GET /api/v1/analyses/options?q=&page=&limit=
- GET /api/v1/analyses/workspace?product_id=&analysis_id=&history_page=&actions_page=
- GET /api/v1/actions/workspace?q=&status=&type=&analysis_id=&page=&limit=

Chỉ gửi tham số có giá trị, không gửi ID rỗng. Quyền lấy từ phiên và store sở hữu;
Admin vẫn chỉ xem tổng hợp qua API quản trị cũ. Các endpoint ghi công việc/import
và quyền gốc không thay đổi. Tất cả API mới chỉ đọc trong transaction nhất quán.

## Kiểm tra tự động

Backend (23 test):

```powershell
node --import tsx --test tests/unit.test.ts tests/ml-sample.test.ts tests/sample-cleanup.test.ts tests/import.test.ts tests/catalog-page.test.ts tests/workspace.test.ts
```

Frontend, bộ fixture không ghi Neon:

```powershell
npx playwright test --config playwright.catalog.config.ts
```

Có thể cần `npx playwright install chromium` nếu chưa cài browser. Phiên phát triển
đã chạy SQL PostgreSQL/WASM và tương tác React DOM, build cả hai ứng dụng và lint.
Playwright mới chỉ kiểm tra discovery/syntax vì môi trường không cho Chromium tạo
Unix socket; cần chạy trên máy bạn để xác minh trình duyệt thực.

Chưa tự import thêm sản phẩm, chưa deploy hay thay dữ liệu Neon trong phiên này.
Trước khi import toàn bộ vẫn cần chốt seller/store mapping, kiểm tra dung lượng và
đo tốc độ trên Neon thực. Admin vẫn dùng loader tài khoản/store cũ; dữ liệu sản phẩm
không được đưa về Admin dưới dạng toàn bộ bản ghi.
