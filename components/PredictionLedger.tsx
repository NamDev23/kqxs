'use client';

import { useState } from 'react';

interface EvaluationRow {
  kind: string;
  edgeStatus?: string | null;
  metricValue: number;
  baseline: number;
  realizedLift: number;
  predictedProbability?: number | null;
  backtestLift?: number | null;
  hits?: string[];
}

interface CombinationSetLike {
  label?: string;
  picks?: Array<{ numbers?: string[] }>;
}

interface LedgerOfficialPortfolio {
  hasSignal?: boolean;
  selectedTicketCount?: number;
  products?: Record<string, {
    label?: string;
    status?: string;
    selectedPicks?: Array<{ selection?: string }>;
    researchPicks?: Array<{ selection?: string }>;
    backtest?: { roi?: number; recentRoi?: number };
  }>;
}

interface LedgerEntry {
  id: string;
  snapshotDate: string;
  predictionFor: string;
  revision: number;
  dataPoints: number;
  de: string[];
  lo2: string[];
  lo3: string[];
  bacang: string[];
  bachThuLo?: string | null;
  bachThuDe?: string | null;
  combinations?: {
    xien2?: CombinationSetLike;
    xien3?: CombinationSetLike;
    xien4?: CombinationSetLike;
    officialPortfolio?: LedgerOfficialPortfolio;
  };
  evaluations?: EvaluationRow[];
  hits: null | Record<string, string[] | undefined>;
  learning: null | {
    resultSpecial: string;
    summary?: { notes?: string[]; weakMarkets?: string[] } | null;
  };
}

interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export default function PredictionLedger({
  entries: initialEntries,
  initialPagination
}: {
  entries: LedgerEntry[];
  initialPagination?: Pagination | null;
}) {
  const [entries, setEntries] = useState(initialEntries ?? []);
  const [pagination, setPagination] = useState<Pagination | null>(initialPagination ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadPage = async (page: number) => {
    if (loading || page < 1 || (pagination && page > pagination.totalPages)) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/prediction-ledger?page=${page}&pageSize=${pagination?.pageSize ?? 8}`);
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Không thể tải trang nhật ký');
      setEntries(payload.data ?? []);
      setPagination(payload.pagination ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải trang nhật ký');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Nhật ký đối chiếu</h2>
          <p className="text-sm text-slate-500">Snapshot bất biến, xác suất OOS tại lúc phát, kết quả thật và calibration theo ngày.</p>
        </div>
        {pagination ? <div className="text-xs tabular-nums text-slate-500">Trang {pagination.page}/{pagination.totalPages} · {pagination.totalItems} snapshot</div> : null}
      </div>

      {error ? <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      {!entries.length ? (
        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">Chưa có snapshot dự đoán để đối chiếu.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="border-b border-slate-200 py-2 pr-3">Ngày</th>
                <th className="border-b border-slate-200 px-3 py-2">Dàn đã chốt</th>
                <th className="border-b border-slate-200 px-3 py-2">Xiên</th>
                <th className="border-b border-slate-200 px-3 py-2">Kết quả hit</th>
                <th className="border-b border-slate-200 px-3 py-2">Xác suất & OOS</th>
                <th className="border-b border-slate-200 py-2 pl-3">Learning</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="align-top">
                  <td className="border-b border-slate-100 py-3 pr-3">
                    <div className="font-semibold tabular-nums text-slate-950">{entry.predictionFor}</div>
                    <div className="mt-1 text-xs text-slate-500">ĐB {entry.learning?.resultSpecial ?? 'chờ KQ'}</div>
                    <div className="mt-1 text-[11px] text-slate-400">phát {entry.snapshotDate} · rev {entry.revision} · {entry.dataPoints} kỳ</div>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <NumberLine label="Đề" values={entry.de} />
                    <NumberLine label="Lô 2" values={entry.lo2} />
                    <NumberLine label="Lô 3" values={entry.lo3} />
                    <NumberLine label="3 càng" values={entry.bacang} />
                    <NumberLine label="BT" values={[entry.bachThuLo ?? '', entry.bachThuDe ?? '']} />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    {entry.combinations?.officialPortfolio ? (
                      <div className={`mb-2 rounded border px-2 py-1.5 text-xs ${entry.combinations.officialPortfolio.hasSignal ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                        <div className="font-semibold">Official v8: {entry.combinations.officialPortfolio.hasSignal ? `${entry.combinations.officialPortfolio.selectedTicketCount ?? 0} vé phát` : 'NO SIGNAL'}</div>
                        {Object.entries(entry.combinations.officialPortfolio.products ?? {}).map(([kind, product]) => (
                          <div key={kind} className="mt-1 tabular-nums">
                            {product.label ?? kind}: {(product.selectedPicks?.length ? product.selectedPicks : product.researchPicks ?? []).map((pick) => pick.selection).filter(Boolean).join(' · ') || '—'}
                            {product.selectedPicks?.length ? '' : ' (shadow)'}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {(['xien2', 'xien3', 'xien4'] as const).map((kind) => (
                      <NumberLine
                        key={kind}
                        label={entry.combinations?.[kind]?.label ?? kind}
                        values={(entry.combinations?.[kind]?.picks ?? []).map((pick) => (pick.numbers ?? []).join('+'))}
                      />
                    ))}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <div className="space-y-1">
                      {['de', 'lo2', 'lo3', 'bacang', 'xien2', 'xien3', 'xien4'].map((kind) => {
                        const evaluation = entry.evaluations?.find((row) => row.kind === kind);
                        return <HitLine key={kind} label={kind} values={evaluation?.hits ?? entry.hits?.[kind]} />;
                      })}
                    </div>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <div className="grid min-w-[330px] grid-cols-2 gap-2">
                      {(entry.evaluations ?? []).map((evaluation) => <EvaluationMetric key={evaluation.kind} evaluation={evaluation} />)}
                    </div>
                  </td>
                  <td className="max-w-[320px] border-b border-slate-100 py-3 pl-3">
                    <div className="space-y-1 text-xs leading-5 text-slate-600">
                      {(entry.learning?.summary?.notes ?? ['Chưa có learning note.']).slice(0, 4).map((note) => <div key={note}>{note}</div>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <button type="button" disabled={!pagination.hasPreviousPage || loading} onClick={() => loadPage(pagination.page - 1)} className="rounded border border-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Trang trước</button>
          <span className="text-sm text-slate-500">{loading ? 'Đang tải…' : `${pagination.page} / ${pagination.totalPages}`}</span>
          <button type="button" disabled={!pagination.hasNextPage || loading} onClick={() => loadPage(pagination.page + 1)} className="rounded border border-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Trang sau</button>
        </div>
      ) : null}
    </section>
  );
}

function NumberLine({ label, values = [] }: { label: string; values?: string[] }) {
  return (
    <div className="mt-1 flex max-w-[420px] items-start gap-2">
      <span className="w-12 shrink-0 text-xs text-slate-500">{label}</span>
      <span className="font-semibold tabular-nums text-slate-900 [overflow-wrap:anywhere]">{values.filter(Boolean).join(' ') || '-'}</span>
    </div>
  );
}

function HitLine({ label, values = [] }: { label: string; values?: string[] }) {
  const hit = values.length > 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-xs uppercase text-slate-500">{label}</span>
      <span className={`rounded border px-2 py-0.5 text-xs font-semibold tabular-nums ${hit ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>{hit ? values.join(' ') : '-'}</span>
    </div>
  );
}

function EvaluationMetric({ evaluation }: { evaluation: EvaluationRow }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs tabular-nums">
      <div className="flex items-center justify-between gap-2 font-semibold text-slate-900"><span className="uppercase">{evaluation.kind}</span><span>{evaluation.edgeStatus ?? 'legacy'}</span></div>
      <div className="mt-1 text-slate-600">p/OOS {evaluation.predictedProbability?.toFixed(2) ?? '–'}% · thực {evaluation.metricValue.toFixed(2)}%</div>
      <div className="text-slate-500">nền {evaluation.baseline.toFixed(2)}% · lift thực {evaluation.realizedLift.toFixed(2)}x</div>
      {evaluation.backtestLift !== null && evaluation.backtestLift !== undefined ? <div className="text-slate-500">lift OOS {evaluation.backtestLift.toFixed(2)}x</div> : null}
    </div>
  );
}
