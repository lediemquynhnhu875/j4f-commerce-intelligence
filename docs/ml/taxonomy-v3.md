# Taxonomy v3: ưu tiên danh từ chính trong tên sản phẩm

Ngày 2026-11-25 (Asia/Saigon). v3 nâng độ chính xác trên holdout khoá từ **63,0% lên 70,7%** (212/300). Trên mẫu ngẫu nhiên 300, v3 đạt **86,0%**, vượt ngưỡng 85% (xem mục Kết quả gate). Số liệu đầy đủ nằm ở [taxonomy_v3.json](../../ml/reports/metrics/taxonomy_v3.json).

## Kết quả gate: mẫu ngẫu nhiên 300 (25/11)

| | v2 | v3 |
| --- | --- | --- |
| Mẫu ngẫu nhiên 300 (người gán mù) | 82,0% | **86,0%** (258/300) |

**v3 đạt ngưỡng 85%** theo quyết định của nhóm là đo trên mẫu đại diện cho toàn bộ dữ liệu, nên `quality_acceptance=true`. Khoảng tin cậy 95% là 81,6–89,5%, vẫn chứa các giá trị dưới 85%; thêm nhãn sẽ thu hẹp khoảng này. Theo nguồn rule trên mẫu: theo tên 92,0% (200 dòng), gán giới tính 81,9% (72), danh mục 54,5% (11), không khớp rule 38,5% (13).

## Holdout gán lại theo bộ nhãn v2 (bài kiểm tra khó)

| | v2 | v3 |
| --- | --- | --- |
| Holdout gán lại (300 dòng, người gán mù) | 66,3% | **74,3%** (223/300) |

Ngưỡng 85% vẫn chưa đạt. Nhãn mới trùng 81,3% với nhãn v1 cũ. Theo nguồn rule trên holdout: theo tên 79,5% (161 dòng), gán giới tính 81,9% (83), danh mục 47,1% (17), không khớp rule 31,0% (29).

Sau lần chấm này, mọi thử nghiệm chỉ chạy trên dev:

- **Model phân loại văn bản cho các nguồn yếu:** TF-IDF + LinearSVC, học từ 35.866 dòng rule theo tên cộng nhãn dev. Cross-validation 5 fold trên 1.042 dòng dev cho tốt nhất 86,8%, so với 86,5% khi chỉ dùng rule. Không áp dụng.
- **Rà lỗi còn lại trên dev:** lỗi rải rác, mỗi cặp nhầm lẫn tối đa 2 dòng. Không còn sửa được bằng rule một cách tổng quát.

## Chạy lại pipeline trên v3 (thử nghiệm, 25/11)

Lệnh `python3 -m ml.src.evaluation.rerun_taxonomy_v3` dùng cùng file đầu vào với lần chạy v2 (SHA-256 `04d76202…`). Kết quả ghi ra `data/processed/taxonomy_v3_run/` và `ml/artifacts/taxonomy_v3_run/` (đều bị ignore), số liệu ở [taxonomy_v3_run.json](../../ml/reports/metrics/taxonomy_v3_run.json). Web và bundle serving vẫn dùng v2.

| Chỉ số | v2 | v3 |
| --- | --- | --- |
| Model A ROC-AUC | 0,700 | 0,697 |
| Model A RMSLE | 1,361 | 1,330 |
| Baseline ROC-AUC / RMSLE | 0,655 / 1,521 | 0,653 / 1,513 |
| Sản phẩm có nhóm tương đồng đủ tin cậy | 37.274 | 37.514 |
| Trạng thái chưa đủ dữ liệu | 5.128 | 6.480 (3.096 là `out_of_scope`) |
| Sản phẩm có đề xuất / tổng đề xuất | 27.696 / 42.652 | 26.601 / 41.208 |
| Đề xuất bổ sung video | 3.857 | 3.747 (622 mới, 732 bị bỏ) |

Model A gần như không đổi: ROC-AUC giảm 0,003 (nằm trong ngưỡng 0,01 của thiết kế tự học lại), RMSLE tốt hơn. Nhóm tương đồng gọn hơn: số sản phẩm bị loại vì độ giống thấp giảm từ 3.339 xuống 2.652. Hàng ngoài phạm vi không còn bị chấm như hàng thời trang. Cột v2 của trạng thái và đề xuất là `scoring_mvp_v2` (bản web đang dùng, cùng rule `rule-based-v2-good-peer-video`). Bản nháp trước so nhầm với lần chạy v2 cũ dùng rule đời trước (969 đề xuất video). Đề xuất video thực tế giảm 110; 80 dòng mẫu của các nhóm thay đổi nằm ở `data/local_reviews/video_recommendation_review/` để người kiểm tra.

## Gói deploy v3 (25/11)

Nhóm chọn giữ v3 và deploy. Gói dùng cùng backend scikit-learn với bản đang chạy, để thay đổi chỉ nằm ở taxonomy.

| Mục | Giá trị |
| --- | --- |
| File | `ml/artifacts/sellens-ml-v3.zip` (bị ignore, 5,1 MB) |
| SHA-256 | `1d5be95fdd6a5a42acc3b33ccab90706490b05742f361f6053b6c2566466b574` |
| `model_version` | `j4f-20261124T183412Z` |
| Python | 3.13.13 (scikit-learn 1.9.0, pandas 3.0.3) |
| Taxonomy trong gói | `ml/config/taxonomy_v3.yml` (`v3-head-noun`) |
| Dữ liệu huấn luyện | `data/processed/taxonomy_v3_run_sklearn/`, artifact `ml/artifacts/taxonomy_v3_run_sklearn/` |

So sánh Model A cùng backend scikit-learn: v2 có ROC-AUC 0,7004 / RMSLE 1,3614, v3 có 0,6954 / 1,3638. Ảnh hưởng của taxonomy nằm trong ngưỡng 0,01 / 0,02 của thiết kế tự học lại. Lần chạy đầu trên v3 dùng LightGBM (0,6974 / 1,3297) vì máy có cài LightGBM. Phần RMSLE tốt hơn ở đó đến từ backend, không phải từ taxonomy. Gói LightGBM được giữ ở `ml/artifacts/sellens-ml-v3-lightgbm.zip` để thử riêng, vì nó cần thêm OpenMP trên Render.

`assets pack` giờ nhận `--taxonomy`; mặc định vẫn là v2. Bản trước đóng gói cứng `taxonomy_v2.yml`, nên với corpus v3 thì service sẽ từ chối khởi động.

Kiểm tra trên máy: giải nén có kiểm SHA, FastAPI sẵn sàng sau 1,4 giây, `/v1/infer` trả 200 cho 5 sản phẩm thử, mỗi lần 0,04–0,1 giây, đều dùng `v3-head-noun`. 51 test ML pass, gồm cả test serving.

Bước deploy (theo [hướng dẫn Render](trien-khai-ml-render.md), mục 2–3):

1. Repo private `sellens-ml-assets` → tạo Release với tag mới `v3`, đính kèm `sellens-ml-v3.zip`.
2. Render → `sellens-ml` → Environment: `ML_ASSET_GITHUB_TAG=v3`, `ML_ASSET_GITHUB_FILE=sellens-ml-v3.zip`, `ML_ASSET_SHA256=` SHA ở trên, `PYTHON_VERSION=3.13.13`. Lưu và deploy lại.
3. Mở `/health/ready` và kiểm tra `model_version` là `j4f-20261124T183412Z`.
4. Quay về bản cũ: đặt lại tag, tên file và SHA của bản v2 rồi deploy lại.

## Kiểm tra đề xuất video (25/11)

Người kiểm tra đã xem 80 dòng mẫu trong `data/local_reviews/video_recommendation_review/`:

| Nhóm | Đúng | Không chắc | Sai |
| --- | --- | --- | --- |
| Mới ở v3 (40) | 26 | 12 | 2 |
| Bị bỏ ở v3 (25, "đúng" = bỏ là hợp lý) | 23 | 2 | 0 |
| Giữ nguyên (15) | 14 | 1 | 0 |

Các đề xuất bị bỏ hầu hết được bỏ đúng. Ở nhóm mới, hai lỗi đều do taxonomy làm lệch nhóm tương đồng:

- "Khăn giấy lau giày shoes sneaker" bị gán là giày thể thao, nên giày Converse có peer là đồ vệ sinh giày.
- "Trâm hoa cài tóc" bị từ khoá v3 "hoa cài" gán thành phụ kiện cài áo.

Lý do "không chắc" phổ biến nhất (8 dòng) là peer gần trùng tên, tức nhiều biến thể của cùng một listing được tính như nhiều sản phẩm độc lập. Lỗi này có từ trước v3. Một số dòng khác có tỷ lệ sát ngưỡng 40% (3/7).

Hạn chế của file kiểm tra: nhóm "Bị bỏ ở v3" chỉ hiện peer của v2, chưa hiện peer của v3.

Việc đề xuất cho bản v3.1, cần đo lại trên mẫu ngẫu nhiên sau khi sửa:

1. Thêm "khăn giấy lau", "khăn lau" vào danh sách đầu tên phụ kiện giày; "hoa cài tóc" và "trâm" vào phụ kiện tóc.
2. Khi đếm peer bán tốt cho rule video, gộp các listing gần trùng tên (cùng seller hoặc tên chuẩn hoá giống nhau).

## Đo ngưỡng 85% trên mẫu ngẫu nhiên

Nhóm chốt ngày 25/11: ngưỡng 85% được đo trên **mẫu ngẫu nhiên đều**, đại diện cho toàn bộ 41.576 sản phẩm. Holdout hiện tại giữ vai trò bài kiểm tra khó và vẫn được báo cáo kèm. File mẫu là `data/local_reviews/taxonomy_random_300/taxonomy_random_300.xlsx`: 300 dòng, seed 20261125, loại 1.343 ID đã từng gán nhãn. Gán mù xong thì chấm:

```bash
python3 -m ml.src.evaluation.holdout_relabel --workbook data/local_reviews/taxonomy_random_300/taxonomy_random_300.xlsx --output ml/reports/metrics/taxonomy_v3_random_300.json
```

## Kết quả các vòng trước

| Tập đánh giá | Số dòng | v2 | v3 | Ghi chú |
| --- | --- | --- | --- | --- |
| Holdout khoá (người gán mù) | 300 | 63,0% | **70,7%** | Chấm sau khi khoá cấu hình, không chỉnh gì sau khi xem kết quả. Sửa đúng 26 dòng, làm sai 3 dòng |
| Dev cũ (người / người xác nhận) | 742 | 81,1% | 85,4% | 3 dòng có nhãn cũ trái với quy ước mới |
| Dev round 4 (AI gán, đã được xác nhận) | 300 | 61,7% | 89,0% | Rule được chỉnh trên lỗi của tập này, nên con số v3 lạc quan |

Holdout là bài kiểm tra khó, không phải mẫu ngẫu nhiên: 1/3 lấy từ ca fallback v1, 2/3 chia đều theo nhãn × nguồn rule (`create_taxonomy_holdout`). Vì vậy độ chính xác trên toàn bộ dữ liệu sẽ cao hơn con số holdout.

Con số 70,7% là của v3 **trước** khi chốt quy ước ngày 25/11. Holdout hiện tại dùng bộ nhãn v1 nên không chấm lại; nhóm đang gán lại nó theo bộ nhãn v2 (xem cuối trang).

## Quy ước nhãn đã chốt (25/11)

Các quy ước này được ghi trong `ml/config/taxonomy_label_guide_v3.yml`, mục `conventions`, và đã được cài vào rule v3:

- Giới tính lấy theo thứ tự: tên sản phẩm, rồi mô tả, rồi danh mục của người bán. Không bao giờ lấy từ file nguồn.
- Tên có "nam nữ" hoặc "unisex": dùng nhãn unisex nếu có, nếu không thì dùng nhãn "khác". Không có giới tính ở đâu cả: dùng nhãn "khác".
- Dép có quai hậu là sandal. Đế xuồng luôn được ưu tiên.

Có 7 nhãn round 4 được chuyển sang nhãn có giới tính theo quy ước này; lý do nằm ở cột `convention_update`.

**Lỗi pandas 3:** từ pandas 3, cột text đọc từ CSV dùng engine regex RE2, trong đó `\b` chỉ hiểu chữ ASCII. Vì vậy `\bnữ\b` không khớp trên cột danh mục. v3 bật `python_regex`, làm đổi 112 dòng trong toàn bộ dữ liệu. v2 dùng `(?:^|\W)` cho danh mục nên hầu như không bị ảnh hưởng.

## Cách làm

1. **Tạo tập dev mới giống holdout.** Tập này dùng đúng thiết kế lấy mẫu của holdout, với seed 9101/9102/9103, và loại hết 1.043 ID đã có nhãn. v2 đạt 63,0% trên tập này, khớp với holdout, nên nó là tập thay thế đáng tin để sửa rule.
2. **Gán nhãn mù 300 dòng theo `taxonomy_label_guide_v2.yml`.** Người gán không nhìn dự đoán và không suy giới tính từ file nguồn. Bốn dòng "dép … đế xuồng" được chỉnh theo quy ước của người trong dev cũ (đế xuồng luôn thắng). File nằm ở `data/local_reviews/taxonomy_round_4/` (bị ignore). Các nhãn này cần người xác nhận.
3. **Phân loại 115 lỗi thành nhóm cơ chế, rồi sửa theo cơ chế.** Mỗi thay đổi đều được kiểm tra lại trên 742 nhãn dev cũ để tránh làm sai thêm.
4. **Khoá cấu hình, rồi chấm holdout.** Chỉ lấy số tổng hợp, không xem lỗi từng dòng của holdout. Lần chấm đầu đọc nhầm file dự đoán cũ (trước đợt sửa nhỏ cuối, vốn làm xong trước khi xem kết quả). Chấm lại với cấu hình đã khoá vẫn ra 212/300, vì đợt sửa đó không đổi dòng nào trong holdout.

## Thay đổi chính

Toàn bộ hành vi mới nằm dưới khoá `v3` trong cấu hình. Cấu hình v2 vẫn cho kết quả như cũ, và đã có test kiểm chứng.

| Cơ chế | Lỗi được sửa |
| --- | --- |
| Danh từ chính: từ khoá khớp sớm nhất trong tên thắng (`out_of_scope` và `giày đế xuồng` luôn thắng) | "Mũ len kèm găng tay", "Nón … có khẩu trang", "Băng đô turban", "Túi tote … đựng laptop" |
| Đầu tên là phụ kiện thì không gán họ giày | "Cục gôm tẩy cho giày", "Miếng lót sau giày" |
| Họ giày theo từ xuất hiện sớm nhất; thêm Chelsea/Chukka vào boots; "dép sandal" tính là sandal | "Dép xỏ ngón … sandal" |
| Giày nữ/khác có dấu hiệu gót (≥ 4 phân, gót trụ/nhọn, cô dâu) thì gán giày cao gót | "Giày nữ da bò 5 phân" |
| Giới tính ví/túi chỉ lấy từ tên, có xét "nam nữ", "nam lẫn nữ", "phái mạnh" | "Bóp đựng tiền nam", "Túi xách nam nữ" |
| Bỏ "Việt Nam", "Hà Nam" khỏi bước suy giới tính | "Giày nữ … hàng Việt Nam" từng không được tính là nữ |
| Danh mục của nhóm hàng chính chỉ được dùng khi tên có danh từ thời trang | Kim khâu len trong danh mục "Giày búp bê" |
| Dòng không khớp rule nào thì gán `out_of_scope` thay cho fallback theo file nguồn | Gán `out_of_scope` đúng 34/72 dòng dev, fallback theo nguồn chỉ đúng 6/72 |
| Từ khoá mới: bóp, dây lưng, kẹp…tóc, phụ kiện kính, túi zip du lịch, cặp công sở | Các ca fallback có tên rõ ràng |

## Hạn chế

- **Lệch bộ nhãn.** Holdout được gán bằng bộ nhãn v1 (54 nhãn). 11 lỗi của v3 là dự đoán nhãn mà người gán không thể chọn, như "sandal khác" hay "giày khác". Nếu tính cả phần này, mức trần là 74,3%.
- **Quy ước giới tính có thể khác.** Bước gán giới tính chỉ đạt 67,1% trên holdout, so với 94% trên dev round 4. Nhiều khả năng người gán holdout suy giới tính từ file nguồn hoặc danh mục, trong khi hướng dẫn v2 cấm điều này.
- Danh mục (33%) và mặc định `out_of_scope` (34,5%) vẫn yếu trên holdout.
- Còn tồn tại: "Túi đeo chéo …, túi đeo hông" vẫn ra túi bao tử, vì hai từ khoá cùng khớp ở đầu tên và thứ tự rule cũ quyết định.
- **Chưa chạy lại** peers, model, scoring, cũng chưa đóng gói lại bundle serving trên v3. Kết quả web hiện tại vẫn dùng v2.

## Gán lại holdout theo bộ nhãn v2

1. Mở `data/local_reviews/taxonomy_holdout_v2_relabel/taxonomy_holdout_relabel_v2.xlsx`. File chỉ có thông tin sản phẩm, không có dự đoán hay nhãn cũ.
2. Ở sheet `Gan nhan`, chọn nhãn trong cột `human_product_type_v2` (có danh sách chọn), theo sheet `Nhan` và `Quy uoc`.
3. Chấm điểm bằng lệnh dưới đây. Chỉ đọc số tổng hợp, không chỉnh rule theo lỗi từng dòng.

```bash
python3 -m ml.src.evaluation.holdout_relabel --taxonomy ml/config/taxonomy_v3.yml --output ml/reports/metrics/taxonomy_v3_holdout_v2.json
```

## Việc nhóm cần quyết định

1. Quy ước nhãn và việc xác nhận 300 nhãn round 4 đã xong (25/11). Còn lại: gán lại holdout như mục trên.
2. Nếu chấp nhận v3, chạy lại các bước sau và cập nhật bundle serving:

```bash
python3 -m ml.src.taxonomy.build_v3          # sinh lại ml/config/taxonomy_v3.yml
python3 -m ml.src.cli prepare --taxonomy ml/config/taxonomy_v3.yml
python3 -m ml.src.cli peers && python3 -m ml.src.cli train && python3 -m ml.src.cli score
```

Gate 85% trong pipeline thường vẫn giữ nguyên. Không được sửa nhãn holdout để đạt ngưỡng.
