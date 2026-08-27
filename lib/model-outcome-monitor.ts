export interface OutcomeEvaluationLike {
  date: Date;
  kind: string;
  metricValue: number;
  baseline: number;
  isHit: boolean;
  predictedProbability: number | null;
  issuedAt: Date;
}

export interface ModelOutcomeMonitor {
  eligibleDays: number;
  minimumDays: number;
  status: 'collecting' | 'review' | 'stable';
  byKind: Record<string, {
    testedDays: number;
    hitRate: number;
    meanMetric: number;
    meanBaseline: number;
    pooledLift: number;
    calibrationGap: number | null;
    recommendation: 'collect_more' | 'review_model' | 'continue_monitoring';
  }>;
}

const MINIMUM_LIVE_DAYS = 30;

export function buildModelOutcomeMonitor(rows: OutcomeEvaluationLike[]): ModelOutcomeMonitor {
  const canonical = canonicalRows(rows);
  const kinds = Array.from(new Set(canonical.map((row) => row.kind))).sort();
  const byKind = Object.fromEntries(kinds.map((kind) => {
    const items = canonical.filter((row) => row.kind === kind);
    const metric = mean(items.map((row) => row.metricValue));
    const baseline = mean(items.map((row) => row.baseline));
    const probabilities = items.filter((row) => row.predictedProbability !== null);
    const calibrationGap = probabilities.length > 0
      ? mean(probabilities.map((row) => row.predictedProbability as number)) - metric
      : null;
    const pooledLift = baseline > 0 ? metric / baseline : 0;
    const recommendation: ModelOutcomeMonitor['byKind'][string]['recommendation'] = items.length < MINIMUM_LIVE_DAYS
      ? 'collect_more'
      : pooledLift < 1
        ? 'review_model'
        : 'continue_monitoring';

    return [kind, {
      testedDays: items.length,
      hitRate: round(items.filter((row) => row.isHit).length / Math.max(1, items.length) * 100),
      meanMetric: round(metric),
      meanBaseline: round(baseline),
      pooledLift: round(pooledLift),
      calibrationGap: calibrationGap === null ? null : round(calibrationGap),
      recommendation
    }];
  }));
  const eligibleDays = new Set(canonical.map((row) => dateKey(row.date))).size;
  const recommendations = Object.values(byKind).map((item) => item.recommendation);

  return {
    eligibleDays,
    minimumDays: MINIMUM_LIVE_DAYS,
    status: eligibleDays < MINIMUM_LIVE_DAYS
      ? 'collecting'
      : recommendations.includes('review_model')
        ? 'review'
        : 'stable',
    byKind
  };
}

function canonicalRows<T extends OutcomeEvaluationLike>(rows: T[]): T[] {
  const sorted = [...rows].sort((left, right) =>
    left.date.getTime() - right.date.getTime() || left.issuedAt.getTime() - right.issuedAt.getTime()
  );
  const seen = new Set<string>();
  return sorted.filter((row) => {
    const key = `${dateKey(row.date)}|${row.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
