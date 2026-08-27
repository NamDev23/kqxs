const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

loadDatabaseUrl();
const prisma = new PrismaClient();

async function main() {
  const output = resolveOutput(process.argv.slice(2));
  const [
    lotteryResults,
    predictions,
    accuracyRecords,
    predictionEvaluations,
    dailyLearningReports,
    systemStats,
    modelReviews
  ] = await Promise.all([
    prisma.lotteryResult.findMany({ orderBy: { date: 'asc' } }),
    prisma.prediction.findMany({ orderBy: [{ predictionFor: 'asc' }, { createdAt: 'asc' }] }),
    prisma.accuracyRecord.findMany({ orderBy: { date: 'asc' } }),
    prisma.predictionEvaluation.findMany({ orderBy: [{ date: 'asc' }, { issuedAt: 'asc' }] }),
    prisma.dailyLearningReport.findMany({ orderBy: { date: 'asc' } }),
    prisma.systemStats.findMany({ orderBy: { date: 'asc' } }),
    prisma.modelReview.findMany({ orderBy: { reviewDate: 'asc' } })
  ]);
  const payload = {
    format: 'kqxs-database-export-v1',
    exportedAt: new Date().toISOString(),
    counts: {
      lotteryResults: lotteryResults.length,
      predictions: predictions.length,
      accuracyRecords: accuracyRecords.length,
      predictionEvaluations: predictionEvaluations.length,
      dailyLearningReports: dailyLearningReports.length,
      systemStats: systemStats.length,
      modelReviews: modelReviews.length
    },
    data: {
      lotteryResults,
      predictions,
      accuracyRecords,
      predictionEvaluations,
      dailyLearningReports,
      systemStats,
      modelReviews
    }
  };

  fs.writeFileSync(output, JSON.stringify(payload));
  fs.chmodSync(output, 0o600);
  console.log(JSON.stringify({ ok: true, output, counts: payload.counts }, null, 2));
}

function resolveOutput(argv) {
  const argument = argv.find((value) => value.startsWith('--output='));
  if (!argument) throw new Error('Required: --output=/absolute/path/export.json');
  const output = path.resolve(argument.slice('--output='.length));
  if (!path.isAbsolute(output)) throw new Error('Output path must be absolute');
  return output;
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
