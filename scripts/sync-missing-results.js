const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const {
  XsmbSourceCrawler,
  addDays,
  getVietnamDateKey,
  validateResult
} = require('../crawler/xsmb-source-crawler');

const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const match = env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
if (match && !process.env.DATABASE_URL) process.env.DATABASE_URL = match[1];

const prisma = new PrismaClient();
const crawler = new XsmbSourceCrawler();
const MAX_CATCH_UP_DAYS = 90;

async function main() {
  const latest = await prisma.lotteryResult.findFirst({ orderBy: { date: 'desc' } });
  const endDate = latestAvailableResultDate();
  const latestDate = latest ? latest.date.toISOString().slice(0, 10) : addDays(endDate, -MAX_CATCH_UP_DAYS);
  const startDate = addDays(latestDate, 1);

  if (startDate > endDate) {
    console.log(`Result sync is current through ${latestDate}`);
    return;
  }

  const gap = daysBetween(startDate, endDate) + 1;
  if (gap > MAX_CATCH_UP_DAYS) {
    throw new Error(`Refusing automatic catch-up of ${gap} days; run the audited rebuild command instead`);
  }

  const saved = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    const fetched = await crawler.fetchDate(date);
    if (!fetched.verified || fetched.sources.length < 2) {
      throw new Error(`Result ${date} is not independently verified by two sources`);
    }

    const errors = validateResult(fetched.result);
    if (errors.length > 0) throw new Error(`Invalid result ${date}: ${errors.join('; ')}`);

    await prisma.lotteryResult.upsert({
      where: { date: new Date(`${date}T00:00:00.000Z`) },
      update: resultData(fetched.result),
      create: resultData(fetched.result)
    });
    saved.push({ date, special: fetched.result.special, sources: fetched.sources });
    console.log(`Synced ${date}: ${fetched.result.special} (${fetched.sources.join(' + ')})`);
  }

  await prisma.systemLog.create({
    data: {
      type: 'result_sync',
      message: 'Verified result catch-up completed',
      data: { startDate, endDate, count: saved.length, saved }
    }
  });
}

function resultData(result) {
  return {
    date: new Date(`${result.date}T00:00:00.000Z`),
    special: result.special,
    first: result.first,
    second: result.second,
    third: result.third,
    fourth: result.fourth,
    fifth: result.fifth,
    sixth: result.sixth,
    seventh: result.seventh
  };
}

function latestAvailableResultDate(now = new Date()) {
  const today = getVietnamDateKey(now);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === 'hour').value);
  const minute = Number(parts.find((part) => part.type === 'minute').value);
  const ready = hour > 18 || (hour === 18 && minute >= 40);
  return ready ? today : addDays(today, -1);
}

function daysBetween(from, to) {
  return Math.round((new Date(`${to}T00:00:00.000Z`) - new Date(`${from}T00:00:00.000Z`)) / 86400000);
}

main()
  .catch(async (error) => {
    console.error(error);
    await prisma.systemLog.create({
      data: {
        type: 'error',
        message: 'Verified result sync failed',
        data: { error: error.message }
      }
    }).catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
