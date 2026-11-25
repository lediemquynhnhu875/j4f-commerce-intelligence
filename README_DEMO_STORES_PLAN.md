# Lập kế hoạch hai shop demo

Mục tiêu: giữ nguyên J4F store và256 sản phẩm/lịch sử hiện có, chọn hai seller
nguồn riêng để tạo hai shop demo phục vụ kiểm tra phân quyền và trình diễn.
Tên seller nguồn không chứng minh quyền sở hữu shop bên ngoài; đây chỉ là mapping
trong ứng dụng demo. Không coi việc chọn dữ liệu trình diễn là đánh giá chất lượng ML.

Chép nội dung ZIP vào gốc project. Trong backend, chạy:

```powershell
node --import tsx scripts/plan-demo-stores.ts
```

Script chỉ đọc Neon trong transaction read-only và đọc bundle đã kiểm tra. Không
cần chạy migration mới. Không tạo tài khoản/store, đổi mật khẩu, gán lại sản phẩm,
import dữ liệu hay thay lịch sử. Không gửi .env lên chat.

Kết quả cần xem:

- `existing_stores`: store, chủ tài khoản, trạng thái và số sản phẩm thực tế.
- `proposed_shops`: hai seller ứng viên, số sản phẩm/đề xuất/trạng thái, store trống
  có thể dùng và `needs_new_account` nếu chưa có store trống phù hợp.
- `alternative_sellers`: lựa chọn dự phòng nếu cần.

Tiêu chí mặc định:20–60 sản phẩm/seller, ít nhất3 trạng thái quan sát được, có đề
xuất, không có ID sản phẩm đã nằm trong Neon, không có cờ invalid-model hoặc
ambiguous-source. Nếu không đủ ứng viên, script trả số thực tế, không bịa dữ liệu.
Toàn bộ kết quả ML vẫn mang quality_acceptance=false từ nguồn đã cung cấp.

Gửi lại existing_stores và proposed_shops để chốt mapping cụ thể. Sau đó mới chuẩn
bị tài khoản/store còn thiếu và dry-run import. Không tự chuyển256 sản phẩm mẫu
sang shop mới; chúng vẫn thuộc J4F store. Khi User2 có dữ liệu, HTTP test cũ vốn
khẳng định User2 rỗng/User1 chứa toàn bộ DB phải được cập nhật thành kiểm tra scope
thực tế và chặn đọc/ghi chéo hai chiều trước khi coi phần multi-store đã đạt.

Mặc định bundle nằm ở ../data/processed/ml-import-v1 tính từ backend. Nếu khác:

```powershell
node --import tsx scripts/plan-demo-stores.ts --bundle ../data/processed/ml-import-v2
```
