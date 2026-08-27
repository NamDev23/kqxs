'use client';

import type { EdgeStatus, PredictionKind, PredictionSet, SinglePick, SinglePickKind } from '@/lib/product-prediction-engine';

interface Props {
  prediction: {
    de: string[];
    lo2: string[];
    lo3: string[];
    bacang: string[];
    bachThuLo?: string;
    bachThuDe?: string;
    songthulode?: string[][];
    dauduoi?: { dau: string[]; duoi: string[] };
  };
  sets?: Partial<Record<PredictionKind, PredictionSet>>;
  singles?: Partial<Record<SinglePickKind, SinglePick>>;
}

const ORDER: PredictionKind[] = ['de', 'lo2', 'lo3', 'bacang'];

const FALLBACK_LABELS: Record<PredictionKind, string> = {
  de: 'Đề đuôi ĐB',
  lo2: 'Lô tô 2 số',
  lo3: 'Lô tô 3 số',
  bacang: '3 càng ĐB'
};

const DESCRIPTIONS: Record<PredictionKind, string> = {
  de: '2 số cuối giải đặc biệt',
  lo2: '2 số cuối của toàn bộ bảng giải',
  lo3: '3 số cuối của các giải đủ 3 chữ số',
  bacang: '3 số cuối giải đặc biệt'
};

export default function PredictionTypes({ prediction, sets, singles }: Props) {
  const values: Record<PredictionKind, string[]> = {
    de: prediction.de ?? [],
    lo2: prediction.lo2 ?? [],
    lo3: prediction.lo3 ?? [],
    bacang: prediction.bacang ?? []
  };

  return (
    <div className="space-y-4">
      <BachThuPanel prediction={prediction} singles={singles} />

      {ORDER.map((kind) => (
        <PredictionGroup
          key={kind}
          kind={kind}
          numbers={values[kind]}
          set={sets?.[kind]}
        />
      ))}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900">Song thủ tham chiếu</h3>
            <p className="text-sm text-slate-500">Cặp lô 2 số cùng xuất hiện nhiều trong 180 kỳ gần nhất</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(prediction.songthulode ?? []).map((pair, index) => (
              <div key={`${pair.join('-')}-${index}`} className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                <span className="font-semibold text-slate-900">{pair[0]}</span>
                <span className="mx-1 text-slate-400">+</span>
                <span className="font-semibold text-slate-900">{pair[1]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900">Đầu đuôi nổi bật</h3>
            <p className="text-sm text-slate-500">Tần suất theo đầu và đuôi trong 90 kỳ gần nhất</p>
          </div>
          <div className="space-y-3">
            <NumberStrip label="Đầu" numbers={prediction.dauduoi?.dau ?? []} />
            <NumberStrip label="Đuôi" numbers={prediction.dauduoi?.duoi ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BachThuPanel({
  prediction,
  singles
}: {
  prediction: Props['prediction'];
  singles?: Props['singles'];
}) {
  const items = [
    {
      kind: 'bachThuLo' as const,
      fallbackLabel: 'Bạch thủ lô',
      fallbackDescription: '1 số lô 2 số, kiểm tra trên toàn bộ bảng giải',
      fallbackNumber: prediction.bachThuLo ?? prediction.lo2?.[0] ?? ''
    },
    {
      kind: 'bachThuDe' as const,
      fallbackLabel: 'Bạch thủ đề',
      fallbackDescription: '1 số đề, chỉ kiểm tra với 2 số cuối giải đặc biệt',
      fallbackNumber: prediction.bachThuDe ?? prediction.de?.[0] ?? ''
    }
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">Bạch thủ</h3>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <SinglePickCard
            key={item.kind}
            single={singles?.[item.kind]}
            fallbackLabel={item.fallbackLabel}
            fallbackDescription={item.fallbackDescription}
            fallbackNumber={item.fallbackNumber}
          />
        ))}
      </div>
    </section>
  );
}

function SinglePickCard({
  single,
  fallbackLabel,
  fallbackDescription,
  fallbackNumber
}: {
  single?: SinglePick;
  fallbackLabel: string;
  fallbackDescription: string;
  fallbackNumber: string;
}) {
  const edgeStatus = single?.edgeStatus ?? 'research_only';

  return (
    <div className={`rounded-lg border p-4 ${edgeBorder(edgeStatus)} ${edgeStatus === 'qualified' ? 'bg-emerald-50' : edgeStatus === 'watch' ? 'bg-sky-50' : 'bg-slate-50'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-semibold text-slate-950">{single?.label ?? fallbackLabel}</h4>
            <EdgeBadge status={edgeStatus} label={single?.edgeLabel ?? 'Nghiên cứu'} />
          </div>
          <p className="text-sm text-slate-500">{single?.description ?? fallbackDescription}</p>
        </div>
        <div className="text-4xl font-bold tabular-nums text-slate-950">{single?.number ?? fallbackNumber}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-right text-xs sm:grid-cols-4">
        <MetricPill label="Backtest OOS" value={`${single?.probability.toFixed(2) ?? '0.00'}%`} tone={edgeStatus} />
        <MetricPill label="Baseline" value={`${single?.baseline.toFixed(2) ?? '0.00'}%`} />
        <MetricPill label="Lift" value={`${single?.lift.toFixed(2) ?? '0.00'}x`} tone={edgeStatus} />
        <MetricPill label="Hit" value={`${single?.hitDays ?? 0}/${single?.testedDraws ?? 0}`} />
      </div>

      {single?.ranked?.reasons?.length ? (
        <div className="mt-3 rounded border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600">
          {single.ranked.reasons.join(' · ')}
        </div>
      ) : null}

      {single?.edgeReason ? (
        <div className={`mt-3 rounded border px-3 py-2 text-sm ${edgePanel(edgeStatus)}`}>
          {single.edgeReason}
        </div>
      ) : null}
    </div>
  );
}

function PredictionGroup({
  kind,
  numbers,
  set
}: {
  kind: PredictionKind;
  numbers: string[];
  set?: PredictionSet;
}) {
  const rankedByNumber = new Map((set?.ranked ?? []).map((row) => [row.number, row]));
  const edgeStatus = set?.edgeStatus ?? 'research_only';

  return (
    <section className={`rounded-lg border bg-white p-5 ${edgeBorder(edgeStatus)}`}>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-950">{set?.label ?? FALLBACK_LABELS[kind]}</h3>
            {set ? <EdgeBadge status={edgeStatus} label={set.edgeLabel} /> : null}
          </div>
          <p className="text-sm text-slate-500">{DESCRIPTIONS[kind]}</p>
        </div>
        {set && (
          <div className="grid grid-cols-2 gap-2 text-right text-xs sm:min-w-[460px] sm:grid-cols-4">
            <MetricPill label="Backtest OOS" value={`${set.probability.toFixed(2)}%`} tone={edgeStatus} />
            <MetricPill label="Baseline" value={`${set.backtestBaseline.toFixed(2)}%`} />
            <MetricPill label="Lift" value={`${set.backtestLift.toFixed(2)}x`} tone={edgeStatus} />
            <MetricPill label="Số lượng" value={`${set.pickCount}`} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
        {numbers.map((number, index) => {
          const ranked = rankedByNumber.get(number);
          return (
            <div key={`${kind}-${number}`} className="min-h-[104px] rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl font-bold tabular-nums text-slate-950">{number}</span>
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">#{index + 1}</span>
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between gap-2">
                  <span>Score</span>
                  <span className="font-medium tabular-nums text-slate-900">{ranked?.score?.toFixed(1) ?? '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Xuất hiện</span>
                  <span className="font-medium tabular-nums text-slate-900">{ranked?.frequency ?? '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Gần nhất</span>
                  <span className="font-medium tabular-nums text-slate-900">{ranked?.lastSeenDays ?? '–'} kỳ</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {set?.ranked?.[0]?.reasons?.length ? (
        <div className="mt-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Rank #1 {set.ranked[0].number}: {set.ranked[0].reasons.join(' · ')}
        </div>
      ) : null}

      {set?.edgeReason ? (
        <div className={`mt-3 rounded border px-3 py-2 text-sm ${edgePanel(edgeStatus)}`}>
          {set.edgeReason}
        </div>
      ) : null}
    </section>
  );
}

function MetricPill({ label, value, tone = 'research_only' }: { label: string; value: string; tone?: EdgeStatus }) {
  return (
    <div className={`rounded border px-3 py-2 ${tonePill(tone)}`}>
      <div className="text-[11px] uppercase text-slate-500">{label}</div>
      <div className="mt-1 font-semibold tabular-nums text-slate-950">{value}</div>
    </div>
  );
}

function EdgeBadge({ status, label }: { status: EdgeStatus; label: string }) {
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${edgeBadge(status)}`}>
      {label}
    </span>
  );
}

function edgeBorder(status: EdgeStatus) {
  if (status === 'qualified') return 'border-emerald-200';
  if (status === 'watch') return 'border-sky-200';
  return 'border-slate-200';
}

function edgeBadge(status: EdgeStatus) {
  if (status === 'qualified') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'watch') return 'border-sky-200 bg-sky-50 text-sky-800';
  return 'border-amber-200 bg-amber-50 text-amber-800';
}

function edgePanel(status: EdgeStatus) {
  if (status === 'qualified') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (status === 'watch') return 'border-sky-200 bg-sky-50 text-sky-900';
  return 'border-amber-200 bg-amber-50 text-amber-900';
}

function tonePill(status: EdgeStatus) {
  if (status === 'qualified') return 'border-emerald-200 bg-emerald-50';
  if (status === 'watch') return 'border-sky-200 bg-sky-50';
  return 'border-slate-200 bg-slate-50';
}

function NumberStrip({ label, numbers }: { label: string; numbers: string[] }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 text-sm font-medium text-slate-500">{label}</div>
      <div className="flex flex-wrap gap-2">
        {numbers.map((number) => (
          <span key={`${label}-${number}`} className="rounded border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-900">
            {number}
          </span>
        ))}
      </div>
    </div>
  );
}
