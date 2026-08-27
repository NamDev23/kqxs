'use client';

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
  accuracy: null | {
    de: number;
    lo2: number;
    lo3: number;
    bacang: number;
    bachThuLo?: number | null;
    bachThuDe?: number | null;
    overall: number;
  };
  hits: null | {
    de?: string[];
    lo2?: string[];
    lo3?: string[];
    bacang?: string[];
    bachThuLo?: string[];
    bachThuDe?: string[];
  };
  learning: null | {
    resultSpecial: string;
    summary?: {
      notes?: string[];
      weakMarkets?: string[];
    } | null;
  };
}

export default function PredictionLedger({ entries }: { entries: LedgerEntry[] }) {
  if (!entries?.length) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-950">Nhật ký đối chiếu</h2>
        <div className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Chưa có snapshot dự đoán để đối chiếu.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-950">Nhật ký đối chiếu</h2>
        <p className="text-sm text-slate-500">Snapshot đã phát, kết quả thật và learning notes theo từng ngày.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500">
              <th className="border-b border-slate-200 py-2 pr-3">Ngày</th>
              <th className="border-b border-slate-200 px-3 py-2">Snapshot</th>
              <th className="border-b border-slate-200 px-3 py-2">Bạch thủ</th>
              <th className="border-b border-slate-200 px-3 py-2">Hit</th>
              <th className="border-b border-slate-200 px-3 py-2">Metric đã chấm</th>
              <th className="border-b border-slate-200 py-2 pl-3">Learning</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="align-top">
                <td className="border-b border-slate-100 py-3 pr-3">
                  <div className="font-semibold tabular-nums text-slate-950">{entry.predictionFor}</div>
                  <div className="mt-1 text-xs text-slate-500">ĐB {entry.learning?.resultSpecial ?? 'chờ KQ'}</div>
                </td>
                <td className="border-b border-slate-100 px-3 py-3">
                  <div className="text-xs text-slate-500">Phát {entry.snapshotDate} · rev {entry.revision} · {entry.dataPoints} kỳ</div>
                  <NumberLine label="Đề" values={entry.de.slice(0, 5)} />
                  <NumberLine label="Lô 2" values={entry.lo2.slice(0, 5)} />
                  <NumberLine label="3 càng" values={entry.bacang.slice(0, 3)} />
                </td>
                <td className="border-b border-slate-100 px-3 py-3">
                  <NumberLine label="BT lô" values={[entry.bachThuLo ?? '-']} />
                  <NumberLine label="BT đề" values={[entry.bachThuDe ?? '-']} />
                </td>
                <td className="border-b border-slate-100 px-3 py-3">
                  {entry.hits ? (
                    <div className="space-y-1">
                      <HitLine label="Đề" values={entry.hits.de} />
                      <HitLine label="Lô 2" values={entry.hits.lo2} />
                      <HitLine label="Lô 3" values={entry.hits.lo3} />
                      <HitLine label="3C" values={entry.hits.bacang} />
                      <HitLine label="BT" values={[...(entry.hits.bachThuLo ?? []), ...(entry.hits.bachThuDe ?? [])]} />
                    </div>
                  ) : (
                    <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">Chờ đối chiếu</span>
                  )}
                </td>
                <td className="border-b border-slate-100 px-3 py-3">
                  {entry.accuracy ? (
                    <div className="grid grid-cols-2 gap-1 text-xs tabular-nums">
                      <Metric label="Đề" value={entry.accuracy.de} />
                      <Metric label="Lô 2" value={entry.accuracy.lo2} />
                      <Metric label="Lô 3" value={entry.accuracy.lo3} />
                      <Metric label="3C" value={entry.accuracy.bacang} />
                      <Metric label="BT lô" value={entry.accuracy.bachThuLo ?? 0} />
                      <Metric label="BT đề" value={entry.accuracy.bachThuDe ?? 0} />
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">Chưa có</span>
                  )}
                </td>
                <td className="max-w-[320px] border-b border-slate-100 py-3 pl-3">
                  <div className="space-y-1 text-xs leading-5 text-slate-600">
                    {(entry.learning?.summary?.notes ?? ['Chưa có learning note.']).slice(0, 3).map((note) => (
                      <div key={note}>{note}</div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NumberLine({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="w-12 text-xs text-slate-500">{label}</span>
      <span className="font-semibold tabular-nums text-slate-900">{values.filter(Boolean).join(' ') || '-'}</span>
    </div>
  );
}

function HitLine({ label, values = [] }: { label: string; values?: string[] }) {
  const hit = values.length > 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 text-xs text-slate-500">{label}</span>
      <span className={`rounded border px-2 py-0.5 text-xs font-semibold tabular-nums ${hit ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
        {hit ? values.join(' ') : '-'}
      </span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value.toFixed(2)}%</span>
    </div>
  );
}
