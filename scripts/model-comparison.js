require('sucrase/register');

const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const {
  compareRegisteredProfiles,
  normalizeLotteryDraws
} = require('../lib/product-prediction-engine.ts');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawRows = args.file ? loadRowsFromFile(args.file) : await loadRowsFromDatabase();
  const rows = normalizeLotteryDraws(rawRows);
  const holdoutDays = Math.min(args.holdout, Math.floor((rows.length - 180) / 2));

  if (holdoutDays < 30) {
    throw new Error(`Need at least 240 valid draws for a useful split, got ${rows.length}`);
  }

  const developmentRows = rows.slice(0, -holdoutDays);
  const development = compareRegisteredProfiles(developmentRows, holdoutDays);
  const holdout = compareRegisteredProfiles(rows, holdoutDays);
  const kinds = ['de', 'lo2', 'lo3', 'bacang'];

  const report = {
    data: {
      draws: rows.length,
      firstDate: rows[0].date,
      lastDate: rows[rows.length - 1].date,
      developmentThrough: developmentRows[developmentRows.length - 1].date,
      holdoutDays
    },
    byKind: Object.fromEntries(kinds.map((kind) => {
      const selected = bestProfile(development, kind);
      const selectedHoldout = summaryFor(holdout, selected.profile, kind);
      const productionHoldout = summaryFor(holdout, 'balanced', kind);

      return [kind, {
        developmentChoice: selected.profile,
        developmentMetric: selected.primaryMetric,
        holdoutMetric: selectedHoldout.primaryMetric,
        holdoutBaseline: selectedHoldout.baseline,
        holdoutLift: selectedHoldout.lift,
        productionProfile: 'balanced',
        productionHoldoutMetric: productionHoldout.primaryMetric,
        productionHoldoutLift: productionHoldout.lift,
        promoted: false
      }];
    })),
    warning: 'Không tự động đổi model từ báo cáo này. Chỉ promote sau holdout độc lập và tiếp tục theo dõi live snapshot.'
  };

  console.log(JSON.stringify(report, null, 2));
}

function bestProfile(comparisons, kind) {
  return comparisons
    .map((entry) => ({
      profile: entry.profile,
      ...entry.summaries.find((summary) => summary.kind === kind)
    }))
    .sort((left, right) =>
      right.primaryMetric - left.primaryMetric || left.profile.localeCompare(right.profile)
    )[0];
}

function summaryFor(comparisons, profile, kind) {
  return comparisons
    .find((entry) => entry.profile === profile)
    .summaries.find((summary) => summary.kind === kind);
}

function loadRowsFromFile(file) {
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.lotteryResults)) return payload.lotteryResults;
  throw new Error('Input JSON must be an array or contain lotteryResults[]');
}

async function loadRowsFromDatabase() {
  const prisma = new PrismaClient();
  try {
    return await prisma.lotteryResult.findMany({ orderBy: { date: 'asc' } });
  } finally {
    await prisma.$disconnect();
  }
}

function parseArgs(argv) {
  return argv.reduce((result, arg) => {
    if (arg.startsWith('--file=')) result.file = arg.slice('--file='.length);
    if (arg.startsWith('--holdout=')) {
      const value = Number(arg.slice('--holdout='.length));
      if (Number.isFinite(value) && value > 0) result.holdout = Math.floor(value);
    }
    return result;
  }, { file: null, holdout: 90 });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
