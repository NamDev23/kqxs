require('sucrase/register');

const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { normalizeLotteryDraws } = require('../lib/product-prediction-engine.ts');
const { buildPredictionEvaluations } = require('../lib/prediction-evaluation.ts');

loadDatabaseUrl();
const prisma = new PrismaClient();

async function main() {
  const [predictions, resultRows] = await Promise.all([
    prisma.prediction.findMany({ orderBy: { predictionFor: 'asc' } }),
    prisma.lotteryResult.findMany({ orderBy: { date: 'asc' } })
  ]);
  const results = new Map(
    normalizeLotteryDraws(resultRows).map((draw) => [draw.date, draw])
  );
  let snapshots = 0;
  let eligibleSnapshots = 0;
  let rows = 0;

  for (const prediction of predictions) {
    const draw = results.get(dateKey(prediction.predictionFor));
    if (!draw) continue;
    const evaluations = buildPredictionEvaluations(prediction, draw);
    for (const evaluation of evaluations) {
      await prisma.predictionEvaluation.upsert({
        where: {
          predictionId_kind: {
            predictionId: prediction.id,
            kind: evaluation.kind
          }
        },
        update: evaluation,
        create: evaluation
      });
      rows += 1;
    }
    snapshots += 1;
    if (evaluations[0]?.issuedBeforeDraw) eligibleSnapshots += 1;
  }

  console.log(JSON.stringify({
    ok: true,
    predictionsWithResults: snapshots,
    eligiblePreDrawSnapshots: eligibleSnapshots,
    evaluationRows: rows,
    note: 'Post-draw rows are retained for audit but excluded from live outcome reports.'
  }, null, 2));
}

function loadDatabaseUrl() {
  const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  const match = env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
  if (match && !process.env.DATABASE_URL) process.env.DATABASE_URL = match[1];
}

function dateKey(value) {
  return value.toISOString().slice(0, 10);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
