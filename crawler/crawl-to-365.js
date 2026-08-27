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
  // Get current count
  const currentCount = await prisma.lotteryResult.count();
  const target = 365;
  const needed = target - currentCount;
  
  console.log(`🚀 Current: ${currentCount} days`);
  console.log(`🎯 Target: ${target} days`);
  console.log(`📥 Need to crawl: ${needed} days\n`);
  
  if (needed <= 0) {
    console.log('✅ Already have enough data!');
    await prisma.$disconnect();
    process.exit(0);
  }
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  let success = 0;
  let startIdx = currentCount + 1;
  
  for (let i = startIdx; i <= startIdx + needed - 1; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Check if already exists
    const existing = await prisma.lotteryResult.findUnique({
      where: { date: new Date(dateStr) }
    });
    
    if (existing) {
      console.log(`  [${success + 1}/${needed}] ${dateStr} - Already exists, skipping`);
      success++;
      continue;
    }
    
    console.log(`  [${success + 1}/${needed}] ${dateStr}...`);
    const result = await crawlDate(browser, dateStr);
    
    if (result) {
      await saveToDatabase(result);
      success++;
      console.log(`    ✅ ĐB: ${result.special}`);
    } else {
      console.log(`    ⚠️  Failed`);
    }
    
    await sleep(2000);
    
    // Progress every 50
    if (success % 50 === 0) {
      const total = await prisma.lotteryResult.count();
      console.log(`\n  📊 Progress: ${total}/365 days in database\n`);
    }
  }
  
  await browser.close();
  
  const final = await prisma.lotteryResult.count();
  console.log(`\n📊 Final: ${final} days in database`);
  
  if (final >= 365) {
    console.log('✅ SUCCESS: 365 days completed!');
  } else {
    console.log(`⚠️  Still need ${365 - final} more days`);
  }
  
  await prisma.$disconnect();
  process.exit(0);
}

main();
