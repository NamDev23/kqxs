# V9 — kiểm soát phát tín hiệu, không công bố cải thiện tỷ lệ trúng

## Phạm vi

- Giữ nguyên thuật toán xếp hạng `official_reward_aware_v1` và số lựa chọn 3/3/3/1/1; không dùng kết quả ngày 02/09 để chọn lại tham số.
- Thêm chính sách `forward_evidence_v1`. Không sửa hoặc backfill snapshot cũ thành dự đoán trước quay.
- API `publication` là hợp đồng duy nhất cho tín hiệu hiện hành. `prediction`, `sets`, `singles` và nhãn backtest cũ chỉ phục vụ nghiên cứu/tương thích, không phải khuyến nghị.
- Tab Tín hiệu không hiển thị dàn dự phòng. Telegram dùng cùng bộ kiểm tra với API.
- Không phát số khi thiếu dữ liệu, thiếu chính sách/evidence, hoặc snapshot được tạo từ 18:15 Việt Nam trở đi cho target đó.
- ROI là mô phỏng cùng mệnh giá, không phải tiền người dùng đã giao dịch. Không có lựa chọn: ROI `null`, không phải 0% hoặc -100%.

## Điều kiện kiểm định

1. Backtest 180 kỳ, tối thiểu 8 lựa chọn có thưởng, ROI tổng và gần nhất dương, ít nhất 2/3 fold dương, cận dưới net dương.
   Đồng thời phải vượt nền chọn đều cùng số vé, cận dưới chênh lệch net dương và còn lãi sau khi bỏ kỳ tốt nhất.
2. Tối thiểu 30 ngày nghiên cứu đã chốt trước quay của **cùng chiến lược**; mỗi ngày lấy snapshot hợp lệ sớm nhất, không lấy bản sửa thắng hơn.
3. Theo dõi có ít nhất 8 ngày có thưởng, ROI tổng/30 quan sát gần nhất dương; còn lãi khi bỏ ngày tốt nhất.
   Phải có snapshot đã đối chiếu cho ngày kết quả mới nhất; không dùng chuỗi bằng chứng cũ thiếu các kỳ gần đây để mở tín hiệu.
4. Khoảng bootstrap theo block 99% mỗi sản phẩm, 4.000 lần, seed cố định; cận dưới net dương. Đây là xấp xỉ dựa trên chuỗi quan sát, không bảo đảm mức sai số khi phân phối đổi hoặc liên tục kiểm tra lại.
5. Phát nguyên dàn cố định đã đánh giá; không lọc riêng `expectedNet > 0` để tạo một chính sách chưa kiểm định. Điểm expectedGross/expectedNet là ước lượng xếp hạng, không phải xác suất hiệu chuẩn.

30 ngày chỉ là điều kiện tối thiểu, không phải bằng chứng đủ. ROI và số ngày có thưởng không đồng nghĩa xác suất thắng ngày mai. Bản này chưa có kiểm định tiền cứu chứng minh **chính sách phát v9** sinh lợi; thống kê live của dàn nghiên cứu không được đổi tên thành thành tích danh mục đã phát. Sửa ranking/count/profile phải tăng strategy version và bắt đầu chuỗi bằng chứng tương ứng. Không tự tối ưu công thức theo chuỗi thua ngắn.

## Kiểm tra trước deploy

```sh
npm run test:publication
npm run test:telegram
npm run typecheck
npm run build
# Nếu môi trường Mac chặn cổng nội bộ Turbopack:
npm run build -- --webpack
# Export read-only từ /api/history?days=730, rồi:
npm run test:replay -- /absolute/path/history.json
# Trong môi trường có DB production, chạy read-only:
npm run data:audit
npm test
npm run test:production-gate
```

Kiểm thử replay dùng dữ liệu kết quả thực và kiểm tra target-result không ảnh hưởng dự đoán. Các fixture thắng trong unit test là dữ liệu tổng hợp để kiểm tra nhánh code, tuyệt đối không dùng làm số liệu thành tích.

## Triển khai và rollback

- Không đổi schema; không xóa dữ liệu, volume hoặc snapshot.
- Chỉ triển khai sau khi được duyệt. Ghi lại commit và image đang chạy, backup DB theo quy trình hiện tại.
- Build image mới trước khi thay container. Chạy unit test và audit DB bằng image scheduler mới, không chạy `daily:update` để thử vì lệnh đó ghi dữ liệu/gửi Telegram.
- Sau triển khai: healthcheck web/DB, trạng thái scheduler; gọi API kiểm tra `meta.method`, `publication.policy`, `publication.status`. Thiếu evidence phải trả danh sách sản phẩm rỗng.
- Kiểm tra UI desktop/mobile: tab Tín hiệu không lộ dàn nghiên cứu; tab Kiểm định vẫn truy xuất được lịch sử.
- Nếu lỗi: khôi phục image/commit trước đó; không rollback bằng cách sửa dự đoán hoặc kết quả lịch sử. V8 có thiếu sót cổng phát đã biết nên ưu tiên tạm dừng phát tín hiệu nếu phải rollback.

## Cơ sở và giới hạn phương pháp

- Giữ trật tự thời gian để tránh học từ tương lai: [TimeSeriesSplit, tài liệu scikit-learn](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html).
- Không đọc điểm rank thành xác suất: xác suất cần đánh giá độ hiệu chuẩn trên dữ liệu độc lập; [Probability calibration, scikit-learn](https://scikit-learn.org/stable/modules/calibration.html).
- Các nguồn trên là nguyên tắc đánh giá mô hình; không chứng minh khả năng dự báo xổ số hoặc sinh lợi của dự án.

## Nghiên cứu ngày 06/09/2026

Đọc trực tiếp 445 kết quả production đến 05/09. Audit cấu trúc trên VPS: 0 dòng lỗi, 0 cảnh báo. V8 có 4 ngày chốt trước quay (02–05/09): 44 lựa chọn nghiên cứu, không có thưởng, ROI mô phỏng -100%. Kiểm tra cấu trúc không chứng minh mọi giá trị lịch sử đúng nguồn; không thay đổi dữ liệu trong đợt phát hành này.

Backtest theo thời gian trên 180 kỳ gần nhất, luôn rank bằng dữ liệu đứng trước target:

| Nhánh | ROI dàn hiện tại | Nền chọn đều cùng chi phí | Net sau bỏ kỳ tốt nhất |
|---|---:|---:|---:|
| Lô tô 2 chính thức | -47,04% | -29,00% | -321 |
| Lô tô 3 chính thức | +60,19% | -50,00% | -92 |
| Xiên 2 | -16,85% | -40,09% | -109 |
| Xiên 3 | -38,89% | -37,29% | -114 |
| Xiên 4 | -83,33% | -62,95% | -164 |

Nền được tính bằng trung bình trả thưởng trên toàn bộ lựa chọn hợp lệ ứng với từng bảng kết quả, cùng số vé. Không giả định các giải hoặc các tổ hợp độc lập để tính ROI nền. Net tính bằng đơn vị mệnh giá. Đây là so sánh hồi cứu, không phải ROI người dùng thực nhận.

Phương án `pairs_max_exposure_2_v1` giữ 3 cặp xiên 2, dùng cùng bảng xếp hạng ứng viên nhưng mỗi số nằm trong tối đa 2 tổ hợp. ROI -16,11%, tăng 0,74 điểm %, số ngày có thưởng 55 so với 51 của dàn gốc; chuỗi lỗ dài nhất lại tăng từ 14 lên 17 kỳ. Khoảng bootstrap 99% chênh lệch net/kỳ [-0,46; 0,53] còn cắt 0. Chưa đủ chứng minh tốt hơn; chỉ lưu `challengerPicks` trong snapshot mới và theo dõi trước quay riêng, không tự thay mô hình chính hay lấy lại thành tích v8. Giá trị điểm và xác suất hiển thị ở các dàn nghiên cứu cũ vẫn chưa phải xác suất đã hiệu chuẩn.

Quy trình chọn mô hình cần tránh vừa chọn vừa đánh giá trên cùng dữ liệu: [tài liệu scikit-learn về selection bias](https://scikit-learn.org/stable/auto_examples/model_selection/plot_nested_cross_validation_iris.html). Không điều chỉnh ngưỡng hoặc đổi số đếm sau khi xem kết quả để ép phương án mới vượt kiểm định.
