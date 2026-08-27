/**
 * Daily crawler script - Chạy mỗi ngày 6:35 PM
 * Lấy kết quả XSMB và lưu vào database
 */

const { PrismaClient } = require('@prisma/client');
const XoSoCrawler = require('./xoso-crawler');

const prisma = new PrismaClient();
const crawler = new XoSoCrawler();

async function main() {
  console.log('🚀 Starting daily crawl...');
  console.log('📅 Date:', new Date().toISOString());

  try {
    // Fetch result
    const result = await crawler.fetchLatestResult();
    
    // Check if already exists
    const existing = await prisma.lotteryResult.findUnique({
      where: { date: new Date(result.date) }
    });

    if (existing) {
      console.log('⚠️  Result already exists for', result.date);
      console.log('   Updating...');
      
      await prisma.lotteryResult.update({
        where: { date: new Date(result.date) },
        data: result
      });
    } else {
      console.log('💾 Saving new result...');
      
      await prisma.lotteryResult.create({
        data: {
          ...result,
          date: new Date(result.date)
        }
      });
    }

    // Log success
    await prisma.systemLog.create({
      data: {
        type: 'crawl',
        message: 'Successfully crawled result',
        data: { date: result.date }
      }
    });

    console.log('✅ Crawl completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error during crawl:', error);
    
    // Log error
    await prisma.systemLog.create({
      data: {
        type: 'error',
        message: 'Crawl failed',
        data: { error: error.message }
      }
    });

    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
