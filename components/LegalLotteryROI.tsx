'use client';

interface KindTotal {
  ticketCount: number;
  winningTickets: number;
  stakeUnits: number;
  payoutUnits: number;
  netUnits: number;
  roi: number | null;
}

interface MethodReport {
  method: string;
  completedDays: number;
  status: string;
  totals: {
    stakeUnits: number;
    payoutUnits: number;
    netUnits: number;
    roi: number | null;
    byKind: Record<string, KindTotal>;
  };
  researchTotals?: {
    stakeUnits: number;
    payoutUnits: number;
    netUnits: number;
    roi: number | null;
    byKind: Record<string, KindTotal>;
  };
}

interface PortfolioProduct {
  label: string;
  status: 'qualified' | 'watch' | 'no_signal';
  statusLabel: string;
  reason: string;
  researchPicks: Array<{ selection: string; expectedGross: number; expectedNet: number }>;
  selectedPicks: Array<{ selection: string; expectedGross: number; expectedNet: number }>;
  backtest: { testedDays: number; roi: number; recentRoi: number; positiveFolds: number; netInterval: { low: number; high: number };
    diagnostics?: { baselineRoi: number; edgeLowerBound: number; netWithoutBestDay: number; longestLosingStreak: number };
    diversification?: { roi: number; roiDifference: number; differenceInterval: { low: number; high: number }; winningDays: number; longestLosingStreak: number };
  };
  liveEvidence?: { eligibleDays: number; winningDays: number; roi: number | null;
    challenger?: { eligibleDays: number; roi: number | null } };
  concentration?: { maxNumberExposure: number; ticketCount: number; uniqueNumbers: number };
}

interface CurrentPortfolio {
  method: string;
  predictionFor: string;
  hasSignal: boolean;
  selectedTicketCount: number;
  products: Record<string, PortfolioProduct>;
}

interface Props {
  report?: {
    source?: { issuer: string; productUrl: string; legalBasisUrl: string; verifiedAt: string; ticketDenominations: number[] };
    units?: string;
    compatibility?: Record<string, string>;
    minimumLiveDays?: number;
    currentPortfolio?: CurrentPortfolio | null;
    byMethod?: MethodReport[];
  } | null;
}

const LABELS: Record<string, string> = {
  loto2: 'Lô tô 2 số',
  loto3: 'Lô tô 3 số',
  xien2: '2 cặp số',
  xien3: '3 cặp số',
  xien4: '4 cặp số'
};

export default function LegalLotteryROI({ report }: Props) {
  const methods = report?.byMethod ?? [];
  const current = report?.currentPortfolio;
  const latest = current ? methods.find((method) => method.method === current.method) : methods[0];

  return (
    <section className="research-card overflow-hidden">
      <div className="border-b border-line px-5 py-5 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="eyebrow">Official settlement</div>
            <h2 className="mt-1 text-xl font-semibold text-ink">ROI theo vé Lô tô hợp pháp</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
              Chấm theo cơ cấu giải thưởng do Xổ số Kiến thiết Thủ đô công bố. Một đơn vị bằng một vé ở cùng mệnh giá; không dùng “giá điểm” của nguồn không chính thức.
            </p>
          </div>
          {report?.source ? (
            <div className="shrink-0 rounded-xl border border-line bg-panel-muted px-3 py-2 text-xs leading-5 text-muted">
              <div className="font-semibold text-ink">Xác minh {report.source.verifiedAt}</div>
              <a className="font-semibold text-accent underline-offset-2 hover:underline" href={report.source.productUrl} target="_blank" rel="noreferrer">Bảng thưởng chính thức</a>
              <span className="mx-1">·</span>
              <a className="font-semibold text-accent underline-offset-2 hover:underline" href={report.source.legalBasisUrl} target="_blank" rel="noreferrer">Cơ sở pháp lý</a>
            </div>
          ) : null}
        </div>
      </div>

      {current ? (
        <div className="border-b border-line bg-white p-5 lg:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="eyebrow">Danh mục ngày {current.predictionFor}</div>
              <h3 className="mt-1 text-lg font-semibold text-ink">
                {current.hasSignal ? `${current.selectedTicketCount} vé đạt cổng phát` : 'Chủ động không phát vé hôm nay'}
              </h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                Chỉ danh mục vượt cả kiểm định lịch sử và theo dõi trước quay mới được phát. Dàn nghiên cứu không phải khuyến nghị mua vé.
              </p>
            </div>
            <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${current.hasSignal ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              {current.hasSignal ? 'Có tín hiệu đủ chuẩn' : 'NO SIGNAL'}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {Object.entries(current.products).map(([kind, product]) => (
              <article key={kind} className="min-w-0 rounded-xl border border-line bg-panel-muted p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-ink">{LABELS[kind] ?? product.label}</div>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${product.status === 'qualified' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{product.statusLabel}</span>
                </div>
                <div className="mt-3 text-sm font-bold tabular-nums text-ink">
                  {product.selectedPicks.map((pick) => pick.selection).join(' · ') || 'Không phát số'}
                </div>
                <details className="mt-2 text-xs text-muted">
                  <summary className="cursor-pointer">Xem dàn nghiên cứu, không dùng như tín hiệu</summary>
                  <p className="mt-2 break-words">{product.researchPicks.map((pick) => pick.selection).join(' · ')}</p>
                </details>
                <div className="mt-2 text-xs leading-5 text-muted">WF {product.backtest.testedDays} kỳ · ROI {formatPercent(product.backtest.roi)} · gần nhất {formatPercent(product.backtest.recentRoi)}</div>
                <div className="mt-2 text-xs leading-5 text-muted">Chốt trước quay: {product.liveEvidence?.eligibleDays ?? 0}/30 ngày tối thiểu · ROI mô phỏng {formatPercent(product.liveEvidence?.roi)}</div>
                {product.backtest.diagnostics && <div className="mt-2 text-xs leading-5 text-muted">
                  Nền chọn đều: {formatPercent(product.backtest.diagnostics.baselineRoi)} · lãi/lỗ khi bỏ kỳ tốt nhất: {product.backtest.diagnostics.netWithoutBestDay} đơn vị · chuỗi lỗ dài nhất: {product.backtest.diagnostics.longestLosingStreak} kỳ.
                </div>}
                {kind.startsWith('xien') && product.concentration && <div className="mt-2 text-xs leading-5 text-muted">
                  Tập trung: một số nằm trong {product.concentration.maxNumberExposure}/{product.concentration.ticketCount} tổ hợp; {product.concentration.uniqueNumbers} số khác nhau.
                </div>}
                {product.backtest.diversification && <details className="mt-3 text-xs leading-5 text-muted">
                  <summary className="cursor-pointer font-semibold">So sánh giảm trùng số giữa các cặp</summary>
                  <p className="mt-2">Cùng 3 tổ hợp/kỳ, mỗi số có mặt tối đa 2 tổ hợp: ROI lịch sử {formatPercent(product.backtest.diversification.roi)}; chênh lệch {product.backtest.diversification.roiDifference} điểm %. Khoảng chênh lệch net/kỳ: {product.backtest.diversification.differenceInterval.low} đến {product.backtest.diversification.differenceInterval.high} đơn vị.</p>
                  <p className="mt-2">Theo dõi riêng {product.liveEvidence?.challenger?.eligibleDays ?? 0} ngày; ROI {formatPercent(product.liveEvidence?.challenger?.roi)}. Chưa được nâng thành tín hiệu từ kết quả thử trên lịch sử.</p>
                </details>}
                <div className="mt-2 text-xs leading-5 text-muted">{product.reason}</div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {!latest ? (
        <div className="px-5 py-6 text-sm text-muted">{current?.method ?? 'Phiên bản hiện tại'} chưa có ngày đối chiếu hợp lệ. Không lấy thành tích phiên bản cũ thay thế.</div>
      ) : (
        <>
          <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="Phiên bản" value={latest.method.replace('Product Walk-Forward Ensemble ', '')} />
            <Summary label="Ngày đã chấm" value={`${latest.completedDays}/${report?.minimumLiveDays ?? 30}`} />
            <Summary label="Thu / chi mô phỏng danh mục phát" value={`${latest.totals.payoutUnits}/${latest.totals.stakeUnits} đơn vị`} />
            <Summary label="ROI mô phỏng danh mục phát" value={formatPercent(latest.totals.roi)} tone={latest.totals.roi === null ? undefined : latest.totals.roi >= 0 ? 'good' : 'bad'} />
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5 lg:p-6">
            {Object.entries(latest.totals.byKind).map(([kind, row]) => (
              <article key={kind} className="min-w-0 rounded-xl border border-line bg-panel-muted p-4">
                <div className="text-sm font-semibold text-ink">{LABELS[kind] ?? kind}</div>
                <div className={`mt-2 text-2xl font-bold tabular-nums ${row.roi === null ? 'text-muted' : row.roi >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatPercent(row.roi)}</div>
                <div className="mt-2 text-xs leading-5 text-muted">{row.winningTickets}/{row.ticketCount} vé có thưởng · thu {row.payoutUnits}, chi {row.stakeUnits}</div>
              </article>
            ))}
          </div>
          {latest.researchTotals && latest.researchTotals.stakeUnits !== latest.totals.stakeUnits ? (
            <div className="border-t border-line bg-slate-50 px-5 py-3 text-xs leading-5 text-muted lg:px-6">
              Dàn nghiên cứu: giả định mua toàn bộ cùng mệnh giá, thu {latest.researchTotals.payoutUnits}/chi {latest.researchTotals.stakeUnits} đơn vị, ROI {formatPercent(latest.researchTotals.roi)}. Đây không phải giao dịch thực tế.
            </div>
          ) : null}
        </>
      )}

      {methods.some((method) => method !== latest) && <details className="border-t border-line px-5 py-4 text-sm lg:px-6">
        <summary className="cursor-pointer font-semibold">Thành tích mô phỏng các phiên bản trước</summary>
        <div className="mt-3 space-y-2 text-xs text-muted">
          {methods.filter((method) => method !== latest).map((method) => <p key={method.method}>
            {method.method}: {method.completedDays} ngày · danh mục phát {formatPercent(method.totals.roi)} · dàn nghiên cứu {formatPercent(method.researchTotals?.roi)}.
          </p>)}
        </div>
      </details>}

      <div className="border-t border-line bg-[#fff9f2] px-5 py-4 text-sm leading-6 text-[#7c421e] lg:px-6">
        <strong>Giới hạn:</strong> Không ghi nhận tiền đã mua vé. Tất cả thu–chi là mô phỏng. Lịch sử cũ được giữ nguyên; không viết lại kết quả. Tối thiểu {report?.minimumLiveDays ?? 30} ngày theo dõi chỉ là điều kiện đầu vào, không chứng minh lợi thế hoặc bảo đảm lợi nhuận.
      </div>
    </section>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="min-w-0 bg-white p-5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 break-words font-bold tabular-nums ${tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : 'text-ink'}`}>{value}</div>
    </div>
  );
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Chưa có vé';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}
