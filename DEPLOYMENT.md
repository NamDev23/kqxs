# 🚀 Hướng Dẫn Triển Khai

## 📋 Yêu Cầu Hệ Thống

- Node.js 18+ 
- npm hoặc yarn
- 2GB RAM minimum
- 10GB disk space

## 🔧 Cài Đặt Local

```bash
# Clone project
cd kqxs

# Cài dependencies
npm install

# Chạy development
npm run dev

# Mở browser: http://localhost:3000
```

## 🌐 Deploy Production

### Option 1: Vercel (Khuyên dùng - Free)

```bash
# Cài Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

### Option 2: Docker

```bash
# Build image
docker build -t kqxs-analysis .

# Run container
docker run -p 3000:3000 kqxs-analysis
```

### Option 3: VPS (Traditional)

```bash
# Build
npm run build

# Start with PM2
npm i -g pm2
pm2 start npm --name "kqxs" -- start

# Setup nginx reverse proxy
```

## 🔄 Setup Cron Job (Daily Analysis)

```bash
# Mở crontab
crontab -e

# Chạy analysis mỗi ngày lúc 7h sáng
0 7 * * * cd /path/to/kqxs && node analyzer/daily-analyzer.js
```

## 🔐 Environment Variables

Tạo file `.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://your-api.com
API_KEY=your-secret-key

# Database (nếu dùng)
DATABASE_URL=postgresql://...

# Analytics
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

## 📊 Tích Hợp API Real Data

### Bước 1: Tìm nguồn data
- Các website xổ số công khai có API
- Web scraping (tuân thủ robots.txt)
- Database riêng

### Bước 2: Update data-fetcher.ts

```typescript
async fetchHistoricalData(): Promise<LotteryResult[]> {
  const response = await fetch('https://api-real.com/xsmb');
  const data = await response.json();
  return this.parseData(data);
}
```

### Bước 3: Setup Auto-update

```javascript
// Cron job hoặc webhook
setInterval(() => {
  fetchLatestResult();
  updateAnalysis();
}, 1000 * 60 * 60); // Mỗi giờ
```

## 🎨 Customization

### Đổi màu chủ đạo

```css
/* app/globals.css */
:root {
  --primary: #your-color;
  --secondary: #your-color;
}
```

### Thêm phương pháp phân tích mới

```typescript
// lib/statistical-analyzer.ts
class StatisticalAnalyzer {
  newMethod() {
    // Your algorithm here
  }
}
```

## 📈 Monitoring & Analytics

### Setup Google Analytics

```typescript
// app/layout.tsx
<Script src="https://www.googletagmanager.com/gtag/js?id=GA_ID" />
```

### Error Tracking (Sentry)

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

## 🔒 Security Checklist

- [ ] HTTPS enabled
- [ ] Rate limiting API
- [ ] Input validation
- [ ] CORS configured
- [ ] Environment variables secure
- [ ] Regular dependency updates

## 🐛 Troubleshooting

### Build failed
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Port already in use
```bash
lsof -ti:3000 | xargs kill
npm run dev
```

### TypeScript errors
```bash
npm install --save-dev @types/node @types/react
```

## 📞 Support

Nếu gặp vấn đề:
1. Check logs: `pm2 logs kqxs`
2. Check documentation
3. Open GitHub issue

---

**Good luck with your deployment! 🎉**
