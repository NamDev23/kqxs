import type { ProductPredictionResult } from './product-prediction-engine';
import { hasQualifiedLiveEvidence, PUBLICATION_POLICY, validResearchPicks } from './official-live-evidence';

/** The only current-signal contract used by the website, API and Telegram. */
export function buildSignalPublication(
  analysis: ProductPredictionResult, targetDate: string, issuedAt: Date | string = analysis.meta.generatedAt
) {
  const portfolio = analysis.prediction.combinations?.officialPortfolio;
  const timestamp = new Date(issuedAt).getTime();
  const blockers = [
    analysis.dataQuality?.canPublish !== true ? 'Dữ liệu chưa đạt điều kiện phát tín hiệu.' : '',
    !Number.isFinite(timestamp) || timestamp >= Date.parse(`${targetDate}T11:15:00.000Z`)
      ? 'Snapshot không được chốt trước giờ quay.' : '',
    !portfolio?.products || portfolio.targetDate !== targetDate || portfolio.policy?.version !== PUBLICATION_POLICY
      ? 'Snapshot thiếu chính sách kiểm định hiện hành.' : ''
  ].filter(Boolean);
  const products = blockers.length || !portfolio?.hasSignal ? [] : Object.values(portfolio.products).filter((product) =>
    product.status === 'qualified' && hasQualifiedLiveEvidence(product.liveEvidence, targetDate) &&
    product.backtest.testedDays >= 180 && product.backtest.winningTickets >= 8 &&
    product.backtest.roi > 0 && product.backtest.recentRoi > 0 &&
    product.backtest.positiveFolds >= 2 && product.backtest.netInterval.low > 0 &&
    !!product.backtest.diagnostics && product.backtest.diagnostics.edgeLowerBound > 0 &&
    product.backtest.diagnostics.netWithoutBestDay > 0 &&
    validResearchPicks(product.kind, product.selectedPicks) &&
    JSON.stringify(product.selectedPicks) === JSON.stringify(product.researchPicks)
  ).map((product) => ({ kind: product.kind, label: product.label,
    selections: product.selectedPicks.map((pick) => pick.selection),
    forwardDays: product.liveEvidence!.eligibleDays, forwardRoi: product.liveEvidence!.roi }));
  return { policy: PUBLICATION_POLICY, targetDate,
    status: blockers.length ? 'blocked' as const : products.length ? 'qualified' as const : 'no_signal' as const,
    products, reasons: blockers.length ? blockers : products.length ? [] : ['Chưa có danh mục vượt đầy đủ điều kiện lịch sử và theo dõi trước quay.'],
    note: 'Điểm xếp hạng không phải xác suất trúng. ROI là mô phỏng cùng mệnh giá, không phải giao dịch thực tế.' };
}
