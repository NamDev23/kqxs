const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('📊 Database Analysis\n');
  
  const total = await prisma.lotteryResult.count();
  console.log(`Total records: ${total}`);
  
  const oldest = await prisma.lotteryResult.findFirst({
    orderBy: { date: 'asc' }
  });
  
  const newest = await prisma.lotteryResult.findFirst({
    orderBy: { date: 'desc' }
  });
  
  console.log(`\nDate range:`);
  console.log(`  Oldest: ${oldest.date.toISOString().split('T')[0]} - ĐB: ${oldest.special}`);
  console.log(`  Newest: ${newest.date.toISOString().split('T')[0]} - ĐB: ${newest.special}`);
  
  // Check data quality
  const samples = await prisma.lotteryResult.findMany({
    orderBy: { date: 'desc' },
    take: 5
  });
  
  console.log(`\nRecent 5 records:`);
  samples.forEach(s => {
    console.log(`  ${s.date.toISOString().split('T')[0]}: ĐB=${s.special}, G1=${s.first.length}, G7=${s.seventh.length}`);
  });
  
  await prisma.$disconnect();
}

checkDatabase();
