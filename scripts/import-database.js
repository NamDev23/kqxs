const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

loadDatabaseUrl();
const prisma = new PrismaClient();

async function main() {
  const input = resolveInput(process.argv.slice(2));
  const payload = JSON.parse(fs.readFileSync(input, 'utf8'));
  if (payload.format !== 'kqxs-database-export-v1' || !payload.data) {
    throw new Error('Unsupported or invalid KQXS database export');
  }

  await upsertRows(payload.data.lotteryResults, (row) => prisma.lotteryResult.upsert({
    where: { id: row.id },
    update: lotteryResultData(row),
    create: { id: row.id, ...lotteryResultData(row), createdAt: date(row.createdAt) }
  }));
  await upsertRows(payload.data.predictions, (row) => prisma.prediction.upsert({
    where: { id: row.id },
    update: predictionData(row),
    create: { id: row.id, ...predictionData(row), createdAt: date(row.createdAt) }
  }));
  await upsertRows(payload.data.accuracyRecords, (row) => prisma.accuracyRecord.upsert({
    where: { predictionId: row.predictionId },
    update: accuracyData(row),
    create: { id: row.id, ...accuracyData(row), createdAt: date(row.createdAt) }
  }));
  await upsertRows(payload.data.predictionEvaluations, (row) => prisma.predictionEvaluation.upsert({
    where: { predictionId_kind: { predictionId: row.predictionId, kind: row.kind } },
    update: evaluationData(row),
    create: { id: row.id, ...evaluationData(row), createdAt: date(row.createdAt) }
  }));
  await upsertRows(payload.data.dailyLearningReports, (row) => prisma.dailyLearningReport.upsert({
    where: { date: date(row.date) },
    update: learningData(row),
    create: { id: row.id, ...learningData(row), createdAt: date(row.createdAt) }
  }));
  await upsertRows(payload.data.systemStats, (row) => prisma.systemStats.upsert({
    where: { date: date(row.date) },
    update: systemStatsData(row),
    create: { id: row.id, ...systemStatsData(row) }
  }));
  await upsertRows(payload.data.modelReviews, (row) => prisma.modelReview.upsert({
    where: { reviewDate_method: { reviewDate: date(row.reviewDate), method: row.method } },
    update: modelReviewData(row),
    create: { id: row.id, ...modelReviewData(row), createdAt: date(row.createdAt) }
  }));

  const counts = {
    lotteryResults: await prisma.lotteryResult.count(),
    predictions: await prisma.prediction.count(),
    accuracyRecords: await prisma.accuracyRecord.count(),
    predictionEvaluations: await prisma.predictionEvaluation.count(),
    dailyLearningReports: await prisma.dailyLearningReport.count(),
    systemStats: await prisma.systemStats.count(),
    modelReviews: await prisma.modelReview.count()
  };
  console.log(JSON.stringify({ ok: true, input, counts }, null, 2));
}

async function upsertRows(rows = [], operation) {
  for (const row of rows) await operation(row);
}

function lotteryResultData(row) {
  return pick(row, ['special', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'], {
    date: date(row.date)
  });
}

function predictionData(row) {
  return omitNullJson(pick(row, [
    'revision', 'de', 'lo2', 'lo3', 'bacang', 'bachThuLo', 'bachThuDe', 'songthulode',
    'dauduoi', 'sets', 'singles', 'backtest', 'analysisView', 'dataQuality', 'modelMeta',
    'snapshotHash', 'method', 'dataPoints'
  ], { date: date(row.date), predictionFor: date(row.predictionFor) }), [
    'sets', 'singles', 'backtest', 'analysisView', 'dataQuality', 'modelMeta'
  ]);
}

function accuracyData(row) {
  return pick(row, [
    'predictionId', 'deAccuracy', 'lo2Accuracy', 'lo3Accuracy', 'bacangAccuracy',
    'overallAccuracy', 'bachThuLoAccuracy', 'bachThuDeAccuracy', 'deCorrect', 'deTotal',
    'lo2Correct', 'lo2Total', 'lo3Correct', 'lo3Total', 'bachThuLoCorrect',
    'bachThuDeCorrect', 'verified'
  ], { date: date(row.date), verifiedAt: optionalDate(row.verifiedAt) });
}

function evaluationData(row) {
  return omitNullJson(pick(row, [
    'predictionId', 'kind', 'scope', 'method', 'modelProfile', 'edgeStatus', 'metricName',
    'issuedBeforeDraw', 'predictedNumbers', 'actualNumbers', 'hitNumbers', 'pickCount',
    'hitCount', 'isHit', 'metricValue', 'precision', 'baseline', 'realizedLift',
    'predictedProbability', 'backtestMetric', 'backtestBaseline', 'backtestLift', 'temporalStability'
  ], { date: date(row.date), snapshotDate: date(row.snapshotDate), issuedAt: date(row.issuedAt) }), [
    'temporalStability'
  ]);
}

function learningData(row) {
  return pick(row, ['resultSpecial', 'predictionCount', 'summary', 'byPrediction'], { date: date(row.date) });
}

function systemStatsData(row) {
  return pick(row, [
    'totalPredictions', 'correctPredictions', 'overallAccuracy', 'deAccuracy', 'lo2Accuracy',
    'lo3Accuracy', 'bacangAccuracy', 'last7DaysAccuracy', 'last30DaysAccuracy'
  ], { date: date(row.date) });
}

function modelReviewData(row) {
  return pick(row, ['method', 'liveDays', 'status', 'decision', 'liveMetrics', 'stabilityMetrics'], {
    reviewDate: date(row.reviewDate), dataThrough: date(row.dataThrough)
  });
}

function pick(row, keys, extra = {}) {
  return keys.reduce((result, key) => {
    if (row[key] !== undefined) result[key] = row[key];
    return result;
  }, { ...extra });
}

function omitNullJson(value, keys) {
  keys.forEach((key) => {
    if (value[key] === null) delete value[key];
  });
  return value;
}

function resolveInput(argv) {
  const argument = argv.find((value) => value.startsWith('--input='));
  if (!argument) throw new Error('Required: --input=/absolute/path/export.json');
  const input = path.resolve(argument.slice('--input='.length));
  if (!fs.existsSync(input)) throw new Error(`Export file not found: ${input}`);
  return input;
}

function date(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${value}`);
  return parsed;
}

function optionalDate(value) {
  return value ? date(value) : null;
}

function loadDatabaseUrl() {
  const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  const match = env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
  if (match && !process.env.DATABASE_URL) process.env.DATABASE_URL = match[1];
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
