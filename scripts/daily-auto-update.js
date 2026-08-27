require('sucrase/register');

const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const {
  XsmbSourceCrawler,
  addDays,
  getVietnamDateKey,
  validateResult
} = require('../crawler/xsmb-source-crawler');
const {
  PRODUCT_METHOD,
  actualNumbersForKind,
  createProductPrediction,
  normalizeLotteryDraws,
  scorePredictionAgainstDraw
} = require('../lib/product-prediction-engine.ts');
const {
  buildPredictionRecordData,
  createSnapshotHash
} = require('../lib/prediction-snapshot.ts');
const { sendDailyTelegramReport } = require('../lib/telegram-notifier.ts');
const { buildPredictionEvaluations } = require('../lib/prediction-evaluation.ts');
const { buildModelOutcomeMonitor } = require('../lib/model-outcome-monitor.ts');

const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const match = env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
if (match && !process.env.DATABASE_URL) process.env.DATABASE_URL = match[1];

const prisma = new PrismaClient();
const crawler = new XsmbSourceCrawler();
const RESULT_READY_HOUR = 18;
const RESULT_READY_MINUTE = 40;

async function saveResult(result) {
  const errors = validateResult(result);
  if (errors.length > 0) {
    throw new Error(`Invalid result for ${result.date}: ${errors.join('; ')}`);
  }

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

async function createSnapshot(targetDate, generatedDateKey = getVietnamDateKey()) {
  const rows = await prisma.lotteryResult.findMany({
    orderBy: { date: 'asc' },
    take: 1000
  });
  const analysis = createProductPrediction(rows, targetDate);
  const generatedDate = new Date(`${generatedDateKey}T00:00:00.000Z`);
  const predictionFor = new Date(`${targetDate}T00:00:00.000Z`);
  const snapshotHash = createSnapshotHash(analysis);
  const latest = await prisma.prediction.findFirst({
    where: {
      predictionFor: {
        gte: predictionFor,
        lt: addDateDays(predictionFor, 1)
      }
    },
    orderBy: [
      { date: 'desc' },
      { revision: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  if (
    latest &&
    latest.method === PRODUCT_METHOD &&
    latest.snapshotHash === snapshotHash
  ) {
    let prediction = latest;
    if (!prediction.sets || !prediction.singles || !prediction.backtest || !prediction.analysisView || !prediction.dataQuality || !prediction.modelMeta) {
      prediction = await prisma.prediction.update({
        where: { id: prediction.id },
        data: buildPredictionRecordData(
          analysis,
          prediction.date,
          prediction.predictionFor,
          prediction.revision || 1
        )
      });
    }

    return { analysis, prediction, created: false, refreshed: false };
  }

  const latestForGeneratedDate = await prisma.prediction.findFirst({
    where: {
      date: {
        gte: generatedDate,
        lt: addDateDays(generatedDate, 1)
      },
      predictionFor: {
        gte: predictionFor,
        lt: addDateDays(predictionFor, 1)
      }
    },
    orderBy: [
      { revision: 'desc' },
      { createdAt: 'desc' }
    ]
  });
  const revision = (latestForGeneratedDate?.revision || 0) + 1;

  let prediction;
  try {
    prediction = await prisma.prediction.create({
      data: buildPredictionRecordData(analysis, generatedDate, predictionFor, revision)
    });
  } catch (error) {
    if (error.code !== 'P2002') throw error;
    prediction = await prisma.prediction.findFirst({
      where: { date: generatedDate, predictionFor, revision },
      orderBy: { createdAt: 'desc' }
    });
    if (!prediction) throw error;
  }

  return { analysis, prediction, created: true, refreshed: Boolean(latest) };
}

async function verifyPredictionsForResult(result) {
  const resultDate = new Date(`${result.date}T00:00:00.000Z`);
  const predictions = await prisma.prediction.findMany({
    where: {
      predictionFor: {
        gte: resultDate,
        lt: addDateDays(resultDate, 1)
      }
    },
    orderBy: [
      { date: 'asc' },
      { revision: 'asc' },
      { createdAt: 'asc' }
    ]
  });

  if (predictions.length === 0) {
    await upsertLearningReport(result, []);
    return [];
  }

  const [draw] = normalizeLotteryDraws([result]);
  if (!draw) {
    throw new Error(`Cannot verify prediction for invalid result ${result.date}`);
  }

  const verifications = [];

  for (const prediction of predictions) {
    verifications.push(await verifyPredictionRecord(prediction, draw, resultDate, result.date));
  }

  await updateSystemStats();
  await upsertLearningReport(result, verifications);

  return verifications;
}

async function verifyPredictionRecord(prediction, draw, resultDate, resultDateKey) {
  const scores = {
    de: scorePredictionAgainstDraw(prediction.de, draw, 'de'),
    lo2: scorePredictionAgainstDraw(prediction.lo2, draw, 'lo2'),
    lo3: scorePredictionAgainstDraw(prediction.lo3, draw, 'lo3'),
    bacang: scorePredictionAgainstDraw(prediction.bacang, draw, 'bacang'),
    bachThuLo: scorePredictionAgainstDraw([prediction.bachThuLo || prediction.lo2[0]].filter(Boolean), draw, 'lo2'),
    bachThuDe: scorePredictionAgainstDraw([prediction.bachThuDe || prediction.de[0]].filter(Boolean), draw, 'de')
  };

  const deAccuracy = scores.de.isHit ? 100 : 0;
  const lo2Accuracy = round(scores.lo2.precision * 100);
  const lo3Accuracy = round(scores.lo3.precision * 100);
  const bacangAccuracy = scores.bacang.isHit ? 100 : 0;
  const bachThuLoAccuracy = scores.bachThuLo.isHit ? 100 : 0;
  const bachThuDeAccuracy = scores.bachThuDe.isHit ? 100 : 0;
  const overallAccuracy = round((deAccuracy + lo2Accuracy + lo3Accuracy + bacangAccuracy) / 4);

  const record = await prisma.accuracyRecord.upsert({
    where: { predictionId: prediction.id },
    update: {
      date: resultDate,
      deAccuracy,
      lo2Accuracy,
      lo3Accuracy,
      bacangAccuracy,
      overallAccuracy,
      bachThuLoAccuracy,
      bachThuDeAccuracy,
      deCorrect: scores.de.hitCount,
      deTotal: 1,
      lo2Correct: scores.lo2.hitCount,
      lo2Total: prediction.lo2.length,
      lo3Correct: scores.lo3.hitCount,
      lo3Total: prediction.lo3.length,
      bachThuLoCorrect: scores.bachThuLo.hitCount,
      bachThuDeCorrect: scores.bachThuDe.hitCount,
      verified: true,
      verifiedAt: new Date()
    },
    create: {
      predictionId: prediction.id,
      date: resultDate,
      deAccuracy,
      lo2Accuracy,
      lo3Accuracy,
      bacangAccuracy,
      overallAccuracy,
      bachThuLoAccuracy,
      bachThuDeAccuracy,
      deCorrect: scores.de.hitCount,
      deTotal: 1,
      lo2Correct: scores.lo2.hitCount,
      lo2Total: prediction.lo2.length,
      lo3Correct: scores.lo3.hitCount,
      lo3Total: prediction.lo3.length,
      bachThuLoCorrect: scores.bachThuLo.hitCount,
      bachThuDeCorrect: scores.bachThuDe.hitCount,
      verified: true,
      verifiedAt: new Date()
    }
  });

  const evaluations = buildPredictionEvaluations(prediction, draw);
  await Promise.all(evaluations.map((evaluation) =>
    prisma.predictionEvaluation.upsert({
      where: {
        predictionId_kind: {
          predictionId: prediction.id,
          kind: evaluation.kind
        }
      },
      update: evaluation,
      create: evaluation
    })
  ));

  return {
    recordId: record.id,
    predictionId: prediction.id,
    snapshotDate: toDateKey(prediction.date),
    issuedAt: prediction.createdAt.toISOString(),
    issuedBeforeDraw: prediction.createdAt < drawTimeUtc(resultDateKey),
    predictionFor: resultDateKey,
    revision: prediction.revision || 1,
    method: prediction.method,
    evaluationCount: evaluations.length,
    hits: {
      de: scores.de.hits,
      lo2: scores.lo2.hits,
      lo3: scores.lo3.hits,
      bacang: scores.bacang.hits,
      bachThuLo: scores.bachThuLo.hits,
      bachThuDe: scores.bachThuDe.hits
    },
    accuracy: {
      deAccuracy,
      lo2Accuracy,
      lo3Accuracy,
      bacangAccuracy,
      bachThuLoAccuracy,
      bachThuDeAccuracy,
      overallAccuracy
    }
  };
}

async function upsertLearningReport(result, verifications) {
  const [draw] = normalizeLotteryDraws([result]);
  if (!draw) return null;

  const reportDate = new Date(`${result.date}T00:00:00.000Z`);
  const actual = {
    special: draw.special,
    de: Array.from(actualNumbersForKind(draw, 'de')),
    bacang: Array.from(actualNumbersForKind(draw, 'bacang')),
    lo2: Array.from(actualNumbersForKind(draw, 'lo2')).sort(),
    lo3: Array.from(actualNumbersForKind(draw, 'lo3')).sort()
  };
  const summary = buildLearningSummary(actual, verifications);

  return prisma.dailyLearningReport.upsert({
    where: { date: reportDate },
    update: {
      resultSpecial: draw.special,
      predictionCount: verifications.length,
      summary,
      byPrediction: verifications
    },
    create: {
      date: reportDate,
      resultSpecial: draw.special,
      predictionCount: verifications.length,
      summary,
      byPrediction: verifications
    }
  });
}

function buildLearningSummary(actual, verifications) {
  const eligible = verifications.filter((item) => item.issuedBeforeDraw !== false);
  if (eligible.length === 0) {
    return {
      actual,
      notes: [verifications.length > 0
        ? 'Có snapshot nhưng đều phát sau giờ quay; không dùng để chấm live accuracy.'
        : 'Không có snapshot đã lưu để đối chiếu ngày này.'],
      eligiblePredictionCount: 0,
      average: null
    };
  }

  const average = (field) => round(
    eligible.reduce((sum, item) => sum + (item.accuracy[field] || 0), 0) / eligible.length
  );
  // The first issued snapshot is the canonical one. Using the latest revision
  // here could cherry-pick a later payload and overstate live accuracy.
  const canonical = eligible[0];
  const weakMarkets = [];
  if (canonical.accuracy.deAccuracy <= 0) weakMarkets.push('de');
  if (canonical.accuracy.lo3Accuracy <= 0) weakMarkets.push('lo3');
  if (canonical.accuracy.bacangAccuracy <= 0) weakMarkets.push('bacang');
  if (canonical.accuracy.bachThuLoAccuracy <= 0) weakMarkets.push('bachThuLo');
  if (canonical.accuracy.bachThuDeAccuracy <= 0) weakMarkets.push('bachThuDe');

  return {
    actual,
    eligiblePredictionCount: eligible.length,
    average: {
      deAccuracy: average('deAccuracy'),
      lo2Accuracy: average('lo2Accuracy'),
      lo3Accuracy: average('lo3Accuracy'),
      bacangAccuracy: average('bacangAccuracy'),
      bachThuLoAccuracy: average('bachThuLoAccuracy'),
      bachThuDeAccuracy: average('bachThuDeAccuracy'),
      overallAccuracy: average('overallAccuracy')
    },
    canonical: {
      snapshotDate: canonical.snapshotDate,
      revision: canonical.revision,
      hits: canonical.hits,
      accuracy: canonical.accuracy
    },
    // Kept as a compatibility alias for previously deployed UI/API clients.
    latest: {
      snapshotDate: canonical.snapshotDate,
      revision: canonical.revision,
      hits: canonical.hits,
      accuracy: canonical.accuracy
    },
    weakMarkets,
    notes: buildLearningNotes(canonical)
  };
}

function buildLearningNotes(latest) {
  const notes = [];
  if (latest.accuracy.deAccuracy <= 0) notes.push('Đề trượt: tiếp tục khóa hoặc giảm ưu tiên nếu walk-forward không vượt baseline.');
  if (latest.accuracy.lo2Accuracy > 0) notes.push(`Lô 2 có ${latest.hits.lo2.length} hit: giữ nhánh này nhưng theo dõi precision thay vì chỉ nhìn hit/ngày.`);
  if (latest.accuracy.lo3Accuracy <= 0) notes.push('Lô 3 trượt: cần kiểm tra profile scoring và không phát như tín hiệu mạnh nếu lift mới chỉ nhỉnh baseline.');
  if (latest.accuracy.bacangAccuracy <= 0) notes.push('3 càng trượt: đây là thị trường mẫu mỏng, chỉ mở tín hiệu khi hitDays đủ ngưỡng.');
  if (latest.accuracy.bachThuLoAccuracy <= 0) notes.push('Bạch thủ lô trượt: dùng như single-pick riêng, không đánh đồng với dàn lô 2.');
  if (latest.accuracy.bachThuDeAccuracy <= 0) notes.push('Bạch thủ đề trượt: giữ research_only cho tới khi backtest single-pick có hit ổn định.');
  return notes;
}

async function updateSystemStats() {
  const verifiedRecords = await prisma.accuracyRecord.findMany({
    where: { verified: true },
    include: {
      prediction: {
        select: { createdAt: true, predictionFor: true }
      }
    },
    orderBy: { date: 'asc' }
  });
  const records = verifiedRecords.filter((record) =>
    record.prediction.createdAt < drawTimeUtc(toDateKey(record.prediction.predictionFor))
  );

  if (records.length === 0) return null;

  const totalPredictions = records.length;
  const correctPredictions = records.filter((record) =>
    record.deCorrect > 0 ||
    record.lo2Correct > 0 ||
    record.lo3Correct > 0 ||
    record.bacangAccuracy > 0
  ).length;
  const average = (field) => round(records.reduce((sum, record) => sum + record[field], 0) / totalPredictions);
  const last7Days = records.slice(-7);
  const last30Days = records.slice(-30);
  const averageRows = (rows) => round(rows.reduce((sum, record) => sum + record.overallAccuracy, 0) / rows.length);

  return prisma.systemStats.upsert({
    where: { date: new Date(`${getVietnamDateKey()}T00:00:00.000Z`) },
    update: {
      totalPredictions,
      correctPredictions,
      overallAccuracy: average('overallAccuracy'),
      deAccuracy: average('deAccuracy'),
      lo2Accuracy: average('lo2Accuracy'),
      lo3Accuracy: average('lo3Accuracy'),
      bacangAccuracy: average('bacangAccuracy'),
      last7DaysAccuracy: averageRows(last7Days),
      last30DaysAccuracy: averageRows(last30Days)
    },
    create: {
      date: new Date(`${getVietnamDateKey()}T00:00:00.000Z`),
      totalPredictions,
      correctPredictions,
      overallAccuracy: average('overallAccuracy'),
      deAccuracy: average('deAccuracy'),
      lo2Accuracy: average('lo2Accuracy'),
      lo3Accuracy: average('lo3Accuracy'),
      bacangAccuracy: average('bacangAccuracy'),
      last7DaysAccuracy: averageRows(last7Days),
      last30DaysAccuracy: averageRows(last30Days)
    }
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const today = getVietnamDateKey();
  const resultDate = args.date || today;
  const targetDate = addDays(resultDate, 1);

  console.log('Daily auto update');
  console.log(`Today: ${today}`);
  console.log(`Result date: ${resultDate}`);

  if (!args.force && !isResultReady(resultDate)) {
    const snapshot = await createSnapshot(resultDate, resultDate);
    console.log(`Result window is not ready; kept/ensured prediction ${resultDate}: ${snapshot.analysis.prediction.de.join(', ')}`);

    await prisma.systemLog.create({
      data: {
        type: 'auto_update_pending',
        message: 'Daily auto update skipped result fetch before result window',
        data: {
          resultDate,
          targetDate: resultDate,
          method: PRODUCT_METHOD,
          dataPoints: snapshot.analysis.dataQuality.dataPoints,
          warnings: snapshot.analysis.dataQuality.warnings,
          snapshotCreated: snapshot.created,
          snapshotRefreshed: snapshot.refreshed
        }
      }
    });
    return;
  }

  console.log(`Prediction target: ${targetDate}`);

  const fetched = await crawler.fetchDate(resultDate);
  await saveResult(fetched.result);
  console.log(`Saved result ${resultDate}: DB ${fetched.result.special} (${fetched.sources.join(', ')})`);
  const verifications = await verifyPredictionsForResult(fetched.result);
  if (verifications.length > 0) {
    console.log(`Verified ${verifications.length} snapshot(s) for ${resultDate}: ${JSON.stringify(verifications.map((item) => item.hits))}`);
  } else {
    console.log(`No stored prediction to verify for ${resultDate}`);
  }

  const snapshot = await createSnapshot(targetDate, resultDate);
  const analysis = snapshot.analysis;
  console.log(`Saved prediction ${targetDate}: ${analysis.prediction.de.join(', ')}`);

  await prisma.systemLog.create({
    data: {
      type: 'auto_update',
      message: 'Daily auto update completed',
      data: {
        resultDate,
        targetDate,
        special: fetched.result.special,
        sources: fetched.sources,
        method: PRODUCT_METHOD,
        dataPoints: analysis.dataQuality.dataPoints,
        warnings: analysis.dataQuality.warnings,
        snapshotCreated: snapshot.created,
        snapshotRefreshed: snapshot.refreshed,
        verifications
      }
    }
  });

  const modelMonitor = await recordModelMonitor(resultDate);

  const telegram = await notifyTelegramOnce({
    resultDate,
    targetDate,
    fetched,
    verifications,
    analysis,
    snapshotHash: snapshot.prediction.snapshotHash,
    modelMonitor
  });
  if (telegram.sent) {
    console.log(`Telegram daily report sent (message ${telegram.messageId || 'unknown'})`);
  } else {
    console.log(`Telegram daily report skipped: ${telegram.reason}`);
  }
}

async function notifyTelegramOnce({
  resultDate,
  targetDate,
  fetched,
  verifications,
  analysis,
  snapshotHash,
  modelMonitor
}) {
  const notificationKey = `daily:${resultDate}:${targetDate}:${snapshotHash || 'no-hash'}`;
  const recentLogs = await prisma.systemLog.findMany({
    where: { type: 'telegram_daily' },
    orderBy: { createdAt: 'desc' },
    take: 30
  });
  const alreadySent = recentLogs.some((log) =>
    log.data && typeof log.data === 'object' && log.data.notificationKey === notificationKey
  );

  if (alreadySent) {
    return {
      configured: true,
      sent: false,
      messageId: null,
      reason: 'báo cáo cho snapshot này đã được gửi'
    };
  }

  const delivery = await sendDailyTelegramReport({
    resultDate,
    targetDate,
    special: fetched.result.special,
    sources: fetched.sources,
    verifications,
    analysis,
    modelMonitor
  });

  if (delivery.sent) {
    await prisma.systemLog.create({
      data: {
        type: 'telegram_daily',
        message: 'Telegram daily report sent',
        data: {
          notificationKey,
          resultDate,
          targetDate,
          snapshotHash,
          messageId: delivery.messageId,
          minEdgeStatus: delivery.minEdgeStatus
        }
      }
    });
  }

  return delivery;
}

async function recordModelMonitor(resultDate) {
  const rows = await prisma.predictionEvaluation.findMany({
    where: {
      method: PRODUCT_METHOD,
      issuedBeforeDraw: true
    },
    orderBy: [
      { date: 'asc' },
      { issuedAt: 'asc' }
    ]
  });
  const monitor = buildModelOutcomeMonitor(rows);
  await prisma.systemLog.create({
    data: {
      type: 'model_monitor',
      message: `Live model monitor: ${monitor.status}`,
      data: {
        resultDate,
        method: PRODUCT_METHOD,
        ...monitor
      }
    }
  });
  return monitor;
}

function parseArgs(argv) {
  return argv.reduce((acc, arg) => {
    if (arg === '--force') acc.force = true;
    if (arg.startsWith('--date=')) acc.date = arg.slice('--date='.length);
    return acc;
  }, { force: false, date: null });
}

function isResultReady(resultDate) {
  const today = getVietnamDateKey();
  if (resultDate < today) return true;
  if (resultDate > today) return false;

  const { hour, minute } = getVietnamClock();
  return hour > RESULT_READY_HOUR || (hour === RESULT_READY_HOUR && minute >= RESULT_READY_MINUTE);
}

function getVietnamClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);

  return {
    hour: Number(parts.find((part) => part.type === 'hour').value),
    minute: Number(parts.find((part) => part.type === 'minute').value)
  };
}

function addDateDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function drawTimeUtc(dateKey) {
  // XSMB starts at 18:15 Asia/Ho_Chi_Minh (UTC+7, no DST).
  return new Date(`${dateKey}T11:15:00.000Z`);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

main()
  .catch(async (error) => {
    console.error(error);
    await prisma.systemLog.create({
      data: {
        type: 'error',
        message: 'Daily auto update failed',
        data: { error: error.message }
      }
    }).catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
