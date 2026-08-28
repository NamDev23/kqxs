'use client';

import { useEffect, useMemo, useState } from 'react';
import PredictionTypes from '@/components/PredictionTypes';
import AccuracyTracker from '@/components/AccuracyTracker';
import FrequencyChart from '@/components/FrequencyChart';
import HotColdNumbers from '@/components/HotColdNumbers';
import PredictionLedger from '@/components/PredictionLedger';
import NumberResearchMatrix from '@/components/NumberResearchMatrix';
import LegalLotteryROI from '@/components/LegalLotteryROI';

type LoadState = 'loading' | 'ready' | 'error';
type View = 'signals' | 'statistics' | 'validation' | 'ledger';

const VIEWS: Array<{ key: View; label: string; description: string }> = [
  { key: 'signals', label: 'Tín hiệu', description: 'Snapshot và dàn nghiên cứu' },
  { key: 'statistics', label: 'Thống kê 00–99', description: 'Tần suất, gan, cặp số' },
  { key: 'validation', label: 'Kiểm định', description: 'Walk-forward và CI95' },
  { key: 'ledger', label: 'Nhật ký', description: 'Dự báo đã chốt và kết quả' }
];

export default function Home() {
  const [dailyData, setDailyData] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any>({ data: [], pagination: null });
  const [legalRoiData, setLegalRoiData] = useState<any>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('signals');

  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetchJson('/api/realtime-prediction'),
      fetchJson('/api/prediction-ledger?page=1&pageSize=8'),
      fetchJson('/api/legal-roi?days=90').catch(() => ({ success: false }))
    ])
      .then(([daily, ledger, legalRoi]) => {
        if (!mounted) return;
        if (!daily.success || !ledger.success) {
          throw new Error(daily.error || ledger.error || 'Không thể tải dữ liệu');
        }
        setDailyData(daily.data);
        setLedgerData({ data: ledger.data ?? [], pagination: ledger.pagination ?? null });
        setLegalRoiData(legalRoi.success ? legalRoi : null);
        setState('ready');
      })
      .catch((reason) => {
        if (!mounted) return;
        setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu');
        setState('error');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const qualityWarnings = useMemo(() => dailyData?.dataQuality?.warnings ?? [], [dailyData]);
  const hasBlockingDataIssue = dailyData?.dataQuality?.canPublish === false;

  if (state === 'loading') return <LoadingState />;
  if (state === 'error' || !dailyData) return <ErrorState error={error} />;

  const analysis = dailyData.analysis ?? { frequency: [], hotCold: { hot: [], cold: [] }, pairs: [] };
  const aggregate = dailyData.backtest?.aggregate ?? {};

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-sm font-black tracking-tight text-white">XS</div>
            <div>
              <div className="eyebrow">Bộ phận tính toán XSMB</div>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-ink">Phòng nghiên cứu xác suất</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={dailyData.dataQuality?.status} />
            <HeaderMetric label="Target" value={dailyData.timing?.targetDate ?? dailyData.prediction.date} />
            <HeaderMetric label="Mẫu" value={`${dailyData.dataQuality?.dataPoints ?? 0} kỳ`} />
            <HeaderMetric label="Snapshot" value={`rev ${dailyData.meta?.revision ?? 1}`} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6 lg:py-8">
        <section className="grid gap-5 xl:grid-cols-[1.55fr_0.85fr]">
          <SnapshotPanel data={dailyData} aggregate={aggregate} blocked={hasBlockingDataIssue} />
          <QualityPanel data={dailyData.dataQuality} warnings={qualityWarnings} />
        </section>

        <nav className="mt-6 grid gap-2 rounded-2xl border border-line bg-white p-2 shadow-card md:grid-cols-4" aria-label="Khu vực nghiên cứu">
          {VIEWS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              aria-current={view === item.key ? 'page' : undefined}
              className={`rounded-xl px-4 py-3 text-left transition ${view === item.key ? 'bg-accent text-white shadow-sm' : 'text-ink hover:bg-panel-muted'}`}
            >
              <span className="block text-sm font-bold">{item.label}</span>
              <span className={`mt-0.5 block text-xs ${view === item.key ? 'text-white/75' : 'text-muted'}`}>{item.description}</span>
            </button>
          ))}
        </nav>

        <div className="mt-6">
          {view === 'signals' && (
            hasBlockingDataIssue
              ? <DataLockedPanel warnings={dailyData.dataQuality?.blockingReasons ?? qualityWarnings} />
              : (
                <div className="space-y-5">
                  <DecisionPanel aggregate={aggregate} />
                  <PredictionTypes prediction={dailyData.prediction} sets={dailyData.sets} singles={dailyData.singles} />
                </div>
              )
          )}

          {view === 'statistics' && (
            <div className="space-y-5">
              <NumberResearchMatrix rows={analysis.frequency ?? []} pairs={analysis.pairs} specialDigits={analysis.specialDigits} />
              <HotColdNumbers hot={analysis.hotCold?.hot ?? []} cold={analysis.hotCold?.cold ?? []} />
              <FrequencyChart data={analysis.frequency ?? []} />
            </div>
          )}

          {view === 'validation' && (
            <div className="space-y-5">
              <LegalLotteryROI report={legalRoiData} />
              <AccuracyTracker
                historicalAccuracy={dailyData.accuracy?.historicalAccuracy ?? 0}
                randomBaseline={dailyData.accuracy?.randomBaseline ?? 0}
                lift={dailyData.accuracy?.lift ?? 0}
                totalPredictions={dailyData.accuracy?.totalPredictions ?? 0}
                correctPredictions={dailyData.accuracy?.correctPredictions ?? null}
                byType={dailyData.accuracy?.byType}
                conclusion={aggregate.conclusion}
              />
              <MethodPanel />
            </div>
          )}

          {view === 'ledger' && (
            <PredictionLedger
              entries={ledgerData.data}
              initialPagination={ledgerData.pagination}
            />
          )}
        </div>

        <footer className="mt-8 flex flex-col gap-2 border-t border-line py-6 text-sm leading-6 text-muted md:flex-row md:items-start md:justify-between">
          <p className="max-w-3xl">Công cụ nghiên cứu thống kê, không phải cam kết dự đoán. Tần suất quá khứ, gan và đồng xuất hiện không tự tạo ra lợi thế cho kỳ kế tiếp.</p>
          <p className="shrink-0 text-xs">Múi giờ Asia/Ho_Chi_Minh · {dailyData.meta?.method}</p>
        </footer>
      </main>
    </div>
  );
}

function SnapshotPanel({ data, aggregate, blocked }: { data: any; aggregate: any; blocked: boolean }) {
  const status = blocked
    ? 'Dừng phát tín hiệu'
    : aggregate.qualifiedMarkets > 0
      ? `${aggregate.qualifiedMarkets} nhánh đủ bằng chứng`
      : 'Chưa có edge đủ bằng chứng';

  return (
    <section className="research-card relative overflow-hidden p-5 lg:p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-[#58a08f] to-transparent" />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="eyebrow">Snapshot bất biến · {data.timing?.phase}</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{status}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{data.timing?.status}. {aggregate.conclusion}</p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 ${blocked ? 'border-red-200 bg-red-50' : aggregate.qualifiedMarkets > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Quyết định hệ thống</div>
          <div className="mt-1 font-bold text-ink">{blocked ? 'LOCKED' : aggregate.qualifiedMarkets > 0 ? 'QUALIFIED' : 'ABSTAIN'}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SnapshotMetric label="Ngày nghiên cứu" value={data.prediction.date} />
        <SnapshotMetric label="Giờ quay" value={data.timing?.drawTime ?? '18:15'} />
        <SnapshotMetric label="Dữ liệu đến" value={data.dataQuality?.lastDate ?? '–'} />
        <SnapshotMetric label="Chốt lúc" value={formatDateTime(data.meta?.generatedAt)} />
      </div>

      {data.result?.hasResult ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Kết quả target đã có: giải đặc biệt <strong className="tabular-nums">{data.result.special}</strong>.
        </div>
      ) : null}
    </section>
  );
}

function QualityPanel({ data, warnings }: { data: any; warnings: string[] }) {
  return (
    <section className="research-card p-5 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">Data contract</div>
          <h2 className="mt-1 text-lg font-semibold text-ink">Chất lượng dữ liệu</h2>
        </div>
        <StatusBadge status={data?.status} compact />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3">
        <QualityMetric label="Hợp lệ" value={`${data?.validDraws ?? 0}`} />
        <QualityMetric label="Độ phủ lịch" value={`${data?.completeness?.toFixed?.(2) ?? '0.00'}%`} />
        <QualityMetric label="Độ trễ target" value={`${data?.lagDays ?? '–'} ngày`} />
        <QualityMetric label="Ngày thiếu" value={`${data?.missingDates?.length ?? 0}`} />
      </dl>
      <div className="mt-4 space-y-2">
        {warnings.length ? warnings.slice(0, 3).map((warning) => (
          <div key={warning} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{warning}</div>
        )) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900">Không có cảnh báo chất lượng dữ liệu.</div>
        )}
      </div>
    </section>
  );
}

function DecisionPanel({ aggregate }: { aggregate: any }) {
  return (
    <section className="research-card p-5 lg:p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="eyebrow">Cổng bằng chứng</div>
          <h2 className="mt-1 text-xl font-semibold text-ink">{aggregate.conclusion}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Chỉ trạng thái “Đủ bằng chứng” mới vượt cả ngưỡng mẫu, lift và CI95. Các số còn lại vẫn hiển thị để nghiên cứu, không phải khuyến nghị.</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <DecisionCount label="Đủ bằng chứng" value={aggregate.qualifiedMarkets ?? 0} tone="good" />
          <DecisionCount label="Tín hiệu yếu" value={aggregate.watchMarkets ?? 0} tone="watch" />
          <DecisionCount label="Nghiên cứu" value={aggregate.researchMarkets ?? 0} tone="neutral" />
        </div>
      </div>
    </section>
  );
}

function MethodPanel() {
  const notes = [
    ['Không nhìn trước', 'Target t chỉ dùng kết quả trước t; profile được cố định trước backtest.'],
    ['Baseline đúng thị trường', 'Đề/3 càng dùng xác suất dàn; lô dùng số lượng giá trị duy nhất thực tế trong bảng giải.'],
    ['Chống overfit', 'Không chọn profile thắng nhất trên cửa sổ 12–18 kỳ như phiên bản cũ.'],
    ['Quyền abstain', 'Nếu CI95 còn cắt 0 hoặc mẫu 3 chữ số quá mỏng, hệ thống không nâng trạng thái.']
  ];
  return (
    <section className="research-card p-5 lg:p-6">
      <div className="eyebrow">Protocol v5</div>
      <h2 className="mt-1 text-xl font-semibold text-ink">Nguyên tắc tính toán</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {notes.map(([title, body]) => (
          <div key={title} className="rounded-xl border border-line bg-panel-muted p-4">
            <h3 className="font-semibold text-ink">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DataLockedPanel({ warnings }: { warnings: string[] }) {
  return (
    <section className="research-card border-red-200 p-6">
      <div className="eyebrow !text-red-700">Publish gate</div>
      <h2 className="mt-1 text-xl font-semibold text-red-800">Tạm khóa dàn số</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Dữ liệu chưa đạt contract nên hệ thống không phát số, score hoặc ước lượng.</p>
      <div className="mt-4 space-y-2">
        {warnings.map((warning) => <div key={warning} className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{warning}</div>)}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="research-card w-full max-w-sm p-7 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
        <div className="font-semibold text-ink">Đang chạy phòng tính toán</div>
        <div className="mt-1 text-sm text-muted">Đọc snapshot và kiểm định walk-forward</div>
      </div>
    </main>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="research-card w-full max-w-lg border-red-200 p-6">
        <h1 className="text-lg font-semibold text-red-700">Không thể tải phòng nghiên cứu</h1>
        <p className="mt-2 text-sm text-muted">{error || 'API chưa trả dữ liệu hợp lệ.'}</p>
      </div>
    </main>
  );
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel-muted px-3 py-2 text-right">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-bold tabular-nums text-ink">{value}</div>
    </div>
  );
}

function SnapshotMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel-muted p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums text-ink">{value}</div>
    </div>
  );
}

function QualityMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-panel-muted px-3 py-3">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 font-bold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function StatusBadge({ status, compact = false }: { status?: 'ready' | 'warning' | 'blocked'; compact?: boolean }) {
  const config = status === 'ready'
    ? ['Sẵn sàng', 'border-emerald-200 bg-emerald-50 text-emerald-800']
    : status === 'blocked'
      ? ['Bị khóa', 'border-red-200 bg-red-50 text-red-800']
      : ['Có cảnh báo', 'border-amber-200 bg-amber-50 text-amber-800'];
  return <span className={`rounded-full border font-bold ${compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-2 text-xs'} ${config[1]}`}>{config[0]}</span>;
}

function DecisionCount({ label, value, tone }: { label: string; value: number; tone: 'good' | 'watch' | 'neutral' }) {
  const classes = tone === 'good' ? 'border-emerald-200 bg-emerald-50' : tone === 'watch' ? 'border-sky-200 bg-sky-50' : 'border-line bg-panel-muted';
  return (
    <div className={`min-w-[105px] rounded-xl border px-3 py-3 text-center ${classes}`}>
      <div className="text-2xl font-black tabular-nums text-ink">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}

async function fetchJson(url: string) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

function formatDateTime(value?: string) {
  if (!value) return '–';
  return new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  });
}
