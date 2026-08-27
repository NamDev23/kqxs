require('sucrase/register');

const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const {
  PRODUCT_METHOD,
  normalizeLotteryDraws,
  scorePredictionAgainstDraw
} = require('../lib/product-prediction-engine.ts');

loadDatabaseUrl();
const prisma = new PrismaClient();

async function main() {
  const [predictions, resultRows] = await Promise.all([
    prisma.prediction.findMany({
      where: { method: { startsWith: 'Product Walk-Forward Ensemble' } },
      orderBy: [
        { predictionFor: 'asc' },
        { createdAt: 'asc' },
        { revision: 'asc' }
      ]
    }),
    prisma.lotteryResult.findMany({ orderBy: { date: 'asc' } })
  ]);

  const results = new Map(
    normalizeLotteryDraws(resultRows).map((draw) => [draw.date, draw])
  );
  const canonical = new Map();

  for (const prediction of predictions) {
    const target = dateKey(prediction.predictionFor);
    if (!results.has(target) || prediction.createdAt >= drawTimeUtc(target)) continue;
    if (!canonical.has(target)) canonical.set(target, prediction);
  }

  const days = Array.from(canonical.entries()).map(([target, prediction]) => {
    const draw = results.get(target);
    const sets = {
      de: scorePredictionAgainstDraw(prediction.de, draw, 'de'),
      lo2: scorePredictionAgainstDraw(prediction.lo2, draw, 'lo2'),
      lo3: scorePredictionAgainstDraw(prediction.lo3, draw, 'lo3'),
      bacang: scorePredictionAgainstDraw(prediction.bacang, draw, 'bacang')
    };
    const singles = {
      bachThuLo: scorePredictionAgainstDraw(
        [prediction.bachThuLo || prediction.lo2[0]].filter(Boolean),
        draw,
        'lo2'
      ),
      bachThuDe: scorePredictionAgainstDraw(
        [prediction.bachThuDe || prediction.de[0]].filter(Boolean),
        draw,
        'de'
      )
    };

    return {
      date: target,
      issuedAt: prediction.createdAt.toISOString(),
      revision: prediction.revision || 1,
      special: draw.special,
      predictions: {
        de: prediction.de,
        lo2: prediction.lo2,
        lo3: prediction.lo3,
        bacang: prediction.bacang,
        bachThuLo: prediction.bachThuLo,
        bachThuDe: prediction.bachThuDe
      },
      hits: {
        de: sets.de.hits,
        lo2: sets.lo2.hits,
        lo3: sets.lo3.hits,
        bacang: sets.bacang.hits,
        bachThuLo: singles.bachThuLo.hits,
        bachThuDe: singles.bachThuDe.hits
      }
    };
  });

  console.log(JSON.stringify({
    currentMethod: PRODUCT_METHOD,
    eligibleLiveDays: days.length,
    note: days.length < 30
      ? 'Mẫu live dưới 30 kỳ; chỉ báo cáo quan sát, chưa dùng để đổi model.'
      : 'Chỉ dùng snapshot canonical được phát trước giờ quay.',
    performance: summarize(days),
    days
  }, null, 2));
}

function summarize(days) {
  const definitions = {
    de: (day) => [day.predictions.de, day.hits.de],
    lo2: (day) => [day.predictions.lo2, day.hits.lo2],
    lo3: (day) => [day.predictions.lo3, day.hits.lo3],
    bacang: (day) => [day.predictions.bacang, day.hits.bacang],
    bachThuLo: (day) => [[day.predictions.bachThuLo].filter(Boolean), day.hits.bachThuLo],
    bachThuDe: (day) => [[day.predictions.bachThuDe].filter(Boolean), day.hits.bachThuDe]
  };

  return Object.fromEntries(Object.entries(definitions).map(([kind, select]) => {
    let hitDays = 0;
    let totalHits = 0;
    let totalPicks = 0;
    days.forEach((day) => {
      const [picks, hits] = select(day);
      if (hits.length > 0) hitDays += 1;
      totalHits += hits.length;
      totalPicks += picks.length;
    });
    return [kind, {
      hitDays,
      testedDays: days.length,
      hitRate: percent(hitDays, days.length),
      totalHits,
      totalPicks,
      precision: percent(totalHits, totalPicks)
    }];
  }));
}

function loadDatabaseUrl() {
  const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  const match = env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
  if (match && !process.env.DATABASE_URL) process.env.DATABASE_URL = match[1];
}

function drawTimeUtc(value) {
  return new Date(`${value}T11:15:00.000Z`);
}

function dateKey(value) {
  return value.toISOString().slice(0, 10);
}

function percent(value, total) {
  return total > 0 ? Math.round((value / total) * 10_000) / 100 : 0;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
