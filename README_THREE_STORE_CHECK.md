# Kiểm tra ba tài khoản demo

Shop Gia Dụng đã hiển thị57 sản phẩm,57 kết quả phân tích và71 đề xuất trong ảnh
người dùng gửi. Bước này kiểm tra chéo ba tài khoản bằng bài test hai-store hiện có,
chạy lần lượt ba cặp để có tổng cộng sáu hướng truy cập chéo.

## Chuẩn bị

Chép nội dung ZIP vào gốc project; không đổi API, frontend, migration hay dữ liệu.
Trong .env ở thư mục gốc, giữ nguyên User1/User2/Admin và thêm:

```dotenv
SEED_USER3_EMAIL=demo.giadung@sellens.test
SEED_USER3_PASSWORD="MAT_KHAU_HIEN_TAI_CUA_DEMO_GIA_DUNG"
```

Thay giá trị ví dụ bằng mật khẩu thật đã đặt. Nếu đã tạo email khác, dùng email đó.
Đây chỉ là thông tin đăng nhập cho test, không tạo tài khoản hoặc đổi mật khẩu DB.
Không gửi .env/mật khẩu/token lên chat. Không commit .env.

## Chạy (ở backend)

Giữ backend hiện có chạy ở port3001. Dùng terminal khác:

```powershell
$env:STORE_TEST_URL="http://127.0.0.1:3001/api/v1"
node --import tsx scripts/test-three-stores.mjs
```

Runner tự chạy các cặp User1–User2, User1–User3, User2–User3. Credentials chỉ được
truyền vào môi trường process con, không đưa lên command line hoặc kết quả JSON.
Mặc định không dùng --with-fixtures. Nghiệp vụ được đọc/kiểm tra fingerprint; các
probe PATCH bị từ chối dùng body rỗng hoặc timestamp cũ. Đăng nhập/logout và login
limiter vẫn là hoạt động vận hành bình thường của bài test.

Mong đợi PASS,3 store và6 hướng có products/analyses/actions=true. Nếu chưa có thay
đổi nghiệp vụ khác, các số sẽ là:

| store_id | products | analyses | actions |
|---|---:|---:|---:|
|3|256|254|272|
|2|56|56|98|
|9|57|57|71|

Đó là số liệu hiện tại để đối chiếu, không được hard-code làm điều kiện vượt test.
Kết quả phải khớp SQL từng store. Không sửa/import đồng thời lúc test vì thay đổi
nghiệp vụ có thể làm fingerprint hoặc count giữa các cặp lệch nhau.

Báo cáo tổng: tmp/three-store-http-results.json. Báo cáo chi tiết của cặp chạy gần
nhất: tmp/store-http-results.json. Nếu FAIL, gửi lỗi và các báo cáo này, không gửi
credentials. Không seed/reset/import lại để ép test qua.

## Kiểm tra runner không cần DB

```powershell
node --test tests/three-store-runner.test.mjs
```

7 test orchestration đã qua:3 cặp/sáu hướng, không rò credentials vào report, email
trùng, kết quả con fail/sai mode, thiếu coverage, count đổi, thiếu assignee checks,
và mapping tài khoản/store thay đổi. Đây không phải bằng chứng ba tài khoản thật
đã PASS; phải chạy lệnh chính trên máy người dùng.

Không thay đổi phần import, chưa chạy media hoặc deploy. Sau khi đạt kiểm tra ba
store, bước tiếp theo là audit ảnh và chuẩn bị thu thập cho hai shop mới.
