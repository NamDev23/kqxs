/**
 * PRODUCTION Crawler - MinhNgoc.net.vn API
 * REAL DATA - Not demo!
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class MinhNgocAPI {
  constructor() {
    this.baseUrl = 'https://www.minhngoc.net.vn';
  }

  async fetchLatest() {
    console.log('🔍 Fetching latest result from minhngoc.net.vn...');
    
    try {
      // Try API endpoint
      const url = `${this.baseUrl}/xo-so-truc-tiep/mien-bac.html`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 15000
      });

      const cheerio = require('cheerio');
      const $ = cheerio.load(response.data);
      
      // MinhNgoc structure
      const result = {
        date: this.getToday(),
        special: '',
        first: [],
        second: [],
        third: [],
        fourth: [],
        fifth: [],
        sixth: [],
        seventh: []
      };

      // Giải đặc biệt
      const special = $('.giaidb .kettqua, .giai-db .number, div[class*="db"] .so-prize').first().text().trim().replace(/\D/g, '');
      result.special = special;

      // Giải nhất
      $('.giai1 .kettqua, .giai-1 .number, div[class*="g1"] .so-prize').each((i, el) => {
        const num = $(el).text().trim().replace(/\D/g, '');
        if (num.length === 5) result.first.push(num);
      });

      // Giải nhì
      $('.giai2 .kettqua, .giai-2 .number, div[class*="g2"] .so-prize').each((i, el) => {
        const num = $(el).text().trim().replace(/\D/g, '');
        if (num.length === 5) result.second.push(num);
      });

      // Giải ba
      $('.giai3 .kettqua, .giai-3 .number, div[class*="g3"] .so-prize').each((i, el) => {
        const num = $(el).text().trim().replace(/\D/g, '');
        if (num.length === 5) result.third.push(num);
      });

      // Giải tư
      $('.giai4 .kettqua, .giai-4 .number, div[class*="g4"] .so-prize').each((i, el) => {
        const num = $(el).text().trim().replace(/\D/g, '');
        if (num.length === 4) result.fourth.push(num);
      });

      // Giải năm
      $('.giai5 .kettqua, .giai-5 .number, div[class*="g5"] .so-prize').each((i, el) => {
        const num = $(el).text().trim().replace(/\D/g, '');
        if (num.length === 4) result.fifth.push(num);
      });

      // Giải sáu
      $('.giai6 .kettqua, .giai-6 .number, div[class*="g6"] .so-prize').each((i, el) => {
        const num = $(el).text().trim().replace(/\D/g, '');
        if (num.length === 3) result.sixth.push(num);
      });

      // Giải bảy
      $('.giai7 .kettqua, .giai-7 .number, div[class*="g7"] .so-prize').each((i, el) => {
        const num = $(el).text().trim().replace(/\D/g, '');
        if (num.length === 2) result.seventh.push(num);
      });

      if (!result.special || result.special.length !== 5) {
        console.log('⚠️  Structure changed, trying alternative...');
        return await this.tryAlternativeSource();
      }

      console.log('✅ Parsed:', result.date, '- Special:', result.special);
      return result;

    } catch (error) {
      console.error('❌ Error:', error.message);
      return null;
    }
  }

  async tryAlternativeSource() {
    // Backup: xoso.net or xosodaiphat
    console.log('🔄 Trying xoso.net...');
    
    try {
      const url = 'https://xoso.net/xsmb.html';
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000
      });

      const cheerio = require('cheerio');
      const $ = cheerio.load(response.data);

      const result = {
        date: this.getToday(),
        special: $('.giaidb, .special').first().text().trim().replace(/\D/g, ''),
        first: [],
        second: [],
        third: [],
        fourth: [],
        fifth: [],
        sixth: [],
        seventh: []
      };

      // Parse structure (simplified)
      return result.special ? result : null;

    } catch (error) {
      console.error('❌ Alternative failed:', error.message);
      return null;
    }
  }

  async crawlHistorical(days = 365) {
    console.log(`\n📅 Crawling ${days} days historical data...`);
    
    let success = 0;
    let failed = 0;

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = this.formatDate(date);

      try {
        console.log(`\n[${i+1}/${days}] ${dateStr}...`);
        
        // MinhNgoc historical URL
        const [d, m, y] = dateStr.split('-').reverse();
        const url = `${this.baseUrl}/ket-qua-xo-so-mien-bac-xsmb-${d}-${m}-${y}.html`;
        
        const response = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 10000
        });

        const cheerio = require('cheerio');
        const $ = cheerio.load(response.data);
        
        const result = this.parseHistoricalPage($, dateStr);
        
        if (result && result.special) {
          await this.save(result);
          success++;
          console.log(`✅ ${dateStr}`);
        } else {
          failed++;
          console.log(`⚠️  No data`);
        }

        await this.sleep(1500); // Rate limit

      } catch (error) {
        failed++;
        console.log(`❌ ${dateStr}: ${error.message}`);
      }
    }

    console.log(`\n📊 Done: ✅ ${success} | ❌ ${failed}`);
  }

  parseHistoricalPage($, date) {
    // Similar to fetchLatest but for historical pages
    const result = {
      date,
      special: $('.giaidb .so-prize, .giai-db .so-prize').first().text().trim().replace(/\D/g, ''),
      first: [],
      second: [],
      third: [],
      fourth: [],
      fifth: [],
      sixth: [],
      seventh: []
    };

    $('.giai1 .so-prize').each((i, el) => {
      const n = $(el).text().trim().replace(/\D/g, '');
      if (n.length === 5) result.first.push(n);
    });

    $('.giai2 .so-prize').each((i, el) => {
      const n = $(el).text().trim().replace(/\D/g, '');
      if (n.length === 5) result.second.push(n);
    });

    $('.giai3 .so-prize').each((i, el) => {
      const n = $(el).text().trim().replace(/\D/g, '');
      if (n.length === 5) result.third.push(n);
    });

    $('.giai4 .so-prize').each((i, el) => {
      const n = $(el).text().trim().replace(/\D/g, '');
      if (n.length === 4) result.fourth.push(n);
    });

    $('.giai5 .so-prize').each((i, el) => {
      const n = $(el).text().trim().replace(/\D/g, '');
      if (n.length === 4) result.fifth.push(n);
    });

    $('.giai6 .so-prize').each((i, el) => {
      const n = $(el).text().trim().replace(/\D/g, '');
      if (n.length === 3) result.sixth.push(n);
    });

    $('.giai7 .so-prize').each((i, el) => {
      const n = $(el).text().trim().replace(/\D/g, '');
      if (n.length === 2) result.seventh.push(n);
    });

    return result;
  }

  async save(result) {
    await prisma.lotteryResult.upsert({
      where: { date: new Date(result.date) },
      update: result,
      create: {
        ...result,
        date: new Date(result.date)
      }
    });
  }

  getToday() {
    return new Date().toISOString().split('T')[0];
  }

  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  const api = new MinhNgocAPI();
  
  const action = process.argv[2];
  
  if (action === '--historical') {
    const days = parseInt(process.argv[3]) || 365;
    console.log(`🚀 Crawling ${days} days historical\n`);
    await api.crawlHistorical(days);
  } else {
    console.log('🚀 Testing latest result\n');
    const result = await api.fetchLatest();
    
    if (result) {
      console.log('\n📊 Result:', JSON.stringify(result, null, 2));
      
      if (process.argv[2] === '--save') {
        await api.save(result);
        console.log('\n✅ Saved to database!');
      }
    }
  }
  
  process.exit(0);
}

if (require.main === module) {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

module.exports = MinhNgocAPI;
