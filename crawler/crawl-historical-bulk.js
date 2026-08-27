/**
 * Crawl 365-500 days historical data
 * Từ archive pages của xoso.com.vn và minhngoc.net.vn
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class HistoricalCrawler {
  constructor() {
    this.baseUrls = {
      xoso: 'https://xoso.com.vn/xsmb',
      minhngoc: 'https://www.minhngoc.net.vn/xo-so-truc-tiep/mien-bac'
    };
    this.delay = 2000; // 2s giữa requests
  }

  async crawlRange(startDate, endDate) {
    console.log(`🔍 Crawling from ${startDate} to ${endDate}`);
    
    const current = new Date(startDate);
    const end = new Date(endDate);
    let successCount = 0;
    let failCount = 0;

    while (current <= end) {
      try {
        const dateStr = this.formatDate(current);
        console.log(`\n📅 Processing ${dateStr}...`);

        const result = await this.crawlDate(dateStr);
        
        if (result) {
          await this.saveToDatabase(result);
          successCount++;
          console.log(`✅ Saved ${dateStr}`);
        } else {
          failCount++;
          console.log(`⚠️  No data for ${dateStr}`);
        }

        // Delay để không spam server
        await this.sleep(this.delay);

      } catch (error) {
        failCount++;
        console.error(`❌ Failed ${this.formatDate(current)}:`, error.message);
      }

      current.setDate(current.getDate() + 1);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
  }

  async crawlDate(dateStr) {
    // Try xoso.com.vn first
    try {
      return await this.crawlXoSo(dateStr);
    } catch (error) {
      console.log('   Fallback to minhngoc...');
      return await this.crawlMinhNgoc(dateStr);
    }
  }

  async crawlXoSo(dateStr) {
    // Format: DD-MM-YYYY for URL
    const [year, month, day] = dateStr.split('-');
    const url = `${this.baseUrls.xoso}-${day}-${month}-${year}.html`;

    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    // Parse data (tùy structure thực tế)
    const special = $('.special .number').text().trim();
    if (!special) return null;

    const result = {
      date: dateStr,
      special,
      first: [],
      second: [],
      third: [],
      fourth: [],
      fifth: [],
      sixth: [],
      seventh: []
    };

    // Extract prizes (cần adjust theo HTML thực tế)
    $('.first .number').each((i, el) => result.first.push($(el).text().trim()));
    $('.second .number').each((i, el) => result.second.push($(el).text().trim()));
    $('.third .number').each((i, el) => result.third.push($(el).text().trim()));
    $('.fourth .number').each((i, el) => result.fourth.push($(el).text().trim()));
    $('.fifth .number').each((i, el) => result.fifth.push($(el).text().trim()));
    $('.sixth .number').each((i, el) => result.sixth.push($(el).text().trim()));
    $('.seventh .number').each((i, el) => result.seventh.push($(el).text().trim()));

    return result;
  }

  async crawlMinhNgoc(dateStr) {
    // Alternative source
    // Implementation similar to crawlXoSo
    return null;
  }

  async saveToDatabase(result) {
    await prisma.lotteryResult.upsert({
      where: { date: new Date(result.date) },
      update: result,
      create: {
        ...result,
        date: new Date(result.date)
      }
    });
  }

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI
async function main() {
  const days = parseInt(process.argv[2]) || 365;
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  console.log(`🚀 Starting historical crawl for ${days} days`);
  console.log(`   From: ${startDate.toISOString().split('T')[0]}`);
  console.log(`   To: ${endDate.toISOString().split('T')[0]}`);

  const crawler = new HistoricalCrawler();
  await crawler.crawlRange(startDate, endDate);

  console.log('\n✅ Historical crawl completed!');
  process.exit(0);
}

if (require.main === module) {
  main()
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

module.exports = HistoricalCrawler;
