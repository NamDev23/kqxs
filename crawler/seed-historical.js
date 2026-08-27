/**
 * Seed historical data - Lấy 100 kỳ gần nhất
 */

const { PrismaClient } = require('@prisma/client');
const XoSoCrawler = require('./xoso-crawler');

const prisma = new PrismaClient();
const crawler = new XoSoCrawler();

async function seedHistorical() {
  console.log('🌱 Seeding historical data...');
  
  // Mock historical data for now
  // Trong thực tế, bạn có thể crawl từ archive pages
  const mockData = [];
  const today = new Date();
  
  for (let i = 0; i < 100; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    mockData.push({
      date: date,
      special: generateRandomNumber(5),
      first: [generateRandomNumber(5)],
      second: [generateRandomNumber(5), generateRandomNumber(5)],
      third: [
        generateRandomNumber(5), generateRandomNumber(5),
        generateRandomNumber(5), generateRandomNumber(5),
        generateRandomNumber(5), generateRandomNumber(5)
      ],
      fourth: [
        generateRandomNumber(4), generateRandomNumber(4),
        generateRandomNumber(4), generateRandomNumber(4)
      ],
      fifth: [
        generateRandomNumber(4), generateRandomNumber(4),
        generateRandomNumber(4), generateRandomNumber(4),
        generateRandomNumber(4), generateRandomNumber(4)
      ],
      sixth: [
        generateRandomNumber(3), generateRandomNumber(3),
        generateRandomNumber(3)
      ],
      seventh: [
        generateRandomNumber(2), generateRandomNumber(2),
        generateRandomNumber(2), generateRandomNumber(2)
      ]
    });
  }
  
  // Save to database
  for (const data of mockData) {
    try {
      await prisma.lotteryResult.upsert({
        where: { date: data.date },
        update: data,
        create: data
      });
      console.log('✓ Saved', data.date.toISOString().split('T')[0]);
    } catch (error) {
      console.error('✗ Failed', data.date, error.message);
    }
  }
  
  console.log('✅ Seeding completed!');
}

function generateRandomNumber(digits) {
  const max = Math.pow(10, digits);
  return Math.floor(Math.random() * max).toString().padStart(digits, '0');
}

seedHistorical()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
