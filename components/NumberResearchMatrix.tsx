'use client';

import { useMemo, useState } from 'react';
import type {
  FrequencyRow,
  PairAnalysisRow,
  SpecialDigitAnalysis
} from '@/lib/product-prediction-engine';

type Metric = 'count7' | 'count30' | 'count90' | 'lastSeen';

const METRICS: Array<{ key: Metric; label: string; suffix: string }> = [
  { key: 'count7', label: '7 kỳ', suffix: 'lần' },
  { key: 'count30', label: '30 kỳ', suffix: 'lần' },
  { key: 'count90', label: '90 kỳ', suffix: 'lần' },
  { key: 'lastSeen', label: 'Gan hiện tại', suffix: 'kỳ' }
];

export default function NumberResearchMatrix({
  rows,
  pairs = [],
  specialDigits
}: {
  rows: FrequencyRow[];
  pairs?: PairAnalysisRow[];
  specialDigits?: SpecialDigitAnalysis;
}) {
  const [metric, setMetric] = useState<Metric>('count30');
  const ordered = useMemo(
    () => rows.slice().sort((left, right) => left.number.localeCompare(right.number)),
    [rows]
  );
  const maximum = Math.max(1, ...ordered.map((row) => valueFor(row, metric)));
  const metricInfo = METRICS.find((item) => item.key === metric) ?? METRICS[1];

  return (
    <div className="space-y-5">
      <section className="research-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow">Thống kê mô tả 00–99</div>
            <h2 className="mt-1 text-xl font-semibold text-ink">Ma trận tần suất và gan</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Đếm theo ngày có xuất hiện ít nhất một lần. “Gan” mô tả khoảng vắng, không đồng nghĩa xác suất kỳ tới tăng.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-line bg-panel-muted p-1" aria-label="Chọn cửa sổ thống kê">
            {METRICS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setMetric(item.key)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${metric === item.key ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {ordered.map((row) => {
            const value = valueFor(row, metric);
            const intensity = value / maximum;
            return (
              <div
                key={row.number}
                className="matrix-cell"
                style={{
                  backgroundColor: metric === 'lastSeen'
                    ? `rgba(190, 69, 36, ${0.06 + intensity * 0.18})`
                    : `rgba(18, 106, 91, ${0.05 + intensity * 0.2})`
                }}
                title={`${row.number}: ${value} ${metricInfo.suffix}; gần nhất ${row.lastSeenDate ?? 'chưa có'}`}
              >
                <span className="text-lg font-bold tabular-nums text-ink">{row.number}</span>
                <span className="mt-1 text-[11px] font-medium tabular-nums text-muted">{value} {metricInfo.suffix}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <PairTable rows={pairs} />
        <SpecialDigitPanel data={specialDigits} />
      </div>
    </div>
  );
}

function PairTable({ rows }: { rows: PairAnalysisRow[] }) {
  return (
    <section className="research-card overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <div className="eyebrow">Cặp cùng xuất hiện · 180 kỳ</div>
        <h3 className="mt-1 text-lg font-semibold text-ink">Lift đồng xuất hiện</h3>
        <p className="mt-1 text-sm text-muted">Đã hiệu chỉnh theo tần suất riêng của từng số; tối thiểu 5 ngày đồng xuất hiện.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-panel-muted text-left text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3">Cặp</th>
              <th className="px-3 py-3 text-right">Thực tế</th>
              <th className="px-3 py-3 text-right">Kỳ vọng độc lập</th>
              <th className="px-3 py-3 text-right">Lift</th>
              <th className="px-5 py-3 text-right">Support</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((row) => (
              <tr key={row.numbers.join('-')} className="border-t border-line/70">
                <td className="px-5 py-3 font-bold tabular-nums text-ink">{row.numbers.join(' · ')}</td>
                <td className="px-3 py-3 text-right tabular-nums text-ink">{row.observedDays}</td>
                <td className="px-3 py-3 text-right tabular-nums text-muted">{row.expectedDays.toFixed(2)}</td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums text-accent">{row.lift.toFixed(2)}×</td>
                <td className="px-5 py-3 text-right tabular-nums text-muted">{row.support.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SpecialDigitPanel({ data }: { data?: SpecialDigitAnalysis }) {
  const sampleSize = data?.sampleSize ?? 0;
  return (
    <section className="research-card p-5">
      <div className="eyebrow">Giải đặc biệt · {sampleSize} kỳ</div>
      <h3 className="mt-1 text-lg font-semibold text-ink">Đầu, đuôi và tổng</h3>
      <p className="mt-1 text-sm text-muted">Phân bố chữ số của hai số cuối giải đặc biệt.</p>
      <div className="mt-5 space-y-5">
        <DigitBars label="Đầu" values={data?.heads ?? []} />
        <DigitBars label="Đuôi" values={data?.tails ?? []} />
        <DigitBars label="Tổng mod 10" values={data?.sums ?? []} />
      </div>
    </section>
  );
}

function DigitBars({ label, values }: { label: string; values: number[] }) {
  const maximum = Math.max(1, ...values);
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="grid grid-cols-10 gap-1.5">
        {Array.from({ length: 10 }, (_, digit) => {
          const value = values[digit] ?? 0;
          return (
            <div key={digit} className="flex flex-col items-center gap-1">
              <div className="flex h-16 w-full items-end overflow-hidden rounded-md bg-panel-muted">
                <div className="w-full rounded-md bg-accent/70" style={{ height: `${Math.max(5, (value / maximum) * 100)}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-ink">{digit}</span>
              <span className="text-[10px] tabular-nums text-muted">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function valueFor(row: FrequencyRow, metric: Metric) {
  if (metric === 'lastSeen') return row.lastSeen ?? row.count + 1;
  return row[metric];
}
