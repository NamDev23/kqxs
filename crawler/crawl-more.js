const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function crawlDate(browser, dateStr) {
  const page = await browser.newPage();
  try {
    const [year, month, day] = dateStr.split('-');
    const url = `https://kqxsmb.co/xsmb-${day}-${month}-${year}.html`;
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
    
    const result = await page.evaluate(() => {
      const allText = document.body.innerText;
      const nums5 = allText.match(/\b\d{5}\b/g) || [];
      const nums4 = allText.match(/\b\d{4}\b/g) || [];
      const nums3 = allText.match(/\b\d{3}\b/g) || [];
      const nums2 = allText.match(/\b\d{2}\b/g) || [];
      
      return {
        special: nums5[0] || '',
        first: nums5.slice(1, 2),
        second: nums5.slice(2, 4),
        third: nums5.slice(4, 10),
        fourth: nums4.slice(0, 4),
        fifth: nums4.slice(4, 10),
        sixth: nums3.slice(0, 3),
        seventh: nums2.slice(0, 4)
      };
    });
    
    await page.close();
    if (result.special && result.special.length === 5) {
      return { date: dateStr, ...result };
    }
    return null;
  } catch (error) {
    await page.close();
    return null;
  }
}

async function saveToDatabase(result) {
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
}

async function main() {
  console.log('🚀 Crawling more days to reach 100...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  let success = 0;
  
  // Crawl from 04/02 back to 03/03 (30 more days)
  for (let i = 71; i <= 100; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    console.log(`  [${i}/100] ${dateStr}`);
    const result = await crawlDate(browser, dateStr);
    
    if (result) {
      await saveToDatabase(result);
      success++;
      console.log(`  ✅ ĐB: ${result.special}`);
    }
    
    await sleep(2000);
  }
  
  await browser.close();
  
  const total = await prisma.lotteryResult.count();
  console.log(`\n📊 Total in DB: ${total} records`);
  
  await prisma.$disconnect();
  process.exit(0);
}

main();
