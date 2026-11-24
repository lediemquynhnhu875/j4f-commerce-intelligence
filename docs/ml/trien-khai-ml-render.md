# Triển khai ML Sellens trên Render và kiểm thử import

Tạo thêm một **Web Service Python** tên `sellens-ml` trên Render. Frontend trên Vercel vẫn gọi backend Next.js trên Render. Backend chuyển dữ liệu đã lưu của một sản phẩm sang FastAPI, nhận kết quả, rồi ghi lịch sử phân tích và đề xuất vào Neon. FastAPI chạy Model A trên **CPU**. Máy cá nhân có thể tắt sau khi triển khai.

```text
Người dùng → Vercel → Backend Next.js (Render) → FastAPI ML (Render)
                               │                      ↑
                               └→ Neon                └ ZIP từ GitHub Release riêng tư
```

## 1. Lấy đúng bộ model và dữ liệu tham chiếu

Nhờ người huấn luyện cung cấp ba file thuộc **cùng lần chạy taxonomy v2** và cho biết môi trường Python dùng để huấn luyện:

| File | Vị trí thông thường trong máy huấn luyện |
| --- | --- |
| `reference_models.joblib` | `ml/artifacts/taxonomy_v2_run/reference_models.joblib` |
| `model_metrics.json` đi kèm bundle | `ml/artifacts/taxonomy_v2_run/model_metrics.json` |
| `clean_products.csv` có `product_type` và `taxonomy_version` v2 | `data/processed/taxonomy_v2_run/clean_products.csv` |

Hai file `product_statuses.csv` và `product_recommendations.csv` là kết quả đã xuất cho các sản phẩm cũ. Để tính cho sản phẩm mới, cần file `.joblib` của nhóm và corpus đi kèm. Nếu bộ đó bị mất, nhóm ML cần chạy lại từ dữ liệu nguồn theo quy trình trong [ML README](../../ml/README.md) để tạo một bundle mới. File `.joblib` phải đến từ người huấn luyện hoặc kho lưu trữ mà nhóm kiểm soát vì khi nạp, định dạng này có thể thực thi mã. [Tài liệu về model persistence của scikit-learn](https://scikit-learn.org/stable/model_persistence.html).

Tại thư mục gốc dự án, dùng Python của **môi trường huấn luyện** để đóng gói. Lệnh dưới đây dùng bố cục đặt trực tiếp hai file vào `ml/artifacts/` và CSV vào `data/processed/`. Có thể dùng đường dẫn mặc định trong bảng hoặc đường dẫn tuyệt đối bằng cách thay giá trị `--artifact-dir` và `--corpus`.

```powershell
python -m ml.src.serving.assets pack --artifact-dir "ml/artifacts" --corpus "data/processed/clean_products.csv" --output "ml/artifacts/sellens-ml-v2.zip"
(Get-FileHash "ml/artifacts/sellens-ml-v2.zip" -Algorithm SHA256).Hash.ToLower()
python --version
```

Ghi lại SHA-256 và phiên bản Python. File ZIP chứa bảng phiên bản các thư viện ML để Render cài đúng phiên bản khi build. Nếu bản huấn luyện dùng bản thư viện chỉ có trên một hệ điều hành, cần môi trường huấn luyện tương thích Linux. Nếu đóng gói bộ khác, dùng tên ZIP mới và giữ bundle, báo cáo, corpus và cấu hình cùng một lần chạy.

## 2. Đưa ZIP lên một GitHub Release trong repo private

1. Trên GitHub, tạo một repo **Private** riêng tên `sellens-ml-assets`. Chọn **Add a README** khi tạo để repo có nhánh đầu tiên.
2. Trong repo riêng này, mở **Releases → Draft a new release**. Chọn **Choose a tag**, tạo tag `v2`, đặt tên release và đính kèm `sellens-ml-v2.zip` vào phần Assets. Bấm **Publish release** để API có thể tìm theo tag. Giữ repo ở chế độ **Private**. [Cách tạo GitHub Release](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository#creating-a-release).
3. Trong tài khoản GitHub sở hữu hoặc có quyền cấp token cho repo đó, mở **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**. Chọn đúng **Resource owner**, chọn **Only select repositories** rồi chỉ chọn `sellens-ml-assets`. Trong **Repository permissions**, cấp **Contents → Read-only**. Lưu token để nhập vào Render. [Cách tạo fine-grained token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token) · [Quyền tải release asset](https://docs.github.com/en/rest/releases/assets#get-a-release-asset).

ZIP nằm trong **Assets** của release, ngoài lịch sử commit. Render tìm đúng tag và tên file, tải bằng token chỉ đọc rồi so SHA-256 trước khi giải nén. Khi đổi bản model, dùng tag mới và cập nhật hash trong môi trường Render.

## 3. Tạo dịch vụ ML trên Render

Đưa các thay đổi code lên nhánh mà Render sẽ lấy. Render Dashboard → **New → Web Service**, chọn repo Sellens. Nếu repo thuộc tài khoản bạn trong nhóm, chọn repo/nhánh mà Render được cấp quyền truy cập và kiểm tra nhánh đó đã chứa code ML mới.

| Mục | Giá trị |
| --- | --- |
| Name | `sellens-ml` |
| Language | **Python 3** |
| Branch | Nhánh chứa code đã merge hoặc nhánh dùng cho staging |
| Region | Chọn cùng vùng với backend, ví dụ **Singapore** |
| Root Directory | Để trống để build từ gốc repo |
| Build Command | `python -m ml.src.serving.assets fetch-github && python -m pip install -r ml/requirements-serve.txt -r ml/artifacts/serving/requirements-model.txt` |
| Start Command | `python -m uvicorn ml.src.serving.app:app --host 0.0.0.0 --port $PORT --workers 1` |
| Advanced → Health Check Path | `/health/ready` |

Với corpus nhỏ, có thể thử gói Free. Khi dùng bộ tham chiếu khoảng 41.000 sản phẩm, hãy kiểm tra biểu đồ Memory khi khởi động. Nếu 512 MB không đủ, dùng instance CPU có 2 GB RAM. Free ngủ sau thời gian không có truy cập và có thể mất khoảng một phút để thức. Khi demo, mở health check của cả backend và ML trước khi bấm **Chạy phân tích**. [Deploy FastAPI](https://render.com/docs/deploy-fastapi) · [Health checks](https://render.com/docs/health-checks) · [Render Free](https://render.com/docs/free).

Trong **Environment Variables** của `sellens-ml`, thêm:

| Biến | Giá trị |
| --- | --- |
| `PYTHON_VERSION` | Phiên bản đầy đủ từ bước 1, ví dụ `3.12.4` nếu đúng với bộ của nhóm |
| `ML_ASSET_GITHUB_REPOSITORY` | Tên repo private theo dạng `ten-tai-khoan/sellens-ml-assets` |
| `ML_ASSET_GITHUB_TAG` | Tag đã publish, ví dụ `v2` |
| `ML_ASSET_GITHUB_FILE` | Tên file đính kèm, ví dụ `sellens-ml-v2.zip` |
| `ML_ASSET_GITHUB_TOKEN` | Fine-grained token có quyền `Contents: read` của repo tài sản |
| `ML_ASSET_SHA256` | SHA-256 của ZIP ở bước 1 |
| `ML_SERVICE_TOKEN` | Một khóa ngẫu nhiên mới, dùng chung giữa ML và backend |
| `OMP_NUM_THREADS` | `1` |
| `OPENBLAS_NUM_THREADS` | `1` |
| `MKL_NUM_THREADS` | `1` |

Tạo khóa bằng lệnh `python -c "import secrets; print(secrets.token_hex(32))"`. Lưu khóa gọi ML và token đọc GitHub trong Environment của Render. [Render Environment Variables](https://render.com/docs/configure-environment-variables) · [Chọn phiên bản Python](https://render.com/docs/python-version).

Bấm **Deploy Web Service**. Khi live, mở URL dạng `https://sellens-ml.onrender.com/health/ready`. Kết quả dự kiến:

```json
{"status":"ready","model_version":"<version-của-bundle>","schema_version":"sellens-inference-v1"}
```

## 4. Nối backend đang chạy và redeploy frontend

1. Render → service **sellens-backend** → **Environment**.
2. Đặt `ML_SERVICE_URL` là URL gốc service ML, ví dụ `https://sellens-ml.onrender.com`. Backend tự gọi `/v1/infer`.
3. Đặt `ML_SERVICE_TOKEN` bằng đúng giá trị dùng ở service ML.
4. Chạy migration trong thư mục `backend` với `DATABASE_URL` trỏ đến đúng database của môi trường bạn sắp deploy.

   ```powershell
   cd backend
   npm ci
   npm run db:migrate
   ```

   Migration 006 đồng bộ hai trường ảnh và video cho database mới. Phần lưu kết quả ML dùng lại các bảng hiện có.
5. Chọn **Save, rebuild, and deploy** để backend nhận cấu hình và code mới. Giữ `DATABASE_URL` trỏ đến Neon đang dùng.
6. Deploy lại frontend Vercel từ nhánh có code mới. `BACKEND_API_URL` vẫn là URL của backend Next.js, ví dụ `https://sellens-backend.onrender.com/api/v1`. URL ML và token chỉ được cấu hình ở Render.

## 5. Kiểm thử từ file tới kết quả

Dùng một tài khoản **User** và một mã SKU mới. Tạo file `sellens-ml-test.csv` lưu UTF-8 từ ví dụ sau. Số liệu chỉ dùng để thử luồng UI. Khi đánh giá độ chính xác, dùng quan sát thật có nguồn gốc và kỳ ghi nhận rõ ràng.

```csv
sku,name,category,description,price,original_price,quantity_sold,rating_average,review_count,image_count,has_video,currency
SELLENS-DEMO-ML-001,Giày lười nam da mềm,Giày lười nam,Giày lười nam đế mềm thoáng khí,250000,300000,0,4.3,20,2,false,VND
```

1. **Danh mục sản phẩm → Import dữ liệu**. Chọn file. Kiểm tra bản xem trước báo đúng một dòng, rồi **Xác nhận nhập**.
2. Trong **Danh mục sản phẩm**, tìm `SELLENS-DEMO-ML-001`, bấm **Xem**, rồi **Chạy phân tích**.
3. Sau popup **Phân tích hoàn tất**, xem trạng thái, **Bằng chứng quan sát** và phiên bản model ở phần **Phạm vi & Giới hạn phân tích**. Nếu các quy tắc có đủ bằng chứng để đưa ra đề xuất, đề xuất sẽ xuất hiện trong kết quả và trang **Đề xuất cải thiện**.
4. Sửa `quantity_sold` thành `3` trong cùng file và import lại với cùng SKU để cập nhật. Bấm **Chạy phân tích** lần nữa. Kết quả cũ vẫn xem được qua biểu đồ. Nếu hai điểm sát nhau, dùng phím Tab để đến mốc cần xem, rồi nhấn Enter. Bảng bằng chứng của từng mốc dùng dữ liệu đã đóng băng ở lần chạy đó.
5. Thử thêm một SKU mới và để trống số bán. Kết quả có thể là **Chưa đủ dữ liệu**. Số bán trống vẫn là dữ liệu chưa biết, còn số `0` nghĩa là đã ghi nhận không bán được sản phẩm nào.

Luồng xử lý mỗi lần chạy một sản phẩm. File import dùng lại hạn mức hiện có của catalog. Model hỗ trợ phạm vi sản phẩm thời trang trong corpus và giá VND. Mã trùng ID có trong corpus huấn luyện (kể cả dạng `SP-...`) được chuyển sang luồng xem kết quả đã lưu để tránh diễn giải dự đoán của model đã thấy sản phẩm khi huấn luyện. Kết quả live dùng bundle thử nghiệm của nhóm, và giao diện đánh dấu cần rà soát. Giá trị tham chiếu không phải dự báo doanh số tương lai.

## Nếu gặp lỗi

| Hiện tượng | Kiểm tra |
| --- | --- |
| GitHub trả HTTP 401, 403 hoặc 404 | Kiểm tra repo dạng `owner/repo`, tag đã publish, token còn hạn và có quyền `Contents: read` đúng repo private. |
| Sai SHA-256 khi tải ZIP | Đối chiếu tên file đã đính kèm và mã SHA-256 của chính file ZIP trên máy. |
| Health check lỗi sau build | Xem log startup. Bundle, báo cáo và taxonomy/corpus phải cùng bộ. Kiểm tra phiên bản Python và thư viện hoặc giới hạn RAM. |
| **Dịch vụ phân tích ML chưa được cấu hình** | Kiểm tra backend đã redeploy với hai biến `ML_SERVICE_URL` và `ML_SERVICE_TOKEN`. |
| ML chưa sẵn sàng hoặc phản hồi quá lâu | Mở health check đến khi trả `ready`, rồi bấm lại. Backend chờ ML tối đa 30 giây và chỉ lưu sau khi nhận phản hồi hợp lệ. |
| ML báo phản hồi không hợp lệ | Kiểm tra token giống nhau ở hai dịch vụ, kiểm tra URL backend đang gọi và log ML cùng thời điểm. |
| **Chưa đủ dữ liệu** | Mở phần bằng chứng để xem lý do. Kiểm tra tên, danh mục, giá VND và số bán. Sản phẩm có thể thiếu nhóm tương đồng đủ tin cậy. |
| Sản phẩm không còn dữ liệu cũ sau khi sửa file | Dùng lại đúng SKU ở dòng import, rồi chọn đúng mốc trên biểu đồ. Catalog cập nhật theo SKU, mỗi lần phân tích lưu bản dữ liệu riêng. |
