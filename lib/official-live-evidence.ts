import { settleOfficialLoto2, settleOfficialLoto3, settleOfficialPairs, type LegalProductKind } from './legal-lottery-products';
import { validateWalkForwardEdge } from './statistical-validation';
import type { LotteryDraw } from './product-prediction-engine';

// Ranking stays frozen at v1. Changing rankings/counts requires a new strategy
// version and a new forward record, not reusing an older strategy's successes.
export const OFFICIAL_STRATEGY = 'official_reward_aware_v1';
export const PUBLICATION_POLICY = 'forward_evidence_v1';
export const PAIR_CHALLENGER_STRATEGY = 'pairs_max_exposure_2_v1';
export const MIN_OFFICIAL_LIVE_DAYS = 30;
export const OFFICIAL_PICK_COUNTS = { loto2: 3, loto3: 3, xien2: 3, xien3: 1, xien4: 1 } as const;

export interface OfficialLiveEvidence {
  strategy: string;
  asOf: string;
  eligibleDays: number;
  lastEvaluatedDate: string | null;
  latestResultDate: string | null;
  winningDays: number;
  stakeUnits: number;
  payoutUnits: number;
  roi: number | null;
  recentRoi: number | null;
  netLowerBound: number | null;
  netWithoutBestDay: number;
  snapshotIds: string[];
  blockers: string[];
  qualified: boolean;
  challenger?: { strategy: string; eligibleDays: number; roi: number | null; winningDays: number };
}
export type OfficialEvidenceByKind = Partial<Record<LegalProductKind, OfficialLiveEvidence>>;

interface EvidenceSnapshot {
  id: string;
  predictionFor: Date | string;
  createdAt: Date | string;
  combinations: unknown;
  dataQuality: unknown;
}

export function buildOfficialLiveEvidence(
  snapshots: EvidenceSnapshot[], draws: LotteryDraw[], targetDate: string,
  strategy: typeof OFFICIAL_STRATEGY | typeof PAIR_CHALLENGER_STRATEGY = OFFICIAL_STRATEGY
): OfficialEvidenceByKind {
  const actuals = new Map(draws.filter((draw) => draw.date < targetDate).map((draw) => [draw.date, draw]));
  const latestResultDate = [...actuals.keys()].sort().at(-1) ?? null;
  const result: OfficialEvidenceByKind = {};
  const ordered = [...snapshots].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id));
  for (const kind of Object.keys(OFFICIAL_PICK_COUNTS) as LegalProductKind[]) {
    if (strategy === PAIR_CHALLENGER_STRATEGY && kind !== 'xien2') continue;
    const days = new Map<string, { id: string; stake: number; payout: number; net: number }>();
    for (const row of ordered) {
      const targetTime = new Date(row.predictionFor).getTime();
      if (!Number.isFinite(targetTime)) continue;
      const target = new Date(targetTime).toISOString().slice(0, 10);
      const issuedAt = new Date(row.createdAt).getTime();
      const draw = actuals.get(target);
      const portfolio = jsonObject(row.combinations)?.officialPortfolio;
      if (!draw || target >= targetDate || days.has(target) || !Number.isFinite(issuedAt) ||
        issuedAt >= Date.parse(`${target}T11:15:00.000Z`) ||
        jsonObject(row.dataQuality)?.canPublish !== true ||
        portfolio?.version !== OFFICIAL_STRATEGY || portfolio.targetDate !== target) continue;
      const product = portfolio.products?.[kind];
      if (strategy === PAIR_CHALLENGER_STRATEGY && product?.backtest?.diversification?.strategy !== strategy) continue;
      const picks = strategy === PAIR_CHALLENGER_STRATEGY ? product?.challengerPicks : product?.researchPicks;
      if (product?.modelProfile !== OFFICIAL_STRATEGY || !validResearchPicks(kind, picks)) continue;
      const settled = kind === 'loto2' ? settleOfficialLoto2(picks.map((p: any) => p.selection), draw)
        : kind === 'loto3' ? settleOfficialLoto3(picks.map((p: any) => p.selection), draw)
          : settleOfficialPairs(kind, picks, draw);
      if (settled.ticketCount !== OFFICIAL_PICK_COUNTS[kind]) continue;
      days.set(target, { id: row.id, stake: settled.stakeUnits, payout: settled.payoutUnits, net: settled.netUnits });
    }
    // All forward observations are retained; no best-window selection.
    const orderedDays = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, day]) => day);
    const stakeUnits = sum(orderedDays.map((day) => day.stake));
    const payoutUnits = sum(orderedDays.map((day) => day.payout));
    const net = orderedDays.map((day) => day.net);
    const recent = orderedDays.slice(-30);
    const roi = stakeUnits ? (payoutUnits - stakeUnits) / stakeUnits * 100 : null;
    const recentStake = sum(recent.map((day) => day.stake));
    const recentRoi = recentStake ? sum(recent.map((day) => day.net)) / recentStake * 100 : null;
    // Conservative 99% per-product interval, not a calibrated win probability.
    const netLowerBound = net.length >= MIN_OFFICIAL_LIVE_DAYS
      ? validateWalkForwardEdge(net, net.map(() => 0), 4000, 0.01).edgeInterval.low : null;
    const winningDays = orderedDays.filter((day) => day.payout > 0).length;
    const netWithoutBestDay = sum(net) - Math.max(0, ...net);
    const lastEvaluatedDate = [...days.keys()].sort().at(-1) ?? null;
    const blockers = [
      !lastEvaluatedDate || lastEvaluatedDate !== latestResultDate ? 'Thiếu đối chiếu snapshot cho kết quả mới nhất' : '',
      net.length < MIN_OFFICIAL_LIVE_DAYS ? `Mới có ${net.length}/${MIN_OFFICIAL_LIVE_DAYS} ngày chốt trước quay` : '',
      winningDays < 8 ? `Mới có ${winningDays}/8 ngày có thưởng` : '',
      roi === null || roi <= 0 ? 'ROI theo dõi chưa dương' : '',
      recentRoi === null || recentRoi <= 0 ? 'ROI 30 ngày theo dõi gần nhất chưa dương' : '',
      netLowerBound === null || netLowerBound <= 0 ? 'Cận dưới bootstrap net chưa dương' : '',
      netWithoutBestDay <= 0 ? 'Chưa có lãi khi bỏ ngày tốt nhất' : ''
    ].filter(Boolean);
    result[kind] = { strategy, asOf: targetDate, eligibleDays: net.length, lastEvaluatedDate, latestResultDate,
      winningDays, stakeUnits, payoutUnits, roi, recentRoi, netLowerBound,
      netWithoutBestDay, snapshotIds: orderedDays.map((day) => day.id), blockers, qualified: blockers.length === 0 };
  }
  return result;
}

export function validResearchPicks(kind: LegalProductKind, picks: any): boolean {
  if (!Array.isArray(picks) || picks.length !== OFFICIAL_PICK_COUNTS[kind]) return false;
  const size = kind === 'xien2' ? 2 : kind === 'xien3' ? 3 : kind === 'xien4' ? 4 : 1;
  const digits = kind === 'loto3' ? 3 : 2;
  const keys: string[] = [];
  for (const pick of picks) {
    if (!Array.isArray(pick?.numbers) || pick.numbers.length !== size ||
      new Set(pick.numbers).size !== size ||
      !pick.numbers.every((n: unknown) => typeof n === 'string' && new RegExp(`^\\d{${digits}}$`).test(n)) ||
      pick.selection !== pick.numbers.join('+')) return false;
    keys.push([...pick.numbers].sort().join('+'));
  }
  return new Set(keys).size === keys.length;
}

export function hasQualifiedLiveEvidence(evidence: OfficialLiveEvidence | undefined, targetDate: string): boolean {
  // Recheck stored fields at publication boundaries; absent/legacy evidence fails closed.
  return !!evidence && evidence.strategy === OFFICIAL_STRATEGY && evidence.asOf === targetDate &&
    !!evidence.lastEvaluatedDate && evidence.lastEvaluatedDate === evidence.latestResultDate &&
    evidence.lastEvaluatedDate < targetDate && Array.isArray(evidence.blockers) && Array.isArray(evidence.snapshotIds) &&
    [evidence.eligibleDays, evidence.winningDays, evidence.roi, evidence.recentRoi,
      evidence.netLowerBound, evidence.netWithoutBestDay].every((value) => typeof value === 'number' && Number.isFinite(value)) &&
    evidence.qualified === true && evidence.eligibleDays >= MIN_OFFICIAL_LIVE_DAYS &&
    evidence.winningDays >= 8 && evidence.roi !== null && evidence.roi > 0 &&
    evidence.recentRoi !== null && evidence.recentRoi > 0 &&
    evidence.netLowerBound !== null && evidence.netLowerBound > 0 &&
    evidence.netWithoutBestDay > 0 && evidence.blockers.length === 0 &&
    evidence.snapshotIds.length === evidence.eligibleDays &&
    new Set(evidence.snapshotIds).size === evidence.eligibleDays;
}

export async function loadOfficialLiveEvidence(
  db: { prediction: { findMany: Function } }, draws: LotteryDraw[], targetDate: string
) {
  const snapshots = await db.prediction.findMany({
    where: { predictionFor: { lt: new Date(`${targetDate}T00:00:00.000Z`) },
      method: { startsWith: 'Product Walk-Forward Ensemble' } },
    select: { id: true, predictionFor: true, createdAt: true, combinations: true, dataQuality: true },
    orderBy: [{ predictionFor: 'asc' }, { createdAt: 'asc' }]
  });
  const primary = buildOfficialLiveEvidence(snapshots, draws, targetDate);
  const alternative = buildOfficialLiveEvidence(snapshots, draws, targetDate, PAIR_CHALLENGER_STRATEGY).xien2!;
  primary.xien2!.challenger = { strategy: alternative.strategy, eligibleDays: alternative.eligibleDays,
    roi: alternative.roi, winningDays: alternative.winningDays };
  return primary;
}

function jsonObject(value: unknown): any {
  try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return null; }
}
function sum(values: number[]) { return values.reduce((a, b) => a + b, 0); }
