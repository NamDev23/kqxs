# 🚀 Setup Guide - Database & Real-time System

## Phase 1: Database Setup

### Step 1: Setup PostgreSQL Database

**Option A: Local PostgreSQL (Development)**
```bash
# Mac (Homebrew)
brew install postgresql
brew services start postgresql
createdb kqxs

# Windows (download từ postgresql.org)
# Linux
sudo apt-get install postgresql
sudo -u postgres createdb kqxs
```

**Option B: Cloud PostgreSQL (Production)**
- Vercel Postgres (Free tier)
- Supabase (Free tier)
- Railway (Free tier)
- ElephantSQL (Free tier)

Bạn đã cung cấp:
```
DATABASE_HOST=103.159.51.106
DATABASE_PORT=5432
DATABASE_USER=root
DATABASE_PASSWORD=Namdev23!
```

### Step 2: Create .env file
```bash
# Copy example
cp .env.example .env

# Edit .env
DATABASE_URL="postgresql://root:Namdev23!@103.159.51.106:5432/kqxs?schema=public"
```

### Step 3: Install dependencies
```bash
npm install
```

### Step 4: Push schema to database
```bash
npm run db:push
```

Lệnh này sẽ:
- Tạo tất cả tables (LotteryResult, Prediction, PredictionEvaluation, AccuracyRecord, DailyLearningReport, SystemStats, SystemLog)
- Setup indexes
- Generate Prisma Client

### Step 5: Verify database
```bash
npm run db:studio
```
→ Mở http://localhost:5555 để xem database

---

## Phase 2: Test Crawler

### Step 1: Test crawler manually
```bash
node crawler/daily-crawler.js
```

**Expected output:**
```
🚀 Starting daily crawl...
📅 Date: 2026-06-12...
🔍 Crawling latest XSMB result...
✅ Crawl successful: 2026-06-12
💾 Saving new result...
✅ Crawl completed successfully!
```

### Step 2: Verify data saved
```bash
npm run db:studio
# Check LotteryResult table
```

---

## Phase 3: Test Analyzer

### Step 1: Run analyzer
```bash
node analyzer/realtime-analyzer.js
```

**Expected output:**
```
🚀 Starting real-time analysis...
🧮 Generating predictions...
✅ Predictions saved for 2026-06-13
✅ Analysis completed!
```

### Step 2: Verify predictions
```bash
npm run db:studio
# Check Prediction table
```

---

## Phase 4: Test Accuracy Calculator

### Step 1: Run accuracy calculator
```bash
node analyzer/accuracy-calculator.js
```

**Expected output:**
```
🚀 Starting accuracy calculation...
📊 Calculating accuracy for 2026-06-11
✅ Accuracy calculated:
   Đề: 0.0%
   Lô 2: 13.3%
   Lô 3: 10.0%
   Overall: 7.8%
📈 Updating system stats...
✅ System stats updated
✅ Accuracy calculation completed!
```

---

## Phase 5: Start Cron Scheduler

### Option A: Development (Node process)
```bash
node analyzer/cron-scheduler.js
```

Keeps running and executes:
- 6:35 PM: Crawl results
- 7:00 PM: Generate predictions
- 7:05 PM: Calculate accuracy

### Option B: Production (PM2)
```bash
npm install -g pm2
pm2 start analyzer/cron-scheduler.js --name kqxs-cron
pm2 save
pm2 startup
```

### Option C: System Cron (Linux/Mac)
```bash
crontab -e

# Add these lines:
35 18 * * * cd /path/to/kqxs && node crawler/daily-crawler.js
0 19 * * * cd /path/to/kqxs && node analyzer/realtime-analyzer.js
5 19 * * * cd /path/to/kqxs && node analyzer/accuracy-calculator.js
```

---

## Phase 6: Update Frontend to Use Real Data

File: `pages/api/daily-prediction.ts`

```typescript
import { prisma } from '@/lib/prisma';

export default async function handler(req, res) {
  // Get latest prediction
  const prediction = await prisma.prediction.findFirst({
    orderBy: { date: 'desc' }
  });

  // Get system stats
  const stats = await prisma.systemStats.findFirst({
    orderBy: { date: 'desc' }
  });

  res.json({
    success: true,
    data: {
      prediction: {
        ...prediction,
        songthulode: JSON.parse(prediction.songthulode),
        dauduoi: JSON.parse(prediction.dauduoi)
      },
      accuracy: {
        historicalAccuracy: stats?.overallAccuracy || 0,
        totalPredictions: stats?.totalPredictions || 0,
        correctPredictions: stats?.correctPredictions || 0
      }
    }
  });
}
```

---

## Troubleshooting

### Database connection failed
```bash
# Test connection
psql "postgresql://root:Namdev23!@103.159.51.106:5432/kqxs"

# If fails, check:
# 1. Firewall rules
# 2. PostgreSQL pg_hba.conf
# 3. Listen address in postgresql.conf
```

### Crawler fails
```bash
# Check internet connection
curl https://xoso.com.vn

# Update selectors in xoso-crawler.js
# Website structure may change
```

### Prisma errors
```bash
# Regenerate client
npx prisma generate

# Reset database (WARNING: deletes data)
npx prisma db push --force-reset
```

---

## Monitoring

### View logs
```bash
# PM2 logs
pm2 logs kqxs-cron

# Check SystemLog table
npm run db:studio
```

### Health check API
Create `pages/api/health.ts`:
```typescript
export default async function handler(req, res) {
  const lastCrawl = await prisma.systemLog.findFirst({
    where: { type: 'crawl' },
    orderBy: { createdAt: 'desc' }
  });

  const isHealthy = lastCrawl && 
    (Date.now() - lastCrawl.createdAt.getTime()) < 86400000; // 24h

  res.json({
    status: isHealthy ? 'healthy' : 'warning',
    lastCrawl: lastCrawl?.createdAt
  });
}
```

---

## Production Checklist

- [ ] Database backup strategy
- [ ] Environment variables secure
- [ ] Cron jobs running
- [ ] Health monitoring active
- [ ] Error alerts configured
- [ ] Rate limiting enabled
- [ ] Logs rotation setup
- [ ] SSL/HTTPS enabled
- [ ] CORS configured
- [ ] API docs updated

---

## Next: Customize Crawler

File: `crawler/xoso-crawler.js`

Bạn cần:
1. Inspect HTML structure của xoso.com.vn
2. Update selectors (.special-prize, .prize-first, etc.)
3. Test với real data
4. Handle edge cases

Example:
```javascript
extractSpecial($) {
  // Thay đổi selector này theo HTML thực tế
  return $('#mb_prize .special .number').text().trim();
}
```

---
