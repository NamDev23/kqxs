/**
 * Advanced Analysis với 100 days REAL data
 * Phân tích: Frequency, Hot/Cold, Patterns, Cycles
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function advancedAnalysis() {
  console.log('🔬 ADVANCED ANALYSIS - 100 DAYS REAL DATA\n');
  
  const data = await prisma.lotteryResult.findMany({
    orderBy: { date: 'desc' },
    take: 100
  });
  
  console.log(`📊 Analyzing ${data.length} records...\n`);
  
  // 1. ĐỀ - Frequency Analysis (CHỈ từ giải ĐẶC BIỆT)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 1. ĐỀ (2 số cuối giải ĐẶC BIỆT)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const deFreq = new Map();
  data.forEach(r => {
    const de = r.special.slice(-2);
    deFreq.set(de, (deFreq.get(de) || 0) + 1);
  });
  
  const topDe = Array.from(deFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  console.log('Top 10 Đề (100 days):');
  topDe.forEach(([num, count], idx) => {
    const percent = ((count / 100) * 100).toFixed(1);
    console.log(`  ${idx + 1}. ${num}: ${count} lần (${percent}%)`);
  });
  
  // 2. 3 CÀNG - Frequency (CHỈ từ giải ĐẶC BIỆT)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 2. 3 CÀNG (3 số cuối giải ĐẶC BIỆT)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const bacangFreq = new Map();
  data.forEach(r => {
    const bacang = r.special.slice(-3);
    bacangFreq.set(bacang, (bacangFreq.get(bacang) || 0) + 1);
  });
  
  const topBacang = Array.from(bacangFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  console.log('Top 10 Bạch thủ 3 càng (100 days):');
  topBacang.forEach(([num, count], idx) => {
    const percent = ((count / 100) * 100).toFixed(1);
    console.log(`  ${idx + 1}. ${num}: ${count} lần (${percent}%)`);
  });
  
  // 3. LÔ 2 SỐ - Hot/Cold Analysis
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 3. LÔ 2 SỐ (từ tất cả giải)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const lo2Freq = new Map();
  data.forEach(r => {
    const allNums = [r.special, ...r.first, ...r.second, ...r.third,
                     ...r.fourth, ...r.fifth, ...r.sixth, ...r.seventh];
    allNums.forEach(n => {
      const lo2 = n.slice(-2);
      lo2Freq.set(lo2, (lo2Freq.get(lo2) || 0) + 1);
    });
  });
  
  const topLo2 = Array.from(lo2Freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  
  console.log('Top 15 Lô 2 số (100 days):');
  topLo2.forEach(([num, count], idx) => {
    console.log(`  ${idx + 1}. ${num}: ${count} lần`);
  });
  
  // 4. HOT numbers (last 30 days)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 4. HOT NUMBERS (30 ngày gần nhất)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const hot30 = new Map();
  data.slice(0, 30).forEach(r => {
    const allNums = [r.special, ...r.first, ...r.second, ...r.third,
                     ...r.fourth, ...r.fifth, ...r.sixth, ...r.seventh];
    allNums.forEach(n => {
      const lo2 = n.slice(-2);
      hot30.set(lo2, (hot30.get(lo2) || 0) + 1);
    });
  });
  
  const topHot = Array.from(hot30.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  console.log('Top 10 HOT (trend tăng):');
  topHot.forEach(([num, count], idx) => {
    console.log(`  ${idx + 1}. ${num}: ${count} lần (30 days)`);
  });
  
  // 5. COLD numbers (ít xuất hiện gần đây)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 5. COLD NUMBERS (có thể sắp "về")');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Numbers that appeared in 100 days but not in last 30
  const all100nums = new Set();
  data.forEach(r => {
    const allNums = [r.special, ...r.first, ...r.second, ...r.third,
                     ...r.fourth, ...r.fifth, ...r.sixth, ...r.seventh];
    allNums.forEach(n => all100nums.add(n.slice(-2)));
  });
  
  const recent30nums = new Set();
  data.slice(0, 30).forEach(r => {
    const allNums = [r.special, ...r.first, ...r.second, ...r.third,
                     ...r.fourth, ...r.fifth, ...r.sixth, ...r.seventh];
    allNums.forEach(n => recent30nums.add(n.slice(-2)));
  });
  
  const cold = Array.from(all100nums).filter(n => !recent30nums.has(n)).slice(0, 10);
  console.log('Top 10 COLD (lâu không về):');
  cold.forEach((num, idx) => {
    console.log(`  ${idx + 1}. ${num}`);
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Analysis complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

advancedAnalysis()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
