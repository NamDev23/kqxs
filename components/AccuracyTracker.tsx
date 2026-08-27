'use client';

interface TypeMetric {
  hitRate: number;
  precision: number;
  primaryMetric?: number;
  baseline: number;
  lift: number;
  testedDraws: number;
  status?: 'qualified' | 'watch' | 'research_only';
  statusLabel?: string;
  metricLabel?: string;
  modelInterval?: { low: number; high: number };
  edgeInterval?: { low: number; high: number };
  observedEdge?: number;
  probabilityAboveBaseline?: number;
  expectedHits?: number;
  sampleAdequacy?: 'adequate' | 'limited' | 'insufficient';
}

interface Props {
  historicalAccuracy: number;
  randomBaseline?: number;
  lift?: number;
  totalPredictions: number;
  correctPredictions?: number | null;
  byType?: Record<string, TypeMetric>;
  conclusion?: string;
}

const LABELS: Record<string, string> = {
  de: 'Đề đuôi ĐB',
  lo2: 'Lô 2',
  lo3: 'Lô 3',
  bacang: '3 càng ĐB'
};

export default function AccuracyTracker({
  historicalAccuracy,
  randomBaseline = 0,
  lift = 0,
  totalPredictions,
  byType,
  conclusion
}: Props) {
  const rows = byType ? Object.entries(byType) : [];

  return (
    <section className="research-card overflow-hidden">
      <div className="border-b border-line px-5 py-5 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="eyebrow">Out-of-sample</div>
            <h2 className="mt-1 text-xl font-semibold text-ink">Kiểm định walk-forward</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              Mỗi target chỉ dùng các kỳ đứng trước nó. Khoảng tin cậy 95% được bootstrap theo block để giữ phụ thuộc thời gian ngắn hạn.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-right">
            <Summary label="Chỉ số gộp" value={`${historicalAccuracy.toFixed(2)}%`} />
            <Summary label="Nền gộp" value={`${randomBaseline.toFixed(2)}%`} />
            <Summary label="Lift mô tả" value={lift ? `${lift.toFixed(2)}×` : '–'} />
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-line bg-panel-muted px-4 py-3 text-sm text-ink">
          {conclusion ?? 'Đọc kết quả theo từng nhánh; không coi chỉ số gộp là xác suất trúng.'}
        </div>
      </div>

      <div className="grid gap-px bg-line md:grid-cols-2 xl:grid-cols-4">
        {rows.map(([kind, metric]) => {
          const primary = metric.primaryMetric ?? (kind === 'de' || kind === 'bacang' ? metric.hitRate : metric.precision);
          return (
            <article key={kind} className="bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-ink">{LABELS[kind] ?? kind}</div>
                  <div className="mt-1 text-xs text-muted">{metric.metricLabel ?? 'Metric chính'}</div>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusTone(metric.status)}`}>
                  {metric.statusLabel ?? 'Chưa đủ bằng chứng'}
                </span>
              </div>

              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <div className="text-3xl font-bold tabular-nums text-ink">{primary.toFixed(2)}%</div>
                  <div className="mt-1 text-xs tabular-nums text-muted">
                    CI95 {formatRange(metric.modelInterval)}
                  </div>
                </div>
                <div className="text-right text-xs text-muted">
                  <div>Nền <strong className="text-ink">{metric.baseline.toFixed(2)}%</strong></div>
                  <div className="mt-1">Lift <strong className="text-ink">{metric.lift.toFixed(2)}×</strong></div>
                </div>
              </div>

              <div className="mt-4 h-px bg-line" />
              <dl className="mt-4 space-y-2 text-xs">
                <Detail label="Edge quan sát" value={formatSigned(metric.observedEdge)} />
                <Detail label="CI95 edge" value={formatRange(metric.edgeInterval, true)} />
                <Detail label="P(edge > 0)" value={`${(metric.probabilityAboveBaseline ?? 0).toFixed(1)}%`} />
                <Detail label="Độ dày mẫu" value={adequacyLabel(metric.sampleAdequacy)} />
              </dl>
              <div className="mt-4 text-[11px] text-muted">{metric.testedDraws} kỳ · hit kỳ vọng nền {metric.expectedHits?.toFixed(2) ?? '–'}</div>
            </article>
          );
        })}
      </div>

      <div className="border-t border-line bg-[#fff9f2] px-5 py-4 text-sm leading-6 text-[#7c421e] lg:px-6">
        Xổ số có thể phù hợp với giả thuyết ngẫu nhiên dù xuất hiện chuỗi “nóng”, “gan” hoặc lặp. Với tối đa {totalPredictions} kỳ kiểm định, hệ thống ưu tiên không phát tín hiệu hơn là công bố một edge chưa chắc chắn.
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[96px] rounded-xl border border-line bg-panel-muted px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 font-bold tabular-nums text-ink">{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function statusTone(status?: TypeMetric['status']) {
  if (status === 'qualified') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'watch') return 'border-sky-200 bg-sky-50 text-sky-800';
  return 'border-amber-200 bg-amber-50 text-amber-800';
}

function formatRange(range?: { low: number; high: number }, signed = false) {
  if (!range) return '–';
  const format = (value: number) => `${signed && value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  return `${format(range.low)} → ${format(range.high)}`;
}

function formatSigned(value?: number) {
  if (value === undefined) return '–';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)} điểm %`;
}

function adequacyLabel(value?: TypeMetric['sampleAdequacy']) {
  if (value === 'adequate') return 'Đủ tối thiểu';
  if (value === 'limited') return 'Mỏng';
  return 'Thiếu';
}
