import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import {
  CAPITAL_LOTTERY_SOURCE,
  settleOfficialLoto2,
  settleOfficialLoto3,
  settleOfficialPairs,
  type LegalProductKind,
  type OfficialDaySettlement
} from '@/lib/legal-lottery-products';
import { normalizeLotteryDraws } from '@/lib/product-prediction-engine';
import { parseJsonField } from '@/lib/prediction-snapshot';
import type {
  OfficialCandidate,
  OfficialPortfolio
} from '@/lib/legal-product-prediction';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const days = clamp(Number(req.query.days ?? 90), 7, 365);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);
    const [predictionRows, resultRows] = await Promise.all([
      prisma.prediction.findMany({
        where: {
          method: { startsWith: 'Product Walk-Forward Ensemble' },
          predictionFor: { gte: since }
        },
        orderBy: [{ predictionFor: 'asc' }, { createdAt: 'asc' }, { revision: 'asc' }]
      }),
      prisma.lotteryResult.findMany({
        where: { date: { gte: since } },
        orderBy: { date: 'asc' }
      })
    ]);
    const draws = new Map(normalizeLotteryDraws(resultRows).map((draw) => [draw.date, draw]));
    const snapshots = predictionRows.flatMap((prediction) => {
      const target = prediction.predictionFor.toISOString().slice(0, 10);
      const draw = draws.get(target);
      if (!draw || prediction.createdAt >= drawTimeUtc(target)) return [];
      const combinations = parseJsonField<Record<string, any>>(prediction.combinations, {});
      const officialPortfolio = asOfficialPortfolio(combinations.officialPortfolio);
      const settlements = officialPortfolio
        ? settlePortfolio(officialPortfolio, draw, 'selectedPicks')
        : settleLegacyPortfolio(prediction, combinations, draw);
      const researchSettlements = officialPortfolio
        ? settlePortfolio(officialPortfolio, draw, 'researchPicks')
        : settlements;
      return [{
        id: prediction.id,
        target,
        issuedAt: prediction.createdAt.toISOString(),
        method: prediction.method,
        revision: prediction.revision,
        settlements,
        researchSettlements,
        policy: officialPortfolio?.policy ?? null
      }];
    });
    const canonicalSnapshots = Array.from(snapshots.reduce((rows, snapshot) => {
      const key = `${snapshot.method}|${snapshot.target}`;
      if (!rows.has(key)) rows.set(key, snapshot);
      return rows;
    }, new Map<string, (typeof snapshots)[number]>()).values());
    const byMethod = Object.values(Object.groupBy(canonicalSnapshots, (snapshot) => snapshot.method)).map((items) => {
      const rows = items ?? [];
      return {
        method: rows[0]?.method,
        completedDays: new Set(rows.map((row) => row.target)).size,
        status: new Set(rows.map((row) => row.target)).size < 30 ? 'collecting' : 'review',
        totals: aggregate(rows.flatMap((row) => row.settlements)),
        researchTotals: aggregate(rows.flatMap((row) => row.researchSettlements)),
        days: rows
      };
    }).sort((left, right) => String(right.method).localeCompare(String(left.method)));
    const currentPortfolio = latestOfficialPortfolio(predictionRows);

    res.status(200).json({
      success: true,
      source: CAPITAL_LOTTERY_SOURCE,
      units: 'Mỗi lựa chọn/tổ hợp là 1 đơn vị mệnh giá vé; payout là tổng tiền thưởng theo lần mệnh giá.',
      compatibility: {
        loto2: 'Dùng dàn đề hiện tại làm ứng viên vé Lô tô 2 số chính thức; đối chiếu ĐB và giải Nhất.',
        loto3: 'Dùng dàn 3 càng hiện tại làm ứng viên vé Lô tô 3 số chính thức; đối chiếu ĐB, giải Nhất, giải Sáu và khuyến khích.',
        lo2: 'Không dùng dàn lô 2 toàn bộ 27 giải để tính ROI vé Lô tô 2 số đơn vì khác thể lệ chính thức.',
        lo3: 'Không dùng dàn lô 3 toàn bộ 27 giải để tính ROI vé Lô tô 3 số đơn vì khác thể lệ chính thức.',
        pairs: 'Xiên 2/3/4 tương thích với vé Lô tô cặp số và được chấm cả điều kiện số xuất hiện lặp.'
      },
      minimumLiveDays: 30,
      currentPortfolio,
      byMethod
    });
  } catch (error) {
    console.error('Legal ROI API error:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate official lottery ROI' });
  }
}

function settleLegacyPortfolio(prediction: any, combinations: Record<string, any>, draw: any) {
  return [
    settleOfficialLoto2(prediction.de, draw),
    settleOfficialLoto3(prediction.bacang, draw),
    settleOfficialPairs('xien2', combinations.xien2?.picks ?? [], draw),
    settleOfficialPairs('xien3', combinations.xien3?.picks ?? [], draw),
    settleOfficialPairs('xien4', combinations.xien4?.picks ?? [], draw)
  ];
}

function settlePortfolio(
  portfolio: OfficialPortfolio,
  draw: any,
  field: 'selectedPicks' | 'researchPicks'
) {
  const product = (kind: LegalProductKind) => portfolio.products[kind]?.[field] ?? [];
  return [
    settleOfficialLoto2(product('loto2').map((pick) => pick.selection), draw),
    settleOfficialLoto3(product('loto3').map((pick) => pick.selection), draw),
    settleOfficialPairs('xien2', product('xien2').map(asPairPick), draw),
    settleOfficialPairs('xien3', product('xien3').map(asPairPick), draw),
    settleOfficialPairs('xien4', product('xien4').map(asPairPick), draw)
  ];
}

function asPairPick(pick: OfficialCandidate) {
  return { numbers: pick.numbers };
}

function asOfficialPortfolio(value: unknown): OfficialPortfolio | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const portfolio = value as Partial<OfficialPortfolio>;
  if (portfolio.version !== 'official_reward_aware_v1' || !portfolio.products) return null;
  return portfolio as OfficialPortfolio;
}

function latestOfficialPortfolio(predictions: any[]) {
  for (let index = predictions.length - 1; index >= 0; index -= 1) {
    const prediction = predictions[index];
    const combinations = parseJsonField<Record<string, any>>(prediction.combinations, {});
    const portfolio = asOfficialPortfolio(combinations.officialPortfolio);
    if (!portfolio) continue;
    return {
      method: prediction.method,
      predictionFor: prediction.predictionFor.toISOString().slice(0, 10),
      issuedAt: prediction.createdAt.toISOString(),
      ...portfolio
    };
  }
  return null;
}

function aggregate(rows: OfficialDaySettlement[]) {
  const kinds: LegalProductKind[] = ['loto2', 'loto3', 'xien2', 'xien3', 'xien4'];
  const byKind = Object.fromEntries(kinds.map((kind) => {
    const items = rows.filter((row) => row.kind === kind);
    const stakeUnits = sum(items.map((row) => row.stakeUnits));
    const payoutUnits = sum(items.map((row) => row.payoutUnits));
    return [kind, {
      ticketCount: stakeUnits,
      winningTickets: sum(items.map((row) => row.winningTickets)),
      stakeUnits,
      payoutUnits,
      netUnits: payoutUnits - stakeUnits,
      roi: stakeUnits > 0 ? round((payoutUnits - stakeUnits) / stakeUnits * 100) : null
    }];
  }));
  const stakeUnits = sum(Object.values(byKind).map((row) => row.stakeUnits));
  const payoutUnits = sum(Object.values(byKind).map((row) => row.payoutUnits));
  return {
    stakeUnits,
    payoutUnits,
    netUnits: payoutUnits - stakeUnits,
    roi: stakeUnits > 0 ? round((payoutUnits - stakeUnits) / stakeUnits * 100) : null,
    byKind
  };
}

function drawTimeUtc(date: string) {
  return new Date(`${date}T11:15:00.000Z`);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
