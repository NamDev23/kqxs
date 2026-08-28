# Nghiên cứu dàn lô và tổ hợp xiên — 28/08/2026

## Quyết định production

Bản v7 giảm dàn lô 2 công khai từ 15 xuống 8 số. Engine vẫn giữ bảng xếp hạng 15 ứng viên để nghiên cứu, nhưng chỉ 8 số đầu được coi là lựa chọn chính. Đây là đánh đổi giữa precision và coverage, không phải cam kết tăng khả năng thắng trong tương lai.

Lệnh tái lập nghiên cứu trên file export không chứa thông tin kết nối database:

```bash
npm run model:pick-count -- /path/to/database-export.json
```

## Kiểm định số lượng mã

Kết quả trên 3 fold liên tiếp, mỗi fold 60 kỳ, kết thúc ngày 27/08/2026:

| Số mã | Precision ngoài mẫu | Lift so với baseline | Ngày có ít nhất 1 hit | Hit trung bình/ngày | Fold dương |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 26,22% | 1,11x | 78,33% | 1,31 | 3/3 |
| 8 | 25,83% | 1,09x | 93,33% | 2,07 | 3/3 |
| 10 | 25,28% | 1,07x | 96,67% | 2,53 | 2/3 |
| 12 | 25,00% | 1,05x | 98,89% | 3,00 | 2/3 |
| 15 | 24,96% | 1,05x | 100,00% | 3,74 | 3/3 |

5 số có precision cao nhất nhưng bỏ lỡ quá nhiều ngày; 15 số phủ ngày tốt nhất nhưng làm giảm precision và tăng số lượt chọn. 8 số được chọn làm cấu hình production vì vẫn dương ở cả 3 fold và giữ coverage trên 90%.

Riêng snapshot ngày 27/08, dàn 15 số trúng 6 số (`95, 61, 17, 34, 52, 94`), precision 40% so với baseline theo ngày 24%, lift thực tế 1,67x. Đây chỉ là một ngày và không được dùng riêng để kết luận mô hình đã có edge bền vững.

## Xiên 2, xiên 3 và xiên 4

v7 bổ sung mô hình `shrunk_cooccurrence_v1`:

1. Lấy tối đa 12 ứng viên lô 2 đã xếp hạng, thay vì ghép toàn bộ 100 số.
2. Đếm đồng xuất hiện trên 180 kỳ gần nhất.
3. Co xác suất quan sát về prior gồm baseline tổ hợp và xác suất biên của từng số; cường độ prior là 30 kỳ để hạn chế overfit.
4. Chấm lại bằng walk-forward tối đa 180 kỳ và so sánh với baseline tổ hợp thực tế từng ngày.
5. Chỉ được `watch` hoặc `qualified` khi vượt gate về số hit kỳ vọng, bootstrap và ổn định thời gian.

Kết quả hiện tại:

| Nhánh | Precision walk-forward | Baseline | Lift | Hit-day | Trạng thái |
| --- | ---: | ---: | ---: | ---: | --- |
| Xiên 2 | 6,667% | 5,468% | 1,22x | 46 | `watch` |
| Xiên 3 | 0,370% | 1,222% | 0,30x | mẫu yếu | `research_only` |
| Xiên 4 | 0,556% | 0,264% | 2,10x | 2 | `research_only` |

Xiên 4 có lift bề ngoài cao nhưng chỉ 2 ngày hit và chưa tới 1 hit kỳ vọng theo baseline, vì vậy tuyệt đối không được promote. Đây là ví dụ vì sao không nên xếp hạng chỉ bằng tần suất hoặc lift thô.

## Các nhánh đề, lô 3 và 3 càng

Các nhánh này đã có phương pháp và walk-forward từ các phiên bản trước; dữ liệu hiển thị yếu vì kết quả ngoài mẫu chưa chứng minh edge ổn định, không phải vì chưa được code. v7 tiếp tục giữ chúng ở `watch`/`research_only` theo evidence gate, thay vì thổi phồng xác suất từ mẫu hiếm.

## Theo dõi và học hàng ngày

- Snapshot lưu cả dàn xiên, method, profile, xác suất, baseline và trạng thái evidence tại thời điểm phát.
- Sau kết quả, pipeline tạo evaluation riêng cho `xien2`, `xien3`, `xien4`, lưu số dự đoán, số hit, precision và realized lift.
- Nhật ký API phân trang phía server; giao diện cho xem toàn bộ số, kết quả đối chiếu, xác suất ngoài mẫu và tỷ lệ thực tế.
- Snapshot cũ không bị viết lại. Chỉ snapshot phát trước giờ quay được dùng làm bằng chứng live canonical.

## Nguyên tắc ML

- Dùng rolling-origin evaluation cho chuỗi thời gian, không trộn dữ liệu tương lai vào quá khứ: [Forecasting: Principles and Practice — time-series cross-validation](https://otexts.com/fpp3/tscv.html).
- Xác suất phải được đánh giá calibration; mẫu nhỏ ưu tiên phương pháp ít linh hoạt hơn vì isotonic dễ overfit: [scikit-learn — Probability calibration](https://scikit-learn.org/stable/modules/calibration.html).
- Brier score là một proper scoring rule phù hợp để theo dõi chất lượng xác suất: [Brier, 1950](https://journals.ametsoc.org/doi/abs/10.1175/1520-0493%281950%29078%3C0001%3AVOFEIT%3E2.0.CO%3B2).

Không có mô hình nào bảo đảm dự đoán xổ số. Hệ thống tối ưu quy trình kiểm chứng, giảm chọn quá rộng và chủ động hạ cấp tín hiệu thiếu bằng chứng; không biến dao động ngẫu nhiên ngắn hạn thành tuyên bố thắng chắc.
