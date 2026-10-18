# Hướng dẫn sử dụng Sellens

**Dành cho người dùng (User) và quản trị viên (Admin).**

Tài liệu này hướng dẫn thao tác trên giao diện đang kết nối backend và cơ sở dữ liệu PostgreSQL trên Neon. Nội dung được đối chiếu với mã nguồn hiện tại ngày **18/10/2026**. Các ví dụ số liệu chỉ dùng để giải thích cách đọc, không phải tổng số sản phẩm hay kết quả cố định của hệ thống.

Sellens giúp bạn xem sản phẩm, đối chiếu số bán với nhóm sản phẩm tương tự, đọc bằng chứng và theo dõi các công việc cải thiện. Hệ thống hỗ trợ quyết định từ dữ liệu đã ghi nhận; kết quả không phải cam kết tăng doanh số hoặc dự báo số bán trong tương lai.

## Mục lục

- [1. Bắt đầu sử dụng và các thao tác chung](#bat-dau)
- [2. Giao diện User](#user)
  - [2.1. Tổng quan](#user-tong-quan)
  - [2.2. Danh mục sản phẩm](#user-san-pham)
  - [2.3. Kết quả phân tích](#user-phan-tich)
  - [2.4. Đề xuất cải thiện](#user-de-xuat)
  - [2.5. Quy trình thực hành cho User mới](#user-thuc-hanh)
- [3. Giao diện Admin](#admin)
  - [3.1. Tổng quan hệ thống](#admin-tong-quan)
  - [3.2. Quản lý cửa hàng](#admin-cua-hang)
  - [3.3. Quản lý tài khoản](#admin-tai-khoan)
  - [3.4. Quản lý sản phẩm](#admin-san-pham)
  - [3.5. Quản lý danh mục](#admin-danh-muc)
  - [3.6. Kết quả đã lưu](#admin-ket-qua)
  - [3.7. Cấu hình đã lưu](#admin-cau-hinh)
  - [3.8. Quy trình thực hành cho Admin mới](#admin-thuc-hanh)
- [4. Cách hiểu trạng thái và số liệu](#trang-thai)
- [5. Các tình huống thường gặp](#cau-hoi)
- [6. Tài liệu dành cho người cài đặt hệ thống](#cai-dat)

<a id="bat-dau"></a>

## 1. Bắt đầu sử dụng và các thao tác chung

### 1.1. Bạn dùng tài khoản nào?

Admin cung cấp tài khoản và mật khẩu cho người sử dụng. Hiện chưa có giao diện tự đăng ký, quên mật khẩu hoặc tự đổi mật khẩu.

| Nội dung | User | Admin |
| --- | --- | --- |
| Xem sản phẩm, phân tích và bằng chứng đã lưu | Có | Có |
| Chấp nhận, từ chối, theo dõi công việc cải thiện trên giao diện | Có, tại Đề xuất cải thiện | Không có trang thao tác công việc tương ứng trong menu Admin hiện tại |
| Thêm, sửa, xóa sản phẩm | Không | Có, trong giới hạn dữ liệu được phép thay đổi |
| Tạo tài khoản, khóa hoặc kích hoạt tài khoản | Không | Có |
| Thêm, xóa danh mục sản phẩm | Không | Có |
| Xem các phiên bản cấu hình đã lưu | Không có trang riêng | Có, chỉ đọc |
| Tạo cửa hàng, phân chia sản phẩm cho từng cửa hàng | Chưa có | Chưa có |
| Bấm nút chạy mô hình để phân tích mới | Chưa có | Chưa có |

**Phạm vi dữ liệu hiện tại:** hệ thống đang dùng catalog chung, tức danh sách sản phẩm dùng chung cho các tài khoản đang hoạt động. Chưa có phân chia sản phẩm riêng theo từng User hoặc từng cửa hàng. Nhãn cửa hàng trên thanh đầu trang không phải bộ chọn cửa hàng và không chứng minh đã có phân quyền cửa hàng.

### 1.2. Đăng nhập

1. Mở địa chỉ website do người phụ trách cung cấp. Khi chạy trên máy cá nhân theo cấu hình mặc định, địa chỉ là `http://localhost:3000`.
2. Tại trang đăng nhập, nhập **Địa chỉ email** và **Mật khẩu** được cấp.
3. Nếu cần kiểm tra nội dung mật khẩu vừa nhập, bấm biểu tượng con mắt. Bấm lại để ẩn.
4. Bấm **Đăng nhập** một lần và chờ trạng thái **Đang đăng nhập…** kết thúc.
5. Hệ thống tự mở đúng giao diện theo vai trò: User vào Tổng quan; Admin vào Tổng quan hệ thống.

Nếu không đăng nhập được, kiểm tra email, chữ hoa/chữ thường trong mật khẩu và trạng thái tài khoản với Admin. Khi đã hết phiên đăng nhập, đăng nhập lại để tiếp tục.

**Phân biệt giao diện thật và preview:** liên kết **Xem giao diện mock riêng** dẫn đến trang đăng nhập minh họa `/preview/demo-login`. Các trang làm việc `/preview/user/*` và `/preview/admin/*` sử dụng dữ liệu mẫu viết trong frontend. Thao tác ở đó không quản lý dữ liệu thật trên Neon và không cấp quyền cho tài khoản thật. Để làm việc với dữ liệu thật, sử dụng các trang `/user/*` hoặc `/admin/*` sau khi đăng nhập thật.

### 1.3. Những thành phần có ở nhiều trang

| Thành phần / nút | Dùng để làm gì? | Cách sử dụng / điều cần biết |
| --- | --- | --- |
| Menu bên trái | Chuyển giữa các trang đúng vai trò | Bấm tên trang. Mục đang chọn được làm nổi bật. |
| Logo Sellens | Trở về trang tổng quan của vai trò hiện tại | Bấm logo ở đầu menu. |
| **Mở menu / Đóng menu** | Hiện hoặc ẩn menu trên màn hình nhỏ | Bấm biểu tượng menu; chọn trang hoặc bấm vùng ngoài menu để đóng. |
| Tên tài khoản và vai trò | Cho biết bạn đang đăng nhập bằng tài khoản nào | Kiểm tra trước khi thực hiện thao tác quản trị. Hiện không có nút sửa hồ sơ tại đây. |
| **CONNECTED** | Nhãn hiển thị của không gian kết nối | Không dùng riêng nhãn này để kết luận mô hình đang chạy hoặc kết nối database vừa được kiểm tra. Admin xem thêm Tình trạng hệ thống. |
| Biểu tượng chuông **Thông báo** | Mở hộp **Đề xuất cần duyệt** | Hiển thị số công việc đang Chờ duyệt trong dữ liệu đã tải. Đây chưa phải hộp thông báo thời gian thực. |
| **Xem chi tiết** trong hộp thông báo | Mở nơi xem tiếp | User đến Đề xuất cải thiện; Admin đến Kết quả đã lưu. Nút này chưa tự lọc chỉ các công việc Chờ duyệt. |
| **Kết quả gần nhất** | Ngày của lượt phân tích mới nhất đã lưu | Không nhất thiết là ngày thu thập dữ liệu sản phẩm, ngày nhập dữ liệu hoặc ngày hôm nay. |
| **Tải lại** | Đọc lại dữ liệu hiện có từ backend | Dùng sau khi dữ liệu được cập nhật. Nút này không chạy ML và không tạo kết quả phân tích mới. |
| **Xuất dữ liệu** | Tải dữ liệu dạng tệp JSON về máy | Phạm vi xuất được giải thích ngay bên dưới; hiện không xuất trực tiếp Excel, CSV hoặc PDF. |
| **Thử lại** | Thử tải lại sau khi có lỗi | Nếu lỗi vẫn còn, gửi thông báo lỗi và tên trang cho người phụ trách kỹ thuật. |
| Dấu **× / Đóng** trong hộp thoại | Đóng hộp nhập hoặc hộp chi tiết | Nội dung chưa bấm Lưu/Tạo chưa được ghi nhận. |
| **Đăng xuất** | Kết thúc phiên làm việc | Bấm ở cuối menu, chờ hệ thống trở về đăng nhập. Nên dùng khi rời máy dùng chung. |

**Phạm vi của nút Xuất dữ liệu ở đầu trang:**

- Tại trang sản phẩm: xuất toàn bộ sản phẩm đã tải, không chỉ các dòng đang lọc, trang đang xem hoặc sản phẩm đã tích chọn.
- Tại Đề xuất cải thiện: xuất toàn bộ công việc đã tải, không chỉ danh sách đang lọc.
- Tại các trang còn lại: xuất gói dữ liệu đã tải theo quyền tài khoản, có thể gồm sản phẩm, danh mục, phân tích, công việc; với Admin còn có danh sách tài khoản. Vì vậy, tệp có thể chứa dữ liệu rộng hơn nội dung đang hiển thị.
- Trang chi tiết phân tích và trang giám sát còn có nút xuất riêng cho một kết quả; xem hướng dẫn tại từng trang.

Tệp tải về nằm trong thư mục tải xuống do trình duyệt cấu hình. Kiểm tra nội dung và phạm vi tài khoản trước khi chia sẻ tệp cho người khác.

**Khi điền biểu mẫu:** nhập đủ các trường bắt buộc rồi bấm Lưu/Tạo một lần. Trong lúc đang lưu, chờ nút hoạt động trở lại. Nếu có lỗi, đọc thông báo, sửa thông tin và gửi lại; không mặc định đã lưu chỉ vì đã bấm nút. Sau khi lưu thành công, kiểm tra bản ghi hoặc trạng thái mới trong danh sách. Nút bị mờ có thể do đang xử lý, chưa chọn dữ liệu hoặc chức năng chưa hỗ trợ; xem hướng dẫn của từng trang để phân biệt.

### 1.4. Một số từ sẽ gặp trong ứng dụng

| Từ | Hiểu đơn giản |
| --- | --- |
| Catalog | Danh sách sản phẩm của hệ thống. |
| Danh mục | Nhóm dùng để sắp xếp, tìm kiếm sản phẩm, chẳng hạn túi đeo chéo hoặc giày lười nam. |
| SKU / sản phẩm | Đơn vị đếm bản ghi sản phẩm trên giao diện; không phải số lượng hàng tồn kho. |
| Mã `SP-…` | Mã hiển thị để nhận diện và tìm sản phẩm. Không phải lúc nào cũng trùng số ID nội bộ trên đường dẫn. |
| Snapshot / dữ liệu đóng băng | Bản dữ liệu được giữ tại thời điểm phân tích, giúp đọc lại đúng cơ sở của kết quả đó. |
| Nhóm đối chiếu / peer | Nhóm sản phẩm tương tự được dùng làm cơ sở so sánh. |
| Tham chiếu | Mức số bán dùng để đối chiếu từ kết quả đã lưu; không phải mục tiêu bắt buộc hoặc dự báo chắc chắn. |
| Đề xuất / công việc | Việc cần cân nhắc hoặc thực hiện, liên kết với một kết quả phân tích cụ thể. |

<a id="user"></a>

## 2. Giao diện User

User sử dụng bốn trang chính để đi từ xem tình hình chung đến đọc từng kết quả và theo dõi công việc cải thiện.

| Trang trong menu | Địa chỉ | Nên mở khi nào? |
| --- | --- | --- |
| **Tổng quan** | `/user/overview` | Muốn biết catalog có gì, tình hình phân tích ra sao và nên xem sản phẩm nào trước. |
| **Danh mục sản phẩm** | `/user/products` | Muốn tìm, lọc, sắp xếp sản phẩm và mở phân tích của một sản phẩm. |
| **Kết quả phân tích** | `/user/analysis` | Muốn hiểu trạng thái, số tham chiếu, bằng chứng và giới hạn của kết luận. |
| **Đề xuất cải thiện** | `/user/suggestions` | Muốn quyết định có làm đề xuất hay không và cập nhật tiến độ thực hiện. |

<a id="user-tong-quan"></a>

### 2.1. Trang Tổng quan

#### Mục đích và các ô thống kê

Trang này tổng hợp toàn bộ catalog đang tải được. Mỗi sản phẩm dùng **kết quả phân tích mới nhất của chính sản phẩm đó** để tính các thống kê liên quan đến phân tích. Các ô là thông tin để đọc, chưa phải nút bấm lọc danh sách.

| Ô thống kê | Ý nghĩa |
| --- | --- |
| **Tổng số sản phẩm** | Số sản phẩm đang có trong catalog, kể cả sản phẩm chưa có phân tích. |
| **Có mức tham chiếu** | Số sản phẩm có kết quả mới nhất chứa mức tham chiếu. |
| **Cần rà soát** | Số sản phẩm có công việc đang Chờ duyệt, Đã chấp nhận hoặc Đang thực hiện gắn với kết quả mới nhất. Đây không phải một trạng thái ML mới. |
| **Chưa có mức tham chiếu** | Sản phẩm chưa có phân tích hoặc kết quả mới nhất chưa có giá trị tham chiếu. |
| **Đang thực hiện** | Số công việc Đang thực hiện thuộc các kết quả mới nhất. Đơn vị là việc, không phải sản phẩm. |
| **Đề xuất cần duyệt** | Số công việc Chờ duyệt thuộc các kết quả mới nhất. Một sản phẩm có thể có nhiều đề xuất. |

#### Những khối nội dung bên dưới

| Khối | Hiển thị gì? | Bạn nên làm gì? |
| --- | --- | --- |
| **Phân bố trạng thái phân tích** | Từng trạng thái, số sản phẩm, tỷ lệ và thanh màu. Tỷ lệ lấy tổng catalog làm mẫu số; có phần Chưa có phân tích nếu có sản phẩm chưa được phân tích. | Xem nhóm nào nhiều, rồi qua Danh mục sản phẩm lọc trạng thái cần kiểm tra. Thanh màu chưa phải bộ lọc bấm trực tiếp. |
| **Cơ cấu danh mục sản phẩm** | Biểu đồ vòng tròn và số lượng/tỷ lệ từng danh mục. | Hiểu catalog đang tập trung ở nhóm nào. Đây không phải tỷ trọng doanh thu. |
| **Sản phẩm cần ưu tiên rà soát** | Tối đa 8 sản phẩm có công việc còn mở, kèm số bán, tham chiếu, chênh lệch và trạng thái. | Bấm **Phân tích** ở dòng cần xem. Bấm **Xem danh mục** để mở danh sách sản phẩm. |
| **Đề xuất cải thiện đang theo dõi** | Tối đa 4 công việc còn mở từ các kết quả mới nhất; huy hiệu có thể đếm nhiều hơn số thẻ hiển thị. | Bấm **Xem bằng chứng** trên thẻ để mở đúng kết quả phân tích liên quan. Nút này chưa chấp nhận đề xuất. |

**Cách đọc bảng ưu tiên:** Số bán là giá trị khi phân tích; Tham chiếu là giá trị đối chiếu đã lưu. Chênh lệch = Số bán − Tham chiếu. Ví dụ 12 − 28 = −16 nghĩa là thấp hơn mức tham chiếu 16 đơn vị theo dữ liệu đó. Cần đọc bằng chứng trước khi quyết định sửa giá, ảnh hay mô tả.

Số trên chuông thông báo có thể khác ô Đề xuất cần duyệt: chuông đếm tất cả công việc Chờ duyệt đã tải, còn Tổng quan chỉ xét công việc của kết quả mới nhất mỗi sản phẩm.

<a id="user-san-pham"></a>

### 2.2. Trang Danh mục sản phẩm

#### Trang này để làm gì?

Đây là nơi tìm sản phẩm và chọn sản phẩm cần xem phân tích. User xem dữ liệu tại đây; các nút tạo, sửa, xóa sản phẩm chỉ có ở giao diện Admin.

#### Cách đọc một dòng sản phẩm

| Cột / thông tin | Ý nghĩa |
| --- | --- |
| Ô tích chọn | Chọn sản phẩm để sử dụng nút Xem phân tích đã chọn. Tích chọn không thay đổi dữ liệu sản phẩm. |
| **Sản phẩm** | Ảnh đại diện, tên, thông tin loại/danh mục và mã `SP-…` ở dưới. Nếu chưa có ảnh hợp lệ, hệ thống dùng hình giữ chỗ. |
| **Danh mục** | Nhóm sản phẩm được gắn trong catalog. |
| **Giá** | Giá hiện tại đang lưu trong catalog; có thể khác giá trong một kết quả phân tích cũ. |
| **Số bán** | Số bán đã lưu của sản phẩm. Không mặc định là số bán hôm nay hoặc trong tháng này. |
| **Đánh giá** | Điểm đánh giá và số lượt đánh giá trong ngoặc. Ví dụ `4,20 (29)` là điểm 4,20 với 29 lượt đánh giá. |
| **Trạng thái** | Trạng thái của kết quả phân tích mới nhất, hoặc Chưa có phân tích. |
| **Xem** | Mở trang phân tích của sản phẩm tương ứng. |

Mã hiển thị ưu tiên mã sản phẩm nguồn: `SP-<mã nguồn>`. Nếu chưa có mã nguồn, giao diện dùng `SP-<ID nội bộ>`. Đây là quy ước hiển thị, không phải bạn phải tự tạo thêm một trường mã mới.

#### Tìm, lọc và sắp xếp

1. Nhập tên, ID nội bộ hoặc mã `SP-…` vào ô **Tìm sản phẩm**. Danh sách cập nhật khi nhập, không cần bấm Enter.
2. Chọn **Danh mục sản phẩm** để chỉ xem một nhóm.
3. Chọn **Trạng thái phân tích** để tập trung vào một kết quả, kể cả Chưa có phân tích.
4. Chọn **Sắp xếp sản phẩm**: mặc định, giá tăng dần hoặc số bán giảm dần.
5. Bấm số trang hoặc nút **‹ / ›** để chuyển trang. Hiện mỗi trang hiển thị tối đa 4 sản phẩm.
6. Muốn xem lại toàn bộ, bấm **Đặt lại**. Nút này xóa tìm kiếm, bộ lọc, sắp xếp, lựa chọn sản phẩm và đưa về trang đầu.

Các bộ lọc kết hợp với nhau. Nếu vừa chọn danh mục vừa chọn trạng thái, chỉ sản phẩm đáp ứng cả hai điều kiện mới xuất hiện. Đổi bộ lọc hoặc sắp xếp sẽ đưa về trang đầu.

#### Chọn sản phẩm và mở phân tích

- Cách nhanh nhất: bấm **Xem** ở đúng dòng sản phẩm.
- Hoặc tích ô ở dòng sản phẩm rồi bấm **Xem phân tích đã chọn (N)**.
- Ô chọn ở đầu bảng chỉ chọn/bỏ chọn các sản phẩm **trên trang hiện tại**, không chọn toàn bộ catalog.
- Lựa chọn có thể còn được giữ khi chuyển trang hoặc đổi bộ lọc. Nếu không chắc đang chọn gì, bấm Đặt lại và chọn lại sản phẩm cần xem.
- **Giới hạn hiện tại:** dù chọn nhiều sản phẩm, nút Xem phân tích đã chọn chỉ mở sản phẩm được chọn đầu tiên. Nút này chưa thực hiện phân tích hàng loạt hoặc so sánh nhiều sản phẩm.

Mở trang phân tích chỉ đọc kết quả đã lưu. Với sản phẩm chưa có kết quả, giao diện thông báo chưa có phân tích thay vì tự chạy mô hình.

<a id="user-phan-tich"></a>

### 2.3. Trang Kết quả phân tích

#### Mở đúng sản phẩm và đúng lần phân tích

Bạn có thể mở trang này từ nút **Xem** của sản phẩm, **Phân tích** trong Tổng quan hoặc menu Kết quả phân tích. Dùng bộ chọn **Sản phẩm phân tích** để chuyển sang sản phẩm khác.

Mặc định, giao diện ưu tiên kết quả mới nhất của sản phẩm. Khi mở một mục trong Lịch sử kết quả hoặc liên kết có chỉ định lần phân tích, bạn đang xem **đúng lần được chọn**, có thể là kết quả cũ.

Đầu trang có tên sản phẩm, mã, giá/đánh giá theo kết quả đang xem nếu đã có phân tích. Bấm **Xuất kết quả đã lưu** để tải tệp JSON gồm sản phẩm, phân tích đã chọn và các công việc liên quan. Tệp có thể chứa thông tin catalog hiện tại cùng snapshot phân tích cũ; đây là hai phần dữ liệu khác nhau. Nút không sử dụng được nếu chưa có phân tích.

#### Đọc lần lượt các phần

| Phần trên trang | Hiển thị gì? | Cách sử dụng |
| --- | --- | --- |
| Trạng thái và giải thích đầu trang | Nhãn kết quả, lời giải thích và cảnh báo nếu có. | Đọc cả phần giải thích; không chỉ dựa vào màu của trạng thái. |
| **Kết quả từ đầu vào đã đóng băng** | Số bán khi phân tích, tham chiếu, chênh lệch, khoảng tham chiếu. | Đối chiếu giá trị trong cùng một lần phân tích. Khoảng tham chiếu không phải lời hứa về doanh số tương lai. |
| **Biểu đồ đối chiếu lượng bán** | So sánh số bán quan sát với mức tham chiếu. | Đây là biểu đồ đối chiếu hai giá trị, không phải biểu đồ doanh thu/số bán theo thời gian. |
| **1. Bối cảnh & Cơ sở ghép nhóm đối chiếu** | Loại sản phẩm, số mẫu đối chiếu, giá trung vị và chất lượng nhóm. | Xem nhóm đối chiếu có đủ cơ sở để bạn cân nhắc hay chưa. Trung vị là giá trị ở giữa nhóm sau khi sắp xếp. |
| **2. Bằng chứng quan sát** | Bảng hiện trạng, cơ sở đối chiếu, chênh lệch và hành động rà soát. | So sánh từng yếu tố trước khi chọn việc cần làm. |
| **3. Giải thích kết quả phân tích** | Các đề xuất, bằng chứng và giả thuyết đã lưu cho đúng lần phân tích. | Đọc vì sao có đề xuất và cần kiểm chứng điều gì. Có thể không có đề xuất nếu dữ liệu không sinh đề xuất tương ứng. |
| **4. Phạm vi & Giới hạn phân tích** | Các giới hạn, cảnh báo thử nghiệm và thông tin thời điểm. | Không bỏ qua phần này khi diễn giải kết quả hoặc báo cáo cho người khác. |
| **5. Hành động tiếp theo** | Đường dẫn tới các công việc liên quan và thông tin cần xác minh. | User bấm **Xem đề xuất** để qua Đề xuất cải thiện, đã giới hạn theo lần phân tích đang xem. |
| **Thông số kết quả đã lưu** | Dữ liệu kỹ thuật dạng JSON khi mở rộng. | Dùng để đối chiếu với người phụ trách kỹ thuật. Đây là phần chỉ xem, không phải nơi sửa kết quả. |
| **Lịch sử kết quả** | Các lần phân tích đã lưu của sản phẩm, kèm ngày và trạng thái. | Bấm mục muốn xem để đọc lại đúng snapshot của lần đó. Việc này không tạo một lượt phân tích mới. |

#### Cách đọc bảng Bằng chứng quan sát

| Cột | Cách hiểu |
| --- | --- |
| **Yếu tố** | Nội dung được so sánh, chẳng hạn giá, giảm giá, số ảnh, điểm đánh giá, số đánh giá, độ dài mô tả, video, số bán hoặc chất lượng nhóm đối chiếu. |
| **Hiện trạng** | Giá trị đầu vào được lưu tại lần phân tích đang xem. |
| **Cơ sở đối chiếu** | Giá trị hoặc thông tin từ nhóm sản phẩm đối chiếu. |
| **Chênh lệch** | Độ lệch khi có giá trị phù hợp để tính; dấu `—` nghĩa là không có giá trị hiển thị cho phép so sánh đó. |
| **Hành động rà soát** | Liên kết đến đề xuất đã có của lần phân tích này. Bấm nhãn màu để đến phần giải thích liên quan bên dưới. |

Nếu cột hành động ghi **Chưa có đề xuất**, nghĩa là chưa có công việc tương ứng với yếu tố đó trong kết quả đang xem. Frontend không tự thêm đề xuất chỉ vì thấy hai số khác nhau. Bấm nhãn hành động cũng chưa thay đổi trạng thái công việc.

Một số lưu ý về đơn vị:

- Giá bán được đọc theo tiền tệ của dữ liệu; các dòng số ảnh, số đánh giá là số lượng.
- Tỷ lệ giảm giá có thể được lưu dạng số thập phân: ví dụ `0,12` tương ứng 12% khi trường đó là tỷ lệ.
- Độ dài mô tả là độ dài nội dung, không phải điểm chất lượng nội dung.
- Độ tương đồng trung bình mô tả nhóm đối chiếu; không mặc định là xác suất kết luận đúng.
- “Có/Không” ở video là thông tin hiện diện video đã lưu. Trang này chưa phải trình phát video hoặc nơi tải video lên.

<a id="user-de-xuat"></a>

### 2.4. Trang Đề xuất cải thiện

#### Trang này để làm gì?

Sau khi đọc bằng chứng, bạn dùng trang này để quyết định có thực hiện đề xuất hay không, nhận việc, theo dõi tiến độ và xem lịch sử thao tác. Một kết quả phân tích có thể tạo nhiều đề xuất. Ngoài đề xuất từ kết quả ML, User còn có thể tạo công việc thủ công gắn với một phân tích đã lưu.

#### Các ô thống kê đầu trang

| Ô | Đếm những công việc nào? |
| --- | --- |
| **Tổng đề xuất** | Tất cả công việc đã tải, gồm cả việc tạo thủ công và việc đã hủy. |
| **Mới phát hiện** | Chờ duyệt. |
| **Đang theo dõi** | Đã chấp nhận và Đang thực hiện. |
| **Đã hoàn thành** | Hoàn thành. |
| **Đã từ chối** | Đã từ chối. |

Các ô đếm trên **toàn bộ dữ liệu công việc đã tải**, không thu hẹp theo tìm kiếm, bộ lọc hoặc một lần phân tích đang chọn. Việc Đã hủy không có ô đếm riêng, nhưng vẫn nằm trong Tổng đề xuất.

#### Tìm kiếm, bộ lọc và hai cách xem

| Thành phần | Thao tác |
| --- | --- |
| **Tìm công việc** | Nhập tiêu đề hoặc số mã công việc. Tìm kiếm hiện chưa dựa vào tên sản phẩm hoặc mã `SP-…`. |
| **Trạng thái công việc** | Chọn trạng thái cần xem hoặc tất cả trạng thái. |
| Các nhóm loại công việc | Bấm **Tất cả**, **Rà soát giá**, **Rà soát ảnh**, **Rà soát video**, **Bổ sung mô tả**, **Phản hồi khách hàng**, **Hiển thị / tồn kho**, **Khả năng hiển thị**, **Ảnh / video**, **Công việc khác** khi nhóm đó có trong dữ liệu. |
| **Danh sách** | Xem các thẻ công việc, tối đa 12 việc mỗi trang; dùng phân trang để xem tiếp. |
| **Kanban** | Xem công việc trong 6 cột trạng thái. Cuộn ngang khi màn hình không đủ rộng. Hiện di chuyển trạng thái bằng nút, chưa kéo thả thẻ giữa các cột. |
| **Xem tất cả** khi đang giới hạn theo phân tích | Bỏ giới hạn của lần phân tích được mở từ trang bằng chứng. Nếu vẫn thiếu việc, kiểm tra thêm ô tìm kiếm, trạng thái và nhóm loại. |

Khi đi từ nút Xem đề xuất trong trang phân tích, có dòng **Đang xem đề xuất của phân tích #…**. Hãy kiểm tra số phân tích này nếu bạn chỉ thấy vài công việc thay vì toàn bộ.

#### Đọc một thẻ công việc

Thẻ hiển thị mã công việc, loại, tiêu đề, trạng thái, sản phẩm và mã phân tích liên quan. Phần **Bằng chứng đã lưu** giải thích cơ sở ban đầu. Các cảnh báo **Cần xác minh**, thông tin cần bổ sung, lý do quyết định và ghi chú thực hiện giúp bạn biết điều gì đã có bằng chứng và điều gì còn phải kiểm tra.

**Trạng thái công việc** do thao tác theo dõi của người dùng quyết định. Nó khác **trạng thái sản phẩm** từ kết quả phân tích. Chấp nhận một công việc không tự chuyển sản phẩm sang Đang tốt.

#### Chấp nhận và thực hiện một đề xuất

1. Tìm công việc đang **Chờ duyệt** và đọc bằng chứng.
2. Nếu phù hợp, bấm **Chấp nhận**. Công việc chuyển sang **Đã chấp nhận**; thao tác này được gửi ngay, không có bước xác nhận thứ hai.
3. Nếu bạn là người phụ trách, mở **Quản lý công việc & lịch sử**, bấm **Giao cho tôi**. Nút gán công việc cho tài khoản đang đăng nhập, không phải chọn một người bất kỳ.
4. Khi bắt đầu làm ngoài thực tế, bấm **Bắt đầu thực hiện**. Công việc chuyển sang **Đang thực hiện**.
5. Cập nhật ghi chú qua **Sửa công việc** nếu cần.
6. Khi đã làm xong, bấm **Đánh dấu hoàn thành**. Công việc chuyển sang **Hoàn thành**.
7. Mở **Lịch sử** để kiểm tra thay đổi đã được ghi nhận.

Hoàn thành chỉ xác nhận tiến độ công việc. Hệ thống không tự chứng minh rằng hành động đó đã cải thiện doanh số; dữ liệu phân tích cũ vẫn được giữ nguyên.

#### Từ chối một đề xuất

1. Ở công việc Chờ duyệt, bấm **Từ chối**.
2. Trong hộp **Sửa / quyết định công việc**, kiểm tra ô **Từ chối công việc** đang được tích.
3. Nhập **Lý do từ chối**. Ví dụ: “Cần xác minh số lượng ảnh hiện có trước khi đề nghị chụp bổ sung”. Không để trống lý do.
4. Bấm **Lưu công việc** để ghi quyết định. Chỉ mở hộp hoặc bấm Đóng chưa từ chối công việc.

#### Sửa thông tin, hủy và xem lịch sử

Mở mục **Quản lý công việc & lịch sử** trên thẻ cần thao tác:

| Nút / mục | Cách dùng và kết quả |
| --- | --- |
| **Sửa công việc** | Chỉnh Tiêu đề, Mô tả, Thông tin cần bổ sung, Ghi chú thực hiện rồi bấm **Lưu công việc**. Các thông tin này phục vụ theo dõi việc làm, không sửa bằng chứng gốc. |
| **Giao cho tôi** | Gán người phụ trách là tài khoản hiện tại. Nếu đã là bạn, nút bị vô hiệu hóa. |
| **Hủy công việc** | Chuyển công việc còn mở sang Đã hủy. Nút có ở Chờ duyệt, Đã chấp nhận hoặc Đang thực hiện; thao tác được gửi ngay. Hủy khác với Từ chối ở bước duyệt. |
| **Lịch sử** | Mở nhật ký sự kiện, thời điểm và ghi chú. Mở **Thay đổi đã ghi nhận** để xem dữ liệu trước/sau nếu cần. Lịch sử là phần chỉ đọc. |
| **Đề xuất gốc (không sửa)** | Mở dữ liệu đề xuất ban đầu để đối chiếu. Bạn không sửa hoặc xóa bằng chứng gốc tại đây. |

Luồng trạng thái được hỗ trợ:

```text
Chờ duyệt → Đã chấp nhận → Đang thực hiện → Hoàn thành
Chờ duyệt → Đã từ chối
Chờ duyệt / Đã chấp nhận / Đang thực hiện → Đã hủy
```

Hiện không có nút mở lại hoặc hoàn tác trạng thái Hoàn thành, Đã từ chối, Đã hủy. Kiểm tra đúng công việc trước khi quyết định.

#### Thêm công việc thủ công

1. Bấm **Thêm công việc**. Cần có ít nhất một phân tích đã lưu để sử dụng.
2. Trong hộp **Thêm công việc từ kết quả đã lưu**, chọn đúng mục **Phân tích** theo mã và tên sản phẩm. Kiểm tra lại lựa chọn kể cả khi bạn vừa đi từ một trang phân tích cụ thể.
3. Nhập **Tiêu đề** rõ việc cần làm, tối đa 255 ký tự; nhập **Mô tả** nếu cần.
4. Bấm **Tạo công việc**.
5. Công việc mới có trạng thái Chờ duyệt, loại Công việc khác và được gán cho người tạo. Tiếp tục duyệt/thực hiện theo luồng bên trên.

Đây là công việc do người dùng bổ sung, không phải kết luận mới do mô hình sinh ra.

Nếu hệ thống báo dữ liệu đã bị thay đổi bởi thao tác khác, ghi lại nội dung chưa lưu rồi bấm **Tải lại** và kiểm tra trạng thái mới trước khi thao tác tiếp. Cơ chế này giúp tránh ghi đè thay đổi của người khác.

<a id="user-thuc-hanh"></a>

### 2.5. Quy trình thực hành cho User mới

1. Đăng nhập bằng tài khoản User được cấp.
2. Vào **Tổng quan**, đọc số sản phẩm chưa phân tích và các trạng thái đang có.
3. Vào **Danh mục sản phẩm**, chọn một danh mục và một trạng thái bạn cần xem xét.
4. Bấm **Xem** của một sản phẩm, kiểm tra đúng tên và mã `SP-…`.
5. Đọc số bán, tham chiếu, bằng chứng, đề xuất và giới hạn; chưa quyết định chỉ dựa vào màu trạng thái.
6. Bấm **Xem đề xuất** để đến các công việc của đúng kết quả đó.
7. Với công việc phù hợp: Chấp nhận → Giao cho tôi → Bắt đầu thực hiện → cập nhật ghi chú → Đánh dấu hoàn thành. Với việc chưa phù hợp, Từ chối và nêu rõ lý do.
8. Kiểm tra **Lịch sử**, sau đó Đăng xuất khi kết thúc.

<a id="admin"></a>

## 3. Giao diện Admin

Admin quản lý tài khoản và catalog, đồng thời kiểm tra các kết quả đã lưu. Vai trò này không đồng nghĩa rằng mọi chức năng minh họa trong preview đã có trên hệ thống thật.

| Trang trong menu | Địa chỉ | Công việc chính |
| --- | --- | --- |
| **Tổng quan hệ thống** | `/admin/overview` | Đọc thống kê, kết nối và các kết quả gần nhất. |
| **Quản lý cửa hàng** | `/admin/stores` | Xem trạng thái chưa thiết lập; hiện chưa quản lý cửa hàng thật. |
| **Quản lý tài khoản** | `/admin/accounts` | Tạo tài khoản, tạm khóa hoặc kích hoạt. |
| **Quản lý sản phẩm** | `/admin/products` | Xem, tìm, thêm, sửa, xóa sản phẩm khi được phép. |
| **Quản lý danh mục** | `/admin/categories` | Tạo danh mục và xóa danh mục chưa được sử dụng. |
| **Kết quả đã lưu** | `/admin/monitor` | Tìm từng lượt phân tích, xem dữ liệu gốc và xuất kết quả. |
| **Cấu hình đã lưu** | `/admin/configuration` | Đọc phiên bản mô hình, taxonomy và quy tắc của kết quả đã lưu. |

Admin còn mở được trang bằng chứng `/admin/analysis` từ sản phẩm hoặc giám sát. Trang này không có mục riêng trong menu và dùng cách đọc bằng chứng tương tự User.

<a id="admin-tong-quan"></a>

### 3.1. Trang Tổng quan hệ thống

#### Các ô thống kê

| Ô | Ý nghĩa |
| --- | --- |
| **Tổng tài khoản** | Tất cả tài khoản được tải, bao gồm tài khoản đang bị khóa. |
| **Tài khoản hoạt động** | Tài khoản đang được kích hoạt. |
| **Tổng cửa hàng** | Hiện hiển thị `—` vì chưa có chức năng cửa hàng thật. |
| **Catalog sản phẩm** | Tổng số bản ghi sản phẩm. |
| **Kết quả phân tích** | Tổng số lượt phân tích đã lưu, bao gồm nhiều lần của cùng sản phẩm. |
| **Đề xuất đã lưu** | Tổng số công việc đã lưu. |
| **Đang thực hiện** | Tổng số công việc đang ở trạng thái Đang thực hiện. |
| **Chưa có tham chiếu** | Số lượt phân tích không có mức tham chiếu; không bao gồm sản phẩm chưa có bất kỳ lượt phân tích nào. |

Số kết quả phân tích có thể lớn hơn số sản phẩm vì hệ thống lưu lịch sử. Khác với Tổng quan User, nhiều thống kê tại đây tính trên **tất cả lượt phân tích** thay vì chỉ kết quả mới nhất mỗi sản phẩm.

#### Biểu đồ và các nút

| Khu vực / nút | Cách đọc / thao tác |
| --- | --- |
| **Kết quả được phân tích 7 ngày qua** | Đếm theo thời điểm phân tích được lưu trong kết quả, không mặc định là ngày import vào database. Nhập hôm nay một kết quả có ngày phân tích cũ không làm nó trở thành kết quả của hôm nay. |
| **Phân bố kết quả DSS** | Cơ cấu trạng thái của tất cả kết quả đã lưu. DSS là hệ thống hỗ trợ quyết định. |
| **Cơ cấu danh mục** | Phân bố sản phẩm theo danh mục, không phải doanh thu. |
| **Tình trạng hệ thống** | Xem trạng thái kiểm tra Web API và PostgreSQL trên Neon; đồng thời phân biệt kết quả ML đã lưu với Phân tích theo yêu cầu chưa khả dụng. |
| **Xem giám sát** | Mở trang Kết quả đã lưu để kiểm tra chi tiết. |
| **Kết quả gần nhất** | Danh sách tối đa 8 lượt phân tích gần nhất theo thời điểm phân tích, kèm sản phẩm, phiên bản và trạng thái. |
| **Xem** tại một kết quả | Mở đúng sản phẩm và lần phân tích trên trang bằng chứng Admin. |

Tình trạng kết nối tốt chỉ xác nhận khả năng truy cập hệ thống ở bước kiểm tra đó. Nó không phải bằng chứng mô hình đã đạt tiêu chí chất lượng hoặc dịch vụ chạy ML trực tiếp đã được tích hợp.

<a id="admin-cua-hang"></a>

### 3.2. Trang Quản lý cửa hàng

**Trạng thái hiện tại: chưa thiết lập chức năng cửa hàng thật.** Trang vẫn có bố cục thống kê và bảng để thể hiện vị trí chức năng, nhưng chưa có dữ liệu/quyền sở hữu cửa hàng để quản lý.

- Tổng cửa hàng và số SKU đã phân bổ chưa có giá trị; một số số liệu kết quả/đề xuất lấy từ catalog chung, không phải của từng cửa hàng.
- Ô **Tìm cửa hàng** và nút **Thêm cửa hàng** đang bị vô hiệu hóa.
- Bảng có các cột dự kiến về mã, tên, chủ sở hữu, sản phẩm, phân tích và thao tác, nhưng hiển thị **Cửa hàng chưa được thiết lập**.
- Chưa thể tạo, sửa, gán User vào cửa hàng hoặc chia sản phẩm cho từng cửa hàng trên trang này.

Không cần thử bấm nhiều lần hoặc tải lại để mở khóa chức năng. Nếu muốn quản lý tài khoản, chuyển sang Quản lý tài khoản; nếu muốn thêm sản phẩm, dùng Quản lý sản phẩm.

<a id="admin-tai-khoan"></a>

### 3.3. Trang Quản lý tài khoản

Trang hiển thị bảng **Tài khoản trong catalog chung**, gồm Tên, Email, Vai trò, Trạng thái và Thao tác.

#### Tạo tài khoản

1. Bấm **Thêm tài khoản** để mở hộp **Tạo tài khoản**.
2. Điền các trường sau:

| Trường | Yêu cầu / cách điền |
| --- | --- |
| **Họ tên** | Bắt buộc, tối đa 150 ký tự; dùng tên giúp nhận diện người dùng. |
| **Email** | Bắt buộc, đúng định dạng email, tối đa 254 ký tự và chưa được sử dụng. |
| **Mật khẩu** | Từ 12 đến 128 ký tự khi tạo tài khoản mới qua giao diện. |
| **Vai trò** | Chọn **User** cho người xem/phụ trách công việc; chỉ chọn **Admin** khi người đó cần quyền quản trị. |

3. Bấm **Tạo tài khoản** và chờ lưu xong.
4. Kiểm tra tài khoản xuất hiện trong bảng, đúng vai trò và trạng thái.
5. Cung cấp thông tin đăng nhập cho đúng người qua kênh phù hợp; không đưa mật khẩu vào báo cáo hoặc tệp hướng dẫn công khai.

Mỗi tài khoản mới không tự có một cửa hàng riêng trong phiên bản hiện tại.

#### Tạm khóa hoặc kích hoạt

1. Tìm đúng dòng theo email để tránh thao tác nhầm người.
2. Bấm **Tạm khóa** nếu tài khoản đang hoạt động, hoặc **Kích hoạt** nếu tài khoản đang bị khóa.
3. Đọc hộp xác nhận của trình duyệt và xác nhận nếu đúng ý định.
4. Kiểm tra Trạng thái trong bảng sau khi dữ liệu tải lại.

Tạm khóa sẽ làm tài khoản không thể tiếp tục sử dụng phiên đang có. Sau khi kích hoạt lại, người đó cần đăng nhập lại; phiên cũ không tự được khôi phục. Nút khóa chính tài khoản Admin đang đăng nhập bị vô hiệu hóa.

**Giới hạn giao diện:** hiện chưa có nút sửa họ tên/email/vai trò, đặt lại mật khẩu hoặc xóa tài khoản. Khi cần các thao tác này, liên hệ người phụ trách hệ thống; không tìm chúng trong hộp tạo tài khoản.

<a id="admin-san-pham"></a>

### 3.4. Trang Quản lý sản phẩm

Cách đọc cột, tìm kiếm, lọc, phân trang và chọn sản phẩm giống [Danh mục sản phẩm của User](#user-san-pham). Admin có thêm các thao tác sau.

#### Thêm sản phẩm

1. Bấm **Thêm sản phẩm**.
2. Nhập thông tin trong hộp tạo:

| Trường | Yêu cầu / ý nghĩa |
| --- | --- |
| **Tên sản phẩm** | Bắt buộc, tối đa 500 ký tự. Nên đủ rõ để phân biệt các sản phẩm. |
| **Giá** | Có thể để trống nếu chưa biết; nếu nhập phải là số không âm. Không nhập 0 chỉ để thay cho dữ liệu chưa rõ. |
| **Danh mục** | Chọn danh mục có sẵn; có thể để Chưa phân loại. Muốn có nhóm mới, tạo ở Quản lý danh mục trước. |
| **Mô tả** | Nội dung mô tả sản phẩm, có thể để trống. |

3. Bấm **Lưu sản phẩm**, chờ **Đang lưu…** kết thúc.
4. Tìm lại sản phẩm vừa tạo để kiểm tra thông tin.

Sản phẩm mới chưa tự có số liệu phân tích. Trạng thái Chưa có phân tích sau khi thêm là bình thường; hiện chưa có nút chạy ML trực tiếp trong giao diện.

#### Sửa sản phẩm

1. Tìm đúng tên và mã sản phẩm.
2. Bấm **Sửa** ở dòng tương ứng.
3. Chỉnh tên, giá, danh mục hoặc mô tả.
4. Bấm **Lưu sản phẩm**, sau đó kiểm tra lại bảng.

Hộp sửa hiện chưa có trường chỉnh số bán, điểm đánh giá, số đánh giá, mã nguồn, ảnh/video hoặc kết quả ML. Chưa có chức năng tải ảnh/video lên hay import CSV bằng nút trong trang này.

Sửa giá/mô tả trong catalog **không sửa ngược snapshot của phân tích đã lưu** và không tự sinh phân tích mới. Vì vậy có thể thấy giá hiện tại khác giá trong một kết quả lịch sử; cần kiểm tra đúng phần dữ liệu trước khi cho rằng hệ thống sai.

#### Xóa sản phẩm

1. Kiểm tra đúng dòng sản phẩm cần xóa.
2. Bấm **Xóa**.
3. Đọc xác nhận của trình duyệt; chỉ đồng ý khi chắc chắn muốn xóa bản ghi đó.
4. Nếu thành công, sản phẩm không còn trong catalog. Nếu bị báo đang được tham chiếu, dừng lại và kiểm tra dữ liệu liên quan.

Sản phẩm đã có phân tích có thể bị chặn xóa để bảo vệ dữ liệu và lịch sử. Trang không có nút ép xóa hoặc tự xóa toàn bộ phân tích/công việc liên quan. Việc dọn dữ liệu thử nghiệm là công việc bảo trì riêng của người phụ trách kỹ thuật.

<a id="admin-danh-muc"></a>

### 3.5. Trang Quản lý danh mục

Trang hiển thị Mã, Tên, số Sản phẩm và Thao tác. Đây là nhóm quản lý catalog; không phải trình chỉnh sửa toàn bộ taxonomy/quy tắc ghép nhóm của mô hình.

#### Tạo danh mục

1. Bấm **Thêm danh mục**.
2. Điền **Mã danh mục**: bắt buộc, duy nhất, tối đa 80 ký tự, chỉ dùng chữ thường không dấu `a-z`, số `0-9` và dấu gạch dưới `_`. Ví dụ `tui_deo_cheo`; không dùng khoảng trắng hoặc chữ hoa.
3. Điền **Tên danh mục**: bắt buộc, tối đa 150 ký tự, có thể dùng tiếng Việt có dấu, ví dụ “Túi đeo chéo”.
4. Nhập **Mô tả** nếu cần.
5. Bấm **Lưu danh mục** rồi kiểm tra bảng.
6. Khi thêm/sửa sản phẩm, chọn danh mục này để đưa sản phẩm vào nhóm.

#### Xóa danh mục

1. Kiểm tra mã, tên và số sản phẩm của danh mục.
2. Bấm **Xóa danh mục**, đọc xác nhận và xác nhận nếu đúng.
3. Nếu có sản phẩm đang sử dụng danh mục, hệ thống chặn xóa. Nếu thật sự cần bỏ nhóm đó, trước tiên dùng Sửa sản phẩm để chuyển sản phẩm sang nhóm phù hợp, rồi thử xóa danh mục đã trống.

Hiện chưa có nút sửa danh mục. Thêm hoặc thay đổi danh mục catalog không tự cập nhật loại sản phẩm, nhóm đối chiếu hoặc kết quả trong các phân tích đã đóng băng.

<a id="admin-ket-qua"></a>

### 3.6. Trang Kết quả đã lưu

#### Mục đích

Trang này giúp Admin kiểm tra từng lượt phân tích đã nằm trong database, kể cả lịch sử của cùng một sản phẩm. Đây chưa phải màn hình điều khiển hàng đợi chạy ML trực tiếp.

| Ô đầu trang | Ý nghĩa |
| --- | --- |
| **Kết quả đã lưu** | Tổng số bản ghi phân tích, bao gồm lịch sử của cùng sản phẩm. |
| **Có tham chiếu** | Số bản ghi phân tích có giá trị tham chiếu. |
| **Kết quả ML** | Số bản ghi thuộc bộ trạng thái ML mới đã nhập; không đồng nghĩa đã nghiệm thu chất lượng mô hình. |
| **Tác vụ trực tiếp** | Hiện hiển thị `—` vì chưa có chức năng theo dõi/chạy tác vụ ML trực tiếp tương ứng. |

#### Tìm và chọn một kết quả

1. Nhập tên sản phẩm vào **Tìm kết quả phân tích**. Tìm kiếm hiện dựa trên tên sản phẩm, chưa phải tìm theo mọi trường kỹ thuật.
2. Chọn **Trạng thái kết quả** nếu muốn thu hẹp danh sách.
3. Xem bảng **Danh sách lượt phân tích**: mã kết quả, sản phẩm, thời gian và trạng thái. Có tối đa 10 kết quả mỗi trang.
4. Bấm **mã #…** của kết quả cần xem. Dòng được chọn được làm nổi bật và phần chi tiết chuyển sang đúng lượt phân tích.
5. Muốn bỏ tìm kiếm/bộ lọc, bấm **Đặt lại**. Nút này không xóa dữ liệu hoặc chạy phân tích lại.

#### Đọc phần chi tiết

| Phần / nút | Nội dung / tác dụng |
| --- | --- |
| **Chi tiết kết quả #…** | Cho biết chính xác lượt phân tích đang chọn, tên sản phẩm và mã hiển thị. |
| **01 · INPUT SNAPSHOT** | Dữ liệu đầu vào đã lưu tại lần phân tích đó, dạng JSON. Chỉ xem. |
| **02 · NHÓM ĐỐI CHIẾU** | Loại sản phẩm và số sản phẩm đối chiếu đã lưu. |
| **03 · THAM CHIẾU VS QUAN SÁT** | Đối chiếu số bán quan sát và tham chiếu của lần được chọn. |
| Giới hạn / cảnh báo | Thông tin cần cân nhắc trước khi diễn giải kết quả. |
| Biểu tượng tải xuống **Tải kết quả đã lưu** | Xuất riêng bản ghi phân tích đang chọn thành JSON. Khác nút Xuất dữ liệu ở đầu trang vốn xuất gói dữ liệu rộng hơn. |
| **Xem bằng chứng** | Mở trang phân tích chi tiết của đúng sản phẩm và đúng lượt phân tích đó. |

Trong trang bằng chứng Admin, cách đọc các phần giống [hướng dẫn Kết quả phân tích](#user-phan-tich). Ở phần Hành động tiếp theo, nút **Xem trong giám sát** đưa trở lại kết quả tương ứng trong trang giám sát; không phải nút chấp nhận công việc.

Không có nút Chạy lại, Thử lại mô hình hoặc sửa trực tiếp kết luận ML ở trang này.

<a id="admin-cau-hinh"></a>

### 3.7. Trang Cấu hình đã lưu

Trang dùng để đọc cấu hình gắn với các kết quả đã có, giúp đối chiếu một kết quả được tạo bởi phiên bản nào. **Hiện chỉ xem, chưa chỉnh sửa hoặc triển khai cấu hình.**

1. Mở **Cấu hình đã lưu** trong menu.
2. Tại **Phiên bản kết quả**, chọn phiên bản cần đối chiếu. Bộ chọn có tên hỗ trợ truy cập là Phiên bản cấu hình.
3. Đọc bốn nhóm thông tin:

| Nhóm | Bạn sẽ thấy gì? |
| --- | --- |
| **Ghép nhóm đối chiếu** | Phiên bản taxonomy, số sản phẩm đối chiếu, số mẫu tối thiểu, độ tương đồng tối thiểu nếu kết quả có lưu các trường này. |
| **Ngưỡng chênh lệch & tham chiếu** | Nguồn dự đoán và bộ quy tắc đã lưu; trường chưa được cung cấp không tự được điền bằng giá trị mẫu. |
| **Quy tắc xử lý dữ liệu thiếu** | Cách diễn giải dữ liệu thiếu và trạng thái nghiệm thu/giới hạn của kết quả. |
| **Quy tắc sinh đề xuất hành động** | Các loại hoặc mã quy tắc thực sự xuất hiện trong kết quả của phiên bản đang xem. |

4. Xem bảng **Các phiên bản cấu hình đã lưu** để đối chiếu mô hình, quy tắc, taxonomy và thời điểm.

Chọn phiên bản chỉ đổi nội dung đang xem, không kích hoạt phiên bản đó cho lần chạy tiếp theo. Các ô là chỉ đọc; nút **Lưu phiên bản (chưa khả dụng)** bị vô hiệu hóa. Chưa có thao tác huấn luyện, triển khai mô hình hoặc khôi phục cấu hình mặc định tại đây.

Dòng **Chưa có trong kết quả** nghĩa là bản ghi không cung cấp giá trị tương ứng, không phải yêu cầu bạn tự nhập một con số để hoàn thiện kết quả.

<a id="admin-thuc-hanh"></a>

### 3.8. Quy trình thực hành cho Admin mới

1. Đăng nhập bằng tài khoản Admin, kiểm tra đúng tên và vai trò.
2. Vào **Tổng quan hệ thống**, xem trạng thái Web API/PostgreSQL và các kết quả đã lưu.
3. Khi cần cấp quyền cho người mới, vào **Quản lý tài khoản → Thêm tài khoản**, chọn User hoặc Admin theo đúng nhu cầu.
4. Nếu cần nhóm sản phẩm mới, tạo ở **Quản lý danh mục** trước.
5. Vào **Quản lý sản phẩm → Thêm sản phẩm**, điền tên, giá, nhóm và mô tả; kiểm tra lại sau khi lưu.
6. Không chờ sản phẩm mới tự xuất hiện kết quả ML. Dữ liệu phân tích mới phải được người phụ trách đưa vào hệ thống qua quy trình tích hợp hiện có; chưa có nút import/chạy ML trên trang quản trị.
7. Với sản phẩm đã có phân tích, vào **Kết quả đã lưu**, chọn mã kết quả, xem snapshot và bấm Xem bằng chứng.
8. Khi cần kiểm tra nguồn phiên bản, đối chiếu **Cấu hình đã lưu**. Không coi việc chọn phiên bản là đã thay đổi mô hình.
9. Đăng xuất khi kết thúc công việc.

<a id="trang-thai"></a>

## 4. Cách hiểu trạng thái và số liệu

### 4.1. Trạng thái phân tích sản phẩm

Các nhãn dưới đây được hiển thị từ trạng thái đã lưu trong kết quả phân tích. Màu giúp phân biệt, còn ý nghĩa chi tiết và lý do cần đọc ở trang bằng chứng; không suy ra ngưỡng cụ thể chỉ từ tên trạng thái.

| Trạng thái | Màu nhận diện | Cách hiểu khi sử dụng |
| --- | --- | --- |
| **Phản hồi tốt nhưng bán thấp** | Vàng nâu | Có tín hiệu phản hồi tích cực nhưng số bán thấp theo đánh giá của quy tắc đã lưu; xem tiếp bằng chứng và tham chiếu. |
| **Đánh giá thấp và bán thấp** | Đỏ | Cả phản hồi và số bán được phân loại ở nhóm cần xem xét theo kết quả đó. Không tự kết luận nguyên nhân nếu chưa đọc bằng chứng. |
| **Đang tốt** | Xanh lá | Kết quả đã lưu xếp sản phẩm vào nhóm hoạt động tốt trong bối cảnh đối chiếu. Không đảm bảo sản phẩm sẽ tiếp tục bán tốt trong tương lai. |
| **Tiềm năng chưa khai thác** | Tím | Một tín hiệu cơ hội theo kết quả/quy tắc đã lưu, cần xem bằng chứng trước khi ưu tiên hành động. Không phải lời hứa tăng trưởng. |
| **Khó bán theo dữ liệu** | Xanh dương | Dữ liệu/quy tắc của lần phân tích xếp sản phẩm vào nhóm khó bán; cần đọc giải thích và giới hạn thay vì coi là kết luận vĩnh viễn. |
| **Chưa đủ dữ liệu** | Xám xanh | Chưa đủ dữ liệu để đưa ra kết luận có cơ sở theo điều kiện của kết quả. Vẫn có thể có một số số liệu hoặc mức tham chiếu; xem lý do cụ thể. |
| **Chưa có phân tích** | Xám đậm | Chưa có bản ghi phân tích cho sản phẩm. Đây là trạng thái hiển thị của ứng dụng, không phải một trong sáu kết luận ML trên. |

Nếu còn kết quả theo bộ trạng thái cũ, bạn có thể gặp các nhãn như Phản hồi tích cực, số bán dưới tham chiếu; Đánh giá thấp, số bán dưới tham chiếu; Đạt hoặc vượt tham chiếu; Chưa có số bán, cần kiểm tra; Chưa có số bán, chưa có tín hiệu ưu tiên; Dưới tham chiếu, thiếu đánh giá; Theo dõi chênh lệch; Chưa kết luận; Chưa đủ cơ sở. Ứng dụng giữ nhãn tương ứng với phiên bản kết quả, không tự biến chúng thành sáu trạng thái mới.

### 4.2. Trạng thái công việc

| Trạng thái | Màu | Ý nghĩa |
| --- | --- | --- |
| **Chờ duyệt** | Nâu cam | Chưa có quyết định chấp nhận/từ chối. |
| **Đã chấp nhận** | Xanh da trời | Đã đồng ý làm, chưa bắt đầu. |
| **Đang thực hiện** | Tím | Công việc đã bắt đầu. |
| **Hoàn thành** | Xanh ngọc | Đã đánh dấu hoàn tất công việc. |
| **Đã từ chối** | Đỏ | Đã quyết định không nhận đề xuất ở bước duyệt, có lý do. |
| **Đã hủy** | Xám | Công việc bị dừng/hủy trong luồng đang mở. |

Mỗi trạng thái trong cùng nhóm có màu riêng. Khi tìm kiếm, báo cáo hoặc thao tác, dùng cả tên trạng thái thay vì chỉ gọi “thẻ màu tím”, vì màu của nhóm phân tích và nhóm công việc không mang cùng một ý nghĩa.

### 4.3. Những điều cần nhớ khi đọc dữ liệu

- **`0` khác `—`:** 0 là giá trị được lưu bằng không; `—` thường là chưa có/không hiển thị được giá trị tương ứng. Không coi thiếu dữ liệu là bằng không.
- **Tham chiếu có số lẻ là bình thường:** ví dụ 14,66 là kết quả ước lượng để đối chiếu, không phải khẳng định có đúng 14,66 đơn hàng thực tế.
- **Không có hành động không đồng nghĩa sản phẩm tốt:** có thể chưa có đề xuất phù hợp, chưa đủ bằng chứng hoặc chưa có phân tích.
- **Ngày phân tích khác ngày thu thập:** xem giới hạn khi thời điểm quan sát nguồn chưa được xác minh. Không mặc định mọi con số phản ánh thị trường hôm nay.
- **Đếm sản phẩm khác đếm phân tích khác đếm công việc:** một sản phẩm có nhiều lượt phân tích; một lượt có nhiều công việc. Vì vậy các tổng không cần bằng nhau.
- **Bản phân tích cũ được giữ nguyên:** cập nhật sản phẩm hoặc hoàn thành công việc không tự sửa lại đầu vào, bằng chứng hay trạng thái của kết quả lịch sử.

<a id="cau-hoi"></a>

## 5. Các tình huống thường gặp

| Tình huống | Cách xử lý / cách hiểu |
| --- | --- |
| Không đăng nhập được | Kiểm tra email/mật khẩu và thông báo trên trang. Nhờ Admin kiểm tra tài khoản có đang hoạt động không. Chưa có nút tự đăng ký/khôi phục mật khẩu. |
| Hiện Mời bạn đăng nhập | Phiên chưa có hoặc đã hết hạn. Bấm Đăng nhập và đăng nhập lại. |
| Hiện Không có quyền truy cập | Bạn đang mở trang của vai trò khác. Bấm **Về không gian của tôi**. Nếu cần quyền khác, liên hệ Admin; đổi URL không cấp thêm quyền. |
| Trang báo Không thể kết nối / lỗi tải dữ liệu | Bấm Thử lại. Nếu vẫn lỗi, ghi lại tên trang, thời điểm và nội dung lỗi để gửi kỹ thuật. Giao diện thật không tự thay bằng dữ liệu mock khi backend lỗi. |
| Không tìm thấy sản phẩm | Xóa tìm kiếm, bấm Đặt lại, kiểm tra lại danh mục, trạng thái và phân trang. Thử tìm theo mã `SP-…`. |
| Không thấy đủ đề xuất | Kiểm tra có đang giới hạn theo phân tích #… hay không; bấm Xem tất cả, xóa tìm kiếm, chọn tất cả trạng thái/loại và xem trang tiếp theo. |
| Số tổng công việc lớn hơn số thẻ đang xem | Các ô đầu trang đếm toàn bộ công việc đã tải; danh sách có lọc, có phân trang. Một sản phẩm cũng có thể có nhiều công việc. |
| Vừa thêm sản phẩm nhưng chưa có phân tích | Đây là hai loại bản ghi khác nhau. Thêm sản phẩm không tự chạy mô hình. Nhờ người phụ trách tích hợp kết quả mới nếu cần. |
| Giá ở catalog và trang phân tích khác nhau | Catalog là thông tin hiện tại; trang phân tích đọc đầu vào đã đóng băng. Kiểm tra ngày và lần phân tích đang chọn. |
| Thiếu ảnh hoặc chỉ có biểu tượng giữ chỗ | Bản ghi chưa có URL ảnh dùng được hoặc ảnh không tải được. Hộp sửa sản phẩm hiện chưa có chức năng tải ảnh lên. |
| Có thông tin video nhưng không xem được video trên trang | Dữ liệu hiện diện video phục vụ bằng chứng; giao diện hiện chưa có trình phát/tải video. |
| Báo xung đột khi lưu công việc | Có thay đổi khác sau thời điểm bạn tải dữ liệu. Ghi lại nội dung chưa lưu, Tải lại, đọc trạng thái mới rồi thao tác tiếp. |
| Xóa sản phẩm/danh mục bị chặn | Bản ghi đang được dữ liệu khác tham chiếu. Không phải mọi bản ghi đều được phép xóa. Với danh mục, xem sản phẩm đang sử dụng; với sản phẩm đã phân tích, nhờ kỹ thuật kiểm tra nhu cầu bảo trì. |
| Nút cửa hàng hoặc Lưu phiên bản không bấm được | Chức năng này chưa khả dụng trong phiên bản thật. Đây không phải đã lưu thành công hay lỗi mật khẩu. |
| Bấm Tải lại nhưng kết quả ML không đổi | Tải lại chỉ đọc dữ liệu đã lưu, không chạy suy luận mới. |
| Hoàn thành công việc nhưng trạng thái sản phẩm vẫn vậy | Trạng thái công việc và kết quả phân tích độc lập. Cần dữ liệu/kết quả mới để đánh giá lại, không sửa kết quả cũ bằng thao tác hoàn thành. |
| Tệp xuất có nhiều dữ liệu hơn danh sách đang lọc | Nút Xuất dữ liệu đầu trang xuất dữ liệu đã tải theo phạm vi mô tả ở mục 1.3, chưa xuất riêng phần đang lọc. |
| Tại sao từng có bốn nhóm đều 25 sản phẩm? | Lần nhập thử 100 sản phẩm đã chọn mẫu cân bằng: 5 loại, mỗi loại 20 sản phẩm và 5 sản phẩm cho mỗi trong bốn trạng thái có trong mẫu. Tổng mỗi trạng thái vì vậy là 25. Đây là phân bố do cách chọn mẫu, không chứng minh dữ liệu thị trường phân bố đều hoặc mô hình đã đạt nghiệm thu; frontend không cần cố định số 25. Tổng hiện tại phụ thuộc dữ liệu thực tế đang có. |

<a id="cai-dat"></a>

## 6. Tài liệu dành cho người cài đặt hệ thống

Người sử dụng thông thường chỉ cần website và tài khoản đã được cấp. Việc cài đặt, cấu hình môi trường, khởi chạy dịch vụ, nhập dữ liệu hoặc xử lý lỗi kết nối thuộc người phụ trách kỹ thuật:

- [README dự án](README.md): kiến trúc và cấu trúc dự án.
- [Hướng dẫn frontend](frontend/README.md): cài đặt và chạy giao diện kết nối.
- [Hướng dẫn backend](backend/README.md): cấu hình, database, API và lệnh vận hành.
- [Trạng thái triển khai hiện tại](docs/CURRENT_STATE.md): các phần đã có và những giới hạn cần tiếp tục xử lý.

Tài liệu này mô tả thao tác theo giao diện hiện tại. Các chức năng cửa hàng, cấu hình có thể chỉnh sửa và phân tích ML theo yêu cầu chỉ nên được đưa vào hướng dẫn sử dụng sau khi đã được triển khai và xác minh riêng.
