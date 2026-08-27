/**
 * PROFESSIONAL Ensemble Analyzer
 * Kết hợp 5 thuật toán với weighted voting
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class EnsembleAnalyzer {
  constructor(data) {
    this.data = data;
  }

  // METHOD 1: Frequency Analysis (Weight: 20%)
  frequencyMethod(type = 'de') {
    const freq = new Map();
    
    this.data.forEach(r => {
      let nums = [];
      if (type === 'de') nums = [r.special.slice(-2)];
      else if (type === 'bacang') nums = [r.special.slice(-3)];
      else if (type === 'lo2') {
        const all = [r.special, ...r.first, ...r.second, ...r.third,
                     ...r.fourth, ...r.fifth, ...r.sixth, ...r.seventh];
        nums = all.map(n => n.slice(-2));
      }
      
      nums.forEach(n => freq.set(n, (freq.get(n) || 0) + 1));
    });

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([num]) => num);
  }

  // METHOD 2: Hot Trend (last 30 days) (Weight: 25%)
  hotTrendMethod(type = 'de') {
    const recent30 = this.data.slice(0, 30);
    const freq = new Map();
    
    recent30.forEach(r => {
      let nums = [];
      if (type === 'de') nums = [r.special.slice(-2)];
      else if (type === 'bacang') nums = [r.special.slice(-3)];
      else if (type === 'lo2') {
        const all = [r.special, ...r.first, ...r.second, ...r.third,
                     ...r.fourth, ...r.fifth, ...r.sixth, ...r.seventh];
        nums = all.map(n => n.slice(-2));
      }
      
      nums.forEach(n => freq.set(n, (freq.get(n) || 0) + 1));
    });

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([num]) => num);
  }

  // METHOD 3: Gap Analysis - Số "overdue" (Weight: 20%)
  gapAnalysisMethod(type = 'de') {
    const lastSeen = new Map();
    
    this.data.forEach((r, idx) => {
      let nums = [];
      if (type === 'de') nums = [r.special.slice(-2)];
      else if (type === 'bacang') nums = [r.special.slice(-3)];
      else if (type === 'lo2') {
        const all = [r.special, ...r.first, ...r.second, ...r.third,
                     ...r.fourth, ...r.fifth, ...r.sixth, ...r.seventh];
        nums = all.map(n => n.slice(-2));
      }
      
      nums.forEach(n => {
        if (!lastSeen.has(n)) {
          lastSeen.set(n, idx);
        }
      });
    });

    // Số lâu chưa về (gap lớn) có khả năng "về"
    return Array.from(lastSeen.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by gap (oldest first)
      .map(([num]) => num);
  }

  // METHOD 4: Markov Chain (Weight: 20%)
  markovChainMethod(type = 'de') {
    // Tính xác suất chuyển trạng thái
    const transitions = new Map();
    
    for (let i = 0; i < this.data.length - 1; i++) {
      let current, next;
      
      if (type === 'de') {
        current = this.data[i].special.slice(-2);
        next = this.data[i + 1].special.slice(-2);
      } else if (type === 'bacang') {
        current = this.data[i].special.slice(-3);
        next = this.data[i + 1].special.slice(-3);
      }
      
      if (current && next) {
        const key = current;
        if (!transitions.has(key)) transitions.set(key, new Map());
        const nextMap = transitions.get(key);
        nextMap.set(next, (nextMap.get(next) || 0) + 1);
      }
    }

    // Get most recent number
    let lastNum;
    if (type === 'de') lastNum = this.data[0].special.slice(-2);
    else if (type === 'bacang') lastNum = this.data[0].special.slice(-3);

    // Get most likely next numbers based on last
    if (transitions.has(lastNum)) {
      return Array.from(transitions.get(lastNum).entries())
        .sort((a, b) => b[1] - a[1])
        .map(([num]) => num);
    }

    return [];
  }

  // METHOD 5: Pattern Recognition (Weight: 15%)
  patternMethod(type = 'de') {
    const patterns = [];

    // Pattern 1: Số đôi (11, 22, 33...)
    if (type === 'de') {
      for (let i = 0; i <= 9; i++) {
        patterns.push(String(i) + String(i));
      }
    }

    // Pattern 2: Số mirror gần đây
    const recent = this.data.slice(0, 10);
    recent.forEach(r => {
      if (type === 'de') {
        const num = r.special.slice(-2);
        const mirror = num[1] + num[0];
        patterns.push(mirror);
      }
    });

    // Pattern 3: Consecutive
    const last = type === 'de' ? this.data[0].special.slice(-2) : null;
    if (last) {
      const num = parseInt(last);
      patterns.push(String((num + 1) % 100).padStart(2, '0'));
      patterns.push(String((num - 1 + 100) % 100).padStart(2, '0'));
    }

    return patterns;
  }

  // ENSEMBLE: Weighted Voting
  ensemble(type = 'de', topN = 10) {
    console.log(`\n🔬 Ensemble Analysis for ${type.toUpperCase()}...`);

    const methods = [
      { name: 'Frequency', fn: this.frequencyMethod.bind(this), weight: 0.20 },
      { name: 'Hot Trend', fn: this.hotTrendMethod.bind(this), weight: 0.25 },
      { name: 'Gap Analysis', fn: this.gapAnalysisMethod.bind(this), weight: 0.20 },
      { name: 'Markov Chain', fn: this.markovChainMethod.bind(this), weight: 0.20 },
      { name: 'Pattern', fn: this.patternMethod.bind(this), weight: 0.15 }
    ];

    const votes = new Map();

    methods.forEach(method => {
      const predictions = method.fn(type).slice(0, 20);
      
      console.log(`  ${method.name}: ${predictions.slice(0, 5).join(', ')}...`);

      predictions.forEach((num, idx) => {
        // Điểm cao hơn cho rank cao (idx nhỏ)
        const rankScore = (predictions.length - idx) / predictions.length;
        const score = method.weight * rankScore;
        votes.set(num, (votes.get(num) || 0) + score);
      });
    });

    const result = Array.from(votes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([num, score]) => ({ num, score }));

    console.log(`  ✅ Final Top ${topN}:`, result.slice(0, 5).map(r => r.num).join(', '));

    return result.map(r => r.num);
  }

  generateFullPrediction() {
    console.log('🎯 GENERATING PREDICTIONS WITH ENSEMBLE ML...\n');
    console.log(`Data: ${this.data.length} days`);

    const de = this.ensemble('de', 10);
    const bacang = this.ensemble('bacang', 5);
    const lo2 = this.ensemble('lo2', 15);

    // Song thủ lô đề: Cặp số xuất hiện cùng nhau
    const pairs = this.analyzePairs();

    // Đầu đuôi
    const dauduoi = this.analyzeDauDuoi();

    return {
      de,
      bacang,
      lo2,
      lo3: lo2.slice(0, 10), // Lô 3 = lô 2 (simplified)
      songthulode: pairs,
      dauduoi
    };
  }

  analyzePairs() {
    const pairFreq = new Map();

    this.data.forEach(r => {
      const allNums = [r.special, ...r.first, ...r.second, ...r.third,
                       ...r.fourth, ...r.fifth, ...r.sixth, ...r.seventh]
        .map(n => n.slice(-2));

      for (let i = 0; i < allNums.length; i++) {
        for (let j = i + 1; j < allNums.length; j++) {
          const pair = [allNums[i], allNums[j]].sort().join('-');
          pairFreq.set(pair, (pairFreq.get(pair) || 0) + 1);
        }
      }
    });

    return Array.from(pairFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pair]) => pair.split('-'));
  }

  analyzeDauDuoi() {
    const dauFreq = new Map();
    const duoiFreq = new Map();

    this.data.forEach(r => {
      const allNums = [r.special, ...r.first, ...r.second, ...r.third,
                       ...r.fourth, ...r.fifth, ...r.sixth, ...r.seventh]
        .map(n => n.slice(-2));

      allNums.forEach(num => {
        dauFreq.set(num[0], (dauFreq.get(num[0]) || 0) + 1);
        duoiFreq.set(num[1], (duoiFreq.get(num[1]) || 0) + 1);
      });
    });

    return {
      dau: Array.from(dauFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([n]) => n),
      duoi: Array.from(duoiFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([n]) => n)
    };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║   🤖 PROFESSIONAL ENSEMBLE ML ANALYZER                        ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const data = await prisma.lotteryResult.findMany({
    orderBy: { date: 'desc' },
    take: 100
  });

  console.log(`📊 Loaded: ${data.length} days REAL data\n`);

  const analyzer = new EnsembleAnalyzer(data);
  const predictions = analyzer.generateFullPrediction();

  // Save to database
  console.log('\n💾 Saving to database...');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.prediction.upsert({
    where: {
      date_predictionFor: {
        date: new Date(),
        predictionFor: tomorrow
      }
    },
    update: {
      de: predictions.de,
      lo2: predictions.lo2,
      lo3: predictions.lo3,
      bacang: predictions.bacang,
      songthulode: JSON.stringify(predictions.songthulode),
      dauduoi: JSON.stringify(predictions.dauduoi),
      dataPoints: data.length,
      method: 'Ensemble ML (5 algorithms)'
    },
    create: {
      date: new Date(),
      predictionFor: tomorrow,
      de: predictions.de,
      lo2: predictions.lo2,
      lo3: predictions.lo3,
      bacang: predictions.bacang,
      songthulode: JSON.stringify(predictions.songthulode),
      dauduoi: JSON.stringify(predictions.dauduoi),
      method: 'Ensemble ML (5 algorithms)',
      dataPoints: data.length
    }
  });

  console.log('✅ Predictions saved!');
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║   ✅ PROFESSIONAL ML ANALYSIS COMPLETE                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  await prisma.$disconnect();
  process.exit(0);
}

main();
