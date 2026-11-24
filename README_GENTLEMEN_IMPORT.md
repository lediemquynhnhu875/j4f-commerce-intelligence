# Gentlemen → store2: apply và kiểm tra hai chiều

Dry-run trên Neon do người dùng chạy:56 sản phẩm,56 phân tích,98 đề xuất mới;
0 phân tích tái sử dụng. J4F store3 đang có256 sản phẩm, store2 đang rỗng.
Không đổi file mapping Atuni. Gói này chỉ cập nhật bài kiểm tra và tài liệu.
Không cần migration hay đổi cấu hình ứng dụng.

## 1. Chép bản sửa

Giải nén vào gốc project. File code được thay là backend/scripts/test-store-http.ts.
Giữ backend cập nhật đang chạy ở port3001 trong terminal riêng.

## 2. Apply đúng kế hoạch đã xem (ở backend)

```powershell
node --import tsx scripts/import-ml-full.ts --mapping ../data/processed/ml-import-v1/store-mapping-gentlemen.json --apply --confirm 09354538c5602b487513ed1f01db6c735905208d84db15582f096d7ef9e2ef3e
```

Lệnh này ghi dữ liệu thật vào store2 theo mapping demo đã chuẩn bị, không xác nhận
quyền sở hữu cửa hàng Gentlemen bên ngoài. Không thay256 sản phẩm/lịch sử store3.
Nếu kế hoạch thay đổi thì lệnh dừng; chạy lại dry-run để đối chiếu, không bỏ kiểm tra.

## 3. Chạy lại để kiểm tra idempotency

```powershell
node --import tsx scripts/import-ml-full.ts --mapping ../data/processed/ml-import-v1/store-mapping-gentlemen.json
```

Mong đợi already-imported và products/analyses/actions trong insert đều0.

## 4. Kiểm tra hai store qua backend thật

Không thao tác sửa/import đồng thời để fingerprint dữ liệu ổn định.
Trong backend, chạy:

```powershell
$env:STORE_TEST_URL="http://127.0.0.1:3001/api/v1"
node --import tsx scripts/test-store-http.ts
```

Dùng SEED_USER1_EMAIL/PASSWORD, SEED_USER2_EMAIL/PASSWORD và SEED_ADMIN_EMAIL/PASSWORD
trong cấu hình hiện có. Không gửi mật khẩu/token lên chat. Mặc định chỉ đọc nghiệp
vụ, đăng nhập/tạo rồi thu hồi session test, preview không commit, và thử PATCH phải
bị từ chối. Các PATCH dùng dữ liệu rỗng hoặc timestamp cũ để tránh sửa bản ghi thật
nếu guard có lỗi. Login limiter/session vẫn có hoạt động vận hành bình thường.

Mong đợi PASS, both_stores_populated=true, User1 có256 sản phẩm, User2 có56 sản phẩm,
56 phân tích và98 actions. Các hướng đọc chéo product/analysis/action phải true ở
cả hai chiều. Count đối chiếu SQL theo store, không còn đối chiếu với toàn DB.
Danh mục dùng chung được phép đọc khi cả hai shop cùng sử dụng danh mục đó.

Kết quả không chứa token/mật khẩu được ghi vào tmp/store-http-results.json.
Nếu FAIL, giữ nguyên dữ liệu và gửi lỗi; không chạy seed/reset để ép test qua.

## Chế độ thử CRUD riêng (không cần cho bước hiện tại)

```powershell
node --import tsx scripts/test-store-http.ts --with-fixtures
```

Chế độ này tạo sản phẩm test tên UUID riêng ở mỗi store, thử CRUD chủ sở hữu và
chặn đọc/sửa/xóa từ store kia, rồi chỉ xóa sản phẩm test đó. Kiểm tra auto-store
khi tạo tài khoản thực hiện trong transaction rollback. Sequence có thể tăng.
Không thử DELETE trực tiếp sản phẩm thật, không sửa nội dung công việc thật.
Negative assignee được kiểm tra bằng helper SQL chỉ đọc; bài test này không tuyên
bố bao phủ POST hành động hợp lệ trên database cách ly hay mọi tình huống concurrency.

Sau khi PASS, đăng nhập User2 ở frontend để xem56 sản phẩm Gentlemen. Tài khoản/
store của seller thứ hai (KHO GIA DỤNG TIỆN ÍCH GIA ĐÌNH) sẽ chuẩn bị riêng.
