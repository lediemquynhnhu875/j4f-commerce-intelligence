# Dọn dữ liệu và mã mock

## Phạm vi ngày 12/11/2026

Yêu cầu hiện tại là gỡ phần mock còn lại sau khi chuyển sang dữ liệu PostgreSQL
và phân quyền cửa hàng theo tài khoản.

## Thay đổi

- Gỡ API Explorer client chứa tài khoản admin viết cứng và nút đăng nhập nhanh.
- Trang gốc backend hiển thị danh sách endpoint từ route registry và liên kết
  health/readiness. Người dùng đăng nhập qua giao diện chính.
- Gỡ route thử nghiệm `GET /:slug` từng trả về thông điệp Hello.
- Gỡ CSS dành riêng cho bộ chọn tài khoản demo đã bị xóa.
- Gỡ script tạo 10 sản phẩm giả, phân tích giả và đề xuất giả cùng lệnh `db:seed`.
- Chuyển `npm run test:http` sang kiểm tra cửa hàng bằng dữ liệu PostgreSQL hiện có.
- Các trang preview, tài khoản mock và fixture UI cũ đã được gỡ ở đợt trước.

## Đối chiếu Neon

| Dữ liệu | Kết quả |
| --- | --- |
| Sản phẩm từ nguồn Tiki/ML | 225 |
| Sản phẩm nhập thủ công | 2 |
| Phân tích từ `rule-based-v2-good-peer-video` | 225 |
| Đề xuất có nguồn `ml_rule` | 255 |
| Lịch sử công việc | 264 |
| Tài khoản đang sử dụng | 3 |
| Cửa hàng sau dọn dẹp | 2 |

Hai sản phẩm thủ công chưa có cờ synthetic hoặc seed key. Nguồn gốc hiện có cho
phép giữ chúng như dữ liệu người dùng nhập.

Tài khoản kiểm thử đã khóa ID 4 có tên bắt đầu bằng `Integration Reviewer`, kèm
cửa hàng rỗng, đã được xóa trong một transaction. Tất cả khóa ngoại về tài khoản
được kiểm tra trước khi xóa. Fingerprint toàn bộ bản ghi sản phẩm, phân tích,
đề xuất, lịch sử, danh mục, lần nhập ML và các tài khoản/cửa hàng còn lại trùng
khớp trước và sau thao tác.

Catalog giả đời đầu đã có marker `catalog-retired` và không còn sản phẩm hay phân
tích synthetic trong Neon. Các seed key cũ được giữ làm dấu vết dọn dẹp.

## Kiểm thử và triển khai

Fixture trong thư mục tests tiếp tục phục vụ kiểm thử độc lập. Dữ liệu đó chỉ
được tạo khi chạy kiểm thử. Kiểm thử HTTP tạo một sản phẩm tạm và tự xóa, còn
kiểm thử cấp tài khoản chạy trong transaction rollback.

Build, kiểm tra HTTP thật và kiểm thử trình duyệt được ghi nhận trong
`docs/CURRENT_STATE.md` sau khi chạy. Thay đổi mã nguồn cần được commit, push và
deploy lại Render/Vercel. Tài khoản đã lộ trong bundle API Explorer cần được đổi
mật khẩu bằng luồng quản lý tài khoản.

### Kết quả kiểm tra đã chạy

- Build backend và frontend thành công, TypeScript hai ứng dụng đạt, lint frontend đạt.
- 15 unit test backend và 4 kiểm thử trình duyệt release đạt.
- 55 yêu cầu HTTP thực với Neon đạt, so sánh số lượng API với PostgreSQL trực tiếp.
- Health và readiness trả 200, readiness xác nhận PostgreSQL connected.
- Trang gốc backend trả 200, không còn form hoặc đăng nhập nhanh. Route Hello trả
  404 và danh sách sản phẩm chưa đăng nhập trả 401.
- Edge đăng nhập hai User thực tế, kiểm tra các trang User và menu di động đạt.
- Quét 682 file source, tài liệu và production bundle không tìm thấy mật khẩu
  cấu hình hiện tại hoặc mật khẩu admin từng viết cứng.
