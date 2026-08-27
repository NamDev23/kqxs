# Phòng nghiên cứu xác suất XSMB

Dashboard nghiên cứu thống kê xổ số miền Bắc theo nguyên tắc có thể kiểm tra lại. Hệ thống không xem tần suất, “gan” hoặc chuỗi lặp là bằng chứng dự báo nếu walk-forward chưa vượt baseline với khoảng tin cậy đủ mạnh.

## Trạng thái hiện tại

- Dữ liệu: 435 kỳ hợp lệ, từ 14/06/2025 đến 26/08/2026.
- Bốn ngày không quay dịp Tết 2026 được khai báo riêng, không bị coi là lỗi crawl.
- Các ngày đồng bộ mới được yêu cầu khớp giữa `xoso.com.vn` và `minhngoc.net.vn`.
- Lõi đang dùng: `Product Walk-Forward Ensemble v6` với temporal stability gate.
- Hai snapshot live hợp lệ hiện có: dàn lô 2 hit 2/2 ngày; bạch thủ 0/2. Mẫu này chỉ để theo dõi, chưa đủ để chọn model.

Chi tiết công thức và kết quả audit nằm trong [CORE_AUDIT_2026-07-18.md](./CORE_AUDIT_2026-07-18.md).

## Nguyên tắc tính toán

1. Target ngày `t` chỉ được rank bằng kết quả có ngày nhỏ hơn `t`.
2. Đề là 2 số cuối giải đặc biệt; 3 càng là 3 số cuối giải đặc biệt.
3. Lô 2 lấy 2 số cuối toàn bộ 27 giải; lô 3 lấy 3 số cuối của 23 giải có ít nhất 3 chữ số.
4. Baseline được tính riêng theo không gian 100/1000 số và số giá trị duy nhất thực tế trong mỗi bảng giải.
5. Profile production được cố định trước backtest; không chọn profile thắng nhất trên một cửa sổ ngắn.
6. CI95 và xác suất edge dương dùng moving-block bootstrap có seed cố định.
7. Bản v6 yêu cầu edge dương ổn định trên 3 cửa sổ thời gian trước khi nâng tín hiệu.
8. Hệ thống được phép `ABSTAIN`: không có tín hiệu là một kết quả hợp lệ.

## Chạy dự án

Yêu cầu Node.js 20.9 trở lên và PostgreSQL đã khai báo trong `.env`.

```bash
npm install
npm run typecheck
npm test
npm run build
npm start
```

Mở `http://localhost:3000`.

## Dữ liệu và tự động hóa

```bash
# Chỉ lấy các ngày còn thiếu sau bản ghi mới nhất; yêu cầu hai nguồn khớp
npm run daily:sync

# Trước giờ quay: bảo đảm snapshot hôm nay tồn tại
# Sau giờ quay: lưu kết quả, đối chiếu snapshot và tạo snapshot ngày kế
npm run daily:update

# Chấm duy nhất snapshot canonical được phát trước giờ quay
npm run model:live

# So profile trên 3 fold 60 kỳ không chồng lấp
npm run model:stability

# Backfill bảng outcome sau khi nâng schema (idempotent)
npm run model:backfill

# Tổng hợp live theo method/profile/edge status và calibration
npm run model:outcomes

# Scheduler theo Asia/Ho_Chi_Minh: 18:45, retry 19:05, repair 05:30,
# review model 06:00 Chủ nhật
npm run cron
```

`docker compose` có hai service tách biệt: web và scheduler. Biến môi trường được đọc từ `.env`, không được đóng vào image nhờ `.dockerignore`.

Mỗi lần có kết quả, scheduler tự ghi `PredictionEvaluation` cho từng dàn/bạch thủ và tạo `model_monitor` trong `SystemLog`. Monitor chỉ đề nghị xem lại mô hình sau tối thiểu 30 ngày live; nó không tự chỉnh công thức bằng chính dữ liệu đang chấm.

Báo cáo Telegram hằng ngày và quy trình triển khai VPS miễn phí nằm trong [DEPLOY_FREE_VPS.md](./DEPLOY_FREE_VPS.md). Chính sách mặc định là `qualified`: dữ liệu cũ và nhánh chỉ dùng nghiên cứu sẽ không phát số.

## Kiểm tra bắt buộc trước khi phát hành

```bash
npm run data:audit
npm test
npm run typecheck
npm run build
npm audit
```

## Giới hạn

- 435 kỳ là đủ để kiểm tra lô 2/đề ở mức cơ bản, nhưng vẫn mỏng với biến cố 3 chữ số.
- Hai website đối chiếu là hai kênh công khai; cần tiếp tục kiểm tra với kết quả chính thức khi có nguồn máy đọc ổn định.
- Backtest tốt không chứng minh kết quả tương lai có thể dự đoán. Các kiểm định chỉ giúp bác bỏ tín hiệu yếu và phát hiện sai lệch dữ liệu/mô hình.
- Đây là công cụ nghiên cứu, không phải khuyến nghị tham gia lô đề hay cam kết lợi nhuận.
