import { prisma } from '@/lib/prisma';
import {
  PRODUCT_METHOD,
  createProductPrediction,
  ProductPredictionResult
} from '@/lib/product-prediction-engine';
import {
  buildPredictionRecordData,
  createSnapshotHash,
  materializePredictionSnapshot
} from '@/lib/prediction-snapshot';

export interface RuntimeTarget {
  targetDate: string;
  isForToday: boolean;
  phase: 'before_draw' | 'drawing' | 'after_draw';
  status: string;
  currentTime: string;
  drawTime: string;
}

const VI_TIMEZONE = 'Asia/Ho_Chi_Minh';
const DRAW_HOUR = 18;
const DRAW_MINUTE = 15;
const RESULT_BUFFER_MINUTE = 40;

export async function loadProductAnalysis(targetDate?: string): Promise<ProductPredictionResult> {
  const draws = await prisma.lotteryResult.findMany({
    orderBy: { date: 'asc' },
    take: 730
  });
  const target = targetDate ?? getRuntimeTarget().targetDate;

  return createProductPrediction(draws as any, target);
}

export async function getOrCreateProductPrediction(target: RuntimeTarget) {
  const effectiveTarget = await resolveTargetAfterStoredResult(target);
  const targetDate = dateKeyToUtcDate(effectiveTarget.targetDate);
  const generatedDate = dateKeyToUtcDate(getVietnamDateKey(new Date()));

  let prediction = await prisma.prediction.findFirst({
    where: {
      predictionFor: {
        gte: targetDate,
        lt: addDays(targetDate, 1)
      }
    },
    orderBy: [
      { date: 'desc' },
      { revision: 'desc' },
      { createdAt: 'desc' }
    ]
  });
  const actualResult = await prisma.lotteryResult.findFirst({
    where: {
      date: {
        gte: targetDate,
        lt: addDays(targetDate, 1)
      }
    }
  });
  const trainingCount = await prisma.lotteryResult.count({
    where: {
      date: {
        lt: targetDate
      }
    }
  });

  if (prediction && isUsableStoredSnapshot(prediction, trainingCount)) {
    return {
      analysis: analysisFromPredictionRecord(prediction),
      prediction,
      actualResult,
      target: effectiveTarget
    };
  }

  const analysis = await loadProductAnalysis(effectiveTarget.targetDate);
  const snapshotHash = createSnapshotHash(analysis);

  if (prediction?.snapshotHash === snapshotHash && prediction.method === PRODUCT_METHOD) {
    if (!prediction.sets || !prediction.singles || !prediction.backtest || !prediction.analysisView || !prediction.dataQuality || !prediction.modelMeta) {
      prediction = await prisma.prediction.update({
        where: { id: prediction.id },
        data: buildPredictionRecordData(
          analysis,
          prediction.date,
          prediction.predictionFor,
          prediction.revision ?? 1
        )
      });
    }
  } else {
    const latestForGeneratedDate = await prisma.prediction.findFirst({
      where: {
        date: {
          gte: generatedDate,
          lt: addDays(generatedDate, 1)
        },
        predictionFor: {
          gte: targetDate,
          lt: addDays(targetDate, 1)
        }
      },
      orderBy: [
        { revision: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    const revision = (latestForGeneratedDate?.revision ?? 0) + 1;

    try {
      prediction = await prisma.prediction.create({
        data: buildPredictionRecordData(analysis, generatedDate, targetDate, revision)
      });
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error;
      prediction = await prisma.prediction.findFirst({
        where: { date: generatedDate, predictionFor: targetDate, revision },
        orderBy: { createdAt: 'desc' }
      });
    }
  }

  if (!prediction) {
    throw new Error('Prediction snapshot could not be created');
  }

  return {
    analysis,
    prediction,
    actualResult,
    target: effectiveTarget
  };
}

export function buildRealtimeResponse(
  analysis: ProductPredictionResult,
  target: RuntimeTarget,
  predictionRecord: any,
  actualResult: { special: string } | null
) {
  const snapshot = materializePredictionSnapshot(predictionRecord, analysis);
  const backtest = snapshot.backtest;
  const dataQuality = snapshot.dataQuality;

  return {
    prediction: snapshot.prediction,
    sets: snapshot.sets,
    singles: snapshot.singles,
    backtest,
    analysis: snapshot.analysis,
    accuracy: {
      historicalAccuracy: backtest.aggregate.modelScore,
      randomBaseline: backtest.aggregate.randomBaseline,
      lift: backtest.aggregate.lift,
      totalPredictions: backtest.aggregate.testedDraws,
      correctPredictions: null,
      byType: Object.fromEntries(
        backtest.summaries.map((summary) => [
          summary.kind,
          {
            hitRate: summary.hitRate,
            precision: summary.precision,
            primaryMetric: summary.primaryMetric,
            baseline: summary.baseline,
            lift: summary.lift,
            testedDraws: summary.testedDraws,
            hitDays: summary.hitDays,
            totalHits: summary.totalHits,
            status: summary.status,
            statusLabel: summary.statusLabel,
            metricLabel: summary.metricLabel,
            modelInterval: summary.modelInterval,
            edgeInterval: summary.edgeInterval,
            observedEdge: summary.observedEdge,
            probabilityAboveBaseline: summary.probabilityAboveBaseline,
            expectedHits: summary.expectedHits,
            sampleAdequacy: summary.sampleAdequacy
          }
        ])
      )
    },
    timing: {
      isForToday: target.isForToday,
      phase: target.phase,
      status: target.status,
      currentTime: target.currentTime,
      drawTime: target.drawTime,
      targetDate: target.targetDate
    },
    result: actualResult
      ? {
          hasResult: true,
          special: actualResult.special,
          message: 'Kết quả đã có'
        }
        : {
          hasResult: false,
          message: target.isForToday ? 'Chưa quay' : 'Chưa đến ngày'
        },
    dataQuality,
    meta: {
      isFixed: true,
      message: 'Snapshot mô hình đã lưu, không đổi khi reload; revision mới chỉ tạo khi payload mô hình đổi',
      generatedAt: predictionRecord.createdAt.toISOString(),
      snapshotDate: predictionRecord.date.toISOString().slice(0, 10),
      revision: predictionRecord.revision ?? 1,
      snapshotHash: predictionRecord.snapshotHash,
      method: PRODUCT_METHOD,
      dataPoints: dataQuality.dataPoints,
      targetDate: target.targetDate
    }
  };
}

function isUsableStoredSnapshot(prediction: any, trainingCount: number) {
  return (
    prediction.method === PRODUCT_METHOD &&
    prediction.dataPoints === trainingCount &&
    Boolean(prediction.snapshotHash) &&
    Boolean(prediction.sets) &&
    Boolean(prediction.singles) &&
    Boolean(prediction.combinations) &&
    Boolean(prediction.backtest) &&
    Boolean(prediction.analysisView) &&
    Boolean(prediction.dataQuality) &&
    Boolean(prediction.modelMeta)
  );
}

function analysisFromPredictionRecord(prediction: any): ProductPredictionResult {
  const dataQuality = parseJsonField(prediction.dataQuality, {
    dataPoints: prediction.dataPoints,
    firstDate: null,
    lastDate: null,
    validDraws: prediction.dataPoints,
    invalidDraws: 0,
    warnings: [],
    blockingReasons: [],
    canPublish: true,
    status: 'ready' as const,
    lagDays: null,
    completeness: 100,
    missingDates: []
  });

  return {
    prediction: {
      date: prediction.predictionFor.toISOString().slice(0, 10),
      de: prediction.de,
      lo2: prediction.lo2,
      lo3: prediction.lo3,
      bacang: prediction.bacang,
      bachThuLo: prediction.bachThuLo ?? prediction.lo2?.[0] ?? '',
      bachThuDe: prediction.bachThuDe ?? prediction.de?.[0] ?? '',
      songthulode: parseJsonField(prediction.songthulode, []),
      combinations: parseJsonField(prediction.combinations, {
        xien2: emptyCombinationSet('xien2', 'Xiên 2', 2),
        xien3: emptyCombinationSet('xien3', 'Xiên 3', 3),
        xien4: emptyCombinationSet('xien4', 'Xiên 4', 4)
      }),
      dauduoi: parseJsonField(prediction.dauduoi, { dau: [], duoi: [] })
    },
    sets: parseJsonField(prediction.sets, {} as ProductPredictionResult['sets']),
    singles: parseJsonField(prediction.singles, {} as ProductPredictionResult['singles']),
    backtest: parseJsonField(prediction.backtest, {
      summaries: [],
      aggregate: {
        testedDraws: 0,
        modelScore: 0,
        randomBaseline: 0,
        lift: 0,
        qualifiedMarkets: 0,
        watchMarkets: 0,
        researchMarkets: 0,
        conclusion: 'Chưa có dữ liệu kiểm định.'
      }
    }),
    analysis: parseJsonField(prediction.analysisView, {
      frequency: [],
      hotCold: {
        hot: [],
        cold: []
      },
      pairs: [],
      specialDigits: {
        heads: Array(10).fill(0),
        tails: Array(10).fill(0),
        sums: Array(10).fill(0),
        sampleSize: 0
      }
    }),
    dataQuality,
    meta: parseJsonField(prediction.modelMeta, {
      method: PRODUCT_METHOD,
      generatedAt: prediction.createdAt.toISOString(),
      targetDate: prediction.predictionFor.toISOString().slice(0, 10),
      trainingWindow: prediction.dataPoints
    })
  };
}

function emptyCombinationSet(kind: 'xien2' | 'xien3' | 'xien4', label: string, size: 2 | 3 | 4) {
  return {
    kind,
    label,
    size,
    picks: [],
    pickCount: 0,
    probability: 0,
    backtestMetric: 0,
    backtestBaseline: 0,
    backtestLift: 0,
    testedDraws: 0,
    hitDays: 0,
    edgeStatus: 'research_only' as const,
    edgeLabel: 'Chưa đủ bằng chứng',
    edgeReason: 'Snapshot cũ chưa có dữ liệu xiên.',
    modelProfile: 'legacy',
    temporalStability: {
      windowSize: 0,
      windows: 0,
      positiveWindows: 0,
      recentEdge: 0,
      minimumEdge: 0,
      stable: false
    }
  };
}

async function resolveTargetAfterStoredResult(target: RuntimeTarget): Promise<RuntimeTarget> {
  if (target.phase === 'after_draw') return target;

  const targetDate = dateKeyToUtcDate(target.targetDate);
  const actualResult = await prisma.lotteryResult.findFirst({
    where: {
      date: {
        gte: targetDate,
        lt: addDays(targetDate, 1)
      }
    }
  });

  if (!actualResult) return target;

  return {
    ...target,
    targetDate: addDaysToDateKey(target.targetDate, 1),
    isForToday: false,
    phase: 'after_draw',
    status: 'Kết quả hôm nay đã có trong DB, dự báo cho ngày mai'
  };
}

export function getRuntimeTarget(now = new Date()): RuntimeTarget {
  const dateKey = getVietnamDateKey(now);
  const { hour, minute } = getVietnamClock(now);
  const currentTime = getVietnamTime(now);
  const afterDrawStart = hour > DRAW_HOUR || (hour === DRAW_HOUR && minute >= DRAW_MINUTE);
  const afterResultBuffer = hour > DRAW_HOUR || (hour === DRAW_HOUR && minute >= RESULT_BUFFER_MINUTE);

  if (!afterDrawStart) {
    return {
      targetDate: dateKey,
      isForToday: true,
      phase: 'before_draw',
      status: 'Dự báo cho hôm nay trước giờ quay',
      currentTime,
      drawTime: '18:15'
    };
  }

  if (!afterResultBuffer) {
    return {
      targetDate: dateKey,
      isForToday: true,
      phase: 'drawing',
      status: 'Đang trong khung quay số, snapshot hôm nay được giữ nguyên',
      currentTime,
      drawTime: '18:15'
    };
  }

  return {
    targetDate: addDaysToDateKey(dateKey, 1),
    isForToday: false,
    phase: 'after_draw',
    status: 'Dự báo cho ngày mai sau khi kết quả hôm nay đã quay',
    currentTime,
    drawTime: '18:15'
  };
}

export function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getVietnamDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

function getVietnamClock(date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VI_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);

  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value ?? 0),
    minute: Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  };
}

function getVietnamTime(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VI_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

function dateKeyToUtcDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addDaysToDateKey(dateKey: string, days: number): string {
  return addDays(dateKeyToUtcDate(dateKey), days).toISOString().slice(0, 10);
}
