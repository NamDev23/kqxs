# 📁 Cấu Trúc Dự Án

```
kqxs/
├── 📱 app/                          # Next.js App Router
│   ├── layout.tsx                   # Root layout (metadata, global styles)
│   ├── page.tsx                     # Homepage (main dashboard)
│   └── globals.css                  # Global CSS + Tailwind
│
├── 🧩 components/                   # React Components
│   ├── PredictionCard.tsx           # Card hiển thị dự đoán
│   ├── FrequencyChart.tsx           # Biểu đồ tần suất
│   ├── HotColdNumbers.tsx           # Hot/Cold analysis display
│   └── StatsOverview.tsx            # Statistics cards
│
├── 🔧 lib/                          # Core Logic
│   ├── statistical-analyzer.ts     # ⭐ Engine phân tích chính
│   │   ├── FrequencyAnalysis       # Phân tích tần suất
│   │   ├── MarkovChainAnalysis     # Chuỗi Markov
│   │   ├── HotColdAnalysis         # Hot/Cold numbers
│   │   └── GapAnalysis             # Phân tích khoảng cách
│   │
│   └── data-fetcher.ts             # Thu thập dữ liệu
│       ├── fetchHistoricalData()   # Lấy data lịch sử
│       └── generateMockData()      # Mock data cho demo
│
├── 🌐 pages/api/                    # API Routes
│   ├── analysis.ts                  # GET /api/analysis
│   │   └── Returns: predictions, frequency, hotCold
│   │
│   └── history.ts                   # GET /api/history?days=X
│       └── Returns: historical lottery data
│
├── 📊 analyzer/                     # Background Scripts
│   └── daily-analyzer.js            # Cron job - phân tích hằng ngày
│
├── 📂 data/                         # Data Storage (future)
│   └── daily-report.json            # Auto-generated reports
│
├── 📚 Documentation
│   ├── README.md                    # Tổng quan dự án
│   ├── QUICKSTART.md                # Hướng dẫn nhanh
│   ├── DEPLOYMENT.md                # Hướng dẫn deploy
│   ├── FEATURES.md                  # Chi tiết tính năng
│   ├── TODO.md                      # Roadmap phát triển
│   └── PROJECT_STRUCTURE.md         # File này
│
├── ⚙️ Configuration Files
│   ├── package.json                 # Dependencies & scripts
│   ├── tsconfig.json                # TypeScript config
│   ├── next.config.js               # Next.js config
│   ├── tailwind.config.js           # Tailwind CSS config
│   ├── postcss.config.js            # PostCSS config
│   ├── Dockerfile                   # Docker image
│   ├── docker-compose.yml           # Docker compose
│   ├── .env.example                 # Environment variables template
│   └── .gitignore                   # Git ignore rules
│
└── 📦 Build Output (generated)
    ├── .next/                       # Next.js build
    └── node_modules/                # Dependencies

```

---

## 🔍 Chi Tiết Các Thư Mục

### `/app` - Next.js App Router
Thư mục chính của Next.js 13+ App Router. Mỗi file tạo ra một route.

**Files:**
- `layout.tsx`: Layout chung cho toàn app (header, footer, metadata)
- `page.tsx`: Homepage chính - Dashboard phân tích
- `globals.css`: Global styles + Tailwind directives

### `/components` - Reusable Components
Components React có thể tái sử dụng.

**Components:**
1. **PredictionCard**: Hiển thị 1 dự đoán
   - Props: `prediction: PredictionResult`
   - Shows: numbers, confidence, method, reasoning

2. **FrequencyChart**: Biểu đồ tần suất (Bar chart)
   - Props: `data: FrequencyData[]`
   - Uses: Recharts library

3. **HotColdNumbers**: Hiển thị Hot/Cold numbers
   - Props: `hot[], cold[]`
   - Layout: 2 columns grid

4. **StatsOverview**: Overview cards
   - Props: `dataPoints, lastUpdate`
   - Shows: Key metrics

### `/lib` - Core Business Logic
Thư viện chính của ứng dụng - không phụ thuộc UI.

**Files:**

1. **statistical-analyzer.ts** ⭐ (Quan trọng nhất)
   ```typescript
   class StatisticalAnalyzer {
     analyzeFrequency()      // Tần suất
     markovChainAnalysis()   // Markov
     hotColdAnalysis()       // Hot/Cold
     generatePredictions()   // Main method
   }
   ```

2. **data-fetcher.ts**
   ```typescript
   class DataFetcher {
     fetchHistoricalData()   // Fetch from API
     generateMockData()      // For demo
   }
   ```

### `/pages/api` - API Routes
Next.js API routes - serverless functions.

**Endpoints:**

1. **GET /api/analysis**
   ```json
   {
     "success": true,
     "data": {
       "predictions": [...],
       "frequency": [...],
       "hotCold": {...},
       "lastUpdate": "ISO date",
       "dataPoints": 100
     }
   }
   ```

2. **GET /api/history?days=30**
   ```json
   {
     "success": true,
     "data": [LotteryResult],
     "total": 30
   }
   ```

### `/analyzer` - Background Jobs
Scripts chạy ngoài web server (cron jobs).

**Scripts:**
- `daily-analyzer.js`: Chạy mỗi ngày để update dữ liệu

### `/data` - Data Storage
Thư mục lưu data (future - hiện tại dùng mock).

---

## 🔄 Data Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ GET /
       ▼
┌─────────────────┐
│   app/page.tsx  │  (Client Component)
└──────┬──────────┘
       │ useEffect()
       │ fetch('/api/analysis')
       ▼
┌─────────────────────┐
│ pages/api/analysis.ts │  (API Route)
└──────┬──────────────┘
       │
       ├─► DataFetcher.fetchHistoricalData()
       │   └─► LotteryResult[]
       │
       └─► StatisticalAnalyzer()
           ├─► analyzeFrequency()
           ├─► hotColdAnalysis()
           ├─► markovChainAnalysis()
           └─► generatePredictions()
               └─► Return JSON
                   │
                   ▼
           ┌──────────────┐
           │   Browser    │
           │ Components:  │
           │ - Cards      │
           │ - Charts     │
           │ - Tables     │
           └──────────────┘
```

---

## 🎨 Component Hierarchy

```
<RootLayout>
  └─ <HomePage>
      ├─ <Header />
      ├─ <Disclaimer />
      ├─ <StatsOverview />
      ├─ <Predictions>
      │   └─ <PredictionCard /> × 4
      ├─ <HotColdNumbers />
      ├─ <FrequencyChart />
      ├─ <FrequencyTable />
      ├─ <Methodology />
      └─ <Footer />
```

---

## 🧮 Algorithm Flow

```
Input: Historical Data (100 kỳ)
  │
  ├─► Method 1: Frequency Analysis
  │   └─► Count occurrences → Top 10
  │
  ├─► Method 2: Hot/Cold Analysis
  │   └─► Recent 30 kỳ → Hot/Cold numbers
  │
  ├─► Method 3: Gap Analysis
  │   └─► Calculate gaps → Overdue numbers
  │
  └─► Method 4: Markov Chain
      └─► Transition probabilities → Next predictions

Output: 4 PredictionResults
  └─► Display to user
```

---

## 📦 Dependencies Map

```
React 18
  ├─ Next.js 14
  │   ├─ App Router
  │   ├─ API Routes
  │   └─ Image Optimization
  │
  ├─ TypeScript
  │   └─ Type Safety
  │
  └─ Recharts
      └─ Data Visualization

Tailwind CSS
  ├─ PostCSS
  └─ Autoprefixer

Dev Tools
  ├─ ESLint
  └─ Prettier (optional)
```

---

## 🚀 Build Process

```
npm run dev
  └─► Next.js Dev Server
      ├─ Fast Refresh
      ├─ HMR (Hot Module Replacement)
      └─ http://localhost:3000

npm run build
  └─► Next.js Production Build
      ├─ TypeScript Compilation
      ├─ Static Generation
      ├─ Code Splitting
      ├─ Minification
      └─ Optimization

npm start
  └─► Production Server
      └─ Serve .next/ folder
```

---

## 📝 File Naming Conventions

- **Components**: PascalCase (e.g., `PredictionCard.tsx`)
- **Libraries**: kebab-case (e.g., `statistical-analyzer.ts`)
- **API Routes**: kebab-case (e.g., `analysis.ts`)
- **Config Files**: kebab-case (e.g., `next.config.js`)
- **Documentation**: UPPERCASE (e.g., `README.md`)

---

## 🔐 Environment Variables

```env
# .env.local (không commit vào Git)
NEXT_PUBLIC_API_URL=...        # Public API URL
API_KEY=...                    # Secret API key
DATABASE_URL=...               # Database connection
```

**Prefix:**
- `NEXT_PUBLIC_*`: Exposed to browser
- No prefix: Server-only

---

## 🧪 Testing Structure (Future)

```
tests/
├── unit/
│   ├── analyzer.test.ts
│   └── fetcher.test.ts
├── integration/
│   └── api.test.ts
└── e2e/
    └── homepage.spec.ts
```

---

**Cập nhật:** 2026-06-12  
**Version:** 1.0.0
