import {
  actualNumbersForKind,
  scorePredictionAgainstDraw,
  type CombinationKind,
  type LotteryDraw,
  type PredictionKind,
  type SinglePickKind
} from './product-prediction-engine';

export interface PredictionEvaluationInput {
  predictionId: string;
  date: Date;
  snapshotDate: Date;
  kind: PredictionKind | SinglePickKind | CombinationKind;
  scope: 'set' | 'single';
  method: string;
  modelProfile: string | null;
  edgeStatus: string | null;
  metricName: 'hit_rate' | 'precision';
  issuedAt: Date;
  issuedBeforeDraw: boolean;
  predictedNumbers: string[];
  actualNumbers: string[];
  hitNumbers: string[];
  pickCount: number;
  hitCount: number;
  isHit: boolean;
  metricValue: number;
  precision: number;
  baseline: number;
  realizedLift: number;
  predictedProbability: number | null;
  backtestMetric: number | null;
  backtestBaseline: number | null;
  backtestLift: number | null;
  temporalStability: unknown | null;
}

export function buildPredictionEvaluations(
  prediction: any,
  draw: LotteryDraw
): PredictionEvaluationInput[] {
  const sets = asObject(prediction.sets);
  const singles = asObject(prediction.singles);
  const backtest = asObject(prediction.backtest);
  const summaries = Array.isArray(backtest.summaries) ? backtest.summaries : [];
  const targetDate = new Date(`${draw.date}T00:00:00.000Z`);
  const issuedBeforeDraw = prediction.createdAt < drawTimeUtc(draw.date);

  const definitions: Array<{
    kind: PredictionKind | SinglePickKind;
    sourceKind: PredictionKind;
    scope: 'set' | 'single';
    numbers: string[];
  }> = [
    { kind: 'de', sourceKind: 'de', scope: 'set', numbers: prediction.de ?? [] },
    { kind: 'lo2', sourceKind: 'lo2', scope: 'set', numbers: prediction.lo2 ?? [] },
    { kind: 'lo3', sourceKind: 'lo3', scope: 'set', numbers: prediction.lo3 ?? [] },
    { kind: 'bacang', sourceKind: 'bacang', scope: 'set', numbers: prediction.bacang ?? [] },
    {
      kind: 'bachThuLo',
      sourceKind: 'lo2',
      scope: 'single',
      numbers: [prediction.bachThuLo || prediction.lo2?.[0]].filter(Boolean)
    },
    {
      kind: 'bachThuDe',
      sourceKind: 'de',
      scope: 'single',
      numbers: [prediction.bachThuDe || prediction.de?.[0]].filter(Boolean)
    }
  ];

  const standardEvaluations = definitions.map((definition) => {
    const score = scorePredictionAgainstDraw(definition.numbers, draw, definition.sourceKind);
    const metadata = definition.scope === 'set'
      ? asObject(sets[definition.kind])
      : asObject(singles[definition.kind]);
    const summary = definition.scope === 'set'
      ? asObject(summaries.find((item: any) => item?.kind === definition.sourceKind))
      : metadata;
    const metricName: PredictionEvaluationInput['metricName'] = definition.scope === 'single' || ['de', 'bacang'].includes(definition.sourceKind)
      ? 'hit_rate'
      : 'precision';
    const precision = score.precision * 100;
    const metricValue = metricName === 'hit_rate' ? (score.isHit ? 100 : 0) : precision;
    const baseline = score.baseline * 100;

    return {
      predictionId: prediction.id,
      date: targetDate,
      snapshotDate: prediction.date,
      kind: definition.kind,
      scope: definition.scope,
      method: prediction.method,
      modelProfile: stringOrNull(metadata.modelProfile),
      edgeStatus: stringOrNull(metadata.edgeStatus),
      metricName,
      issuedAt: prediction.createdAt,
      issuedBeforeDraw,
      predictedNumbers: definition.numbers,
      actualNumbers: Array.from(actualNumbersForKind(draw, definition.sourceKind)).sort(),
      hitNumbers: score.hits,
      pickCount: definition.numbers.length,
      hitCount: score.hitCount,
      isHit: score.isHit,
      metricValue: round(metricValue),
      precision: round(precision),
      baseline: round(baseline),
      realizedLift: round(baseline > 0 ? metricValue / baseline : 0),
      predictedProbability: numberOrNull(metadata.probability),
      backtestMetric: numberOrNull(summary.primaryMetric ?? metadata.backtestMetric),
      backtestBaseline: numberOrNull(summary.baseline ?? metadata.backtestBaseline),
      backtestLift: numberOrNull(summary.lift ?? metadata.backtestLift),
      temporalStability: summary.temporalStability ?? metadata.temporalStability ?? null
    };
  });

  return [
    ...standardEvaluations,
    ...buildCombinationEvaluations(prediction, draw, targetDate, issuedBeforeDraw)
  ];
}

function buildCombinationEvaluations(
  prediction: any,
  draw: LotteryDraw,
  targetDate: Date,
  issuedBeforeDraw: boolean
): PredictionEvaluationInput[] {
  const combinations = asObject(prediction.combinations);
  const actual = actualNumbersForKind(draw, 'lo2');
  const definitions: Array<{ kind: CombinationKind; size: 2 | 3 | 4 }> = [
    { kind: 'xien2', size: 2 },
    { kind: 'xien3', size: 3 },
    { kind: 'xien4', size: 4 }
  ];

  return definitions.flatMap(({ kind, size }) => {
    const metadata = asObject(combinations[kind]);
    const rawPicks = Array.isArray(metadata.picks) ? metadata.picks : [];
    const picks = rawPicks
      .map((pick: any) => Array.isArray(pick?.numbers) ? pick.numbers.filter((value: any) => typeof value === 'string') : [])
      .filter((numbers: string[]) => numbers.length === size);
    if (picks.length === 0) return [];

    const predictedNumbers = picks.map((numbers: string[]) => numbers.join('+'));
    const hitNumbers = picks
      .filter((numbers: string[]) => numbers.every((number) => actual.has(number)))
      .map((numbers: string[]) => numbers.join('+'));
    const precision = hitNumbers.length / picks.length;
    const baseline = combinationBaseline(actual.size, size);
    const metricValue = precision * 100;
    const baselinePercent = baseline * 100;

    return [{
      predictionId: prediction.id,
      date: targetDate,
      snapshotDate: prediction.date,
      kind,
      scope: 'set' as const,
      method: prediction.method,
      modelProfile: stringOrNull(metadata.modelProfile),
      edgeStatus: stringOrNull(metadata.edgeStatus),
      metricName: 'precision' as const,
      issuedAt: prediction.createdAt,
      issuedBeforeDraw,
      predictedNumbers,
      actualNumbers: Array.from(actual).sort(),
      hitNumbers,
      pickCount: picks.length,
      hitCount: hitNumbers.length,
      isHit: hitNumbers.length > 0,
      metricValue: round(metricValue),
      precision: round(metricValue),
      baseline: round(baselinePercent),
      realizedLift: round(baselinePercent > 0 ? metricValue / baselinePercent : 0),
      predictedProbability: numberOrNull(metadata.probability),
      backtestMetric: numberOrNull(metadata.backtestMetric),
      backtestBaseline: numberOrNull(metadata.backtestBaseline),
      backtestLift: numberOrNull(metadata.backtestLift),
      temporalStability: metadata.temporalStability ?? null
    }];
  });
}

function combinationBaseline(actualUniqueCount: number, size: number) {
  if (actualUniqueCount < size) return 0;
  return ratio(binomial(actualUniqueCount, size), binomial(100, size));
}

function binomial(n: number, k: number) {
  let result = 1;
  for (let index = 1; index <= k; index += 1) result = (result * (n - k + index)) / index;
  return result;
}

function ratio(left: number, right: number) {
  return right > 0 ? left / right : 0;
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function drawTimeUtc(value: string) {
  return new Date(`${value}T11:15:00.000Z`);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
