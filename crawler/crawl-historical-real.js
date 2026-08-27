const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function crawlDate(browser, dateStr) {
  const page = await browser.newPage();
  
  try {
    // CORRECT URL pattern: /xsmb-DD-MM-YYYY.html
    const [year, month, day] = dateStr.split('-');
    const url = `https://kqxsmb.co/xsmb-${day}-${month}-${year}.html`;
    
    console.log(`  📍 ${dateStr}`);
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await sleep(2000);
    
    const result = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tr'));
      const result = {
        special: '',
        first: [],
        second: [],
        third: [],
        fourth: [],
        fifth: [],
        sixth: [],
        seventh: []
      };

      const mapLabelToKey = (label) => {
        const normalized = label.replace(/\s+/g, '').toUpperCase();
        if (normalized === 'ĐB' || normalized === 'DB') return 'special';
        if (normalized === 'G.1') return 'first';
        if (normalized === 'G.2') return 'second';
        if (normalized === 'G.3') return 'third';
        if (normalized === 'G.4') return 'fourth';
        if (normalized === 'G.5') return 'fifth';
        if (normalized === 'G.6') return 'sixth';
        if (normalized === 'G.7') return 'seventh';
        return null;
      };

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return;

        const key = mapLabelToKey(cells[0].textContent || '');
        if (!key) return;

        const numbers = Array.from(cells[1].querySelectorAll('.number'))
          .map((node) => (node.textContent || '').replace(/\D/g, ''))
          .filter(Boolean);

        if (key === 'special') result.special = numbers[0] || '';
        else result[key] = numbers;
      });

      return result;
    });
    
    await page.close();
    
    const errors = validateResult({ date: dateStr, ...result });
    if (errors.length === 0) {
      return { date: dateStr, ...result };
    }

    console.log(`  ⚠️ Invalid parse: ${errors.join('; ')}`);
    
    return null;
    
  } catch (error) {
    console.log(`  ❌ Error`);
    await page.close();
    return null;
  }
}

async function saveToDatabase(result) {
  const errors = validateResult(result);
  if (errors.length > 0) {
    throw new Error(`Refusing to save invalid result for ${result.date}: ${errors.join('; ')}`);
  }

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

function validateResult(result) {
  const specs = [
    ['special', [result.special], 1, 5],
    ['first', result.first, 1, 5],
    ['second', result.second, 2, 5],
    ['third', result.third, 6, 5],
    ['fourth', result.fourth, 4, 4],
    ['fifth', result.fifth, 6, 4],
    ['sixth', result.sixth, 3, 3],
    ['seventh', result.seventh, 4, 2]
  ];

  const errors = [];
  specs.forEach(([name, values, expectedCount, digits]) => {
    if (!Array.isArray(values) || values.length !== expectedCount) {
      errors.push(`${name} expected ${expectedCount}, got ${Array.isArray(values) ? values.length : 'invalid'}`);
      return;
    }

    values.forEach((value) => {
      if (!new RegExp(`^\\d{${digits}}$`).test(String(value))) {
        errors.push(`${name} has invalid value ${value}`);
      }
    });
  });

  const year = String(result.date || '').slice(0, 4);
  if (year && (result.fourth || []).includes(year)) {
    errors.push(`fourth contains date year ${year}`);
  }

  return errors;
}

async function main() {
  const days = parseInt(process.argv[2]) || 30;
  
  console.log(`🚀 Crawling ${days} days...\n`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  let success = 0;
  let failed = 0;
  
  for (let i = 1; i <= days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const result = await crawlDate(browser, dateStr);
    
    if (result) {
      await saveToDatabase(result);
      success++;
      console.log(`  ✅ ĐB: ${result.special}`);
    } else {
      failed++;
    }
    
    await sleep(2000);
  }
  
  await browser.close();
  
  const total = await prisma.lotteryResult.count();
  
  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Success: ${success}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📊 Total: ${total} records`);
  
  await prisma.$disconnect();
  process.exit(0);
}

main();
