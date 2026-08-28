# Đối chiếu sản phẩm Lô tô hợp pháp — 29/08/2026

## Nguồn được chấp nhận

- Văn bản hợp nhất hướng dẫn hoạt động kinh doanh xổ số của Bộ Tài chính: <https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/7/13-vbhn-btc.pdf>
- Cơ cấu giải thưởng do Công ty TNHH MTV Xổ số Kiến thiết Thủ đô công bố: <https://xosothudo.com.vn/xstd/loai-hinh-xo-so/99/267/xo-so-lo-to.html>
- Thông tin Lô tô điện toán 2/3/5 số, cập nhật 18/11/2025: <https://xosothudo.com.vn/tin/xo-so-dien-toan/7405/xo-so-dien-toan-lo-to-2%2C-3%2C-5-so.html>

Không sử dụng bảng “giá điểm” của nhà cái, diễn đàn hoặc trang tổng hợp làm dữ liệu chính thức.

## Cơ cấu dùng trong settlement engine

Mọi mức bên dưới là số lần mệnh giá vé và là tổng tiền thưởng, không phải odds tự đặt.

### Lô tô 2 số

- Trùng 2 số cuối giải Đặc biệt: 70 lần.
- Trùng 2 số cuối giải Nhất: 1 lần.
- Trùng cả hai: 71 lần.

### Lô tô 3 số

- Trùng 3 số cuối giải Đặc biệt: 420 lần.
- Trùng 3 số cuối giải Nhất: 20 lần.
- Khuyến khích trùng 2 số cuối giải Đặc biệt: 5 lần, áp dụng khi không trúng đủ 3 số ĐB.
- Trùng một trong ba lần quay giải Sáu: 5 lần.
- Các trường hợp đồng thời được cộng theo bảng công bố, tối đa 445 lần.

### Lô tô cặp số

- 2 cặp: 10 lần; cả hai cặp đều xuất hiện từ hai lần thì 15 lần; giải khuyến khích một cặp lặp từ hai lần là 1 lần.
- 3 cặp: 45 lần; cả ba cặp đều lặp từ hai lần thì 60 lần; khuyến khích 2 hoặc 10 lần theo số cặp lặp.
- 4 cặp: 110 lần; cả bốn cặp đều lặp từ hai lần thì 1.000 lần; khuyến khích 5/15/30 lần theo số cặp lặp.

## Khác biệt với nhãn cũ trong dự án

| Nhánh cũ | Có dùng trực tiếp cho ROI chính thức? | Lý do |
| --- | --- | --- |
| `de` | Có, đổi nghĩa thành ứng viên Lô tô 2 số | Mô hình đang xếp hạng đuôi ĐB; settlement bổ sung cả giải Nhất theo thể lệ |
| `bacang` | Có, đổi nghĩa thành ứng viên Lô tô 3 số | Settlement bổ sung giải Nhất, giải Sáu và giải khuyến khích |
| `xien2/3/4` | Có | Cùng định nghĩa chọn 2/3/4 cặp trong 27 lần quay; phải chấm thêm số lần lặp |
| `lo2` | Không | Nhánh cũ coi mỗi đuôi trong 27 giải là một outcome của vé đơn, khác Lô tô 2 số chính thức |
| `lo3` | Không | Nhánh cũ coi mọi đuôi 3 số trong 27 giải là outcome, khác thể lệ Lô tô 3 số chính thức |

## Kết quả live đã biết

Snapshot v7 ngày 28/08/2026 theo settlement chính thức:

- Lô tô 2 số: chi 10 đơn vị, thu 0.
- Lô tô 3 số: chi 5 đơn vị, thu 0.
- 2 cặp số: chi 5 đơn vị, tổ hợp `17+95` trúng mức 10 lần, thu 10; ROI riêng nhánh +100%.
- 3 cặp số: chi 3, thu 0.
- 4 cặp số: chi 2, thu 0.
- Toàn bộ danh mục: chi 25, thu 10, lỗ 15 đơn vị, ROI -60%.

Một ngày không đủ để suy luận lợi thế. API giữ trạng thái `collecting` dưới 30 ngày và không dùng ROI quan sát để tự động promote mô hình.
