# Nghiên cứu nâng độ tin cậy mô hình — 27/08/2026

## Kết luận

Không có bằng chứng đáng tin rằng đổi ngay sang một profile khác sẽ tăng tỷ lệ tương lai. Bản v6 vì vậy cải thiện **độ chính xác có điều kiện**: chỉ nâng tín hiệu lên `watch`/`qualified` khi edge vượt baseline trên bootstrap và ổn định qua nhiều lát thời gian. Khi không đủ bằng chứng, hệ thống chủ động không phát.

Việc tăng số lượng số trong dàn có thể làm hit-rate theo ngày cao hơn một cách cơ học, nhưng cũng làm baseline và chi phí tăng theo. Dự án tiếp tục dùng precision/lift so với baseline làm tiêu chí chính, không tối ưu riêng hit-rate.

## Dữ liệu live

Chỉ snapshot tạo trước 18:15 Asia/Ho_Chi_Minh mới được chấm. Tính đến 26/08 có 2 ngày hợp lệ:

- Dàn lô 2: hit 2/2 ngày, 6 hit / 30 lượt chọn, precision 20%.
- Đề, lô 3, 3 càng: 0/2 ngày.
- Bạch thủ lô và bạch thủ đề: 0/2 ngày.

Hai quan sát không đủ để ước lượng tỷ lệ thật hoặc chọn lại model. Lệnh tái tạo báo cáo: `npm run model:live`.

## Kiểm định nhiều lát thời gian

`npm run model:stability` đánh giá 3 fold 60 kỳ không chồng lấp:

| Nhánh | Production | Kết quả chính |
| --- | --- | --- |
| Đề | balanced | Lift gộp 0,83; chỉ 1/3 fold dương — không phát mạnh |
| Lô 2 | balanced | Lift gộp 1,05; 3/3 fold dương |
| Lô 3 | balanced | Lift gộp 1,08; chỉ 1/3 fold dương — tiếp tục research |
| 3 càng | balanced | Quá ít hit, không đủ mẫu |

`stable_frequency` đạt lift 1,06 cho lô 2, chỉ hơn production khoảng 0,01 và chưa đạt ngưỡng promotion. `anti_repeat` tốt hơn cho lô 3 ở 2 fold gần nhưng fold đầu vẫn dưới baseline. Không challenger nào được promote.

## Thay đổi trong v6

1. Thêm temporal stability gate: đánh giá tối đa 3 cửa sổ gần nhất, mỗi cửa sổ 60 kỳ (30 kỳ khi backtest ngắn).
2. `qualified` yêu cầu ít nhất 2/3 cửa sổ dương và cửa sổ mới nhất dương, ngoài CI95/bootstrap hiện có.
3. `watch` cũng yêu cầu 2/3 cửa sổ không mâu thuẫn và cửa sổ mới nhất không âm.
4. Thêm challenger `robust_consensus`, xác định bằng trung bình số học của các expert đã đăng ký trước; challenger không tự động trở thành production.
5. Thêm báo cáo live canonical và báo cáo stability nhiều fold.
6. Thêm `PredictionEvaluation`: lưu outcome theo snapshot × nhánh cùng method/profile/edge status, probability, baseline, realized lift và temporal stability tại thời điểm phát.
7. Daily pipeline tự tạo `model_monitor`; dưới 30 ngày là `collecting`, sau đó nhánh dưới baseline được đánh dấu `review_model`.

## Cơ sở phương pháp

- Selective classification mô tả trực tiếp đánh đổi coverage–accuracy: giảm số lần phát để giảm rủi ro có điều kiện. Nguồn: [El-Yaniv & Wiener, JMLR 2010](https://www.jmlr.org/papers/v11/el-yaniv10a.html).
- Xác suất dự báo cần khớp với tần suất quan sát, và việc đánh giá calibration có nhiều bẫy diễn giải. Nguồn: [Vaicenavicius et al., AISTATS 2019](https://proceedings.mlr.press/v89/vaicenavicius19a.html).
- Aggregation nhiều expert là một hướng hợp lệ, nhưng phải đo ngoài mẫu thay vì chọn expert thắng trên cùng dữ liệu. Nguồn: [Trunov & V’yugin, PMLR 2023](https://proceedings.mlr.press/v204/trunov23a.html).
- Thử nhiều cấu hình trên cùng backtest tạo nguy cơ overfitting và làm hiệu suất tương lai thấp hơn báo cáo. Nguồn: [Carr & López de Prado, 2014](https://arxiv.org/abs/1408.1159).

## Điều kiện promotion

Challenger chỉ được cân nhắc khi đồng thời:

- mọi fold độc lập có lift tối thiểu 1,00;
- lift gộp hơn production ít nhất 0,03;
- không dùng kết quả live sau giờ quay để chọn tham số;
- tiếp tục thắng trên tối thiểu 30 snapshot live canonical.

Không có phương pháp thống kê nào bảo đảm dự đoán đúng xổ số. Mục tiêu của các gate là loại bỏ tín hiệu yếu và ngăn hệ thống tự đánh lừa bởi may mắn ngắn hạn.
