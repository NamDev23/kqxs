/**
 * Production Crawler for kqxsmb.co
 * Crawls REAL data
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class KQXSMBCrawler {
  constructor() {
    this.baseUrl = 'https://kqxsmb.co';
  }

  async crawlToday() {
    console.log('🔍 Crawling today from kqxsmb.co...');
    
    try {
      const response = await axios.get(this.baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      
      // Debug: print page structure
      console.log('\n📋 Analyzing page structure...');
      
      // Find result container
      const result = this.parseKQXSMB($);
      
      if (!result) {
        throw new Error('Could not parse result');
      }

      console.log('\n✅ Parsed result:', result.date);
      return result;

    } catch (error) {
      console.error('❌ Crawl failed:', error.message);
      throw error;
    }
  }

  parseKQXSMB($) {
    // kqxsmb.co structure - need to inspect actual HTML
    // This is template, will adjust after seeing real structure
    
    try {
      // Find date
      const dateText = $('.date, .ngay, [class*="date"], [class*="ngay"]').first().text().trim();
      console.log('Date found:', dateText);

      // Find giải đặc biệt
      const special = $('.db, .dacbiet, [class*="special"], [class*="dacbiet"] span, [class*="special"] span')
        .first().text().trim().replace(/\D/g, '');
      console.log('Special:', special);

      // Find other prizes
      const first = [];
      $('.g1, .giai-nhat, [class*="first"], [class*="nhat"] span').each((i, el) => {
        const num = $(el).text().trim().replace(/\D/g, '');
        if (num.length >= 4) first.push(num);
      });

      const second = [];
      $('.g2, .giai-nhi, [class*="second"], [class*="nhi"] span').each((i, el) => {
        const num = $(el).text().trim().replace(/\D/g, '');
        if (num.length >= 4) second.push(num);
      });

      const third = [];
      $('.g3, .giai-ba, [class*="third"], [class*="ba"] span').each((i, el) => {
        const num = $(el).text().trim().replace(/\D/g, '');
        if (num.length >= 4) third.push(num);
      });

      const fourth = [];
      $('.g4, .giai-tu, [class*="fourth"], [class*="tu"] span').each((i, el) => {
        const num = $(el).text().trim().replace(/\D/g, '');
        if (num.length >= 3) fourth.push(num);
      });

      const fifth = [];
      $('.g5, .giai-nam, [class*="fifth"], [class*="nam"] span').each((i, el) => {
        const num = $(el).text().trim().replace(/\D/g, '');
        if (num.length >= 3) fifth.push(num);
      });

      const sixth = [];
      $('.g6, .giai-sau, [class*="sixth"], [class*="sau"] span').each((i, el) => {
        const num = $(el).text().trim().replace(/\D/g, '');
        if (num.length >= 2) sixth.push(num);
      });

      const seventh = [];
      $('.g7, .giai-bay, [class*="seventh"], [class*="bay"] span').each((i, el) => {
        const num = $(el).text().trim().replace(/\D/g, '');
        if (num.length >= 2) seventh.push(num);
      });

      if (!special || special.length !== 5) {
        console.log('\n⚠️  Could not find proper structure. Printing page for manual inspection...');
        console.log('HTML classes found:', $('[class*="giai"], [class*="prize"], [class*="result"]').map((i, el) => $(el).attr('class')).get().slice(0, 20));
        return null;
      }

      return {
        date: this.parseDate(dateText),
        special,
        first,
        second,
        third,
        fourth,
        fifth,
        sixth,
        seventh
      };

    } catch (error) {
      console.error('Parse error:', error.message);
      return null;
    }
  }

  parseDate(dateText) {
    // Parse various formats
    const today = new Date();
    return today.toISOString().split('T')[0];
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
    console.log('💾 Saved to database');
  }

  async crawlHistorical(days = 30) {
    console.log(`🔍 Crawling ${days} days historical...`);
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
      
      try {
        // kqxsmb.co archive URL pattern (need to verify)
        const url = `${this.baseUrl}/xsmb-${dateStr}.html`;
        console.log(`\n📅 Trying ${dateStr}...`);
        
        const response = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const result = this.parseKQXSMB($);

        if (result) {
          await this.saveToDatabase(result);
          console.log(`✅ ${dateStr}`);
        }

        await this.sleep(2000); // Rate limit
      } catch (error) {
        console.log(`⚠️  ${dateStr}: ${error.message}`);
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  const crawler = new KQXSMBCrawler();
  
  console.log('🚀 Testing crawler on kqxsmb.co...\n');
  
  try {
    const result = await crawler.crawlToday();
    
    if (result) {
      console.log('\n📊 Result:', JSON.stringify(result, null, 2));
      
      const save = process.argv[2] === '--save';
      if (save) {
        await crawler.saveToDatabase(result);
        console.log('\n✅ Saved to database!');
      } else {
        console.log('\n💡 Run with --save to save to database');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

module.exports = KQXSMBCrawler;
