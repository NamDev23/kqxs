/**
 * PRODUCTION Puppeteer Crawler cho kqxsmb.co
 * Crawl REAL data với structure chính xác
 */

const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function crawlKQXSMB() {
  console.log('🚀 Starting REAL crawler...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    console.log('📍 Loading kqxsmb.co...');
    await page.goto('https://kqxsmb.co/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await sleep(3000); // Wait for JS rendering
    
    console.log('✅ Page loaded\n');
    console.log('🔍 Parsing structure...\n');
    
    const result = await page.evaluate(() => {
      const allText = document.body.innerText;
      
      // Extract date
      const dateMatch = allText.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
      let date = new Date();
      if (dateMatch) {
        const [_, day, month, year] = dateMatch;
        date = new Date(`${year}-${month}-${day}`);
      }
      
      // Extract all numbers by length
      const nums5 = allText.match(/\b\d{5}\b/g) || [];
      const nums4 = allText.match(/\b\d{4}\b/g) || [];
      const nums3 = allText.match(/\b\d{3}\b/g) || [];
      const nums2 = allText.match(/\b\d{2}\b/g) || [];
      
      // Parse theo cấu trúc XSMB chuẩn:
      // Giải ĐB: 1 số 5 chữ số
      // Giải nhất: 1 số 5 chữ số  
      // Giải nhì: 2 số 5 chữ số
      // Giải ba: 6 số 5 chữ số
      // Giải tư: 4 số 4 chữ số
      // Giải năm: 6 số 4 chữ số
      // Giải sáu: 3 số 3 chữ số
      // Giải bảy: 4 số 2 chữ số
      
      return {
        date: date.toISOString().split('T')[0],
        special: nums5[0] || '', // Giải ĐB
        first: nums5.slice(1, 2), // Giải nhất
        second: nums5.slice(2, 4), // Giải nhì
        third: nums5.slice(4, 10), // Giải ba
        fourth: nums4.slice(0, 4), // Giải tư
        fifth: nums4.slice(4, 10), // Giải năm
        sixth: nums3.slice(0, 3), // Giải sáu
        seventh: nums2.slice(0, 4) // Giải bảy
      };
    });
    
    console.log('📊 Parsed result:');
    console.log('Date:', result.date);
    console.log('Đặc biệt:', result.special);
    console.log('Giải nhất:', result.first);
    console.log('Giải nhì:', result.second);
    console.log('Giải ba:', result.third);
    console.log('Giải tư:', result.fourth);
    console.log('Giải năm:', result.fifth);
    console.log('Giải sáu:', result.sixth);
    console.log('Giải bảy:', result.seventh);
    
    await browser.close();
    
    return result;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (browser) await browser.close();
    return null;
  }
}

async function saveToDatabase(result) {
  console.log('\n💾 Saving to database...');
  
  try {
    await prisma.lotteryResult.upsert({
      where: { date: new Date(result.date) },
      update: {
        special: result.special,
        first: result.first,
        second: result.second,
        third: result.third,
        fourth: result.fourth,
        fifth: result.fifth,
        sixth: result.sixth,
        seventh: result.seventh
      },
      create: {
        date: new Date(result.date),
        special: result.special,
        first: result.first,
        second: result.second,
        third: result.third,
        fourth: result.fourth,
        fifth: result.fifth,
        sixth: result.sixth,
        seventh: result.seventh
      }
    });
    
    console.log('✅ Saved to database!');
    
  } catch (error) {
    console.error('❌ Save failed:', error.message);
  }
}

async function main() {
  const result = await crawlKQXSMB();
  
  if (result && result.special) {
    if (process.argv[2] === '--save') {
      await saveToDatabase(result);
      
      // Verify
      const count = await prisma.lotteryResult.count();
      console.log(`\n📊 Total records in DB: ${count}`);
    } else {
      console.log('\n💡 Run with --save to save to database');
    }
  } else {
    console.log('\n❌ Failed to parse result');
  }
  
  await prisma.$disconnect();
  process.exit(0);
}

main();
