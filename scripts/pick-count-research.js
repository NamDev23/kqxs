require('sucrase/register');

const fs = require('fs');
const {
  comparePickCounts,
  normalizeLotteryDraws
} = require('../lib/product-prediction-engine.ts');

function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = JSON.parse(fs.readFileSync(args.input, 'utf8'));
  const draws = normalizeLotteryDraws(payload.data?.lotteryResults ?? payload);
  const required = 180 + args.foldSize * args.folds;
  if (draws.length < required) {
    throw new Error(`Need at least ${required} draws, got ${draws.length}`);
  }

  const folds = [];
  for (let fold = 0; fold < args.folds; fold += 1) {
    const end = draws.length - args.foldSize * (args.folds - fold - 1);
    const prefix = draws.slice(0, end);
    folds.push({
      fold: fold + 1,
      fromDate: prefix[prefix.length - args.foldSize].date,
      toDate: prefix[prefix.length - 1].date,
      results: comparePickCounts(prefix, args.kind, args.counts, args.foldSize)
    });
  }

  const comparisons = args.counts.map((pickCount) => {
    const results = folds.map((fold) => {
      const summary = fold.results.find((entry) => entry.pickCount === pickCount)?.summary;
      if (!summary) throw new Error(`Missing result for pickCount=${pickCount}`);
      return {
        fold: fold.fold,
        fromDate: fold.fromDate,
        toDate: fold.toDate,
        precision: summary.precision,
        hitRate: summary.hitRate,
        averageHits: summary.averageHits,
        baseline: summary.baseline,
        lift: summary.lift
      };
    });
    const precision = mean(results.map((row) => row.precision));
    const baseline = mean(results.map((row) => row.baseline));
    return {
      pickCount,
      meanPrecision: round(precision),
      meanBaseline: round(baseline),
      pooledLift: round(ratio(precision, baseline)),
      meanHitRate: round(mean(results.map((row) => row.hitRate))),
      meanHitsPerDay: round(mean(results.map((row) => row.averageHits))),
      positiveFolds: results.filter((row) => row.precision > row.baseline).length,
      minimumFoldLift: Math.min(...results.map((row) => row.lift)),
      folds: results
    };
  }).sort((left, right) =>
    right.positiveFolds - left.positiveFolds ||
    right.pooledLift - left.pooledLift ||
    right.meanHitRate - left.meanHitRate ||
    left.pickCount - right.pickCount
  );

  console.log(JSON.stringify({
    data: {
      draws: draws.length,
      kind: args.kind,
      folds: args.folds,
      foldSize: args.foldSize,
      firstDate: draws[0]?.date,
      lastDate: draws[draws.length - 1]?.date
    },
    comparisons,
    policy: 'Chỉ giảm dàn nếu mọi fold không âm, precision/lift không giảm và sau đó còn phải qua live holdout.'
  }, null, 2));
}

function parseArgs(argv) {
  const inputArg = argv.find((arg) => arg.startsWith('--input='));
  const positionalInput = argv.find((arg) => !arg.startsWith('--'));
  const countsArg = argv.find((arg) => arg.startsWith('--counts='));
  const kindArg = argv.find((arg) => arg.startsWith('--kind='));
  const foldSizeArg = argv.find((arg) => arg.startsWith('--fold-size='));
  const foldsArg = argv.find((arg) => arg.startsWith('--folds='));
  if (!inputArg && !positionalInput) throw new Error('Required: --input=/absolute/path/export.json');
  return {
    input: inputArg ? inputArg.slice('--input='.length) : positionalInput,
    kind: kindArg?.slice('--kind='.length) || 'lo2',
    counts: (countsArg?.slice('--counts='.length) || '5,8,10,12,15')
      .split(',').map(Number).filter((value) => Number.isInteger(value) && value > 0),
    foldSize: positiveInt(foldSizeArg, '--fold-size=', 60),
    folds: positiveInt(foldsArg, '--folds=', 3)
  };
}

function positiveInt(arg, prefix, fallback) {
  if (!arg) return fallback;
  const value = Number(arg.slice(prefix.length));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function ratio(left, right) {
  return right > 0 ? left / right : 0;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

main();
