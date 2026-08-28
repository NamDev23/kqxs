import { validateWalkForwardEdge } from './statistical-validation';

export interface LotteryDraw {
  date: string;
  special: string;
  first: string[];
  second: string[];
  third: string[];
  fourth: string[];
  fifth: string[];
  sixth: string[];
  seventh: string[];
}

export type PredictionKind = 'de' | 'lo2' | 'lo3' | 'bacang';
export type EdgeStatus = 'qualified' | 'watch' | 'research_only';
export type SinglePickKind = 'bachThuLo' | 'bachThuDe';
export type CombinationKind = 'xien2' | 'xien3' | 'xien4';

export interface RankedNumber {
  number: string;
  score: number;
  probability: number;
  lift: number;
  frequency: number;
  recentFrequency: number;
  lastSeenDays: number | null;
  components: {
    longTerm: number;
    recent: number;
    dayOfWeek: number;
    gap: number;
    stability: number;
  };
  reasons: string[];
}

export interface PredictionSet {
  kind: PredictionKind;
  label: string;
  numbers: string[];
  ranked: RankedNumber[];
  pickCount: number;
  probability: number;
  baselineProbability: number;
  baselineLabel: string;
  edgeStatus: EdgeStatus;
  edgeLabel: string;
  edgeReason: string;
  backtestLift: number;
  backtestMetric: number;
  backtestBaseline: number;
  testedDraws: number;
  modelProfile: string;
  modelProfileLabel: string;
  profileLift: number;
  metricLabel: string;
}

export interface SinglePick {
  kind: SinglePickKind;
  label: string;
  description: string;
  sourceKind: PredictionKind;
  number: string;
  ranked: RankedNumber | null;
  probability: number;
  baseline: number;
  lift: number;
  testedDraws: number;
  hitDays: number;
  edgeStatus: EdgeStatus;
  edgeLabel: string;
  edgeReason: string;
  published: boolean;
  modelProfile: string;
  modelProfileLabel: string;
  profileLift: number;
  temporalStability: BacktestSummary['temporalStability'];
}

export interface CombinationPick {
  numbers: string[];
  probability: number;
  baseline: number;
  lift: number;
  observedDays: number;
  score: number;
}

export interface CombinationSet {
  kind: CombinationKind;
  label: string;
  size: 2 | 3 | 4;
  picks: CombinationPick[];
  pickCount: number;
  probability: number;
  backtestMetric: number;
  backtestBaseline: number;
  backtestLift: number;
  testedDraws: number;
  hitDays: number;
  edgeStatus: EdgeStatus;
  edgeLabel: string;
  edgeReason: string;
  modelProfile: string;
  temporalStability: BacktestSummary['temporalStability'];
}

export interface BacktestSummary {
  kind: PredictionKind;
  label: string;
  testedDraws: number;
  fromDate: string | null;
  toDate: string | null;
  pickCount: number;
  hitDays: number;
  totalHits: number;
  hitRate: number;
  precision: number;
  primaryMetric: number;
  averageHits: number;
  baseline: number;
  lift: number;
  status: EdgeStatus;
  statusLabel: string;
  profileUsage: Record<string, number>;
  metricLabel: string;
  modelInterval: { low: number; high: number };
  edgeInterval: { low: number; high: number };
  observedEdge: number;
  probabilityAboveBaseline: number;
  expectedHits: number;
  sampleAdequacy: 'adequate' | 'limited' | 'insufficient';
  temporalStability: {
    windowSize: number;
    windows: number;
    positiveWindows: number;
    recentEdge: number;
    minimumEdge: number;
    stable: boolean;
  };
}

export interface ProductPredictionResult {
  prediction: {
    date: string;
    de: string[];
    lo2: string[];
    lo3: string[];
    bacang: string[];
    bachThuLo: string;
    bachThuDe: string;
    songthulode: string[][];
    combinations: Record<CombinationKind, CombinationSet>;
    dauduoi: { dau: string[]; duoi: string[] };
  };
  sets: Record<PredictionKind, PredictionSet>;
  singles: Record<SinglePickKind, SinglePick>;
  backtest: {
    summaries: BacktestSummary[];
    aggregate: {
      testedDraws: number;
      modelScore: number;
      randomBaseline: number;
      lift: number;
      qualifiedMarkets: number;
      watchMarkets: number;
      researchMarkets: number;
      conclusion: string;
    };
  };
  analysis: {
    frequency: FrequencyRow[];
    hotCold: {
      hot: HotColdRow[];
      cold: HotColdRow[];
    };
    pairs: PairAnalysisRow[];
    specialDigits: SpecialDigitAnalysis;
  };
  dataQuality: {
    dataPoints: number;
    firstDate: string | null;
    lastDate: string | null;
    validDraws: number;
    invalidDraws: number;
    warnings: string[];
    blockingReasons: string[];
    canPublish: boolean;
    status: 'ready' | 'warning' | 'blocked';
    lagDays: number | null;
    completeness: number;
    missingDates: string[];
  };
  meta: {
    method: string;
    generatedAt: string;
    targetDate: string;
    trainingWindow: number;
  };
}

export interface RegisteredProfileComparison {
  profile: string;
  label: string;
  summaries: BacktestSummary[];
  aggregate: ProductPredictionResult['backtest']['aggregate'];
}

export interface PickCountComparison {
  kind: PredictionKind;
  pickCount: number;
  summary: BacktestSummary;
}

export interface FrequencyRow {
  number: string;
  count: number;
  percentage: number;
  lastSeen: number | null;
  avgGap: number | null;
  maxGap: number | null;
  count7: number;
  count30: number;
  count90: number;
  trend: number;
  lastSeenDate: string | null;
}

export interface HotColdRow {
  number: string;
  frequency: number;
  percentage: number;
}

export interface PairAnalysisRow {
  numbers: [string, string];
  observedDays: number;
  expectedDays: number;
  lift: number;
  support: number;
}

export interface SpecialDigitAnalysis {
  heads: number[];
  tails: number[];
  sums: number[];
  sampleSize: number;
}

interface KindConfig {
  kind: PredictionKind;
  label: string;
  digits: 2 | 3;
  domainSize: number;
  pickCount: number;
  maxHistory: number;
  recentWindow: number;
  minTraining: number;
  backtestWindow: number;
  baselineMode: 'single' | 'multi';
  prizesPerDraw: number;
}

interface ScoreCandidate {
  number: string;
  score: number;
  probability: number;
  lift: number;
  frequency: number;
  recentFrequency: number;
  lastSeenDays: number | null;
  components: RankedNumber['components'];
  reasons: string[];
}

interface ScoreProfile {
  id: string;
  label: string;
  weights: RankedNumber['components'];
  probabilityWeights: {
    longTerm: number;
    recent: number;
    weighted: number;
    dayOfWeek: number;
  };
  cooldownDays?: number;
  cooldownPenalty?: number;
}

interface ProfileSelection {
  profile: ScoreProfile;
  lift: number;
  metric: number;
  baseline: number;
  testedDraws: number;
}

const PRODUCT_METHOD = 'Product Walk-Forward Ensemble v7';

const SCORE_PROFILES: ScoreProfile[] = [
  {
    id: 'balanced',
    label: 'Pre-registered balanced ensemble',
    weights: { longTerm: 38, recent: 32, dayOfWeek: 10, gap: 0, stability: 20 },
    probabilityWeights: { longTerm: 42, recent: 28, weighted: 18, dayOfWeek: 12 }
  },
  {
    id: 'recent_momentum',
    label: 'Recent momentum',
    weights: { longTerm: 22, recent: 42, dayOfWeek: 12, gap: 6, stability: 18 },
    probabilityWeights: { longTerm: 24, recent: 42, weighted: 24, dayOfWeek: 10 }
  },
  {
    id: 'stable_frequency',
    label: 'Stable frequency',
    weights: { longTerm: 46, recent: 18, dayOfWeek: 8, gap: 4, stability: 24 },
    probabilityWeights: { longTerm: 54, recent: 16, weighted: 20, dayOfWeek: 10 }
  },
  {
    id: 'gap_reversion',
    label: 'Gap reversion',
    weights: { longTerm: 22, recent: 16, dayOfWeek: 10, gap: 34, stability: 18 },
    probabilityWeights: { longTerm: 30, recent: 16, weighted: 18, dayOfWeek: 36 }
  },
  {
    id: 'anti_repeat',
    label: 'Anti-repeat guard',
    weights: { longTerm: 30, recent: 24, dayOfWeek: 12, gap: 20, stability: 14 },
    probabilityWeights: { longTerm: 36, recent: 22, weighted: 18, dayOfWeek: 24 },
    cooldownDays: 1,
    cooldownPenalty: 0.82
  },
  {
    id: 'robust_consensus',
    label: 'Robust consensus of pre-registered experts',
    // Arithmetic consensus of the five pre-registered profiles above. These
    // weights are outcome-independent: the challenger is defined before it is
    // scored, so a holdout result is not silently reused for tuning.
    weights: { longTerm: 31.6, recent: 26.4, dayOfWeek: 10.4, gap: 12.8, stability: 18.8 },
    probabilityWeights: { longTerm: 37.2, recent: 24.8, weighted: 19.6, dayOfWeek: 18.4 }
  }
];

const DEFAULT_PROFILE = SCORE_PROFILES[0];
// Confirmed absent on both configured result archives during the 2026 Tet break.
// Keep this explicit: silently treating a no-draw day as a missing crawl would
// lower the data-quality score, while inventing a result would be much worse.
const KNOWN_NON_DRAW_DATES = new Set(['2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19']);

const KIND_CONFIGS: Record<PredictionKind, KindConfig> = {
  de: {
    kind: 'de',
    label: 'Đề đuôi ĐB',
    digits: 2,
    domainSize: 100,
    pickCount: 10,
    maxHistory: 365,
    recentWindow: 45,
    minTraining: 90,
    backtestWindow: 180,
    baselineMode: 'single',
    prizesPerDraw: 1
  },
  lo2: {
    kind: 'lo2',
    label: 'Lô 2 số',
    digits: 2,
    domainSize: 100,
    // Three contiguous 60-draw folds through 2026-08-27: core 8 retained a
    // positive edge in 3/3 folds (minimum lift 1.05). The wider top 15 remains
    // available in ranked metadata for coverage research, but is not the
    // primary published set.
    pickCount: 8,
    maxHistory: 365,
    recentWindow: 30,
    minTraining: 90,
    backtestWindow: 180,
    baselineMode: 'multi',
    prizesPerDraw: 27
  },
  lo3: {
    kind: 'lo3',
    label: 'Lô 3 số',
    digits: 3,
    domainSize: 1000,
    pickCount: 10,
    maxHistory: 365,
    recentWindow: 45,
    minTraining: 120,
    backtestWindow: 180,
    baselineMode: 'multi',
    prizesPerDraw: 23
  },
  bacang: {
    kind: 'bacang',
    label: '3 càng ĐB',
    digits: 3,
    domainSize: 1000,
    pickCount: 5,
    maxHistory: 500,
    recentWindow: 90,
    minTraining: 150,
    backtestWindow: 180,
    baselineMode: 'single',
    prizesPerDraw: 1
  }
};

export { PRODUCT_METHOD };

export function normalizeLotteryDraws(input: any[]): LotteryDraw[] {
  const normalized = input
    .map((item) => ({
      date: toDateKey(item.date),
      special: normalizeNumber(item.special, 5),
      first: normalizePrizeList(item.first, 5),
      second: normalizePrizeList(item.second, 5),
      third: normalizePrizeList(item.third, 5),
      fourth: normalizePrizeList(item.fourth, 4),
      fifth: normalizePrizeList(item.fifth, 4),
      sixth: normalizePrizeList(item.sixth, 3),
      seventh: normalizePrizeList(item.seventh, 2)
    }))
    .filter(isStructurallyValidDraw)
    .sort((a, b) => a.date.localeCompare(b.date));

  return Array.from(new Map(normalized.map((draw) => [draw.date, draw])).values())
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function createProductPrediction(
  rawDraws: LotteryDraw[],
  targetDate: string,
  generatedAt = new Date()
): ProductPredictionResult {
  const sortedDraws = normalizeLotteryDraws(rawDraws);

  const trainingDraws = sortedDraws.filter((draw) => draw.date < targetDate);
  const invalidDraws = rawDraws.length - sortedDraws.length;
  const dataQuality = assessDataQuality(sortedDraws, trainingDraws, invalidDraws, targetDate);

  const rawSets = {
    de: buildPredictionSet(trainingDraws, targetDate, KIND_CONFIGS.de),
    lo2: buildPredictionSet(trainingDraws, targetDate, KIND_CONFIGS.lo2),
    lo3: buildPredictionSet(trainingDraws, targetDate, KIND_CONFIGS.lo3),
    bacang: buildPredictionSet(trainingDraws, targetDate, KIND_CONFIGS.bacang)
  };

  const summaries = (Object.keys(KIND_CONFIGS) as PredictionKind[]).map((kind) =>
    runWalkForwardBacktest(trainingDraws, KIND_CONFIGS[kind])
  );
  const sets = attachBacktestToSets(rawSets, summaries);
  const singles = buildSinglePicks(trainingDraws, targetDate);
  const combinations = buildCombinationSets(trainingDraws, targetDate, rawSets.lo2.ranked.slice(0, 12));

  const aggregate = summarizeBacktests(summaries);
  const prediction = {
    date: targetDate,
    de: sets.de.numbers,
    lo2: sets.lo2.numbers,
    lo3: sets.lo3.numbers,
    bacang: sets.bacang.numbers,
    bachThuLo: singles.bachThuLo.number,
    bachThuDe: singles.bachThuDe.number,
    songthulode: buildSongThu(trainingDraws),
    combinations,
    dauduoi: buildDauDuoi(trainingDraws)
  };

  return {
    prediction,
    sets,
    singles,
    backtest: {
      summaries,
      aggregate
    },
    analysis: {
      frequency: buildFrequencyRows(trainingDraws, 'lo2'),
      hotCold: buildHotCold(trainingDraws, 'lo2', 30),
      pairs: buildPairAnalysis(trainingDraws),
      specialDigits: buildSpecialDigitAnalysis(trainingDraws)
    },
    dataQuality,
    meta: {
      method: PRODUCT_METHOD,
      generatedAt: generatedAt.toISOString(),
      targetDate,
      trainingWindow: Math.min(trainingDraws.length, 365)
    }
  };
}

export function actualNumbersForKind(draw: LotteryDraw, kind: PredictionKind): Set<string> {
  return new Set(extractKindNumbers(draw, kind));
}

export function scorePredictionAgainstDraw(
  numbers: string[],
  draw: LotteryDraw,
  kind: PredictionKind
) {
  const actual = actualNumbersForKind(draw, kind);
  const hits = numbers.filter((number) => actual.has(number));
  const config = KIND_CONFIGS[kind];
  const baseline = baselineForScoredPrediction(numbers, draw, config);

  return {
    hits,
    hitCount: hits.length,
    isHit: hits.length > 0,
    precision: numbers.length > 0 ? hits.length / numbers.length : 0,
    baseline
  };
}

/**
 * Research-only comparison of the pre-registered score profiles.
 *
 * This intentionally uses the same walk-forward window and scoring rules as
 * production. Consumers must not choose a winner from this result and report
 * that same window as an unbiased estimate; a later holdout/live window is
 * still required after any model choice.
 */
export function compareRegisteredProfiles(
  rawDraws: LotteryDraw[],
  backtestWindow?: number
): RegisteredProfileComparison[] {
  const draws = normalizeLotteryDraws(rawDraws);

  return SCORE_PROFILES.map((profile) => {
    const summaries = (Object.keys(KIND_CONFIGS) as PredictionKind[]).map((kind) =>
      runWalkForwardBacktest(
        draws,
        backtestWindow
          ? { ...KIND_CONFIGS[kind], backtestWindow: Math.max(1, Math.floor(backtestWindow)) }
          : KIND_CONFIGS[kind],
        profile
      )
    );

    return {
      profile: profile.id,
      label: profile.label,
      summaries,
      aggregate: summarizeBacktests(summaries)
    };
  });
}

/**
 * Research helper for pre-registering the size of a published set. The caller
 * must compare contiguous time folds and must not pick a count from a single
 * winning day. Production count changes still require an independent live
 * window after this historical comparison.
 */
export function comparePickCounts(
  rawDraws: LotteryDraw[],
  kind: PredictionKind,
  pickCounts: number[],
  backtestWindow?: number
): PickCountComparison[] {
  const draws = normalizeLotteryDraws(rawDraws);
  const baseConfig = KIND_CONFIGS[kind];

  return Array.from(new Set(pickCounts))
    .filter((pickCount) => Number.isInteger(pickCount) && pickCount > 0 && pickCount <= baseConfig.domainSize)
    .sort((left, right) => left - right)
    .map((pickCount) => {
      const config = {
        ...baseConfig,
        pickCount,
        backtestWindow: backtestWindow
          ? Math.max(1, Math.floor(backtestWindow))
          : baseConfig.backtestWindow
      };
      return {
        kind,
        pickCount,
        summary: runWalkForwardBacktest(draws, config, DEFAULT_PROFILE)
      };
    });
}

function buildPredictionSet(
  draws: LotteryDraw[],
  targetDate: string,
  config: KindConfig
): PredictionSet {
  const history = draws.slice(-config.maxHistory);
  const profileSelection = selectScoreProfile(history, targetDate, config);
  const rankedLimit = config.kind === 'lo2' ? Math.max(15, config.pickCount) : config.pickCount;
  const ranked = rankCandidates(history, targetDate, config, profileSelection.profile).slice(0, rankedLimit);
  const publishedRanked = ranked.slice(0, config.pickCount);
  const numbers = publishedRanked.map((candidate) => candidate.number);
  const probability = estimateSetProbability(publishedRanked, config);
  const baselineProbability = baselineForKind(config, history);

  return {
    kind: config.kind,
    label: config.label,
    numbers,
    ranked,
    pickCount: config.pickCount,
    probability,
    baselineProbability,
    baselineLabel: config.baselineMode === 'single'
      ? `Chọn ngẫu nhiên ${config.pickCount}/${config.domainSize}`
      : 'Nền thực nghiệm: tỷ lệ một số bất kỳ xuất hiện mỗi ngày',
    edgeStatus: 'research_only',
    edgeLabel: 'Chưa kiểm định',
    edgeReason: 'Chưa gắn kết quả walk-forward',
    backtestLift: 0,
    backtestMetric: 0,
    backtestBaseline: round(baselineProbability * 100, 2),
    testedDraws: 0,
    modelProfile: profileSelection.profile.id,
    modelProfileLabel: profileSelection.profile.label,
    profileLift: profileSelection.lift,
    metricLabel: metricLabelFor(config)
  };
}

function rankCandidates(
  draws: LotteryDraw[],
  targetDate: string,
  config: KindConfig,
  profile: ScoreProfile = DEFAULT_PROFILE
): RankedNumber[] {
  const candidates = buildCandidateDomain(config.digits);
  const targetDayOfWeek = new Date(`${targetDate}T00:00:00.000Z`).getUTCDay();
  const recentWindow = Math.min(config.recentWindow, draws.length);
  const recentDraws = draws.slice(-recentWindow);
  const dowDraws = draws.filter((draw) => new Date(`${draw.date}T00:00:00.000Z`).getUTCDay() === targetDayOfWeek);
  const base = baselineForSingleCandidate(config, draws);
  const globalStats = buildCandidateStats(draws, config.kind);
  const recentStats = buildCandidateStats(recentDraws, config.kind);
  const dowStats = buildCandidateStats(dowDraws, config.kind);
  const expectedGap = base > 0 ? 1 / base : config.domainSize;

  return candidates
    .map((number) => {
      const totalHits = globalStats.dayHits.get(number) ?? 0;
      const recentHits = recentStats.dayHits.get(number) ?? 0;
      const dowHits = dowStats.dayHits.get(number) ?? 0;
      const lastSeenIndex = globalStats.lastSeenIndex.get(number);
      const lastSeenDays = lastSeenIndex === undefined ? null : draws.length - 1 - lastSeenIndex;

      const longRate = smoothedRate(totalHits, draws.length, base);
      const recentRate = smoothedRate(recentHits, recentDraws.length, base);
      const dowRate = smoothedRate(dowHits, dowDraws.length, base);
      const weightedRate = smoothedRate(
        globalStats.weightedHits.get(number) ?? 0,
        globalStats.weightedTotal,
        base
      );

      const longLift = safeRatio(longRate, base);
      const recentLift = safeRatio(recentRate, base);
      const dowLift = safeRatio(dowRate, base);
      const weightedLift = safeRatio(weightedRate, base);
      const gapRatio = lastSeenDays === null ? 1 : Math.min(lastSeenDays / expectedGap, 3);

      const longTerm = squashLift(longLift);
      const recent = squashLift((recentLift * 0.7) + (weightedLift * 0.3));
      const dayOfWeek = dowDraws.length >= 8 ? squashLift(dowLift) : 0.5;
      const gap = Math.max(0, Math.min(1, gapRatio / 3));
      const stability = Math.min(1, Math.log10(totalHits + 1) / Math.log10(Math.max(10, draws.length)));

      const scoreWeights = normalizeComponentWeights(profile.weights);
      const repeatPenalty = cooldownPenalty(lastSeenDays, config, profile);
      const score = (
        longTerm * scoreWeights.longTerm +
        recent * scoreWeights.recent +
        dayOfWeek * scoreWeights.dayOfWeek +
        gap * scoreWeights.gap +
        stability * scoreWeights.stability
      ) * repeatPenalty;
      const probabilityWeights = normalizeProbabilityWeights(profile.probabilityWeights);

      const probability = clamp(
        base * (
          longLift * probabilityWeights.longTerm +
          recentLift * probabilityWeights.recent +
          weightedLift * probabilityWeights.weighted +
          dowLift * probabilityWeights.dayOfWeek
        ),
        0,
        Math.min(0.95, base * 4)
      );

      return {
        number,
        score: round(score * 100, 2),
        probability: round(probability * 100, 2),
        lift: round(safeRatio(probability, base), 2),
        frequency: totalHits,
        recentFrequency: recentHits,
        lastSeenDays,
        components: {
          longTerm: round(longTerm * 100, 1),
          recent: round(recent * 100, 1),
          dayOfWeek: round(dayOfWeek * 100, 1),
          gap: round(gap * 100, 1),
          stability: round(stability * 100, 1)
        },
        reasons: buildReasons(totalHits, recentHits, lastSeenDays, longLift, recentLift, config)
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      return a.number.localeCompare(b.number);
    });
}

function runWalkForwardBacktest(
  draws: LotteryDraw[],
  config: KindConfig,
  fixedProfile?: ScoreProfile
): BacktestSummary {
  if (draws.length <= config.minTraining) {
    return emptyBacktest(config);
  }

  const start = Math.max(config.minTraining, draws.length - config.backtestWindow);
  let testedDraws = 0;
  let daysWithHit = 0;
  let totalHits = 0;
  let totalPrecision = 0;
  let totalBaseline = 0;
  let fromDate: string | null = null;
  let toDate: string | null = null;
  const profileUsage: Record<string, number> = {};
  const modelScores: number[] = [];
  const baselineScores: number[] = [];

  for (let index = start; index < draws.length; index += 1) {
    const targetDraw = draws[index];
    const training = draws.slice(Math.max(0, index - config.maxHistory), index);
    const profileSelection = fixedProfile
      ? fixedProfileSelection(fixedProfile, config, training)
      : selectScoreProfile(training, targetDraw.date, config);
    const ranked = rankCandidates(training, targetDraw.date, config, profileSelection.profile).slice(0, config.pickCount);
    const predicted = ranked.map((candidate) => candidate.number);
    const actual = actualNumbersForKind(targetDraw, config.kind);
    const hitCount = predicted.filter((number) => actual.has(number)).length;

    profileUsage[profileSelection.profile.id] = (profileUsage[profileSelection.profile.id] ?? 0) + 1;
    if (!fromDate) fromDate = targetDraw.date;
    toDate = targetDraw.date;
    testedDraws += 1;
    totalHits += hitCount;
    totalPrecision += predicted.length > 0 ? hitCount / predicted.length : 0;
    const dailyModelScore = config.baselineMode === 'single'
      ? (hitCount > 0 ? 1 : 0)
      : (predicted.length > 0 ? hitCount / predicted.length : 0);
    const dailyBaseline = baselineForBacktestDraw(targetDraw, config);
    modelScores.push(dailyModelScore);
    baselineScores.push(dailyBaseline);
    totalBaseline += dailyBaseline;
    if (hitCount > 0) daysWithHit += 1;
  }

  const metric = config.baselineMode === 'single'
    ? daysWithHit / testedDraws
    : totalPrecision / testedDraws;
  const baseline = totalBaseline / testedDraws;
  const validation = validateWalkForwardEdge(modelScores, baselineScores);
  const temporalStability = temporalStabilityFor(modelScores, baselineScores);
  const expectedHits = baselineScores.reduce((sum, value) => sum + value, 0);
  const sampleAdequacy = sampleAdequacyFor(testedDraws, expectedHits, config);
  const status = edgeStatusFor(
    metric,
    baseline,
    testedDraws,
    config,
    daysWithHit,
    validation,
    sampleAdequacy,
    temporalStability
  );
  const primaryMetric = round(metric * 100, 2);

  return {
    kind: config.kind,
    label: config.label,
    testedDraws,
    fromDate,
    toDate,
    pickCount: config.pickCount,
    hitDays: daysWithHit,
    totalHits,
    hitRate: round((daysWithHit / testedDraws) * 100, 2),
    precision: round((totalPrecision / testedDraws) * 100, 2),
    primaryMetric,
    averageHits: round(totalHits / testedDraws, 2),
    baseline: round(baseline * 100, 2),
    lift: round(safeRatio(metric, baseline), 2),
    status,
    statusLabel: edgeLabelFor(status),
    profileUsage,
    metricLabel: metricLabelFor(config),
    modelInterval: {
      low: round(validation.modelInterval.low * 100, 2),
      high: round(validation.modelInterval.high * 100, 2)
    },
    edgeInterval: {
      low: round(validation.edgeInterval.low * 100, 2),
      high: round(validation.edgeInterval.high * 100, 2)
    },
    observedEdge: round(validation.observedEdge * 100, 2),
    probabilityAboveBaseline: round(validation.probabilityAboveBaseline * 100, 2),
    expectedHits: round(expectedHits, 2),
    sampleAdequacy,
    temporalStability: {
      ...temporalStability,
      recentEdge: round(temporalStability.recentEdge * 100, 2),
      minimumEdge: round(temporalStability.minimumEdge * 100, 2)
    }
  };
}

function temporalStabilityFor(modelScores: number[], baselineScores: number[]) {
  const length = Math.min(modelScores.length, baselineScores.length);
  const windowSize = length >= 150 ? 60 : Math.max(30, Math.floor(length / 3));
  const edges: number[] = [];

  for (let end = length; end - windowSize >= 0 && edges.length < 3; end -= windowSize) {
    let edge = 0;
    for (let index = end - windowSize; index < end; index += 1) {
      edge += modelScores[index] - baselineScores[index];
    }
    edges.unshift(edge / windowSize);
  }

  const positiveWindows = edges.filter((edge) => edge > 0).length;
  const recentEdge = edges[edges.length - 1] ?? 0;
  const minimumEdge = edges.length > 0 ? Math.min(...edges) : 0;

  return {
    windowSize,
    windows: edges.length,
    positiveWindows,
    recentEdge,
    minimumEdge,
    stable: edges.length >= 3 && positiveWindows >= 2 && recentEdge > 0
  };
}

function fixedProfileSelection(
  profile: ScoreProfile,
  config: KindConfig,
  draws: LotteryDraw[]
): ProfileSelection {
  return {
    profile,
    lift: 0,
    metric: 0,
    baseline: round(baselineForKind(config, draws) * 100, 2),
    testedDraws: 0
  };
}

function summarizeBacktests(summaries: BacktestSummary[]) {
  const usable = summaries.filter((summary) => summary.testedDraws > 0);
  if (usable.length === 0) {
    return {
      testedDraws: 0,
      modelScore: 0,
      randomBaseline: 0,
      lift: 0,
      qualifiedMarkets: 0,
      watchMarkets: 0,
      researchMarkets: 0,
      conclusion: 'Chưa có đủ kỳ để kiểm định.'
    };
  }

  const weightedModel = usable.reduce((sum, summary) => {
    const metric = summary.kind === 'de' || summary.kind === 'bacang'
      ? summary.hitRate
      : summary.precision;
    return sum + metric * summary.testedDraws;
  }, 0);
  const weightedBaseline = usable.reduce((sum, summary) => sum + summary.baseline * summary.testedDraws, 0);
  const total = usable.reduce((sum, summary) => sum + summary.testedDraws, 0);
  const modelScore = weightedModel / total;
  const randomBaseline = weightedBaseline / total;

  return {
    testedDraws: Math.max(...usable.map((summary) => summary.testedDraws)),
    modelScore: round(modelScore, 2),
    randomBaseline: round(randomBaseline, 2),
    lift: round(safeRatio(modelScore, randomBaseline), 2),
    qualifiedMarkets: summaries.filter((summary) => summary.status === 'qualified').length,
    watchMarkets: summaries.filter((summary) => summary.status === 'watch').length,
    researchMarkets: summaries.filter((summary) => summary.status === 'research_only').length,
    conclusion: summarizeConclusion(summaries)
  };
}

function buildCandidateStats(draws: LotteryDraw[], kind: PredictionKind) {
  const dayHits = new Map<string, number>();
  const weightedHits = new Map<string, number>();
  const lastSeenIndex = new Map<string, number>();
  let weightedTotal = 0;
  const halfLife = 45;

  draws.forEach((draw, index) => {
    const age = draws.length - 1 - index;
    const weight = Math.pow(0.5, age / halfLife);
    const values = actualNumbersForKind(draw, kind);
    weightedTotal += weight;

    values.forEach((number) => {
      dayHits.set(number, (dayHits.get(number) ?? 0) + 1);
      weightedHits.set(number, (weightedHits.get(number) ?? 0) + weight);
      lastSeenIndex.set(number, index);
    });
  });

  return { dayHits, weightedHits, lastSeenIndex, weightedTotal };
}

function buildFrequencyRows(draws: LotteryDraw[], kind: PredictionKind): FrequencyRow[] {
  const config = KIND_CONFIGS[kind];
  const candidates = buildCandidateDomain(config.digits);
  const positions = new Map<string, number[]>();

  draws.forEach((draw, index) => {
    actualNumbersForKind(draw, kind).forEach((number) => {
      if (!positions.has(number)) positions.set(number, []);
      positions.get(number)!.push(index);
    });
  });

  return candidates
    .map((number) => {
      const seen = positions.get(number) ?? [];
      const gaps = seen.slice(1).map((position, index) => position - seen[index]);
      const countInWindow = (window: number) => seen.filter((position) => position >= draws.length - window).length;
      const count30 = countInWindow(30);
      const longRate = seen.length / Math.max(1, draws.length);
      const recentRate = count30 / Math.max(1, Math.min(30, draws.length));
      return {
        number,
        count: seen.length,
        percentage: round((seen.length / Math.max(1, draws.length)) * 100, 2),
        lastSeen: seen.length ? draws.length - 1 - seen[seen.length - 1] : null,
        avgGap: gaps.length ? round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length, 2) : null,
        maxGap: gaps.length ? Math.max(...gaps) : null,
        count7: countInWindow(7),
        count30,
        count90: countInWindow(90),
        trend: round(recentRate - longRate, 4),
        lastSeenDate: seen.length ? draws[seen[seen.length - 1]].date : null
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.number.localeCompare(b.number);
    });
}

function buildHotCold(draws: LotteryDraw[], kind: PredictionKind, period: number) {
  const config = KIND_CONFIGS[kind];
  const candidates = buildCandidateDomain(config.digits);
  const recent = draws.slice(-period);
  const counts = new Map<string, number>();

  recent.forEach((draw) => {
    actualNumbersForKind(draw, kind).forEach((number) => {
      counts.set(number, (counts.get(number) ?? 0) + 1);
    });
  });

  const rows = candidates.map((number) => ({
    number,
    frequency: counts.get(number) ?? 0,
    percentage: round(((counts.get(number) ?? 0) / Math.max(1, recent.length)) * 100, 2)
  }));

  return {
    hot: rows
      .slice()
      .sort((a, b) => b.frequency - a.frequency || a.number.localeCompare(b.number))
      .slice(0, 10),
    cold: rows
      .slice()
      .sort((a, b) => a.frequency - b.frequency || a.number.localeCompare(b.number))
      .slice(0, 10)
  };
}

interface CombinationBacktestResult {
  metric: number;
  baseline: number;
  lift: number;
  testedDraws: number;
  hitDays: number;
  expectedHits: number;
  status: EdgeStatus;
  edgeReason: string;
  temporalStability: BacktestSummary['temporalStability'];
}

const COMBINATION_CONFIGS: Array<{
  kind: CombinationKind;
  label: string;
  size: 2 | 3 | 4;
  pickCount: number;
}> = [
  { kind: 'xien2', label: 'Xiên 2', size: 2, pickCount: 5 },
  { kind: 'xien3', label: 'Xiên 3', size: 3, pickCount: 3 },
  { kind: 'xien4', label: 'Xiên 4', size: 4, pickCount: 2 }
];

function buildCombinationSets(
  draws: LotteryDraw[],
  targetDate: string,
  lo2Candidates: RankedNumber[]
): Record<CombinationKind, CombinationSet> {
  return Object.fromEntries(COMBINATION_CONFIGS.map((config) => {
    const raw = rankCombinationSet(draws, lo2Candidates, config.size, config.pickCount);
    const backtest = runCombinationBacktest(draws, targetDate, config.size, config.pickCount);
    return [config.kind, {
      kind: config.kind,
      label: config.label,
      size: config.size,
      picks: raw,
      pickCount: config.pickCount,
      probability: backtest.metric,
      backtestMetric: backtest.metric,
      backtestBaseline: backtest.baseline,
      backtestLift: backtest.lift,
      testedDraws: backtest.testedDraws,
      hitDays: backtest.hitDays,
      edgeStatus: backtest.status,
      edgeLabel: edgeLabelFor(backtest.status),
      edgeReason: backtest.edgeReason,
      modelProfile: 'shrunk_cooccurrence_v1',
      temporalStability: backtest.temporalStability
    } satisfies CombinationSet];
  })) as Record<CombinationKind, CombinationSet>;
}

function rankCombinationSet(
  draws: LotteryDraw[],
  candidates: RankedNumber[],
  size: 2 | 3 | 4,
  pickCount: number
): CombinationPick[] {
  const recent = draws.slice(-180);
  if (recent.length === 0 || candidates.length < size) return [];
  const actualByDay = recent.map((draw) => actualNumbersForKind(draw, 'lo2'));
  const baseline = mean(actualByDay.map((actual) => combinationBaseline(actual.size, size)));
  const priorStrength = 30;

  return combinationsOf(candidates.slice(0, 12), size)
    .map((rows) => {
      const numbers = rows.map((row) => row.number).sort();
      const observedDays = actualByDay.filter((actual) => numbers.every((number) => actual.has(number))).length;
      const marginalPrior = rows.reduce((product, row) => product * clamp(row.probability / 100, 0.001, 0.95), 1);
      const prior = clamp((marginalPrior + baseline) / 2, 0.000001, 0.95);
      const posterior = (observedDays + priorStrength * prior) / (recent.length + priorStrength);
      const confidence = mean(rows.map((row) => row.score / 100));
      const lift = safeRatio(posterior, baseline);
      const score = posterior * (0.75 + confidence * 0.25) * Math.min(1.5, Math.sqrt(Math.max(0.25, lift)));
      return {
        numbers,
        probability: round(posterior * 100, 3),
        baseline: round(baseline * 100, 3),
        lift: round(lift, 2),
        observedDays,
        score: round(score * 100, 4)
      };
    })
    .sort((left, right) =>
      right.score - left.score ||
      right.observedDays - left.observedDays ||
      left.numbers.join('-').localeCompare(right.numbers.join('-'))
    )
    .slice(0, pickCount);
}

function runCombinationBacktest(
  draws: LotteryDraw[],
  targetDate: string,
  size: 2 | 3 | 4,
  pickCount: number
): CombinationBacktestResult {
  void targetDate;
  const minTraining = 150;
  if (draws.length <= minTraining) return emptyCombinationBacktest(size);
  const start = Math.max(minTraining, draws.length - 180);
  const modelScores: number[] = [];
  const baselineScores: number[] = [];
  let hitDays = 0;
  let expectedHits = 0;

  for (let index = start; index < draws.length; index += 1) {
    const target = draws[index];
    const training = draws.slice(Math.max(0, index - 365), index);
    const rankedLo2 = rankCandidates(training, target.date, KIND_CONFIGS.lo2, DEFAULT_PROFILE).slice(0, 12);
    const picks = rankCombinationSet(training, rankedLo2, size, pickCount);
    const actual = actualNumbersForKind(target, 'lo2');
    const hits = picks.filter((pick) => pick.numbers.every((number) => actual.has(number))).length;
    const baseline = combinationBaseline(actual.size, size);
    modelScores.push(picks.length > 0 ? hits / picks.length : 0);
    baselineScores.push(baseline);
    expectedHits += baseline * picks.length;
    if (hits > 0) hitDays += 1;
  }

  const testedDraws = modelScores.length;
  const metric = mean(modelScores);
  const baseline = mean(baselineScores);
  const lift = safeRatio(metric, baseline);
  const validation = validateWalkForwardEdge(modelScores, baselineScores);
  const rawStability = temporalStabilityFor(modelScores, baselineScores);
  const temporalStability = {
    ...rawStability,
    recentEdge: round(rawStability.recentEdge * 100, 2),
    minimumEdge: round(rawStability.minimumEdge * 100, 2)
  };
  let status: EdgeStatus = 'research_only';
  if (
    testedDraws >= 150 && expectedHits >= 8 && hitDays >= 8 && lift >= 1.05 &&
    validation.edgeInterval.low > 0 && validation.probabilityAboveBaseline >= 0.975 && rawStability.stable
  ) status = 'qualified';
  else if (
    testedDraws >= 120 && expectedHits >= 5 && lift > 1 &&
    validation.observedEdge > 0 && validation.probabilityAboveBaseline >= 0.9 &&
    rawStability.windows >= 3 && rawStability.positiveWindows >= 2 && rawStability.recentEdge >= 0
  ) status = 'watch';

  const metricPercent = round(metric * 100, 3);
  const baselinePercent = round(baseline * 100, 3);
  const reason = expectedHits < 5
    ? `Mẫu xiên ${size} quá mỏng: chỉ ${round(expectedHits, 2)} hit kỳ vọng theo nền trong ${testedDraws} kỳ.`
    : status === 'qualified'
      ? `Walk-forward ${testedDraws} kỳ, precision ${metricPercent}%, baseline ${baselinePercent}%, lift ${round(lift, 2)}x.`
      : `Chưa chứng minh vượt nền bền vững: precision ${metricPercent}%, baseline ${baselinePercent}%, lift ${round(lift, 2)}x; ${rawStability.positiveWindows}/${rawStability.windows} cửa sổ dương.`;

  return {
    metric: metricPercent,
    baseline: baselinePercent,
    lift: round(lift, 2),
    testedDraws,
    hitDays,
    expectedHits: round(expectedHits, 2),
    status,
    edgeReason: reason,
    temporalStability
  };
}

function emptyCombinationBacktest(size: 2 | 3 | 4): CombinationBacktestResult {
  return {
    metric: 0,
    baseline: 0,
    lift: 0,
    testedDraws: 0,
    hitDays: 0,
    expectedHits: 0,
    status: 'research_only',
    edgeReason: `Chưa đủ dữ liệu để kiểm định xiên ${size}.`,
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

function combinationsOf<T>(values: T[], size: number): T[][] {
  const output: T[][] = [];
  const visit = (start: number, selected: T[]) => {
    if (selected.length === size) {
      output.push(selected.slice());
      return;
    }
    for (let index = start; index <= values.length - (size - selected.length); index += 1) {
      selected.push(values[index]);
      visit(index + 1, selected);
      selected.pop();
    }
  };
  visit(0, []);
  return output;
}

function combinationBaseline(actualUniqueCount: number, size: number) {
  if (actualUniqueCount < size) return 0;
  return safeRatio(binomial(actualUniqueCount, size), binomial(100, size));
}

function binomial(n: number, k: number) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let index = 1; index <= k; index += 1) {
    result = (result * (n - k + index)) / index;
  }
  return result;
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function buildSongThu(draws: LotteryDraw[]): string[][] {
  return buildPairAnalysis(draws).slice(0, 10).map((row) => [...row.numbers]);
}

function buildPairAnalysis(draws: LotteryDraw[]): PairAnalysisRow[] {
  const recent = draws.slice(-180);
  const pairCounts = new Map<string, number>();
  const marginals = new Map<string, number>();

  recent.forEach((draw) => {
    const numbers = Array.from(actualNumbersForKind(draw, 'lo2')).sort();
    numbers.forEach((number) => marginals.set(number, (marginals.get(number) ?? 0) + 1));
    for (let left = 0; left < numbers.length; left += 1) {
      for (let right = left + 1; right < numbers.length; right += 1) {
        const key = `${numbers[left]}-${numbers[right]}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  });

  return Array.from(pairCounts.entries())
    .map(([key, observedDays]) => {
      const [left, right] = key.split('-') as [string, string];
      const expectedDays = ((marginals.get(left) ?? 0) * (marginals.get(right) ?? 0)) / Math.max(1, recent.length);
      return {
        numbers: [left, right] as [string, string],
        observedDays,
        expectedDays: round(expectedDays, 2),
        lift: round(safeRatio(observedDays, expectedDays), 2),
        support: round((observedDays / Math.max(1, recent.length)) * 100, 2)
      };
    })
    .filter((row) => row.observedDays >= 5 && row.expectedDays >= 2)
    .sort((a, b) => b.lift - a.lift || b.observedDays - a.observedDays || a.numbers.join('-').localeCompare(b.numbers.join('-')))
    .slice(0, 25);
}

function buildSpecialDigitAnalysis(draws: LotteryDraw[]): SpecialDigitAnalysis {
  const recent = draws.slice(-365);
  const heads = Array(10).fill(0) as number[];
  const tails = Array(10).fill(0) as number[];
  const sums = Array(10).fill(0) as number[];

  recent.forEach((draw) => {
    const de = draw.special.slice(-2);
    const head = Number(de[0]);
    const tail = Number(de[1]);
    heads[head] += 1;
    tails[tail] += 1;
    sums[(head + tail) % 10] += 1;
  });

  return { heads, tails, sums, sampleSize: recent.length };
}

function buildDauDuoi(draws: LotteryDraw[]): { dau: string[]; duoi: string[] } {
  const dau = new Map<string, number>();
  const duoi = new Map<string, number>();

  draws.slice(-90).forEach((draw) => {
    actualNumbersForKind(draw, 'lo2').forEach((number) => {
      dau.set(number[0], (dau.get(number[0]) ?? 0) + 1);
      duoi.set(number[1], (duoi.get(number[1]) ?? 0) + 1);
    });
  });

  return {
    dau: Array.from(dau.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([number]) => number),
    duoi: Array.from(duoi.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([number]) => number)
  };
}

function estimateSetProbability(ranked: RankedNumber[], config: KindConfig): number {
  if (ranked.length === 0) return 0;
  if (config.baselineMode === 'single') {
    return round(Math.min(100, ranked.reduce((sum, row) => sum + row.probability, 0)), 2);
  }

  return round(ranked.reduce((sum, row) => sum + row.probability, 0) / ranked.length, 2);
}

function attachBacktestToSets(
  sets: Record<PredictionKind, PredictionSet>,
  summaries: BacktestSummary[]
): Record<PredictionKind, PredictionSet> {
  const byKind = new Map(summaries.map((summary) => [summary.kind, summary]));

  return (Object.keys(sets) as PredictionKind[]).reduce((result, kind) => {
    const summary = byKind.get(kind);
    const set = sets[kind];

    if (!summary) {
      result[kind] = set;
      return result;
    }

    result[kind] = {
      ...set,
      probability: summary.primaryMetric,
      edgeStatus: summary.status,
      edgeLabel: summary.statusLabel,
      edgeReason: buildEdgeReason(summary),
      backtestLift: summary.lift,
      backtestMetric: summary.primaryMetric,
      backtestBaseline: summary.baseline,
      testedDraws: summary.testedDraws
    };
    return result;
  }, {} as Record<PredictionKind, PredictionSet>);
}

function buildSinglePicks(draws: LotteryDraw[], targetDate: string): Record<SinglePickKind, SinglePick> {
  return {
    bachThuLo: buildSinglePick(
      draws,
      targetDate,
      { ...KIND_CONFIGS.lo2, label: 'Bạch thủ lô', pickCount: 1 },
      'bachThuLo',
      'lo2',
      '1 số lô 2 số, kiểm tra trên toàn bộ bảng giải'
    ),
    bachThuDe: buildSinglePick(
      draws,
      targetDate,
      { ...KIND_CONFIGS.de, label: 'Bạch thủ đề', pickCount: 1 },
      'bachThuDe',
      'de',
      '1 số đề, chỉ kiểm tra với 2 số cuối giải đặc biệt'
    )
  };
}

function buildSinglePick(
  draws: LotteryDraw[],
  targetDate: string,
  config: KindConfig,
  kind: SinglePickKind,
  sourceKind: PredictionKind,
  description: string
): SinglePick {
  const set = buildPredictionSet(draws, targetDate, config);
  const summary = runWalkForwardBacktest(draws, config);
  const ranked = set.ranked[0] ?? null;
  const edgeStatus = summary.status;

  return {
    kind,
    label: config.label,
    description,
    sourceKind,
    number: ranked?.number ?? ''.padStart(config.digits, '0'),
    ranked,
    probability: summary.primaryMetric,
    baseline: summary.baseline,
    lift: summary.lift,
    testedDraws: summary.testedDraws,
    hitDays: summary.hitDays,
    edgeStatus,
    edgeLabel: summary.statusLabel,
    edgeReason: buildEdgeReason(summary),
    published: edgeStatus !== 'research_only',
    modelProfile: set.modelProfile,
    modelProfileLabel: set.modelProfileLabel,
    profileLift: set.profileLift,
    temporalStability: summary.temporalStability
  };
}

function selectScoreProfile(
  draws: LotteryDraw[],
  targetDate: string,
  config: KindConfig
): ProfileSelection {
  // The profile is deliberately pre-registered. Selecting the best of several
  // profiles on a short rolling window created a multiple-testing advantage
  // that looked good in-sample but was not a trustworthy forward signal.
  void targetDate;
  return {
    profile: DEFAULT_PROFILE,
    lift: 0,
    metric: 0,
    baseline: round(baselineForKind(config, draws) * 100, 2),
    testedDraws: 0
  };
}

function validateProfile(
  draws: LotteryDraw[],
  config: KindConfig,
  profile: ScoreProfile,
  start: number
): ProfileSelection {
  let testedDraws = 0;
  let daysWithHit = 0;
  let totalPrecision = 0;
  let totalBaseline = 0;

  for (let index = start; index < draws.length; index += 1) {
    const targetDraw = draws[index];
    const training = draws.slice(Math.max(0, index - config.maxHistory), index);
    const predicted = rankCandidates(training, targetDraw.date, config, profile)
      .slice(0, config.pickCount)
      .map((candidate) => candidate.number);
    const actual = actualNumbersForKind(targetDraw, config.kind);
    const hitCount = predicted.filter((number) => actual.has(number)).length;

    testedDraws += 1;
    if (hitCount > 0) daysWithHit += 1;
    totalPrecision += predicted.length > 0 ? hitCount / predicted.length : 0;
    totalBaseline += baselineForBacktestDraw(targetDraw, config);
  }

  const metric = config.baselineMode === 'single'
    ? daysWithHit / Math.max(1, testedDraws)
    : totalPrecision / Math.max(1, testedDraws);
  const baseline = totalBaseline / Math.max(1, testedDraws);

  return {
    profile,
    lift: round(safeRatio(metric, baseline), 2),
    metric: round(metric * 100, 2),
    baseline: round(baseline * 100, 2),
    testedDraws
  };
}

function baselineForKind(config: KindConfig, draws?: LotteryDraw[]): number {
  if (config.baselineMode === 'single') {
    return config.pickCount / config.domainSize;
  }

  return baselineForSingleCandidate(config, draws);
}

function baselineForSingleCandidate(config: KindConfig, draws?: LotteryDraw[]): number {
  if (config.baselineMode === 'single') {
    return 1 / config.domainSize;
  }

  if (draws && draws.length > 0) {
    const totalUnique = draws.reduce((sum, draw) => sum + actualNumbersForKind(draw, config.kind).size, 0);
    return clamp(totalUnique / draws.length / config.domainSize, 0, 1);
  }

  return 1 - Math.pow(1 - (1 / config.domainSize), config.prizesPerDraw);
}

function baselineForBacktestDraw(draw: LotteryDraw, config: KindConfig): number {
  if (config.baselineMode === 'single') {
    return config.pickCount / config.domainSize;
  }

  return actualNumbersForKind(draw, config.kind).size / config.domainSize;
}

function baselineForScoredPrediction(numbers: string[], draw: LotteryDraw, config: KindConfig): number {
  if (config.baselineMode === 'single') {
    return Math.min(1, numbers.length / config.domainSize);
  }

  return actualNumbersForKind(draw, config.kind).size / config.domainSize;
}

function extractKindNumbers(draw: LotteryDraw, kind: PredictionKind): string[] {
  if (kind === 'de') return [draw.special.slice(-2)];
  if (kind === 'bacang') return [draw.special.slice(-3)];

  const all = extractAllPrizeNumbers(draw);
  if (kind === 'lo2') return all.map((number) => number.slice(-2));
  return all.filter((number) => number.length >= 3).map((number) => number.slice(-3));
}

function extractAllPrizeNumbers(draw: LotteryDraw): string[] {
  return [
    draw.special,
    ...draw.first,
    ...draw.second,
    ...draw.third,
    ...draw.fourth,
    ...draw.fifth,
    ...draw.sixth,
    ...draw.seventh
  ];
}

function buildCandidateDomain(digits: 2 | 3): string[] {
  const size = digits === 2 ? 100 : 1000;
  return Array.from({ length: size }, (_, index) => String(index).padStart(digits, '0'));
}

function buildReasons(
  totalHits: number,
  recentHits: number,
  lastSeenDays: number | null,
  longLift: number,
  recentLift: number,
  config: KindConfig
): string[] {
  const reasons = [
    `${totalHits} lần trong cửa sổ dữ liệu`,
    `${recentHits} lần trong ${config.recentWindow} kỳ gần nhất`
  ];

  if (longLift >= 1.25) reasons.push(`cao hơn nền dài hạn ${round(longLift, 2)}x`);
  if (recentLift >= 1.25) reasons.push(`xu hướng gần đây ${round(recentLift, 2)}x`);
  if (lastSeenDays === null) reasons.push('chưa xuất hiện trong cửa sổ huấn luyện');
  else reasons.push(`lần gần nhất cách ${lastSeenDays} kỳ`);

  return reasons.slice(0, 4);
}

function assessDataQuality(
  allDraws: LotteryDraw[],
  trainingDraws: LotteryDraw[],
  invalidDraws: number,
  targetDate: string
): ProductPredictionResult['dataQuality'] {
  const warnings: string[] = [];
  const blockingReasons: string[] = [];

  if (invalidDraws > 0) blockingReasons.push(`${invalidDraws} bản ghi bị loại vì sai cấu trúc giải`);
  if (trainingDraws.length < 180) blockingReasons.push('Dữ liệu dưới 180 kỳ, chưa đủ điều kiện backtest tối thiểu');

  const dateLeakRows = trainingDraws.filter((draw) => {
    const [year, month, day] = draw.date.split('-');
    const fourthYearCount = draw.fourth.filter((value) => value === year).length;
    const seventhDateTokens = draw.seventh.filter((value) => value === day || value === month);
    return fourthYearCount >= 2 || seventhDateTokens.length >= 3;
  }).length;

  if (dateLeakRows > 0) {
    blockingReasons.push(`Dữ liệu nghi nhiễm ngày/tháng/năm ở ${dateLeakRows} kỳ`);
  }

  const firstDate = trainingDraws[0]?.date ?? null;
  const lastDate = trainingDraws[trainingDraws.length - 1]?.date ?? null;
  const lagDays = lastDate ? daysBetween(lastDate, targetDate) : null;
  if (lagDays === null || lagDays > 1) {
    blockingReasons.push(lastDate
      ? `Dữ liệu huấn luyện chậm ${lagDays} ngày so với target`
      : 'Không có dữ liệu huấn luyện trước target');
  }

  const missingDates = collectMissingDates(trainingDraws);
  if (missingDates.length > 0) {
    warnings.push(`Thiếu ${missingDates.length} ngày trong chuỗi lịch sử; cần xác minh lịch nghỉ quay hoặc nguồn crawl`);
  }

  if (trainingDraws.length < 365) {
    warnings.push(`Mới có ${trainingDraws.length} kỳ; nhánh 3 chữ số vẫn có độ bất định cao`);
  }

  const spanDays = firstDate && lastDate ? daysBetween(firstDate, lastDate) + 1 : 0;
  const plannedNonDrawDays = firstDate && lastDate
    ? Array.from(KNOWN_NON_DRAW_DATES).filter((date) => date >= firstDate && date <= lastDate).length
    : 0;
  const expectedDrawDays = Math.max(0, spanDays - plannedNonDrawDays);
  const completeness = expectedDrawDays > 0 ? round((trainingDraws.length / expectedDrawDays) * 100, 2) : 0;
  const canPublish = blockingReasons.length === 0;

  return {
    dataPoints: trainingDraws.length,
    firstDate,
    lastDate,
    validDraws: allDraws.length,
    invalidDraws,
    warnings: [...blockingReasons, ...warnings],
    blockingReasons,
    canPublish,
    status: canPublish ? (warnings.length > 0 ? 'warning' : 'ready') : 'blocked',
    lagDays,
    completeness,
    missingDates: missingDates.slice(-20)
  };
}

function collectMissingDates(draws: LotteryDraw[]) {
  if (draws.length < 2) return [];
  const dates = new Set(draws.map((draw) => draw.date));
  const missing: string[] = [];
  for (let date = draws[0].date; date < draws[draws.length - 1].date; date = addDaysToDateKey(date, 1)) {
    if (!dates.has(date) && !KNOWN_NON_DRAW_DATES.has(date)) missing.push(date);
  }
  return missing;
}

function emptyBacktest(config: KindConfig): BacktestSummary {
  return {
    kind: config.kind,
    label: config.label,
    testedDraws: 0,
    fromDate: null,
    toDate: null,
    pickCount: config.pickCount,
    hitDays: 0,
    totalHits: 0,
    hitRate: 0,
    precision: 0,
    primaryMetric: 0,
    averageHits: 0,
    baseline: round(baselineForKind(config) * 100, 2),
    lift: 0,
    status: 'research_only',
    statusLabel: edgeLabelFor('research_only'),
    profileUsage: {},
    metricLabel: metricLabelFor(config),
    modelInterval: { low: 0, high: 0 },
    edgeInterval: { low: 0, high: 0 },
    observedEdge: 0,
    probabilityAboveBaseline: 0,
    expectedHits: 0,
    sampleAdequacy: 'insufficient',
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

function edgeStatusFor(
  metric: number,
  baseline: number,
  testedDraws: number,
  config: KindConfig,
  hitDays: number,
  validation: ReturnType<typeof validateWalkForwardEdge>,
  sampleAdequacy: BacktestSummary['sampleAdequacy'],
  temporalStability: BacktestSummary['temporalStability']
): EdgeStatus {
  if (sampleAdequacy !== 'adequate' || baseline <= 0) return 'research_only';

  const lift = safeRatio(metric, baseline);
  const minObservedHits = config.digits === 3 ? 5 : 8;

  if (
    lift >= 1.05 &&
    hitDays >= minObservedHits &&
    validation.edgeInterval.low > 0 &&
    validation.probabilityAboveBaseline >= 0.975 &&
    temporalStability.stable
  ) return 'qualified';

  if (
    lift > 1 &&
    validation.observedEdge > 0 &&
    validation.probabilityAboveBaseline >= 0.9 &&
    temporalStability.windows >= 3 &&
    temporalStability.positiveWindows >= 2 &&
    temporalStability.recentEdge >= 0
  ) return 'watch';

  return 'research_only';
}

function edgeLabelFor(status: EdgeStatus): string {
  if (status === 'qualified') return 'Đủ bằng chứng';
  if (status === 'watch') return 'Tín hiệu yếu';
  return 'Chưa đủ bằng chứng';
}

function buildEdgeReason(summary: BacktestSummary): string {
  if (summary.testedDraws < 60) {
    return `Mới test ${summary.testedDraws} kỳ, chưa đủ dày để phát tín hiệu.`;
  }

  if (summary.status === 'qualified') {
    return `Walk-forward ${summary.testedDraws} kỳ: ${summary.metricLabel.toLowerCase()} ${summary.primaryMetric.toFixed(2)}%, baseline ${summary.baseline.toFixed(2)}%; CI95 edge ${formatSigned(summary.edgeInterval.low)} đến ${formatSigned(summary.edgeInterval.high)} điểm %, ${summary.temporalStability.positiveWindows}/${summary.temporalStability.windows} cửa sổ gần nhất dương.`;
  }

  if (summary.status === 'watch') {
    return `Điểm ước lượng cao hơn baseline ${summary.lift.toFixed(2)}x, nhưng CI95 edge ${formatSigned(summary.edgeInterval.low)} đến ${formatSigned(summary.edgeInterval.high)} điểm % vẫn chưa đủ chắc chắn.`;
  }

  if (summary.sampleAdequacy !== 'adequate') {
    return `Mẫu ${summary.testedDraws} kỳ còn ${summary.sampleAdequacy === 'limited' ? 'mỏng' : 'thiếu'}; số hit kỳ vọng dưới giả thuyết ngẫu nhiên là ${summary.expectedHits.toFixed(2)}.`;
  }

  if (!summary.temporalStability.stable) {
    return `Edge chưa bền theo thời gian: ${summary.temporalStability.positiveWindows}/${summary.temporalStability.windows} cửa sổ ${summary.temporalStability.windowSize} kỳ dương; cửa sổ mới nhất ${formatSigned(summary.temporalStability.recentEdge)} điểm %.`;
  }

  if (summary.kind === 'bacang' && summary.hitDays < 2) {
    return `Mới hit ${summary.hitDays}/${summary.testedDraws} kỳ; 3 càng cần thêm mẫu trước khi mở tín hiệu.`;
  }

  if (summary.kind === 'de' && summary.pickCount === 1 && summary.hitDays < 2) {
    return `Mới hit ${summary.hitDays}/${summary.testedDraws} kỳ; bạch thủ đề cần thêm mẫu trước khi mở tín hiệu.`;
  }

  return `Chưa chứng minh vượt baseline: lift ${summary.lift.toFixed(2)}x, xác suất bootstrap edge dương ${summary.probabilityAboveBaseline.toFixed(1)}%.`;
}

function sampleAdequacyFor(
  testedDraws: number,
  expectedHits: number,
  config: KindConfig
): BacktestSummary['sampleAdequacy'] {
  const minimumDraws = config.digits === 3 ? 150 : 120;
  if (testedDraws < Math.min(60, minimumDraws)) return 'insufficient';
  if (testedDraws < minimumDraws || expectedHits < 5) return 'limited';
  return 'adequate';
}

function metricLabelFor(config: KindConfig) {
  return config.baselineMode === 'single' ? 'Tỷ lệ kỳ có ít nhất 1 hit' : 'Precision trung bình mỗi số';
}

function summarizeConclusion(summaries: BacktestSummary[]) {
  const qualified = summaries.filter((summary) => summary.status === 'qualified');
  const watch = summaries.filter((summary) => summary.status === 'watch');
  if (qualified.length > 0) return `${qualified.length} nhánh vượt baseline với CI95 dương.`;
  if (watch.length > 0) return `${watch.length} nhánh có tín hiệu yếu; chưa đủ điều kiện phát mạnh.`;
  return 'Chưa có nhánh nào chứng minh vượt baseline; hệ thống nên giữ chế độ nghiên cứu.';
}

function formatSigned(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
}

function normalizeComponentWeights(weights: RankedNumber['components']) {
  const total = Math.max(
    1,
    weights.longTerm + weights.recent + weights.dayOfWeek + weights.gap + weights.stability
  );

  return {
    longTerm: weights.longTerm / total,
    recent: weights.recent / total,
    dayOfWeek: weights.dayOfWeek / total,
    gap: weights.gap / total,
    stability: weights.stability / total
  };
}

function normalizeProbabilityWeights(weights: ScoreProfile['probabilityWeights']) {
  const total = Math.max(1, weights.longTerm + weights.recent + weights.weighted + weights.dayOfWeek);

  return {
    longTerm: weights.longTerm / total,
    recent: weights.recent / total,
    weighted: weights.weighted / total,
    dayOfWeek: weights.dayOfWeek / total
  };
}

function cooldownPenalty(
  lastSeenDays: number | null,
  config: KindConfig,
  profile: ScoreProfile
): number {
  if (!profile.cooldownDays || !profile.cooldownPenalty) return 1;
  if (config.baselineMode !== 'single') return 1;
  if (lastSeenDays === null) return 1;
  return lastSeenDays <= profile.cooldownDays ? profile.cooldownPenalty : 1;
}

function smoothedRate(hits: number, total: number, base: number): number {
  const priorStrength = 12;
  return ((hits || 0) + base * priorStrength) / Math.max(1, total + priorStrength);
}

function squashLift(lift: number): number {
  return clamp((Math.log(lift + 0.2) + 1.25) / 2.6, 0, 1);
}

function safeRatio(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0;
  return a / b;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00.000Z`).getTime();
  const b = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function addDaysToDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toDateKey(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function normalizePrizeList(value: unknown, digits: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeNumber(item, digits));
}

function normalizeNumber(value: unknown, digits: number): string {
  const raw = String(value ?? '').replace(/\D/g, '');
  return raw.length === digits ? raw : '';
}

function isStructurallyValidDraw(draw: LotteryDraw): boolean {
  const validList = (values: string[], count: number, digits: number) =>
    values.length === count && values.every((number) => new RegExp(`^\\d{${digits}}$`).test(number));

  return Boolean(
    draw.date &&
    /^\d{4}-\d{2}-\d{2}$/.test(draw.date) &&
    /^\d{5}$/.test(draw.special) &&
    validList(draw.first, 1, 5) &&
    validList(draw.second, 2, 5) &&
    validList(draw.third, 6, 5) &&
    validList(draw.fourth, 4, 4) &&
    validList(draw.fifth, 6, 4) &&
    validList(draw.sixth, 3, 3) &&
    validList(draw.seventh, 4, 2)
  );
}
