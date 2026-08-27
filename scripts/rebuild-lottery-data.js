const fs = require('fs');
const path = require('path');
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

function parseArgs() {
  const args = {
    days: 365,
    end: getVietnamDateKey(),
    delay: 250,
    dryRun: false,
    pruneMissing: true
  };

  process.argv.slice(2).forEach((arg) => {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--keep-failed') args.pruneMissing = false;
    else if (arg.startsWith('--days=')) args.days = Number(arg.split('=')[1]);
    else if (arg.startsWith('--end=')) args.end = arg.split('=')[1];
    else if (arg.startsWith('--delay=')) args.delay = Number(arg.split('=')[1]);
  });

  if (!Number.isInteger(args.days) || args.days <= 0) {
    throw new Error('--days must be a positive integer');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.end)) {
    throw new Error('--end must use YYYY-MM-DD');
  }

  return args;
}

async function backupExistingRows() {
  const rows = await prisma.lotteryResult.findMany({ orderBy: { date: 'asc' } });
  const predictions = await prisma.prediction.findMany({ orderBy: { predictionFor: 'asc' } });
  const dir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `lottery-backup-${stamp}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        lotteryResults: rows,
        predictions
      },
      null,
      2
    )
  );

  return { file, rows: rows.length, predictions: predictions.length };
}

async function saveResult(result) {
  const data = {
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

  await prisma.lotteryResult.upsert({
    where: { date: data.date },
    update: data,
    create: data
  });
}

async function deleteResult(dateKey) {
  await prisma.lotteryResult.delete({
    where: { date: new Date(`${dateKey}T00:00:00.000Z`) }
  }).catch((error) => {
    if (error.code !== 'P2025') throw error;
  });
}

async function writeReport(report) {
  const dir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `lottery-rebuild-report-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  return file;
}

async function main() {
  const args = parseArgs();
  const start = addDays(args.end, -args.days + 1);
  const backup = await backupExistingRows();
  const report = {
    startedAt: new Date().toISOString(),
    dryRun: args.dryRun,
    range: { start, end: args.end, days: args.days },
    backup,
    success: [],
    failed: []
  };

  console.log('Rebuilding lottery data');
  console.log(`Range: ${start} -> ${args.end} (${args.days} days)`);
  console.log(`Backup: ${backup.file}`);
  console.log(args.dryRun ? 'Mode: dry-run' : 'Mode: write DB');

  for (let dateKey = start; dateKey <= args.end; dateKey = addDays(dateKey, 1)) {
    try {
      const fetched = await crawler.fetchDate(dateKey);
      const errors = validateResult(fetched.result);
      if (errors.length > 0) {
        throw new Error(errors.join('; '));
      }

      if (!args.dryRun) {
        await saveResult(fetched.result);
      }

      report.success.push({
        date: dateKey,
        special: fetched.result.special,
        de: fetched.result.special.slice(-2),
        verified: fetched.verified,
        sources: fetched.sources
      });
      console.log(`OK ${dateKey} DB ${fetched.result.special} ${fetched.verified ? 'verified' : fetched.sources.join(',')}`);
    } catch (error) {
      if (!args.dryRun && args.pruneMissing) {
        await deleteResult(dateKey);
      }

      report.failed.push({ date: dateKey, error: error.message });
      console.log(`FAIL ${dateKey} ${error.message}${!args.dryRun && args.pruneMissing ? ' (deleted existing row)' : ''}`);
    }

    if (args.delay > 0) {
      await sleep(args.delay);
    }
  }

  const finalCount = await prisma.lotteryResult.count();
  report.finishedAt = new Date().toISOString();
  report.finalCount = finalCount;
  report.reportFile = await writeReport(report);

  await prisma.systemLog.create({
    data: {
      type: 'crawl',
      message: args.dryRun ? 'Lottery rebuild dry-run completed' : 'Lottery rebuild completed',
      data: {
        range: report.range,
        success: report.success.length,
        failed: report.failed.length,
        backup: backup.file,
        report: report.reportFile
      }
    }
  }).catch(() => undefined);

  console.log('\nSummary');
  console.log(`Success: ${report.success.length}`);
  console.log(`Failed: ${report.failed.length}`);
  console.log(`Final DB count: ${finalCount}`);
  console.log(`Report: ${report.reportFile}`);

  if (report.failed.length > 0) {
    process.exitCode = 1;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
