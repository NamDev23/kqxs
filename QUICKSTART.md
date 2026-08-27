# ⚡ Quick Start Guide

## 🚀 Chạy trong 3 bước

### Bước 1: Cài đặt
```bash
npm install
```

### Bước 2: Chạy development server
```bash
npm run dev
```

### Bước 3: Mở browser
```
http://localhost:3000
```

**Xong! Bạn đã có website phân tích xổ số chuyên nghiệp! 🎉**

---

## 📖 Hướng Dẫn Sử Dụng

### Xem Dự Báo Hôm Nay
1. Scroll xuống phần "📊 Dự Báo Hôm Nay"
2. Xem 4 phương pháp dự đoán khác nhau
3. Mỗi phương pháp có:
   - ✅ Danh sách số dự đoán
   - ✅ Confidence score (độ tin cậy)
   - ✅ Giải thích phương pháp

### Phân Tích Hot/Cold
- 🔥 **Hot Numbers:** Số đang "nóng" (xuất hiện nhiều gần đây)
- ❄️ **Cold Numbers:** Số đang "lạnh" (ít xuất hiện gần đây)

### Xem Biểu Đồ Tần Suất
- Biểu đồ cột hiển thị top 15 số xuất hiện nhiều nhất
- Hover để xem chi tiết

### Đọc Bảng Thống Kê
- **Số:** Con số phân tích
- **Số Lần:** Tổng số lần xuất hiện
- **Tỷ Lệ %:** Phần trăm xuất hiện
- **Lần Cuối:** Bao nhiêu kỳ trước xuất hiện
- **Khoảng Cách TB:** Trung bình bao nhiêu kỳ xuất hiện 1 lần

---

## 🎯 Tips Sử Dụng Hiệu Quả

### 1. Kết hợp nhiều phương pháp
Số xuất hiện trong nhiều phương pháp có "xác suất" cao hơn

### 2. Chú ý Confidence Score
Phương pháp nào có % cao hơn thì đáng tin hơn

### 3. Theo dõi Hot Numbers
Xu hướng ngắn hạn thường ổn định trong vài kỳ

### 4. Xem Gap Analysis
Số quá lâu không ra có thể "đến lượt"

### 5. Đọc Methodology
Hiểu cách tính để đưa ra quyết định tốt hơn

---

## ⚠️ Lưu Ý Quan Trọng

### KHÔNG phải công cụ dự đoán chính xác
- Xổ số = ngẫu nhiên
- Không có công thức 100%
- Chỉ là công cụ hỗ trợ tham khảo

### Chơi có trách nhiệm
- Đừng đặt quá nhiều tiền
- Xem như giải trí
- Biết dừng đúng lúc

---

## 🔄 Tự Động Hóa

### Setup Cron Job (Linux/Mac)
```bash
# Chạy phân tích mỗi ngày 7h sáng
crontab -e

# Thêm dòng:
0 7 * * * cd /path/to/kqxs && node analyzer/daily-analyzer.js
```

### Setup Task Scheduler (Windows)
1. Mở Task Scheduler
2. Tạo Basic Task
3. Chọn Daily, 7:00 AM
4. Action: Start Program
5. Program: `node`
6. Arguments: `analyzer/daily-analyzer.js`
7. Start in: `C:\path\to\kqxs`

---

## 📱 Mobile Usage

### Responsive Design
- Tự động điều chỉnh trên điện thoại
- Touch-friendly
- Scroll mượt

### Thêm vào Home Screen
1. Mở website trên Safari/Chrome
2. Tap "Share" / "Menu"
3. Chọn "Add to Home Screen"
4. Giờ có icon như app!

---

## 🐛 Gặp Vấn Đề?

### Website không mở được
```bash
# Check port 3000 có bị chiếm không
lsof -i :3000

# Kill process cũ
kill -9 <PID>

# Chạy lại
npm run dev
```

### Lỗi khi build
```bash
# Xóa cache
rm -rf .next node_modules

# Cài lại
npm install
npm run build
```

### TypeScript errors
```bash
# Update types
npm install --save-dev @types/node @types/react

# Restart TypeScript server (VS Code)
Ctrl+Shift+P > "TypeScript: Restart TS Server"
```

---

## 📞 Cần Giúp Đỡ?

1. Đọc README.md
2. Đọc DEPLOYMENT.md
3. Đọc FEATURES.md
4. Check GitHub Issues
5. Create new issue với:
   - Mô tả vấn đề
   - Screenshots
   - Error logs
   - Hệ thống của bạn

---

## 🎉 Tiếp Theo?

### Customize
- Đổi màu sắc trong `app/globals.css`
- Thêm logo trong `public/`
- Sửa title trong `app/layout.tsx`

### Add Features
- Tích hợp API thật trong `lib/data-fetcher.ts`
- Thêm phương pháp mới trong `lib/statistical-analyzer.ts`
- Tạo components mới trong `components/`

### Deploy
- Đọc DEPLOYMENT.md
- Chọn platform: Vercel / Docker / VPS
- Push lên production!

---

**Chúc bạn phát triển website thành công! 🚀**
