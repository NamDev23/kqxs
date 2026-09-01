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
  backtest: { testedDays: number; roi: number; recentRoi: number; positiveFolds: number; netInterval: { low: number; high: number } };
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
  const latest = methods[0];
  const current = report?.currentPortfolio;

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
                Model v8 tối ưu trực tiếp thu–chi. Dàn nghiên cứu bên dưới không phải khuyến nghị mua vé khi chưa qua cổng ROI và độ ổn định.
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
                  {(product.selectedPicks.length ? product.selectedPicks : product.researchPicks).map((pick) => pick.selection).join(' · ') || '—'}
                </div>
                <div className="mt-2 text-xs leading-5 text-muted">WF {product.backtest.testedDays} kỳ · ROI {formatPercent(product.backtest.roi)} · gần nhất {formatPercent(product.backtest.recentRoi)}</div>
                <div className="mt-2 text-xs leading-5 text-muted">{product.reason}</div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {!latest ? (
        <div className="px-5 py-6 text-sm text-muted">Chưa có snapshot đủ điều kiện để chấm ROI chính thức.</div>
      ) : (
        <>
          <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="Phiên bản" value={latest.method.replace('Product Walk-Forward Ensemble ', '')} />
            <Summary label="Ngày đã chấm" value={`${latest.completedDays}/${report?.minimumLiveDays ?? 30}`} />
            <Summary label="Thu / chi đã phát" value={`${latest.totals.payoutUnits}/${latest.totals.stakeUnits} đơn vị`} />
            <Summary label="ROI đã phát" value={formatPercent(latest.totals.roi)} tone={latest.totals.roi === null ? undefined : latest.totals.roi >= 0 ? 'good' : 'bad'} />
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5 lg:p-6">
            {Object.entries(latest.totals.byKind).map(([kind, row]) => (
              <article key={kind} className="min-w-0 rounded-xl border border-line bg-panel-muted p-4">
                <div className="text-sm font-semibold text-ink">{LABELS[kind] ?? kind}</div>
                <div className={`mt-2 text-2xl font-bold tabular-nums ${(row.roi ?? -1) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatPercent(row.roi)}</div>
                <div className="mt-2 text-xs leading-5 text-muted">{row.winningTickets}/{row.ticketCount} vé có thưởng · thu {row.payoutUnits}, chi {row.stakeUnits}</div>
              </article>
            ))}
          </div>
          {latest.researchTotals && latest.researchTotals.stakeUnits !== latest.totals.stakeUnits ? (
            <div className="border-t border-line bg-slate-50 px-5 py-3 text-xs leading-5 text-muted lg:px-6">
              Shadow research không phát tiền: thu {latest.researchTotals.payoutUnits}/chi {latest.researchTotals.stakeUnits} đơn vị, ROI {formatPercent(latest.researchTotals.roi)}. Dữ liệu này chỉ dùng đánh giá challenger.
            </div>
          ) : null}
        </>
      )}

      <div className="border-t border-line bg-[#fff9f2] px-5 py-4 text-sm leading-6 text-[#7c421e] lg:px-6">
        <strong>Giới hạn:</strong> Từ v8, danh mục chính thức chỉ tính vé vượt cổng reward-aware; dàn chưa đạt được chạy shadow và không tính là tiền đã chi. Các phiên bản cũ vẫn được giữ nguyên để audit, không viết lại lịch sử. Dưới {report?.minimumLiveDays ?? 30} ngày live chỉ là quan sát, không phải lợi thế đã chứng minh.
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
