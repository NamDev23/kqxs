/**
 * Accuracy Calculator - Tính độ chính xác thực tế
 * Chạy mỗi ngày 7:05 PM (sau khi có kết quả)
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class AccuracyCalculator {
  async calculateDailyAccuracy(date) {
    console.log('📊 Calculating accuracy for', date);

    // Get prediction for this date
    const prediction = await prisma.prediction.findFirst({
      where: {
        predictionFor: new Date(date)
      }
    });

    if (!prediction) {
      console.log('⚠️  No prediction found for', date);
      return null;
    }

    // Get actual result
    const actualResult = await prisma.lotteryResult.findUnique({
      where: { date: new Date(date) }
    });

    if (!actualResult) {
      console.log('⚠️  No result found for', date);
      return null;
    }

    // Extract actual numbers
    const actualNumbers = this.extractAllNumbers(actualResult);
    const actualLast2 = actualNumbers.map(n => n.slice(-2));
    const actualDe = actualResult.special.slice(-2);
    const actualBacang = actualResult.special.slice(-3);

    // Calculate accuracy
    const deCorrect = prediction.de.includes(actualDe) ? 1 : 0;
    const lo2Correct = prediction.lo2.filter(n => actualLast2.includes(n)).length;
    const actualLast3 = actualNumbers.map(n => n.slice(-3));
    const lo3Correct = prediction.lo3.filter(n => actualLast3.includes(n)).length;
    const bacangCorrect = prediction.bacang.includes(actualBacang) ? 1 : 0;

    const deAccuracy = (deCorrect / 1) * 100;
    const lo2Accuracy = prediction.lo2.length ? (lo2Correct / prediction.lo2.length) * 100 : 0;
    const lo3Accuracy = prediction.lo3.length ? (lo3Correct / prediction.lo3.length) * 100 : 0;
    const bacangAccuracy = bacangCorrect * 100;
    const overallAccuracy = (lo2Accuracy + lo3Accuracy + deAccuracy + bacangAccuracy) / 4;

    // Save accuracy record
    const accuracyRecord = await prisma.accuracyRecord.create({
      data: {
        predictionId: prediction.id,
        date: new Date(date),
        deAccuracy,
        lo2Accuracy,
        lo3Accuracy,
        bacangAccuracy,
        overallAccuracy,
        deCorrect,
        deTotal: 1,
        lo2Correct,
        lo2Total: prediction.lo2.length,
        lo3Correct,
        lo3Total: prediction.lo3.length,
        verified: true,
        verifiedAt: new Date()
      }
    });

    console.log('✅ Accuracy calculated:');
    console.log('   Đề:', deAccuracy.toFixed(1) + '%');
    console.log('   Lô 2:', lo2Accuracy.toFixed(1) + '%');
    console.log('   Lô 3:', lo3Accuracy.toFixed(1) + '%');
    console.log('   Overall:', overallAccuracy.toFixed(1) + '%');

    // Update system stats
    await this.updateSystemStats();

    return accuracyRecord;
  }

  extractAllNumbers(result) {
    return [
      result.special,
      ...result.first,
      ...result.second,
      ...result.third,
      ...result.fourth,
      ...result.fifth,
      ...result.sixth,
      ...result.seventh
    ];
  }

  async updateSystemStats() {
    console.log('📈 Updating system stats...');

    // Get all accuracy records
    const allAccuracy = await prisma.accuracyRecord.findMany({
      where: { verified: true },
      orderBy: { date: 'asc' }
    });

    if (allAccuracy.length === 0) return;

    const totalPredictions = allAccuracy.length;
    const correctPredictions = allAccuracy.filter(a => a.deCorrect > 0 || a.lo2Correct > 0 || a.lo3Correct > 0).length;
    const overallAccuracy = allAccuracy.reduce((sum, a) => sum + a.overallAccuracy, 0) / totalPredictions;

    const deAccuracy = allAccuracy.reduce((sum, a) => sum + a.deAccuracy, 0) / totalPredictions;
    const lo2Accuracy = allAccuracy.reduce((sum, a) => sum + a.lo2Accuracy, 0) / totalPredictions;
    const lo3Accuracy = allAccuracy.reduce((sum, a) => sum + a.lo3Accuracy, 0) / totalPredictions;
    const bacangAccuracy = allAccuracy.reduce((sum, a) => sum + a.bacangAccuracy, 0) / totalPredictions;

    // Last 7 days
    const last7Days = allAccuracy.slice(-7);
    const last7DaysAccuracy = last7Days.reduce((sum, a) => sum + a.overallAccuracy, 0) / last7Days.length;

    // Last 30 days
    const last30Days = allAccuracy.slice(-30);
    const last30DaysAccuracy = last30Days.reduce((sum, a) => sum + a.overallAccuracy, 0) / last30Days.length;

    await prisma.systemStats.upsert({
      where: { date: new Date() },
      update: {
        totalPredictions,
        correctPredictions,
        overallAccuracy,
        deAccuracy,
        lo2Accuracy,
        lo3Accuracy,
        bacangAccuracy,
        last7DaysAccuracy,
        last30DaysAccuracy
      },
      create: {
        date: new Date(),
        totalPredictions,
        correctPredictions,
        overallAccuracy,
        deAccuracy,
        lo2Accuracy,
        lo3Accuracy,
        bacangAccuracy,
        last7DaysAccuracy: overallAccuracy,
        last30DaysAccuracy: overallAccuracy
      }
    });

    console.log('✅ System stats updated');
  }
}

async function main() {
  console.log('🚀 Starting accuracy calculation...');
  
  try {
    const calculator = new AccuracyCalculator();
    
    // Calculate for yesterday
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    await calculator.calculateDailyAccuracy(yesterdayStr);
    
    await prisma.systemLog.create({
      data: {
        type: 'accuracy',
        message: 'Accuracy calculated',
        data: { date: yesterdayStr }
      }
    });

    console.log('✅ Accuracy calculation completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Accuracy calculation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

module.exports = AccuracyCalculator;
