require('sucrase/register');

const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const {
  PRODUCT_METHOD,
  actualNumbersForKind,
  createProductPrediction,
  normalizeLotteryDraws
} = require('../lib/product-prediction-engine.ts');
const { validateResult } = require('../crawler/xsmb-source-crawler');
const { buildModelOutcomeMonitor } = require('../lib/model-outcome-monitor.ts');
const {
  settleOfficialLoto2,
  settleOfficialLoto3,
  settleOfficialPairs
} = require('../lib/legal-lottery-products.ts');

const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const match = env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
if (match && !process.env.DATABASE_URL) process.env.DATABASE_URL = match[1];

const prisma = new PrismaClient();
const VI_TIMEZONE = 'Asia/Ho_Chi_Minh';
const RESULT_READY_HOUR = 18;
const RESULT_READY_MINUTE = 40;

async function main() {
  const rows = await prisma.lotteryResult.findMany({ orderBy: { date: 'asc' } });
  assert(rows.length >= 180, `Need at least 180 valid draws, got ${rows.length}`);

  const invalidRows = rows
    .map(toCrawlerResult)
    .map((result) => ({ date: result.date, errors: validateResult(result) }))
    .filter((item) => item.errors.length > 0);
  assert(invalidRows.length === 0, `Invalid lottery rows: ${JSON.stringify(invalidRows.slice(0, 5))}`);

  const normalized = normalizeLotteryDraws(rows);
  assert(normalized.length === rows.length, `Normalization dropped ${rows.length - normalized.length} rows`);
  const malformed = normalizeLotteryDraws([{
    ...rows[0],
    special: '',
    date: rows[0].date
  }]);
  assert(malformed.length === 0, 'Malformed values must not be silently padded to zero');

  const latest = normalized[normalized.length - 1];
  const de = Array.from(actualNumbersForKind(latest, 'de'));
  const bacang = Array.from(actualNumbersForKind(latest, 'bacang'));
  assert(de.length === 1 && de[0] === latest.special.slice(-2), 'Đề must be 2 số cuối giải đặc biệt');
  assert(bacang.length === 1 && bacang[0] === latest.special.slice(-3), '3 càng must be 3 số cuối giải đặc biệt');

  const target = getRuntimeTarget();
  const analysis = createProductPrediction(normalized, target.targetDate);
  assert(analysis.meta.method === PRODUCT_METHOD, 'Unexpected prediction method');
  assert(analysis.dataQuality.blockingReasons.length === 0, `Blocking data issues: ${analysis.dataQuality.blockingReasons.join('; ')}`);
  assert(analysis.dataQuality.canPublish, 'Fresh validated data should pass the publish gate');
  assert(analysis.backtest.aggregate.testedDraws > 0, 'Backtest did not run');
  assert(Number.isFinite(analysis.backtest.aggregate.lift), 'Aggregate lift is not finite');
  assert(typeof analysis.dataQuality.canPublish === 'boolean', 'Missing publish gate');
  assert(analysis.analysis.frequency.length === 100, '00-99 matrix is incomplete');

  assertNumberList('de', analysis.prediction.de, 10, 2);
  assertNumberList('lo2', analysis.prediction.lo2, 8, 2);
  assertNumberList('lo3', analysis.prediction.lo3, 10, 3);
  assertNumberList('bacang', analysis.prediction.bacang, 5, 3);
  assertSingleNumber('bachThuLo', analysis.prediction.bachThuLo, 2);
  assertSingleNumber('bachThuDe', analysis.prediction.bachThuDe, 2);

  [['xien2', 2, 5], ['xien3', 3, 3], ['xien4', 4, 2]].forEach(([kind, size, pickCount]) => {
    const combination = analysis.prediction.combinations[kind];
    assert(combination.kind === kind, `Unexpected combination kind ${combination.kind}`);
    assert(combination.size === size, `${kind} expected size ${size}`);
    assert(combination.picks.length === pickCount, `${kind} expected ${pickCount} picks`);
    assert(combination.testedDraws > 0, `${kind} is missing walk-forward evidence`);
    assert(Number.isFinite(combination.backtestLift), `${kind} has invalid lift`);
    assert(['qualified', 'watch', 'research_only'].includes(combination.edgeStatus), `Invalid status for ${kind}`);
    combination.picks.forEach((pick) => {
      assertNumberList(kind, pick.numbers, size, 2);
      assert(new Set(pick.numbers).size === size, `${kind} contains duplicate numbers`);
      assert(Number.isFinite(pick.probability), `${kind} has invalid probability`);
    });
  });

  Object.values(analysis.sets).forEach((set) => {
    assert(['qualified', 'watch', 'research_only'].includes(set.edgeStatus), `Invalid edge status for ${set.kind}`);
    assert(set.testedDraws > 0, `Missing backtest attachment for ${set.kind}`);
    assert(Number.isFinite(set.backtestLift), `Invalid backtest lift for ${set.kind}`);
    const summary = analysis.backtest.summaries.find((item) => item.kind === set.kind);
    assert(summary && Number.isFinite(summary.edgeInterval.low), `Missing CI95 for ${set.kind}`);
    assert(summary.probabilityAboveBaseline >= 0 && summary.probabilityAboveBaseline <= 100, `Invalid bootstrap probability for ${set.kind}`);
    assert(summary.temporalStability.windows >= 3, `Missing temporal stability windows for ${set.kind}`);
    assert(
      summary.temporalStability.positiveWindows >= 0 &&
      summary.temporalStability.positiveWindows <= summary.temporalStability.windows,
      `Invalid temporal stability for ${set.kind}`
    );
  });
  Object.values(analysis.singles).forEach((single) => {
    assert(['qualified', 'watch', 'research_only'].includes(single.edgeStatus), `Invalid single edge status for ${single.kind}`);
    assertSingleNumber(single.kind, single.number, 2);
    assert(single.testedDraws > 0, `Missing single backtest for ${single.kind}`);
  });

  const storedSnapshot = await prisma.prediction.findFirst({
    where: {
      predictionFor: {
        gte: dateKeyToUtcDate(target.targetDate),
        lt: addDateDays(dateKeyToUtcDate(target.targetDate), 1)
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  const latestCompletedPrediction = await prisma.prediction.findFirst({
    where: {
      predictionFor: {
        gte: dateKeyToUtcDate(latest.date),
        lt: addDateDays(dateKeyToUtcDate(latest.date), 1)
      }
    },
    include: { accuracy: true },
    orderBy: { createdAt: 'desc' }
  });

  if (latestCompletedPrediction) {
    assert(latestCompletedPrediction.accuracy?.verified, `Missing verified AccuracyRecord for ${latest.date}`);
  }

  if (storedSnapshot) {
    assert(storedSnapshot.revision >= 1, 'Stored snapshot must have a revision');
    assert(storedSnapshot.sets, 'Stored snapshot is missing sets payload');
    assert(storedSnapshot.singles, 'Stored snapshot is missing singles payload');
    if (storedSnapshot.method === PRODUCT_METHOD) {
      assert(storedSnapshot.combinations, 'Stored v7 snapshot is missing combinations payload');
    }
    assert(storedSnapshot.backtest, 'Stored snapshot is missing backtest payload');
    assert(storedSnapshot.analysisView, 'Stored snapshot is missing analysis view payload');
    assert(storedSnapshot.dataQuality, 'Stored snapshot is missing data quality payload');
    assert(storedSnapshot.snapshotHash, 'Stored snapshot is missing snapshot hash');
  }

  const latestLearningReport = await prisma.dailyLearningReport.findUnique({
    where: { date: dateKeyToUtcDate(latest.date) }
  });
  const latestEvaluation = await prisma.predictionEvaluation.findFirst({
    orderBy: [{ date: 'desc' }, { issuedAt: 'asc' }]
  });
  if (latestEvaluation) {
    assert(Array.isArray(latestEvaluation.predictedNumbers), 'Evaluation is missing predicted numbers');
    assert(Array.isArray(latestEvaluation.actualNumbers), 'Evaluation is missing actual numbers');
    assert(Number.isFinite(latestEvaluation.metricValue), 'Evaluation metric is invalid');
    assert(Number.isFinite(latestEvaluation.baseline), 'Evaluation baseline is invalid');
  }

  const monitorFixture = buildModelOutcomeMonitor(Array.from({ length: 30 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 0, index + 1)),
    issuedAt: new Date(Date.UTC(2026, 0, index + 1, 3)),
    kind: 'lo2',
    metricValue: 20,
    baseline: 24,
    isHit: true,
    predictedProbability: 25
  })));
  assert(monitorFixture.status === 'review', 'Live monitor must flag a mature below-baseline model');

  const officialFixture = {
    date: '2026-01-01',
    special: '12345',
    first: ['54345'],
    second: ['10011', '20011'],
    third: ['30022', '40022', '50033', '60033', '70044', '80044'],
    fourth: ['1000', '2000', '3000', '4000'],
    fifth: ['1000', '2000', '3000', '4000', '5000', '6000'],
    sixth: ['345', '222', '333'],
    seventh: ['01', '02', '03', '04']
  };
  assert(settleOfficialLoto2(['45'], officialFixture).payoutUnits === 71, 'Official Lô tô 2 payout must be 70x + 1x');
  assert(settleOfficialLoto3(['345'], officialFixture).payoutUnits === 445, 'Official Lô tô 3 combined payout must be 445x');
  assert(settleOfficialPairs('xien2', [{ numbers: ['45', '11'] }], officialFixture).payoutUnits === 15, 'Official 2-pair repeated payout must be 15x');
  assert(settleOfficialPairs('xien3', [{ numbers: ['45', '11', '22'] }], officialFixture).payoutUnits === 60, 'Official 3-pair repeated payout must be 60x');
  assert(settleOfficialPairs('xien4', [{ numbers: ['45', '11', '22', '33'] }], officialFixture).payoutUnits === 1000, 'Official 4-pair repeated payout must be 1000x');

  console.log(JSON.stringify({
    ok: true,
    rows: rows.length,
    firstDate: dateKey(rows[0].date),
    lastDate: latest.date,
    latestSpecial: latest.special,
    target,
    storedSnapshot: storedSnapshot
      ? {
          date: dateKey(storedSnapshot.date),
          predictionFor: dateKey(storedSnapshot.predictionFor),
          revision: storedSnapshot.revision,
          dataPoints: storedSnapshot.dataPoints,
          bachThuLo: storedSnapshot.bachThuLo,
          bachThuDe: storedSnapshot.bachThuDe,
          snapshotHash: storedSnapshot.snapshotHash?.slice(0, 12)
        }
      : null,
    latestVerification: latestCompletedPrediction?.accuracy
      ? {
          predictionFor: latest.date,
          deAccuracy: latestCompletedPrediction.accuracy.deAccuracy,
          lo2Accuracy: latestCompletedPrediction.accuracy.lo2Accuracy,
          lo3Accuracy: latestCompletedPrediction.accuracy.lo3Accuracy,
          bacangAccuracy: latestCompletedPrediction.accuracy.bacangAccuracy,
          bachThuLoAccuracy: latestCompletedPrediction.accuracy.bachThuLoAccuracy,
          bachThuDeAccuracy: latestCompletedPrediction.accuracy.bachThuDeAccuracy,
          overallAccuracy: latestCompletedPrediction.accuracy.overallAccuracy
        }
      : null,
    latestLearningReport: latestLearningReport
      ? {
          date: dateKey(latestLearningReport.date),
          resultSpecial: latestLearningReport.resultSpecial,
          predictionCount: latestLearningReport.predictionCount
        }
      : null,
    evaluationTracking: latestEvaluation
      ? {
          kind: latestEvaluation.kind,
          method: latestEvaluation.method,
          issuedBeforeDraw: latestEvaluation.issuedBeforeDraw,
          metricValue: latestEvaluation.metricValue,
          baseline: latestEvaluation.baseline
        }
      : null,
    singles: Object.fromEntries(
      Object.entries(analysis.singles).map(([kind, single]) => [
        kind,
        {
          number: single.number,
          status: single.edgeStatus,
          label: single.edgeLabel,
          lift: single.lift,
          hitDays: single.hitDays,
          testedDraws: single.testedDraws
        }
      ])
    ),
    aggregate: analysis.backtest.aggregate,
    edge: Object.fromEntries(
      Object.entries(analysis.sets).map(([kind, set]) => [
        kind,
        {
          status: set.edgeStatus,
          label: set.edgeLabel,
          lift: set.backtestLift,
          metric: set.backtestMetric,
          baseline: set.backtestBaseline
        }
      ])
    )
  }, null, 2));
}

function assertNumberList(name, values, expectedLength, digits) {
  assert(Array.isArray(values), `${name} must be an array`);
  assert(values.length === expectedLength, `${name} expected ${expectedLength}, got ${values.length}`);
  values.forEach((value) => {
    assert(new RegExp(`^\\d{${digits}}$`).test(value), `${name} contains invalid value ${value}`);
  });
}

function assertSingleNumber(name, value, digits) {
  assert(new RegExp(`^\\d{${digits}}$`).test(value), `${name} contains invalid value ${value}`);
}

function toCrawlerResult(row) {
  return {
    date: dateKey(row.date),
    special: row.special,
    first: row.first,
    second: row.second,
    third: row.third,
    fourth: row.fourth,
    fifth: row.fifth,
    sixth: row.sixth,
    seventh: row.seventh
  };
}

function getRuntimeTarget(now = new Date()) {
  const date = getVietnamDateKey(now);
  const { hour, minute } = getVietnamClock(now);
  const resultReady = hour > RESULT_READY_HOUR || (hour === RESULT_READY_HOUR && minute >= RESULT_READY_MINUTE);

  return {
    targetDate: resultReady ? addDays(date, 1) : date,
    phase: resultReady ? 'after_draw' : 'before_draw',
    currentTime: getVietnamTime(now)
  };
}

function getVietnamDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  return `${parts.find((part) => part.type === 'year').value}-${parts.find((part) => part.type === 'month').value}-${parts.find((part) => part.type === 'day').value}`;
}

function getVietnamClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VI_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);

  return {
    hour: Number(parts.find((part) => part.type === 'hour').value),
    minute: Number(parts.find((part) => part.type === 'minute').value)
  };
}

function getVietnamTime(date = new Date()) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VI_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

function addDays(dateKey, days) {
  const date = dateKeyToUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateKeyToUtcDate(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDateDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
