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
}

interface Props {
  report?: {
    source?: { issuer: string; productUrl: string; legalBasisUrl: string; verifiedAt: string; ticketDenominations: number[] };
    units?: string;
    compatibility?: Record<string, string>;
    minimumLiveDays?: number;
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

      {!latest ? (
        <div className="px-5 py-6 text-sm text-muted">Chưa có snapshot đủ điều kiện để chấm ROI chính thức.</div>
      ) : (
        <>
          <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="Phiên bản" value={latest.method.replace('Product Walk-Forward Ensemble ', '')} />
            <Summary label="Ngày đã chấm" value={`${latest.completedDays}/${report?.minimumLiveDays ?? 30}`} />
            <Summary label="Thu / chi" value={`${latest.totals.payoutUnits}/${latest.totals.stakeUnits} đơn vị`} />
            <Summary label="ROI quan sát" value={formatPercent(latest.totals.roi)} tone={(latest.totals.roi ?? -1) >= 0 ? 'good' : 'bad'} />
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
        </>
      )}

      <div className="border-t border-line bg-[#fff9f2] px-5 py-4 text-sm leading-6 text-[#7c421e] lg:px-6">
        <strong>Giới hạn:</strong> “Lô 2/Lô 3” cũ đối chiếu 27 giải không phải vé Lô tô 2/3 số đơn chính thức nên bị loại khỏi ROI. Dàn đề được dùng làm ứng viên Lô tô 2 số; dàn 3 càng dùng làm ứng viên Lô tô 3 số; xiên dùng đúng thể lệ vé cặp số. Dưới {report?.minimumLiveDays ?? 30} ngày chỉ là quan sát, không phải lợi thế đã chứng minh.
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
