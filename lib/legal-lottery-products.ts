import type { LotteryDraw } from './product-prediction-engine';

export type LegalProductKind = 'loto2' | 'loto3' | 'xien2' | 'xien3' | 'xien4';

export const CAPITAL_LOTTERY_SOURCE = {
  issuer: 'Công ty TNHH một thành viên Xổ số Kiến thiết Thủ đô',
  productUrl: 'https://xosothudo.com.vn/xstd/loai-hinh-xo-so/99/267/xo-so-lo-to.html',
  legalBasisUrl: 'https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/7/13-vbhn-btc.pdf',
  verifiedAt: '2026-08-29',
  ticketDenominations: [5000, 10000]
} as const;

export interface OfficialTicketSettlement {
  kind: LegalProductKind;
  selection: string;
  payoutMultiplier: number;
  outcome: string;
}

export interface OfficialDaySettlement {
  kind: LegalProductKind;
  ticketCount: number;
  winningTickets: number;
  stakeUnits: number;
  payoutUnits: number;
  netUnits: number;
  roi: number;
  tickets: OfficialTicketSettlement[];
}

export function settleOfficialLoto2(numbers: string[], draw: LotteryDraw): OfficialDaySettlement {
  const special = draw.special.slice(-2);
  const first = draw.first[0]?.slice(-2) ?? '';
  const tickets = uniqueValid(numbers, 2).map((number) => {
    const specialHit = number === special;
    const firstHit = number === first;
    const payoutMultiplier = (specialHit ? 70 : 0) + (firstHit ? 1 : 0);
    return {
      kind: 'loto2' as const,
      selection: number,
      payoutMultiplier,
      outcome: specialHit && firstHit ? 'Trúng ĐB và giải Nhất' : specialHit ? 'Trúng ĐB' : firstHit ? 'Trúng giải Nhất' : 'Trượt'
    };
  });
  return summarize('loto2', tickets);
}

export function settleOfficialLoto3(numbers: string[], draw: LotteryDraw): OfficialDaySettlement {
  const special3 = draw.special.slice(-3);
  const special2 = draw.special.slice(-2);
  const first3 = draw.first[0]?.slice(-3) ?? '';
  const sixth = new Set(draw.sixth.map((number) => number.slice(-3)));
  const tickets = uniqueValid(numbers, 3).map((number) => {
    const rewards: string[] = [];
    let payoutMultiplier = 0;
    if (number === special3) {
      payoutMultiplier += 420;
      rewards.push('3 số cuối ĐB');
    } else if (number.slice(-2) === special2) {
      payoutMultiplier += 5;
      rewards.push('khuyến khích 2 số cuối ĐB');
    }
    if (number === first3) {
      payoutMultiplier += 20;
      rewards.push('3 số cuối giải Nhất');
    }
    if (sixth.has(number)) {
      payoutMultiplier += 5;
      rewards.push('một lần quay giải Sáu');
    }
    return {
      kind: 'loto3' as const,
      selection: number,
      payoutMultiplier,
      outcome: rewards.length > 0 ? rewards.join(' + ') : 'Trượt'
    };
  });
  return summarize('loto3', tickets);
}

export function settleOfficialPairs(
  kind: 'xien2' | 'xien3' | 'xien4',
  picks: Array<{ numbers?: string[] }>,
  draw: LotteryDraw
): OfficialDaySettlement {
  const size = kind === 'xien2' ? 2 : kind === 'xien3' ? 3 : 4;
  const counts = endingCounts(draw);
  const seen = new Set<string>();
  const tickets = picks.flatMap((pick) => {
    const numbers = uniqueValid(pick.numbers ?? [], 2).sort();
    if (numbers.length !== size) return [];
    const selection = numbers.join('+');
    if (seen.has(selection)) return [];
    seen.add(selection);
    const hitCount = numbers.filter((number) => (counts[number] ?? 0) >= 1).length;
    const repeatedCount = numbers.filter((number) => (counts[number] ?? 0) >= 2).length;
    const payoutMultiplier = pairPayout(size, hitCount, repeatedCount);
    return [{
      kind,
      selection,
      payoutMultiplier,
      outcome: payoutMultiplier > 0
        ? `${hitCount}/${size} cặp xuất hiện; ${repeatedCount} cặp từ 2 lần`
        : 'Trượt'
    }];
  });
  return summarize(kind, tickets);
}

export function allPrizeNumbers(draw: LotteryDraw) {
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

function endingCounts(draw: LotteryDraw) {
  return allPrizeNumbers(draw).reduce<Record<string, number>>((counts, value) => {
    const ending = value.slice(-2);
    counts[ending] = (counts[ending] ?? 0) + 1;
    return counts;
  }, {});
}

function summarize(kind: LegalProductKind, tickets: OfficialTicketSettlement[]): OfficialDaySettlement {
  const stakeUnits = tickets.length;
  const payoutUnits = tickets.reduce((sum, ticket) => sum + ticket.payoutMultiplier, 0);
  const netUnits = payoutUnits - stakeUnits;
  return {
    kind,
    ticketCount: tickets.length,
    winningTickets: tickets.filter((ticket) => ticket.payoutMultiplier > 0).length,
    stakeUnits,
    payoutUnits,
    netUnits,
    roi: stakeUnits > 0 ? round(netUnits / stakeUnits * 100) : 0,
    tickets
  };
}

function uniqueValid(numbers: string[], digits: number) {
  return Array.from(new Set(numbers.filter((number) => new RegExp(`^\\d{${digits}}$`).test(number))));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
