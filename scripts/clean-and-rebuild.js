/**
 * Clean demo data & rebuild with REAL data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanAll() {
  console.log('🗑️  Cleaning ALL demo data...\n');
  
  await prisma.accuracyRecord.deleteMany({});
  console.log('✓ AccuracyRecord cleaned');
  
  await prisma.prediction.deleteMany({});
  console.log('✓ Prediction cleaned');
  
  await prisma.systemStats.deleteMany({});
  console.log('✓ SystemStats cleaned');
  
  await prisma.systemLog.deleteMany({});
  console.log('✓ SystemLog cleaned');
  
  await prisma.lotteryResult.deleteMany({});
  console.log('✓ LotteryResult cleaned');
  
  console.log('\n✅ All demo data deleted! Database is clean.\n');
}

async function verify() {
  console.log('🔍 Verifying...\n');
  
  const counts = {
    lotteryResult: await prisma.lotteryResult.count(),
    prediction: await prisma.prediction.count(),
    accuracyRecord: await prisma.accuracyRecord.count(),
    systemStats: await prisma.systemStats.count(),
    systemLog: await prisma.systemLog.count()
  };
  
  console.log('Current counts:');
  console.log('  LotteryResult:', counts.lotteryResult);
  console.log('  Prediction:', counts.prediction);
  console.log('  AccuracyRecord:', counts.accuracyRecord);
  console.log('  SystemStats:', counts.systemStats);
  console.log('  SystemLog:', counts.systemLog);
  
  if (counts.lotteryResult === 0) {
    console.log('\n✅ Database is clean and ready for REAL data!\n');
  }
}

async function main() {
  await cleanAll();
  await verify();
  
  console.log('📋 Next steps:');
  console.log('  1. node crawler/minhngoc-api-crawler.js --historical 365');
  console.log('  2. node analyzer/realtime-analyzer-v2.js');
  console.log('  3. npm run dev');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
