require('sucrase/register');

const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const {
  compareRegisteredProfiles,
  normalizeLotteryDraws
} = require('../lib/product-prediction-engine.ts');

loadDatabaseUrl();
const prisma = new PrismaClient();

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = normalizeLotteryDraws(
    await prisma.lotteryResult.findMany({ orderBy: { date: 'asc' } })
  );
  const required = 180 + args.foldSize * args.folds;
  if (rows.length < required) {
    throw new Error(`Need at least ${required} draws for ${args.folds} folds, got ${rows.length}`);
  }

  const folds = [];
  for (let fold = 0; fold < args.folds; fold += 1) {
    const end = rows.length - args.foldSize * (args.folds - fold - 1);
    const prefix = rows.slice(0, end);
    folds.push({
      fold: fold + 1,
      fromDate: prefix[prefix.length - args.foldSize].date,
      toDate: prefix[prefix.length - 1].date,
      comparisons: compareRegisteredProfiles(prefix, args.foldSize)
    });
  }

  const profileIds = folds[0].comparisons.map((entry) => entry.profile);
  const kinds = ['de', 'lo2', 'lo3', 'bacang'];
  const byKind = Object.fromEntries(kinds.map((kind) => {
    const profiles = profileIds.map((profile) => {
      const results = folds.map((fold) => {
        const comparison = fold.comparisons.find((entry) => entry.profile === profile);
        const summary = comparison.summaries.find((entry) => entry.kind === kind);
        return {
          fold: fold.fold,
          fromDate: fold.fromDate,
          toDate: fold.toDate,
          metric: summary.primaryMetric,
          baseline: summary.baseline,
          lift: summary.lift,
          hitRate: summary.hitRate,
          precision: summary.precision
        };
      });
      const metric = mean(results.map((entry) => entry.metric));
      const baseline = mean(results.map((entry) => entry.baseline));
      return {
        profile,
        meanMetric: round(metric),
        meanBaseline: round(baseline),
        pooledLift: round(ratio(metric, baseline)),
        minimumFoldLift: Math.min(...results.map((entry) => entry.lift)),
        positiveFolds: results.filter((entry) => entry.metric > entry.baseline).length,
        metricStdDev: round(stdDev(results.map((entry) => entry.metric))),
        folds: results
      };
    }).sort((left, right) =>
      right.positiveFolds - left.positiveFolds ||
      right.pooledLift - left.pooledLift ||
      left.metricStdDev - right.metricStdDev ||
      left.profile.localeCompare(right.profile)
    );

    const production = profiles.find((entry) => entry.profile === 'balanced');
    const challenger = profiles.find((entry) => entry.profile === 'robust_consensus');
    return [kind, {
      ranking: profiles,
      challengerDecision: decideChallenger(production, challenger, args.folds)
    }];
  }));

  console.log(JSON.stringify({
    data: {
      draws: rows.length,
      firstDate: rows[0].date,
      lastDate: rows[rows.length - 1].date,
      folds: args.folds,
      foldSize: args.foldSize,
      slices: folds.map(({ fold, fromDate, toDate }) => ({ fold, fromDate, toDate }))
    },
    byKind,
    policy: 'Không tự động promote. Challenger phải thắng production ngoài mẫu, không có fold âm và tiếp tục được xác minh bằng snapshot live.'
  }, null, 2));
}

function decideChallenger(production, challenger, folds) {
  if (!production || !challenger) return { promote: false, reason: 'Thiếu production hoặc challenger.' };
  const liftGain = challenger.pooledLift - production.pooledLift;
  const promote = (
    challenger.positiveFolds === folds &&
    challenger.minimumFoldLift >= 1 &&
    liftGain >= 0.03
  );
  return {
    promote,
    liftGain: round(liftGain),
    reason: promote
      ? 'Challenger vượt production ổn định; vẫn cần theo dõi live trước khi đổi mặc định.'
      : 'Chưa đạt đồng thời: mọi fold dương, lift tối thiểu >= 1 và gain >= 0.03.'
  };
}

function parseArgs(argv) {
  return argv.reduce((result, arg) => {
    if (arg.startsWith('--fold-size=')) result.foldSize = positiveInt(arg, '--fold-size=', result.foldSize);
    if (arg.startsWith('--folds=')) result.folds = positiveInt(arg, '--folds=', result.folds);
    return result;
  }, { foldSize: 60, folds: 3 });
}

function positiveInt(arg, prefix, fallback) {
  const value = Number(arg.slice(prefix.length));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function loadDatabaseUrl() {
  const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  const match = env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
  if (match && !process.env.DATABASE_URL) process.env.DATABASE_URL = match[1];
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function stdDev(values) {
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

function ratio(left, right) {
  return right > 0 ? left / right : 0;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
