import {
  settleOfficialLoto2,
  settleOfficialLoto3,
  settleOfficialPairs,
  type LegalProductKind
} from './legal-lottery-products';
import type { LotteryDraw } from './product-prediction-engine';

export type OfficialPortfolioStatus = 'qualified' | 'watch' | 'no_signal';

export interface OfficialCandidate {
  selection: string;
  numbers: string[];
  expectedGross: number;
  expectedNet: number;
  score: number;
  reasons: string[];
}

export interface OfficialProductBacktest {
  testedDays: number;
  stakeUnits: number;
  payoutUnits: number;
  netUnits: number;
  roi: number;
  winningTickets: number;
  positiveFolds: number;
  folds: Array<{ fromDate: string; toDate: string; roi: number }>;
  meanDailyNet: number;
  netInterval: { low: number; high: number };
  recentRoi: number;
}

export interface OfficialPortfolioProduct {
  kind: LegalProductKind;
  label: string;
  status: OfficialPortfolioStatus;
  statusLabel: string;
  reason: string;
  researchPicks: OfficialCandidate[];
  selectedPicks: OfficialCandidate[];
  backtest: OfficialProductBacktest;
  modelProfile: 'official_reward_aware_v1';
}

export interface OfficialPortfolio {
  version: 'official_reward_aware_v1';
  targetDate: string;
  policy: {
    publishThreshold: 'qualified_only';
    allowsNoSignal: true;
    minimumBacktestDays: number;
    minimumLiveDays: number;
  };
  hasSignal: boolean;
  selectedTicketCount: number;
  products: Record<LegalProductKind, OfficialPortfolioProduct>;
}

const PRODUCT_CONFIGS: Array<{
  kind: LegalProductKind;
  label: string;
  researchCount: number;
}> = [
  { kind: 'loto2', label: 'Lô tô 2 số chính thức', researchCount: 3 },
  { kind: 'loto3', label: 'Lô tô 3 số chính thức', researchCount: 3 },
  { kind: 'xien2', label: 'Vé 2 cặp số', researchCount: 3 },
  { kind: 'xien3', label: 'Vé 3 cặp số', researchCount: 1 },
  { kind: 'xien4', label: 'Vé 4 cặp số', researchCount: 1 }
];

const MIN_TRAINING_DAYS = 180;
const BACKTEST_DAYS = 180;
const MIN_LIVE_DAYS = 30;

export function buildOfficialPortfolio(
  draws: LotteryDraw[],
  targetDate: string
): OfficialPortfolio {
  const pairCandidatePool = rankLo2Marginals(draws, 12);
  const products = Object.fromEntries(PRODUCT_CONFIGS.map((config) => {
    const researchPicks = rankProductCandidates(draws, config.kind, config.researchCount, pairCandidatePool);
    const backtest = backtestOfficialProduct(draws, config.kind, config.researchCount);
    const status = portfolioStatus(backtest);
    const selectedPicks = status === 'qualified' && backtest.roi > 0
      ? researchPicks.filter((pick) => pick.expectedNet > 0)
      : [];
    const finalStatus: OfficialPortfolioStatus = selectedPicks.length > 0 ? status : 'no_signal';

    return [config.kind, {
      kind: config.kind,
      label: config.label,
      status: finalStatus,
      statusLabel: finalStatus === 'qualified'
        ? 'Đủ bằng chứng để phát'
        : status === 'watch'
          ? 'Theo dõi, chưa phát'
          : 'Không có tín hiệu',
      reason: explainDecision(finalStatus, backtest, researchPicks),
      researchPicks,
      selectedPicks,
      backtest,
      modelProfile: 'official_reward_aware_v1'
    } satisfies OfficialPortfolioProduct];
  })) as Record<LegalProductKind, OfficialPortfolioProduct>;
  const selectedTicketCount = Object.values(products)
    .reduce((total, product) => total + product.selectedPicks.length, 0);

  return {
    version: 'official_reward_aware_v1',
    targetDate,
    policy: {
      publishThreshold: 'qualified_only',
      allowsNoSignal: true,
      minimumBacktestDays: BACKTEST_DAYS,
      minimumLiveDays: MIN_LIVE_DAYS
    },
    hasSignal: selectedTicketCount > 0,
    selectedTicketCount,
    products
  };
}

export function backtestOfficialProduct(
  draws: LotteryDraw[],
  kind: LegalProductKind,
  pickCount: number,
  window = BACKTEST_DAYS
): OfficialProductBacktest {
  if (draws.length <= MIN_TRAINING_DAYS) return emptyBacktest();
  const start = Math.max(MIN_TRAINING_DAYS, draws.length - window);
  const days: Array<{ date: string; stake: number; payout: number; net: number; winners: number }> = [];

  for (let index = start; index < draws.length; index += 1) {
    const target = draws[index];
    const training = draws.slice(Math.max(0, index - 500), index);
    const lo2Pool = rankLo2Marginals(training, 12);
    const picks = rankProductCandidates(training, kind, pickCount, lo2Pool);
    const settlement = settleCandidates(kind, picks, target);
    days.push({
      date: target.date,
      stake: settlement.stakeUnits,
      payout: settlement.payoutUnits,
      net: settlement.netUnits,
      winners: settlement.winningTickets
    });
  }

  if (days.length === 0) return emptyBacktest();
  const stakeUnits = sum(days.map((day) => day.stake));
  const payoutUnits = sum(days.map((day) => day.payout));
  const dailyNet = days.map((day) => day.net);
  const meanDailyNet = mean(dailyNet);
  const standardError = sampleStandardDeviation(dailyNet) / Math.sqrt(days.length);
  const foldSize = Math.max(1, Math.floor(days.length / 3));
  const folds = [0, 1, 2].map((fold) => {
    const from = fold * foldSize;
    const to = fold === 2 ? days.length : Math.min(days.length, (fold + 1) * foldSize);
    const rows = days.slice(from, to);
    const stake = sum(rows.map((row) => row.stake));
    const payout = sum(rows.map((row) => row.payout));
    return {
      fromDate: rows[0]?.date ?? '',
      toDate: rows[rows.length - 1]?.date ?? '',
      roi: percent(payout - stake, stake)
    };
  });
  const recent = days.slice(-60);
  const recentStake = sum(recent.map((day) => day.stake));
  const recentPayout = sum(recent.map((day) => day.payout));

  return {
    testedDays: days.length,
    stakeUnits,
    payoutUnits,
    netUnits: payoutUnits - stakeUnits,
    roi: percent(payoutUnits - stakeUnits, stakeUnits),
    winningTickets: sum(days.map((day) => day.winners)),
    positiveFolds: folds.filter((fold) => fold.roi > 0).length,
    folds,
    meanDailyNet: round(meanDailyNet),
    netInterval: {
      low: round(meanDailyNet - 1.96 * standardError),
      high: round(meanDailyNet + 1.96 * standardError)
    },
    recentRoi: percent(recentPayout - recentStake, recentStake)
  };
}

function rankProductCandidates(
  draws: LotteryDraw[],
  kind: LegalProductKind,
  pickCount: number,
  lo2Candidates: OfficialCandidate[]
): OfficialCandidate[] {
  if (kind === 'loto2') return rankLoto2(draws, pickCount);
  if (kind === 'loto3') return rankLoto3(draws, pickCount);
  const size = kind === 'xien2' ? 2 : kind === 'xien3' ? 3 : 4;
  return rankPairs(draws, kind, size, pickCount, lo2Candidates);
}

function rankLoto2(draws: LotteryDraw[], pickCount: number): OfficialCandidate[] {
  const history = draws.slice(-365);
  const recent = draws.slice(-60);
  const longStats = loto2OutcomeCounts(history);
  const recentStats = loto2OutcomeCounts(recent);
  return numericDomain(100, 2).map((number) => {
    const specialLong = smoothedCount(longStats.special.get(number) ?? 0, history.length, 0.01, 120);
    const firstLong = smoothedCount(longStats.first.get(number) ?? 0, history.length, 0.01, 120);
    const specialRecent = smoothedCount(recentStats.special.get(number) ?? 0, recent.length, 0.01, 80);
    const firstRecent = smoothedCount(recentStats.first.get(number) ?? 0, recent.length, 0.01, 80);
    const expectedGross = 70 * blend(specialLong, specialRecent) + blend(firstLong, firstRecent);
    return candidate(number, [number], expectedGross, [
      `ĐB ${round(specialLong * 100)}%`,
      `G1 ${round(firstLong * 100)}%`,
      'co Bayes về nền 1%'
    ]);
  }).sort(compareCandidates).slice(0, pickCount);
}

function rankLoto3(draws: LotteryDraw[], pickCount: number): OfficialCandidate[] {
  const history = draws.slice(-500);
  const recent = draws.slice(-120);
  const longGrossTotals = loto3GrossTotals(history);
  const recentGrossTotals = loto3GrossTotals(recent);
  return numericDomain(1000, 3).map((number) => {
    const longGross = shrink(
      (longGrossTotals.get(number) ?? 0) / Math.max(1, history.length),
      history.length,
      0.5,
      500
    );
    const recentGross = shrink(
      (recentGrossTotals.get(number) ?? 0) / Math.max(1, recent.length),
      recent.length,
      0.5,
      240
    );
    const expectedGross = longGross * 0.75 + recentGross * 0.25;
    return candidate(number, [number], expectedGross, [
      `gross co mẫu ${round(expectedGross)}`,
      'gộp ĐB, G1, G6 và khuyến khích',
      'prior mạnh do giải 3 số rất hiếm'
    ]);
  }).sort(compareCandidates).slice(0, pickCount);
}

function rankPairs(
  draws: LotteryDraw[],
  kind: 'xien2' | 'xien3' | 'xien4',
  size: 2 | 3 | 4,
  pickCount: number,
  lo2Candidates: OfficialCandidate[]
): OfficialCandidate[] {
  // Pre-registered compact pools keep the walk-forward deployable on the VPS
  // and reduce the multiple-testing surface before combinations are ranked.
  const poolLimit = size === 2 ? 8 : size === 3 ? 7 : 6;
  const numbers = Array.from(new Set(lo2Candidates.map((row) => row.numbers[0])))
    .filter((number) => /^\d{2}$/.test(number))
    .slice(0, poolLimit);
  const history = draws.slice(-120);
  const recent = draws.slice(-60);
  const baselineGross = baselinePairGross(history, kind, size);
  const historyCounts = history.map(endingCounts);
  const recentCounts = historyCounts.slice(-recent.length);

  return combinationsOf(numbers, size).map((selection) => {
    const longGross = mean(historyCounts.map((counts) => pairGross(size, selection, counts)));
    const recentGross = mean(recentCounts.map((counts) => pairGross(size, selection, counts)));
    const shrunkLong = shrink(longGross, history.length, baselineGross, 90);
    const shrunkRecent = shrink(recentGross, recent.length, baselineGross, 90);
    const expectedGross = shrunkLong * 0.7 + shrunkRecent * 0.3;
    return candidate(selection.join('+'), selection, expectedGross, [
      `gross dài ${round(shrunkLong)}`,
      `gross 60 kỳ ${round(shrunkRecent)}`,
      `nền vé ${round(baselineGross)}`
    ]);
  }).sort(compareCandidates).slice(0, pickCount);
}

function rankLo2Marginals(draws: LotteryDraw[], pickCount: number): OfficialCandidate[] {
  const history = draws.slice(-365);
  const recent = draws.slice(-60);
  const longCounts = presenceCounts(history);
  const recentCounts = presenceCounts(recent);
  return numericDomain(100, 2).map((number) => {
    const long = smoothedCount(longCounts.get(number) ?? 0, history.length, 0.24, 60);
    const short = smoothedCount(recentCounts.get(number) ?? 0, recent.length, 0.24, 45);
    const probability = blend(long, short);
    return candidate(number, [number], probability, [
      `P xuất hiện ${round(probability * 100)}%`,
      'pool chỉ dùng để tạo vé cặp'
    ]);
  }).sort(compareCandidates).slice(0, pickCount);
}

function settleCandidates(kind: LegalProductKind, picks: OfficialCandidate[], draw: LotteryDraw) {
  if (kind === 'loto2') return settleOfficialLoto2(picks.map((pick) => pick.selection), draw);
  if (kind === 'loto3') return settleOfficialLoto3(picks.map((pick) => pick.selection), draw);
  return settleOfficialPairs(kind, picks.map((pick) => ({ numbers: pick.numbers })), draw);
}

function portfolioStatus(backtest: OfficialProductBacktest): OfficialPortfolioStatus {
  if (
    backtest.testedDays >= BACKTEST_DAYS &&
    backtest.winningTickets >= 8 &&
    backtest.roi > 0 &&
    backtest.recentRoi > 0 &&
    backtest.positiveFolds >= 2 &&
    backtest.netInterval.low > 0
  ) return 'qualified';
  if (
    backtest.testedDays >= 120 &&
    backtest.roi > 0 &&
    backtest.positiveFolds >= 2
  ) return 'watch';
  return 'no_signal';
}

function explainDecision(
  status: OfficialPortfolioStatus,
  backtest: OfficialProductBacktest,
  picks: OfficialCandidate[]
) {
  if (status === 'qualified') {
    return `ROI walk-forward ${backtest.roi}%, cận dưới net/ngày ${backtest.netInterval.low}, ${backtest.positiveFolds}/3 fold dương.`;
  }
  if (backtest.testedDays < 120) return `Mới có ${backtest.testedDays} kỳ walk-forward; chưa đủ dữ liệu.`;
  const blockers = [
    backtest.roi <= 0 ? `ROI ${backtest.roi}% chưa dương` : null,
    backtest.recentRoi <= 0 ? `60 kỳ gần nhất ${backtest.recentRoi}%` : null,
    backtest.positiveFolds < 2 ? `${backtest.positiveFolds}/3 fold dương` : null,
    backtest.netInterval.low <= 0 ? `cận dưới net ${backtest.netInterval.low}` : null,
    picks.every((pick) => pick.expectedNet <= 0) ? 'không có vé EV dương sau co mẫu' : null
  ].filter(Boolean);
  return `Không phát vé: ${blockers.join('; ')}.`;
}

function candidate(selection: string, numbers: string[], expectedGross: number, reasons: string[]): OfficialCandidate {
  return {
    selection,
    numbers,
    expectedGross: round(expectedGross),
    expectedNet: round(expectedGross - 1),
    score: round(expectedGross * 100),
    reasons
  };
}

function baselinePairGross(draws: LotteryDraw[], kind: 'xien2' | 'xien3' | 'xien4', size: 2 | 3 | 4) {
  if (draws.length === 0) return 0;
  const totalCombinations = binomial(100, size);
  return mean(draws.map((draw) => {
    const counts = endingCounts(draw);
    const repeated = Object.values(counts).filter((count) => count >= 2).length;
    const single = Object.values(counts).filter((count) => count === 1).length;
    const absent = 100 - repeated - single;
    let totalPayout = 0;
    for (let repeatPicks = 0; repeatPicks <= Math.min(size, repeated); repeatPicks += 1) {
      for (let singlePicks = 0; singlePicks <= Math.min(size - repeatPicks, single); singlePicks += 1) {
        const absentPicks = size - repeatPicks - singlePicks;
        if (absentPicks < 0 || absentPicks > absent) continue;
        const ways = binomial(repeated, repeatPicks) * binomial(single, singlePicks) * binomial(absent, absentPicks);
        totalPayout += ways * pairPayout(size, repeatPicks + singlePicks, repeatPicks);
      }
    }
    return totalPayout / Math.max(1, totalCombinations);
  }));
}

function drawEndings(draw: LotteryDraw) {
  return new Set([
    draw.special,
    ...draw.first,
    ...draw.second,
    ...draw.third,
    ...draw.fourth,
    ...draw.fifth,
    ...draw.sixth,
    ...draw.seventh
  ].map((number) => number.slice(-2)));
}

function endingCounts(draw: LotteryDraw) {
  return Array.from(drawEndingsWithDuplicates(draw)).reduce<Record<string, number>>((counts, number) => {
    counts[number] = (counts[number] ?? 0) + 1;
    return counts;
  }, {});
}

function drawEndingsWithDuplicates(draw: LotteryDraw) {
  return [
    draw.special,
    ...draw.first,
    ...draw.second,
    ...draw.third,
    ...draw.fourth,
    ...draw.fifth,
    ...draw.sixth,
    ...draw.seventh
  ].map((number) => number.slice(-2));
}

function pairGross(size: 2 | 3 | 4, numbers: string[], counts: Record<string, number>) {
  const hitCount = numbers.filter((number) => (counts[number] ?? 0) >= 1).length;
  const repeatedCount = numbers.filter((number) => (counts[number] ?? 0) >= 2).length;
  return pairPayout(size, hitCount, repeatedCount);
}

function pairPayout(size: 2 | 3 | 4, hitCount: number, repeatedCount: number) {
  if (size === 2) {
    if (hitCount === 2 && repeatedCount === 2) return 15;
    if (hitCount === 2) return 10;
    if (repeatedCount >= 1) return 1;
    return 0;
  }
  if (size === 3) {
    if (hitCount === 3 && repeatedCount === 3) return 60;
    if (hitCount === 3) return 45;
    if (hitCount >= 2 && repeatedCount >= 2) return 10;
    if (hitCount >= 2 && repeatedCount >= 1) return 2;
    return 0;
  }
  if (hitCount === 4 && repeatedCount === 4) return 1000;
  if (hitCount === 4) return 110;
  if (hitCount >= 3 && repeatedCount >= 3) return 30;
  if (hitCount >= 3 && repeatedCount >= 2) return 15;
  if (hitCount >= 3 && repeatedCount >= 1) return 5;
  return 0;
}

function loto2OutcomeCounts(draws: LotteryDraw[]) {
  const special = new Map<string, number>();
  const first = new Map<string, number>();
  draws.forEach((draw) => {
    increment(special, draw.special.slice(-2));
    if (draw.first[0]) increment(first, draw.first[0].slice(-2));
  });
  return { special, first };
}

function loto3GrossTotals(draws: LotteryDraw[]) {
  const totals = new Map<string, number>();
  draws.forEach((draw) => {
    const special3 = draw.special.slice(-3);
    const special2 = draw.special.slice(-2);
    increment(totals, special3, 420);
    numericDomain(10, 1).forEach((head) => {
      const number = `${head}${special2}`;
      if (number !== special3) increment(totals, number, 5);
    });
    if (draw.first[0]) increment(totals, draw.first[0].slice(-3), 20);
    new Set(draw.sixth.map((number) => number.slice(-3))).forEach((number) => increment(totals, number, 5));
  });
  return totals;
}

function presenceCounts(draws: LotteryDraw[]) {
  const counts = new Map<string, number>();
  draws.forEach((draw) => drawEndings(draw).forEach((number) => increment(counts, number)));
  return counts;
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function smoothedCount(count: number, sampleSize: number, baseline: number, priorStrength: number) {
  return (count + priorStrength * baseline) / Math.max(1, sampleSize + priorStrength);
}

function binomial(n: number, k: number) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let index = 1; index <= k; index += 1) {
    result = result * (n - k + index) / index;
  }
  return result;
}

function numericDomain(size: number, digits: number) {
  return Array.from({ length: size }, (_, index) => String(index).padStart(digits, '0'));
}

function combinationsOf<T>(values: T[], size: number): T[][] {
  const output: T[][] = [];
  const visit = (start: number, selected: T[]) => {
    if (selected.length === size) {
      output.push([...selected]);
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

function emptyBacktest(): OfficialProductBacktest {
  return {
    testedDays: 0,
    stakeUnits: 0,
    payoutUnits: 0,
    netUnits: 0,
    roi: 0,
    winningTickets: 0,
    positiveFolds: 0,
    folds: [],
    meanDailyNet: 0,
    netInterval: { low: 0, high: 0 },
    recentRoi: 0
  };
}

function compareCandidates(left: OfficialCandidate, right: OfficialCandidate) {
  return right.score - left.score || left.selection.localeCompare(right.selection);
}

function blend(long: number, recent: number) {
  return long * 0.7 + recent * 0.3;
}

function shrink(observed: number, sampleSize: number, prior: number, priorStrength: number) {
  return (observed * sampleSize + prior * priorStrength) / Math.max(1, sampleSize + priorStrength);
}

function sampleStandardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(sum(values.map((value) => (value - average) ** 2)) / (values.length - 1));
}

function mean(values: number[]) {
  return sum(values) / Math.max(1, values.length);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function percent(net: number, stake: number) {
  return stake > 0 ? round(net / stake * 100) : 0;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
