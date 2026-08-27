# Core audit — 18/07/2026

## Kết luận điều hành

Phiên bản cũ có nền tảng walk-forward tốt nhưng vẫn có ba nguồn sai lệch quan trọng: dữ liệu chậm 31 ngày, profile được chọn từ cửa sổ 12–18 kỳ gây multiple testing/overfit, và nhãn “độ chính xác/xác suất” được dùng cho các đại lượng chưa hiệu chuẩn. Các điểm này đã được sửa trong v5.

Kết quả kiểm định hiện tại không chứng minh được lợi thế ổn định. Hệ thống đúng ra phải `ABSTAIN`, không cố tìm một “cầu” để phát. Lô 2 có điểm ước lượng nhỉnh hơn baseline nhưng CI95 vẫn cắt 0; đề thấp hơn baseline.

## Phát hiện và thay đổi

| Hạng mục | Trước v5 | Sau v5 |
|---|---|---|
| Độ mới dữ liệu | Dừng ở 16/06/2026 | 395 kỳ đến 17/07/2026; backfill 31/31 ngày |
| Xác minh nguồn | Nguồn `kqxsmb.co` hỏng, thường chỉ còn một nguồn | Parser `xoso.com.vn` + Minh Ngọc; chỉ auto-sync khi hai nguồn khớp |
| Chuẩn hóa số | Giá trị rỗng có thể bị pad thành `00000` | Sai độ dài bị loại, không tự biến thành số 0 |
| Chọn profile | Chọn tốt nhất trong 5 profile trên 12–18 kỳ | Profile cân bằng được đăng ký trước và cố định |
| Edge gate | Dựa chủ yếu vào lift và số hit | Mẫu tối thiểu + lift + moving-block bootstrap CI95 + P(edge > 0) |
| “Xác suất” | Ước lượng in-sample trên từng số | UI bỏ xác suất chưa hiệu chuẩn; chỉ hiển thị metric OOS theo nhánh |
| Dữ liệu chậm | Có cảnh báo nhưng UI vẫn có thể hiện dàn | `canPublish=false` khóa vùng tín hiệu |
| Scheduler | Gọi crawler/analyzer cũ khác lõi production | Một pipeline v5 idempotent, timezone Việt Nam, có retry/repair |
| Giao diện | Một trang dài, trộn tín hiệu và mô tả | Tách Tín hiệu / 00–99 / Kiểm định / Nhật ký |
| Bảo mật phụ thuộc | 10 advisory, gồm 7 high | `npm audit`: 0 advisory |

## Định nghĩa thị trường

- `de`: tập thực tế có đúng một giá trị, `special.slice(-2)`.
- `bacang`: tập thực tế có đúng một giá trị, `special.slice(-3)`.
- `lo2`: tập các đuôi 2 số duy nhất của toàn bộ 27 giải.
- `lo3`: tập các đuôi 3 số duy nhất của 23 giải có tối thiểu 3 chữ số; giải bảy 2 chữ số không được đưa vào.

Việc dùng `Set` là chủ ý: metric precision hỏi “một số đã chọn có xuất hiện trong ngày hay không”, không cộng thêm điểm khi cùng số lặp nhiều nháy.

## Baseline

Với dàn `k` số trong không gian `D` và một kết quả duy nhất:

```text
P(ít nhất một hit) = k / D
```

Do đó:

- đề 10 số: `10 / 100 = 10%`;
- bạch thủ đề: `1 / 100 = 1%`;
- 3 càng 5 số: `5 / 1000 = 0,5%`;
- bạch thủ 3 càng (nếu dùng): `1 / 1000 = 0,1%`.

Với lô 2/lô 3, metric chính là precision trung bình mỗi số. Baseline mỗi ngày là:

```text
baseline_t = số giá trị thực tế duy nhất trong ngày t / D
```

Cách này xử lý đúng việc các giải có thể trùng đuôi; dùng cố định 27/100 hoặc 23/1000 sẽ đánh giá baseline cao hơn thực tế.

## Walk-forward và khoảng tin cậy

Ở mỗi target `t`:

1. Cắt training tại `date < t`.
2. Rank toàn bộ 100 hoặc 1000 ứng viên bằng profile đã cố định.
3. Lấy đúng `k` số theo cấu hình.
4. Ghi `modelScore_t` và `baseline_t`.
5. Chỉ sau đó mới chuyển tới target kế tiếp.

Chuỗi `modelScore_t - baseline_t` được moving-block bootstrap theo block liên tục, circular sampling, seed xác định từ chính chuỗi. Cách này không giả định các ngày hoàn toàn IID và vẫn giữ snapshot tái lập được.

Một nhánh chỉ đạt “Đủ bằng chứng” khi đồng thời:

- mẫu đạt ngưỡng (120 kỳ cho 2 chữ số, 150 kỳ cho 3 chữ số);
- số hit kỳ vọng dưới baseline đủ dày;
- lift tối thiểu 1,05×;
- đủ số ngày hit quan sát;
- cận dưới CI95 của edge lớn hơn 0;
- bootstrap `P(edge > 0) >= 97,5%`.

## Kết quả v5 trên 180 target gần nhất

| Nhánh | Metric OOS | Baseline | Lift | CI95 edge (điểm %) | P(edge > 0) | Kết luận |
|---|---:|---:|---:|---:|---:|---|
| Đề 10 số | 6,11% | 10,00% | 0,61× | -6,67 → -1,11 | 0,06% | Chưa đủ bằng chứng |
| Lô 2 (15 số) | 24,70% | 23,82% | 1,04× | -0,35 → +2,10 | 91,75% | Tín hiệu yếu |
| Lô 3 (10 số) | 2,33% | 2,28% | 1,02× | -0,56 → +0,72 | 53,81% | Mẫu mỏng |
| 3 càng (5 số) | 0,56% | 0,50% | 1,11× | -0,50 → +1,17 | 64,50% | Mẫu mỏng |

Điểm gộp 8,43% so với nền gộp 9,15% chỉ là chỉ số mô tả giữa các metric khác đơn vị diễn giải; UI không gọi đây là “xác suất trúng”. Quyết định phải đọc theo từng nhánh.

## Tính năng thống kê thị trường đã đối chiếu

Các website thị trường thường cung cấp tần suất, gan cực đại, đầu/đuôi/tổng, thống kê 00–99 và cặp cùng về. Dashboard đã bổ sung các màn tương ứng nhưng phân tách rõ:

- mô tả: tần suất 7/30/90 kỳ, gan hiện tại/cực đại, đầu–đuôi–tổng, cặp đồng xuất hiện;
- kiểm định: baseline, lift, CI95, P(edge > 0), độ dày mẫu;
- quyết định: qualified / watch / research-only / locked.

Cặp số không còn xếp hạng chỉ bằng số lần cùng về. `pair lift = observed / expected`, trong đó kỳ vọng được tính từ tần suất biên của từng số; yêu cầu tối thiểu 5 ngày hỗ trợ.

## Kiểm tra đã chạy

- Structural audit: 395/395 bản ghi hợp lệ, 0 error, 0 warning.
- Hai nguồn: 31/31 ngày backfill khớp toàn bộ bảng giải.
- Product smoke: pass; kiểm tra định nghĩa đề/3 càng, publish gate, CI95, snapshot.
- TypeScript: pass.
- Next.js production build: pass.
- Production HTTP/API: trang 200, realtime API 200, input ngày sai trả 400.
- Dependency audit: 0 vulnerability được npm báo cáo.
- Scheduler: khởi động/dừng sạch với `node-cron` 4.6 và timezone Việt Nam.

## Giới hạn còn lại

1. Dữ liệu 3 chữ số vẫn mỏng. Không nên nới ngưỡng chỉ để tạo tín hiệu.
2. Nguồn crawl là hai website công khai, chưa phải API chính thức có chữ ký/provenance cấp bản ghi.
3. Cần vận hành scheduler liên tục (service riêng hoặc cron máy chủ); code đúng không thay thế hạ tầng chạy đúng giờ.
4. Chưa có enough live, pre-published snapshots để đánh giá drift theo nhiều tháng. Walk-forward là bằng chứng mô phỏng lịch sử, không thay thế live tracking.
5. Các file analyzer cũ vẫn nằm trong repo để tham chiếu, nhưng không còn được package scripts/scheduler gọi.

## Nguyên tắc nghiên cứu

Thống kê có thể phát hiện độ lệch, lỗi nguồn hoặc pattern đáng kiểm tra; nó không thể chứng minh một cơ chế ngẫu nhiên trở nên dự đoán được. NIST cũng lưu ý rằng không một bộ kiểm định thống kê nào có thể tự chứng nhận một bộ sinh là phù hợp hoặc an toàn; trong dự án này, kết luận tương ứng là: vượt một backtest không đủ để cam kết kỳ tiếp theo.
