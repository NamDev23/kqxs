const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class RealtimeAnalyzer {
  async getHistoricalData(days = 100) {
    return await prisma.lotteryResult.findMany({
      orderBy: { date: 'desc' },
      take: days
    });
  }

  analyzeFrequency(data, type = 'last2') {
    const freqMap = new Map();
    
    data.forEach(result => {
      const numbers = this.extractNumbers(result, type);
      numbers.forEach(num => {
        freqMap.set(num, (freqMap.get(num) || 0) + 1);
      });
    });

    return Array.from(freqMap.entries())
      .map(([num, count]) => ({ number: num, count }))
      .sort((a, b) => b.count - a.count);
  }

  extractNumbers(result, type) {
    const all = [
      result.special,
      ...result.first,
      ...result.second,
      ...result.third,
      ...result.fourth,
      ...result.fifth,
      ...result.sixth,
      ...result.seventh
    ];

    if (type === 'last2') return all.map(n => n.slice(-2));
    if (type === 'last3') return all.map(n => n.slice(-3));
    return all;
  }

  async generateDailyPrediction() {
    console.log('🧮 Generating predictions...');
    
    const data = await this.getHistoricalData(100);
    
    const de = this.analyzeFrequency(data, 'last2').slice(0, 10).map(f => f.number);
    const lo2 = this.analyzeFrequency(data, 'last2').slice(0, 15).map(f => f.number);
    const lo3 = this.analyzeFrequency(data, 'last3').slice(0, 10).map(f => f.number);
    const bacang = lo3.slice(0, 5);

    const songthulode = [];
    for (let i = 0; i < 10 && i < lo2.length - 1; i += 2) {
      songthulode.push([lo2[i], lo2[i + 1]]);
    }

    const dauMap = new Map();
    const duoiMap = new Map();
    data.forEach(result => {
      this.extractNumbers(result, 'last2').forEach(num => {
        dauMap.set(num[0], (dauMap.get(num[0]) || 0) + 1);
        duoiMap.set(num[1], (duoiMap.get(num[1]) || 0) + 1);
      });
    });

    const dau = Array.from(dauMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);
    const duoi = Array.from(duoiMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);

    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);

    // UPSERT instead of create - tránh duplicate
    const prediction = await prisma.prediction.upsert({
      where: {
        date_predictionFor: {
          date: today,
          predictionFor: tomorrow
        }
      },
      update: {
        de,
        lo2,
        lo3,
        bacang,
        songthulode: JSON.stringify(songthulode),
        dauduoi: JSON.stringify({ dau, duoi }),
        dataPoints: data.length
      },
      create: {
        date: today,
        predictionFor: tomorrow,
        de,
        lo2,
        lo3,
        bacang,
        songthulode: JSON.stringify(songthulode),
        dauduoi: JSON.stringify({ dau, duoi }),
        method: 'Statistical Analysis',
        dataPoints: data.length
      }
    });

    console.log('✅ Predictions saved for', prediction.predictionFor.toISOString().split('T')[0]);
    
    return prediction;
  }
}

async function main() {
  console.log('🚀 Starting real-time analysis...');
  
  try {
    const analyzer = new RealtimeAnalyzer();
    const prediction = await analyzer.generateDailyPrediction();
    
    await prisma.systemLog.create({
      data: {
        type: 'analyze',
        message: 'Predictions generated',
        data: { date: prediction.date }
      }
    });

    console.log('✅ Analysis completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

module.exports = RealtimeAnalyzer;
